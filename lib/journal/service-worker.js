/* global self, caches */
// Bump VERSION whenever the worker/cache contract changes.
const VERSION = "v3";
const PREFIX = "leos-journal-";
const PAGES = `${PREFIX}${VERSION}-pages`;
const ASSETS = `${PREFIX}${VERSION}-assets`;
const CORE = `${PREFIX}${VERSION}-core`;
const COVER = "/journal";
const ARCHIVE = "/journal/arquivo";
const CORE_URLS = [
  "/journal/manifest.webmanifest",
  "/journal-app/icon-192.png",
  "/journal-app/icon-512.png",
  "/journal-app/icon-maskable-512.png",
  "/journal-app/apple-touch-icon.png",
  "/journal-app/favicon-32.png",
  "/journal-app/favicon.svg",
];

// Registration scope is a prefix; never handle lookalikes such as /journalism.
function journalPage(path) {
  return path === "/journal" || path.startsWith("/journal/");
}

function staticAsset(path) {
  return path.startsWith("/_next/static/") || path.startsWith("/journal-app/") ||
    /^\/fonts\/[^?]+\.(?:woff2?|ttf|otf)$/.test(path) ||
    /^\/journal\/\d{4}-\d{2}-\d{2}\/[^/]+\.(?:webp|png|jpe?g|avif)$/i.test(path);
}

function cacheable(response) {
  return response.ok && response.type !== "opaque" &&
    (!response.url || new URL(response.url).origin === self.location.origin);
}

// This initiates cancellation without awaiting a tee's other branch (which may
// still belong to the page). Never keep an unused HTTP response alive.
function discard(response) {
  if (response?.body && !response.bodyUsed) void response.body.cancel().catch(() => {});
}

// Serialize writes so simultaneous asset downloads cannot exceed the bound.
// Ownership transfers to remember: cache.put consumes the original, not a clone.
let writes = Promise.resolve();
function remember(name, key, response, limit, pinned = []) {
  if (!cacheable(response)) {
    discard(response);
    return Promise.resolve(false);
  }
  writes = writes.catch(() => {}).then(async () => {
    try {
      const cache = await caches.open(name);
      await cache.delete(key);
      await cache.put(key, response);
      const keys = await cache.keys();
      let count = keys.length;
      for (const request of keys) {
        if (count <= limit) break;
        if (!pinned.includes(new URL(request.url).pathname)) {
          await cache.delete(request);
          count--;
        }
      }
      return true;
    } finally {
      discard(response); // Also release the body if storage rejects the write.
    }
  });
  return writes.catch(() => false);
}

// One shared pool across install, messages and concurrent navigations. A slot
// covers fetch AND body consumption, not just the arrival of response headers.
let activeDownloads = 0;
const waitingDownloads = [];
async function backgroundDownload(task) {
  if (activeDownloads >= 4) await new Promise((resolve) => waitingDownloads.push(resolve));
  else activeDownloads++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
    const next = waitingDownloads.shift();
    if (next) next();
    else activeDownloads--;
  }
}

function assetURLs(source, base, css = false) {
  // Consume quoted CSS strings/data URIs as whole tokens: url(%23n) inside
  // the grain's inline SVG is not a second stylesheet resource.
  const matches = css
    ? source.matchAll(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^\\)])*))\s*\)/gi)
    : source.matchAll(/(?:src|href)="([^"<>]+)"/g);
  const urls = new Set();
  for (const match of matches) {
    const value = (match[1] ?? match[2] ?? match[3])?.trim().replaceAll("&amp;", "&");
    if (!value || /^(?:data:|#|%23)/i.test(value)) continue;
    try {
      const url = new URL(value, base);
      if (url.origin === self.location.origin && staticAsset(url.pathname)) urls.add(url.href);
    } catch {
      // Malformed optional CSS/HTML references must not interrupt warming.
    }
  }
  return [...urls];
}

async function cachedText(name, key) {
  const response = await (await caches.open(name)).match(key);
  if (!response) return "";
  try {
    return await response.text();
  } finally {
    discard(response);
  }
}

// Warming happens after installation, from CACHE_PAGE or a controlled document.
// Read already-cached HTML/CSS so no live HTTP body is forked just for parsing.
async function warmAssets(source, base) {
  const queue = assetURLs(source, base).slice(0, 120);
  const seen = new Set(queue);
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < queue.length) {
      const url = queue[cursor++];
      try {
        await backgroundDownload(async (signal) => {
          const response = await fetch(url, { signal });
          const css = response.headers.get("content-type")?.includes("text/css");
          const saved = await remember(ASSETS, url, response, 120);
          if (css && saved) {
            for (const asset of assetURLs(await cachedText(ASSETS, url), url, true)) {
              if (!seen.has(asset) && seen.size < 120) {
                seen.add(asset);
                queue.push(asset);
              }
            }
          }
        });
      } catch {
        // A timeout or failed optional asset does not block the remaining queue.
      }
    }
  }));
}

