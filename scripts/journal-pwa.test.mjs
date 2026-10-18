import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { journalManifest as manifest } from "../lib/journal/pwa.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const worker = read("lib/journal/service-worker.js");
const origin = "https://journal.test";
const absolute = (key) => new URL(typeof key === "string" ? key : key.url, origin).href;

test("cover keeps Next's default canonical URL without a global proxy", () => {
  assert.equal(existsSync(new URL("../proxy.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../middleware.ts", import.meta.url)), false);
  assert.doesNotMatch(read("next.config.ts"), /skipTrailingSlashRedirect|trailingSlash|source: ["']\/journal/);
});

// Loads a TSX/TS module in a VM; `@/` imports resolve to sibling sources.
function loadModule(path, mocks = {}) {
  const require = createRequire(import.meta.url);
  const context = { exports: {}, require: (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) {
      const base = name.slice(2);
      return loadModule(existsSync(new URL(`../${base}.tsx`, import.meta.url)) ? `${base}.tsx` : `${base}.ts`, mocks);
    }
    return require(name);
  } };
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, context);
  return context.exports;
}

test("top journal bar always offers archive/latest links and marks the current page", () => {
  let pathname;
  const bar = loadModule("components/journal/JournalBar.tsx", {
    "next/navigation": { usePathname: () => pathname },
    "next/link": { default: (input) => {
      const props = { ...input };
      delete props.prefetch;
      return createElement("a", props);
    } },
  });
  for (pathname of ["/journal", "/journal/2026-10-18", "/journal/arquivo", "/journal/missing"]) {
    const html = renderToStaticMarkup(createElement(bar.default));
    assert.match(html, /href="\/journal\/arquivo"[^>]*>Arquivo<\/a>/);
    assert.match(html, /href="\/journal"/);
    assert.match(html, /Edição mais recente/);
    assert.doesNotMatch(html, /\s(?:hidden|disabled)(?:[ =>])/);
    assert.equal((html.match(/aria-current="page"/g) || []).length, ["/journal", "/journal/arquivo"].includes(pathname) ? 1 : 0);
    if (pathname === "/journal/arquivo") {
      assert.match(html, /href="\/journal\/arquivo" aria-current="page"/);
      assert.match(html, /←/);
    }
  }
  const layout = read("app/journal/layout.tsx");
  assert.ok(layout.indexOf("<JournalBar />") < layout.indexOf("<JournalTransitions>"));
});

test("font size control sits in the bar as an accessible A−/A/A+ group", () => {
  const bar = loadModule("components/journal/JournalBar.tsx", {
    "next/navigation": { usePathname: () => "/journal/2026-10-18" },
    "next/link": { default: (input) => createElement("a", { ...input, prefetch: undefined }) },
  });
  const html = renderToStaticMarkup(createElement(bar.default));
  assert.match(html, /role="group" aria-label="Tamanho da fonte"/);
  const buttons = [...html.matchAll(/<button[^>]*jr-fontsize__option[^>]*>/g)].map(([tag]) => tag);
  assert.equal(buttons.length, 3);
  for (const [index, label] of ["Diminuir fonte", "Tamanho padrão", "Aumentar fonte"].entries()) {
    assert.match(buttons[index], new RegExp(`type="button"`));
    assert.match(buttons[index], new RegExp(`aria-label="${label}"`));
    // The server renders the default size; the inline script and CSS cover the rest before paint.
    assert.match(buttons[index], new RegExp(`aria-pressed="${index === 1}"`));
  }
});

