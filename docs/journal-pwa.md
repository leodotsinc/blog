# Journal app (LEO-20)

The blog's pages live in `app/(site)/`; its layout uses `SiteShell` with the
original header, SmoothScroll, `main.pt-20` and footer. The shared root retains
fonts, metadata, ThemeProvider and Umami. The Journal has its own server-rendered
layout and masthead, with no blog chrome or top offset. Its layout always provides
a visible top bar with **Edição mais recente** (`/journal`) and **Arquivo**
(`/journal/arquivo`), including empty states and its own 404. The bar is rendered
before the masthead at every screen size, independent of edition count; the active
cover/archive link uses `aria-current="page"`. On the archive, the latest-edition
link has a back arrow. The footer retains Capa/Arquivo/RSS links. First/latest
edition ears describe the boundary of the available editions; they do not imply
that an older/newer edition exists. The root blog 404
uses SiteShell; nested blog 404s inherit it from the site group. The blog favicon
is now `public/favicon.ico` (same public URL), referenced by root metadata, so the
Journal can override **all** icons without inheriting Next's automatic root icon.

## Scope and URLs (PR notes)

The canonical cover remains **`/journal`**, using Next's default trailing-slash
behavior. Manifest `id`, `start_url`, `scope`, registration scope and the
`Service-Worker-Allowed` header are all **`/journal`**. Scope `/journal/` would
exclude the cover at `/journal`, so the scope must include that start URL. There
is no proxy/middleware, custom trailing-slash setting or cover redirect.

Service-worker scopes use prefix matching: `/journal` can technically control
future lookalike paths such as `/journalism`. The worker therefore explicitly
handles document paths only when **equal to `/journal` or starting with
`/journal/`**. All other documents pass through, including `/journalism` and
`/journals-foo`. The only resource exceptions are the same-origin static asset
allowlist below; it checks that the requesting client is still on an actual
journal page before serving cached assets. The test suite covers prefix
lookalikes, cross-origin requests and clients that leave Journal. This is an
explicit fetch-handler boundary, not a claim that browser scope matching has a
path-segment boundary. Edition, archive, API, feed and blog URLs remain unchanged.

Only journal pages link `/journal/manifest.webmanifest`, advertise theme colors
and Apple app metadata, and register `/journal/sw.js`. Registration runs only in
production. No PWA files live in the daily publishing directories. A future PR
must retain the branch's `LEO-20` reference and include `Fixes LEO-20`.

## Logo source and regeneration

**`assets/journal-icon/source.svg`** is the source of truth: a transparent,
tightly framed vector redraw of Leo's newspaper glyph, with no external fonts,
white tile, rounded app background or shadow. Keep the original presentation
reference at **`assets/journal-icon/leo-logo-mockup.png`**; it is never an icon input.
The provisional J has been replaced.

Run **`yarn journal:icons`** to regenerate all six files in `public/journal-app/`:

| Output | Canvas | Glyph layout |
| --- | --- | --- |
| `icon-192.png` | 192 × 192 | Centered, ~70% width |
| `icon-512.png` | 512 × 512 | Centered, ~70% width |
| `icon-maskable-512.png` | 512 × 512 | Centered, ~60% width; diagonal capped within the safe circle |
| `apple-touch-icon.png` | 180 × 180 | Centered, ~70% width, opaque RGB without an alpha channel |
| `favicon-32.png` | 32 × 32 | ~88% width for small-size legibility |
| `favicon.svg` | Tight glyph viewBox | Copy of the transparent vector master |

Every PNG has a **solid white `#ffffff` full-bleed background**, no alpha, rounded
tile or shadow. The OS applies the icon mask. Aspect ratio is preserved; the
maskable artwork's diagonal is capped at 79% of the canvas, inside the safe circle
of radius 40%. Manifest background/theme colors still use journal paper.

An optional **`assets/journal-icon/source.png`** takes precedence if present. It
must contain only the glyph on transparent or white background (prefer at least
1024 px on its longest edge); it need not be square. Delete that override to use
the SVG master again. The script trims blank margins before scaling. With a PNG
override, favicon.svg is a self-contained wrapper embedding the trimmed image.
Review and version the source and all generated files together, outside daily
edition publishing paths. Never use `leo-logo-mockup.png` as `source.png`.