function pageResponse(response) {
  return cacheable(response) && response.headers.get("content-type")?.includes("text/html") &&
    (!response.url || journalPage(new URL(response.url).pathname));
}

// Ownership transfers to savePage, then to remember/cache.put (or cancellation).
async function savePage(path, response, warm = false) {
  if (!pageResponse(response)) {
    discard(response);
    return;
  }
  const saved = await remember(PAGES, path, response, 10, [COVER, ARCHIVE]);
  if (warm && saved) await warmAssets(await cachedText(PAGES, path), new URL(path, self.location.origin).href);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // Nine essential URLs only. With four slots and a 2.5s fetch/body deadline,
    // even an entirely stalled origin cannot hold installation for a minute.
    await Promise.allSettled([COVER, ARCHIVE, ...CORE_URLS].map((path) =>
      backgroundDownload(async (signal) => {
        const response = await fetch(path, { cache: "no-store", signal });
        if (path === COVER || path === ARCHIVE) await savePage(path, response);
        else await remember(CORE, path, response, CORE_URLS.length);
      }),
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((key) =>
      key.startsWith(PREFIX) && ![PAGES, ASSETS, CORE].includes(key),
    ).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_PAGE" || !event.source?.url) return;
  const client = new URL(event.source.url);
  const path = event.data.path;
  if (client.origin !== self.location.origin || !journalPage(client.pathname) || path !== client.pathname) return;
  event.waitUntil(backgroundDownload(async (signal) => {
    const response = await fetch(path, { cache: "no-store", headers: { Accept: "text/html" }, signal });
    await savePage(path === "/journal/" ? COVER : path, response);
  }).then(async () => {
    // Release the page download's slot before scheduling asset downloads.
    const key = path === "/journal/" ? COVER : path;
    await warmAssets(await cachedText(PAGES, key), client.href);
  }).catch(() => {}));
});

async function networkFirst(event, url) {
  const path = url.pathname === "/journal/" ? COVER : url.pathname;
  const network = fetch(event.request, { cache: "no-store" });
  let decide;
  const handedToPage = new Promise((resolve) => { decide = resolve; });
  event.waitUntil(network.then(async (response) => {
    // The only document fork: savePage owns the copy; the page OR discard owns
    // the original, including late responses after a timeout/cache fallback.
    const saved = pageResponse(response) ? savePage(path, response.clone(), true) : Promise.resolve();
    const finished = saved.catch(() => {});
    if (!await handedToPage) discard(response);
    await finished;
  }).catch(() => {}));
  let timer;
  try {
    const response = await Promise.race([
      network,
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), 2500); }),
    ]);
    if (response && response.status < 500) {
      decide(true);
      return response;
    }
  } catch {
    // Offline: try this document, then the cover.
  } finally {
    clearTimeout(timer);
  }
  try {
    const cache = await caches.open(PAGES);
    const cached = await cache.match(path) || await cache.match(COVER);
    if (cached) {
      decide(false);
      return cached;
    }
  } catch {
    // Storage denial must still allow the live response through.
  }
  try {
    const response = await network;
    decide(true);
    return response;
  } catch {
    decide(false);
    return new Response("Journal indisponível offline. Conecte-se para carregar a primeira edição.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staticResponse(event, url) {
  const client = await self.clients.get(event.clientId);
  if (!client || !journalPage(new URL(client.url).pathname)) return { response: await fetch(event.request) };
  const name = CORE_URLS.includes(url.pathname) ? CORE : ASSETS;
  const limit = name === CORE ? CORE_URLS.length : 120;
  const cached = await caches.open(name).then((cache) => cache.match(event.request)).catch(() => undefined);
  if (cached) {
    // The page gets the cached body. remember owns the entire refresh body.
    const background = backgroundDownload(async (signal) =>
      remember(name, event.request, await fetch(event.request, { signal }), limit),
    ).catch(() => {});
    return { response: cached, background };
  }
  const response = await fetch(event.request);
  // A cache miss needs two consumers: the page and cache.put. Error responses
  // go only to the page, with no unused cache branch.
  const background = cacheable(response) ? remember(name, event.request, response.clone(), limit) : undefined;
  return { response, background };
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // RSC/prefetch responses are never stored as HTML or given an HTML fallback.
  const html = request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
  if (html) {
    if (!journalPage(url.pathname)) return;
    event.respondWith(networkFirst(event, url));
    return;
  }
  if (!staticAsset(url.pathname) && url.pathname !== "/journal/manifest.webmanifest") return;

  const result = staticResponse(event, url);
  event.waitUntil(result.then(({ background }) => background).catch(() => {}));
  event.respondWith(result.then(({ response }) => response));
});