test("journal bar carries the shared theme toggle right after the font size control", () => {
  const bar = loadModule("components/journal/JournalBar.tsx", {
    "next/navigation": { usePathname: () => "/journal" },
    "next/link": { default: (input) => createElement("a", { ...input, prefetch: undefined }) },
  });
  const html = renderToStaticMarkup(createElement(bar.default));
  const toggle = html.match(/<button[^>]*class="jr-theme"[^>]*>/)?.[0];
  assert.ok(toggle, "theme toggle rendered");
  assert.match(toggle, /type="button"/);
  assert.match(toggle, /aria-label="Alternar tema claro\/escuro"/);
  assert.ok(html.indexOf("Tamanho da fonte") < html.indexOf('class="jr-theme"'));
  // The glyph (not the bordered box) gets the blog's theme-toggle transition name.
  assert.match(html, /class="jr-theme"[^>]*><span class="jr-theme__glyph theme-toggle"/);
  // Same mechanism as the blog header: one hook, next-themes storage and the wave.
  assert.match(read("components/journal/JournalThemeToggle.tsx"), /useThemeWave/);
  assert.match(read("components/ThemeSwitcher.tsx"), /useThemeWave/);
});

test("saved font size is applied to <html> before paint and only read by journal rules", () => {
  const { FONT_SIZE_SCRIPT, parseFontSize } = loadModule("lib/journal/font-size.ts");
  const run = (stored, { throws = false, initial } = {}) => {
    const attributes = new Map(initial ? [["data-jr-size", initial]] : []);
    const documentElement = {
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
    };
    const localStorage = { getItem: (key) => {
      if (throws) throw new Error("blocked");
      return key === "jr-font-size" ? stored : null;
    } };
    vm.runInNewContext(FONT_SIZE_SCRIPT, { document: { documentElement }, localStorage });
    return attributes.get("data-jr-size");
  };
  assert.equal(run("sm"), "sm");
  assert.equal(run("lg"), "lg");
  assert.equal(run(null, { initial: "lg" }), undefined);
  assert.equal(run("huge", { initial: "sm" }), undefined);
  assert.equal(run("lg", { throws: true }), undefined);
  assert.deepEqual(["sm", "md", "lg", null, "x"].map(parseFontSize), ["sm", "md", "lg", "md", "md"]);

  const layout = read("app/journal/layout.tsx");
  assert.ok(layout.indexOf("FONT_SIZE_SCRIPT") < layout.indexOf("<JournalBar />"));
  const css = read("app/journal/journal.css");
  for (const rule of css.match(/^[^\n{}@]*data-jr-size[^{]*\{/gm)) {
    assert.match(rule, /\.jr-(root|fontsize)/, rule);
  }
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*\.jr-root \{\s*transition: --jr-fs/);
});

test("headlines mode turns each headline into a disclosure; full mode keeps the plain heading", () => {
  const props = { storyId: "fim-da-6x1", titleId: "fim-da-6x1-titulo", contentId: "fim-da-6x1-conteudo", title: "Fim da 6x1 é promulgado" };
  const render = (state) => {
    const { StoryHeadline } = loadModule("components/journal/Reading.tsx", { react: { ...React, useContext: () => state } });
    return renderToStaticMarkup(createElement(StoryHeadline, props));
  };
  const plain = '<h3 id="fim-da-6x1-titulo" class="jr-headline">Fim da 6x1 é promulgado</h3>';
  assert.equal(render(null), plain);
  assert.equal(render({ mode: "full", open: new Set(["fim-da-6x1"]) }), plain);

  for (const open of [false, true]) {
    const html = render({ mode: "headlines", open: new Set(open ? ["fim-da-6x1"] : []) });
    assert.match(html, /^<h3 id="fim-da-6x1-titulo" class="jr-headline"><button type="button" class="jr-headline__toggle"/);
    assert.match(html, new RegExp(`aria-expanded="${open}" aria-controls="fim-da-6x1-conteudo" aria-describedby="jr-headline-hint"`));
    // The marker stays glued to the last word and out of the accessible name.
    assert.match(html, />Fim da 6x1 é <span class="jr-headline__end">promulgado<span class="jr-headline__marker" aria-hidden="true"><\/span><\/span><\/button><\/h3>$/);
  }

  const story = read("components/journal/Story.tsx");
  assert.match(story, /<div id=\{contentId\} className="jr-story__more">/);
  const css = read("app/journal/journal.css");
  // Layout-neutral wrapper in full mode; only headlines mode collapses it.
  assert.match(css, /\.jr-story__more,\s*\.jr-story__more-inner \{\s*display: contents;/);
  assert.doesNotMatch(css, /data-reading="headlines"\][^{]*\.jr-body[^{]*\{\s*display: none/);
  assert.match(css, /\.jr-story:has\(> \.jr-headline \[aria-expanded="true"\]\) \.jr-story__more \{\s*grid-template-rows: 1fr;/);
});

function harness({ fetcher = async () => new Response("fresh", { headers: { "Content-Type": "text/html" } }), client = "/journal", immediateTimeout = false, downloadTimeout, storageFails = false } = {}) {
  const events = {};
  const stores = new Map();
  let claimed = false;
  let skipped = false;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (key) => stores.delete(key),
    open: async (name) => {
      if (storageFails) throw new Error("storage unavailable");
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async (key) => store.get(absolute(key))?.clone(),
        put: async (key, value) => {
          // Real cache.put consumes its input body; a clone-only mock hid leaks.
          const bytes = await value.arrayBuffer();
          store.set(absolute(key), new Response(bytes, { status: value.status, headers: value.headers }));
        },
        delete: async (key) => store.delete(absolute(key)),
        keys: async () => [...store.keys()].map((url) => new Request(url)),
      };
    },
  };
  const context = vm.createContext({
    URL, Response, Request, AbortController, caches, fetch: fetcher,
    setTimeout: immediateTimeout ? (fn) => { fn(); return 0; } : (fn, ms) => setTimeout(fn, downloadTimeout ?? ms),
    clearTimeout,
    self: {
      location: { origin },
      addEventListener: (name, handler) => { events[name] = handler; },
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; }, get: async () => ({ url: origin + client }) },
    },
  });
  vm.runInContext(worker, context);
  const dispatch = (name, values = {}) => {
    const waits = [];
    let response;
    events[name]({ ...values, waitUntil: (promise) => waits.push(promise), respondWith: (promise) => { response = promise; } });
    return { response, done: () => Promise.all(waits) };
  };
  const request = (path, { method = "GET", mode = "navigate", accept = "text/html" } = {}) => dispatch("fetch", {
    clientId: "journal-client",
    request: { url: new URL(path, origin).href, method, mode, headers: new Headers({ accept }) },
  });
  return { caches, stores, request, dispatch, context, claimed: () => claimed, skipped: () => skipped };
}

test("manifest identity, cover-inclusive scope, paper colors, and generated icon dimensions", () => {
  assert.equal(manifest.name, "Leo's Journal");
  assert.equal(manifest.short_name, "Journal");
  assert.equal(manifest.id, "/journal");
  assert.equal(manifest.scope, "/journal");
  assert.equal(manifest.start_url, "/journal");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "pt-BR");
  assert.ok(manifest.description.length > 20);
  assert.equal(manifest.background_color, "#f3f3f2");
  assert.equal(manifest.theme_color, "#f3f3f2");
  assert.deepEqual(manifest.icons.map(({ sizes, purpose }) => [sizes, purpose]), [
    ["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"],
  ]);
  const icons = [...manifest.icons, { src: "/journal-app/apple-touch-icon.png", sizes: "180x180" }, { src: "/journal-app/favicon-32.png", sizes: "32x32" }];
  for (const icon of icons) {
    const png = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.toString("ascii", 12, 16), "IHDR");
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
    // PNG IHDR color type 2 = truecolor RGB, with no alpha channel.
    assert.equal(png[25], 2, `${icon.src} must be opaque RGB`);
  }
  assert.match(read("public/journal-app/favicon.svg"), /<svg/);
});