### Vector fidelity

The reference's pixels with mean RGB < 128 occupy x=373–876, y=409–814
(504 × 406). The redraw uses that tight viewBox and measured rounded outlines:
top frame about 24 px, vertical sides about 25 px, lower rolled edge about 33 px;
the photo block is 139.2 × 126.8 px, with three short rounded lines to its right
and three longer rounded lines below. The small slopes in the reference are
preserved rather than importing its photographic texture.

Compare reproducibly with **`node scripts/journal-logo-compare.mjs`**. It rasterizes
the SVG at the reference glyph's dimensions, flattens on white, thresholds both
images at mean RGB < 128, and computes intersection / union without searching for
an alignment. The final redraw scores **0.99395033 (99.40% IoU)**: intersection
104,658 pixels, union 105,295; 339 extra and 298 missing pixels. This evaluates the
glyph only, excluding the mockup tile/shadow.

## Offline policy

The source is `lib/journal/service-worker.js`, served as JavaScript with
`Cache-Control: no-cache`. Increment `VERSION` when changing the cache contract.
Version **v3** installs only nine essential URLs: cover, archive, manifest and
six icons. It does not follow HTML/CSS assets during install. One failed URL does
not prevent installation. A shared pool allows at most **four background
downloads**, with a **2.5-second deadline per download including body consumption**;
stalled fetches are aborted. Installation uses skipWaiting; activation claims
clients and deletes only older `leos-journal-*` caches.

HTML asset references and CSS fonts are warmed after activation through the
page's `CACHE_PAGE` message or a controlled navigation's `waitUntil`. The same
four-slot pool also bounds overlapping warmers and cached-asset refreshes. Quoted
CSS data URIs are treated as whole tokens; data URLs and fragment-only `#…` or
`%23…` references are ignored, including the grain SVG's internal filter URL.
Every fetched body is handed to the page/cache, fully read, or explicitly
cancelled. Cache writers take ownership of the original response; the only
clones split a live page response between the page and cache. Late responses
unused after an offline/timeout fallback are cancelled as well.

- Journal document requests use network first with `cache: no-store` and a
  **2.5-second timeout**. A successful HTML response refreshes the document cache,
  including a response arriving after timeout. Fast online responses are always
  fresh; offline, server failure or a slow connection can show a cached copy.
  This is offline reading, not a guarantee of current news while disconnected.
- The document cache holds **10 pages**, preserving the cover and archive plus
  up to eight recently fetched pages. An uncached journal URL falls back to the
  cover. Without any cached page, the request waits for the network or returns a
  short Portuguese offline message. HTTP 404s stay 404s and are never cached.
- Next's RSC/prefetch responses pass through unchanged: HTML is never returned
  as RSC. After client navigation, the journal component asks the worker to warm
  that page's HTML separately, checking the sender's current journal URL.
- Same-origin `/_next/static/*`, `/fonts/*` font files, `/journal-app/*`, and dated
  journal images use stale-while-revalidate. The shared asset cache holds at most
  **120 entries**; manifest/icons have their own bounded seven-entry cache.
  Evictions and writes are serialized. Cache writes may fail without preventing
  online reading. This bounds entry count, not total bytes; clearing browser
  storage removes offline editions.
- Cross-origin requests, non-GET requests, blog HTML and APIs are not handled.
  Shared assets are served from cache only for a client currently under Journal,
  including after a client-side departure to the blog. There is no root worker.

## Validation

`node --test scripts/journal-pwa.test.mjs` checks icon PNG headers, manifest fields,
scope exclusions, fresh HTML, offline/timeout fallbacks, activation and eviction,
response-body ownership, install timeouts, CSS URL filtering and the shared
four-download limit.
It is included in `yarn test:lab`, hence `sh scripts/check-all.sh`. Run that check
and `yarn build` before publishing. Browser acceptance should include installation,
offline reload/uncached fallback, online freshness, Journal/blog transitions and
mobile light/dark icons. Automated unit checks do not prove native installation
on iOS or Android.