test("worker ignores blog routes, lookalike prefixes, external URLs, writes, APIs and RSC", () => {
  const h = harness();
  for (const path of ["/", "/about", "/journals-foo", "/journalism", "/journalism/arquivo", "/journal-app/other-page", "https://elsewhere.test/journal/a"]) {
    assert.equal(h.request(path).response, undefined, path);
  }
  assert.equal(h.request("/journal", { method: "POST" }).response, undefined);
  assert.equal(h.request("/api/spotify", { mode: "cors", accept: "application/json" }).response, undefined);
  assert.equal(h.request("/journal/arquivo?_rsc=abc", { mode: "cors", accept: "text/x-component" }).response, undefined);
});

test("online documents use no-store and replace cached HTML", async () => {
  let options;
  const h = harness({ fetcher: async (_, init) => { options = init; return new Response("today", { headers: { "Content-Type": "text/html" } }); } });
  const cache = await h.caches.open("leos-journal-v3-pages");
  await cache.put("/journal", new Response("yesterday"));
  const event = h.request("/journal");
  assert.equal(await (await event.response).text(), "today");
  await event.done();
  assert.equal(options.cache, "no-store");
  assert.equal(await (await cache.match("/journal")).text(), "today");
});

test("offline reads exact cached edition, or cover for an uncached journal URL", async () => {
  const h = harness({ fetcher: async () => { throw new Error("offline"); } });
  const cache = await h.caches.open("leos-journal-v3-pages");
  await cache.put("/journal", new Response("cover"));
  await cache.put("/journal/2026-10-18", new Response("edition"));
  for (const [path, expected] of [["/journal/2026-10-18", "edition"], ["/journal/missing", "cover"], ["/journal", "cover"]]) {
    const event = h.request(path);
    assert.equal(await (await event.response).text(), expected);
    await event.done();
  }
});

test("timeout falls back, but late network success still refreshes the cache", async () => {
  let finish;
  const h = harness({ immediateTimeout: true, fetcher: () => new Promise((resolve) => { finish = resolve; }) });
  const cache = await h.caches.open("leos-journal-v3-pages");
  await cache.put("/journal", new Response("offline cover"));
  const event = h.request("/journal");
  assert.equal(await (await event.response).text(), "offline cover");
  const late = new Response("updated", { headers: { "Content-Type": "text/html" } });
  finish(late);
  await event.done();
  assert.ok(late.bodyUsed, "late original must be cancelled when only its cached copy is needed");
  assert.equal(await (await cache.match("/journal")).text(), "updated");
});

test("install tolerates unavailable precache URLs; activation deletes only old journal caches", async () => {
  const fetched = [];
  const h = harness({ fetcher: async (path) => { fetched.push(path); throw new Error("offline"); } });
  await h.caches.open("leos-journal-v0-pages");
  await h.caches.open("another-app-cache");
  await h.caches.open("leos-journal-v3-pages");
  await h.dispatch("install").done();
  assert.ok(h.skipped());
  for (const path of ["/journal", "/journal/arquivo", "/journal/manifest.webmanifest", ...manifest.icons.map((icon) => icon.src)]) assert.ok(fetched.includes(path));
  await h.dispatch("activate").done();
  assert.ok(h.claimed());
  assert.deepEqual(await h.caches.keys(), ["another-app-cache", "leos-journal-v3-pages"]);
});

test("static assets are bounded, and a client that left Journal never gets cached assets", async () => {
  const h = harness();
  await vm.runInContext('Promise.all(Array.from({length: 130}, (_, i) => remember(ASSETS, "/_next/static/" + i + ".js", new Response("asset"), 120)))', h.context);
  assert.equal((await (await h.caches.open("leos-journal-v3-assets")).keys()).length, 120);
  const outside = harness({ client: "/about" });
  const cache = await outside.caches.open("leos-journal-v3-assets");
  await cache.put("/_next/static/test.js", new Response("stale"));
  const event = outside.request("/_next/static/test.js", { mode: "cors", accept: "*/*" });
  assert.equal(await (await event.response).text(), "fresh");
  await event.done();
  assert.equal(await (await cache.match("/_next/static/test.js")).text(), "stale");
});

test("PWA metadata and registration belong only to the journal layout", () => {
  const root = read("app/layout.tsx");
  assert.doesNotMatch(root, /manifest|JournalPWA|SiteHeader|SmoothScroll|<Footer|pt-20/);
  assert.match(read("components/SiteShell.tsx"), /flex-grow pt-20/);
  assert.match(read("app/journal/layout.tsx"), /prefers-color-scheme: dark/);
  assert.match(read("app/journal/layout.tsx"), /#121212/);
  assert.match(read("components/journal/JournalPWA.tsx"), /process.env.NODE_ENV !== "production"/);
  assert.match(read("components/journal/JournalPWA.tsx"), /scope: "\/journal"/);
  assert.match(read("app/journal/sw.js/route.ts"), /"Service-Worker-Allowed": "\/journal"/);
});

test("CSS discovery ignores data URI contents, comments, strings and fragment references", () => {
  const h = harness();
  h.context.css = `
    .grain { background: url("data:image/svg+xml,%3Csvg%3Eurl(%23n) url(/_next/static/ghost.js)%3C/svg%3E"); }
    .other { background: url('data:image/svg+xml,<svg filter="url(#n)"/>'); }
    .fragments { filter: url(#n); mask: url(%23n); fill: url( "%23another" ); }
    /* background: url(/_next/static/comment.js) */
    .text::after { content: "url(/_next/static/string.js)"; }
    @font-face { src: url('../media/type.woff2') format('woff2'); }
    .image { background: url(/journal/2026-10-18/photo.webp); }
    .external { background: url(https://elsewhere.test/_next/static/font.woff2); }
  `;
  const urls = vm.runInContext('assetURLs(css, "https://journal.test/_next/static/css/page.css", true)', h.context);
  assert.deepEqual([...urls], [origin + "/_next/static/media/type.woff2", origin + "/journal/2026-10-18/photo.webp"]);
});

test("install consumes only core/page bodies and leaves heavy asset warming until later", async () => {
  const responses = [];
  const fetched = [];
  const h = harness({ fetcher: async (path) => {
    fetched.push(path);
    const response = new Response('<script src="/_next/static/heavy.js"></script>', {
      headers: { "Content-Type": "text/html" },
    });
    responses.push(response);
    return response;
  } });
  await h.dispatch("install").done();
  assert.ok(h.skipped());
  assert.equal(fetched.length, 9);
  assert.ok(!fetched.some((path) => path.includes("heavy.js")));
  assert.ok(responses.every((response) => response.bodyUsed));
});

test("stalled install fetches abort and still reach skipWaiting", { timeout: 1000 }, async () => {
  let aborted = 0;
  const h = harness({ downloadTimeout: 5, fetcher: (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => { aborted++; reject(new Error("aborted")); }, { once: true });
  }) });
  await h.dispatch("install").done();
  assert.equal(aborted, 9);
  assert.ok(h.skipped());
});

test("install deadline also aborts stalled bodies after headers arrive", { timeout: 1000 }, async () => {
  let aborted = 0;
  const responses = [];
  const h = harness({ downloadTimeout: 5, fetcher: async (_, { signal }) => {
    const body = new ReadableStream({ start(controller) {
      signal.addEventListener("abort", () => {
        aborted++;
        controller.error(new Error("body aborted"));
      }, { once: true });
    } });
    const response = new Response(body, { headers: { "Content-Type": "text/html" } });
    responses.push(response);
    return response;
  } });
  await h.dispatch("install").done();
  assert.equal(aborted, 9);
  assert.ok(responses.every((response) => response.bodyUsed));
  assert.ok(h.skipped());
});

test("a failed navigation cancels the unused server error when serving cached HTML", async () => {
  const error = new Response("server error", { status: 503 });
  const h = harness({ fetcher: async () => error });
  await (await h.caches.open("leos-journal-v3-pages")).put("/journal", new Response("cover"));
  const event = h.request("/journal");
  assert.equal(await (await event.response).text(), "cover");
  await event.done();
  assert.ok(error.bodyUsed);
});

test("remember/savePage transfer bodies directly and cancel rejected or unwritable responses", async () => {
  // Only page/cache sharing may clone. These ownership-taking helpers must not.
  const remember = worker.slice(worker.indexOf("function remember("), worker.indexOf("// One shared pool"));
  const save = worker.slice(worker.indexOf("async function savePage("), worker.indexOf('self.addEventListener("install"'));
  assert.doesNotMatch(remember + save, /\.clone\(/);
  const h = harness();
  const rejected = new Response("404", { status: 404 });
  const notHTML = new Response("json", { headers: { "Content-Type": "application/json" } });
  h.context.rejected = rejected;
  h.context.notHTML = notHTML;
  await vm.runInContext('remember(ASSETS, "/_next/static/missing.js", rejected, 120)', h.context);
  await vm.runInContext('savePage("/journal", notHTML)', h.context);
  assert.ok(rejected.bodyUsed);
  assert.ok(notHTML.bodyUsed);

  const failed = harness({ storageFails: true });
  const response = new Response("uncached");
  failed.context.response = response;
  await vm.runInContext('remember(ASSETS, "/_next/static/app.js", response, 120)', failed.context);
  assert.ok(response.bodyUsed);
});

test("concurrent warmers share four slots through body consumption and consume failures too", async () => {
  let active = 0, peak = 0;
  const responses = [];
  const fetched = [];
  const h = harness({ fetcher: async (url) => {
    fetched.push(url);
    active++;
    peak = Math.max(peak, active);
    const css = url.endsWith(".css");
    const stream = new ReadableStream({ start(controller) {
      setTimeout(() => {
        controller.enqueue(new TextEncoder().encode(css ? "@font-face{src:url('../media/font.woff2')}" : "asset"));
        controller.close();
        active--;
      }, 5);
    } });
    const response = new Response(stream, { headers: { "Content-Type": css ? "text/css" : "application/javascript" } });
    responses.push(response);
    return response;
  } });
  h.context.html = Array.from({ length: 12 }, (_, i) => `<script src="/_next/static/${i}.js"></script>`).join("") + '<link href="/_next/static/css/app.css">';
  await vm.runInContext('Promise.all([warmAssets(html, "https://journal.test/journal"), warmAssets(html, "https://journal.test/journal/arquivo")])', h.context);
  assert.equal(peak, 4);
  assert.equal(active, 0);
  assert.ok(fetched.includes(origin + "/_next/static/media/font.woff2"));
  assert.ok(responses.every((response) => response.bodyUsed));

  const bad = new Response("missing", { status: 404 });
  const failed = harness({ fetcher: async () => bad });
  await vm.runInContext('warmAssets(\'<link href="/_next/static/missing.css">\', "https://journal.test/journal")', failed.context);
  assert.ok(bad.bodyUsed);
});

test("cached static refresh consumes its original; a miss keeps the page's branch readable", async () => {
  const responses = [];
  const h = harness({ fetcher: async () => {
    const response = new Response("fresh asset");
    responses.push(response);
    return response;
  } });
  const cache = await h.caches.open("leos-journal-v3-assets");
  await cache.put("/_next/static/cached.js", new Response("cached asset"));
  const hit = h.request("/_next/static/cached.js", { mode: "cors", accept: "*/*" });
  assert.equal(await (await hit.response).text(), "cached asset");
  await hit.done();
  assert.ok(responses[0].bodyUsed);
  const miss = h.request("/_next/static/new.js", { mode: "cors", accept: "*/*" });
  assert.equal(await (await miss.response).text(), "fresh asset");
  await miss.done();
  assert.equal(await (await cache.match("/_next/static/new.js")).text(), "fresh asset");
});
