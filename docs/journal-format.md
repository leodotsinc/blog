# Leo's Journal: Grok Bot contract

Write one edition per weekday in `data/journal/YYYY-MM-DD.md`. The source of truth
is `lib/journal/core.mjs`, shared by validation and rendering. The daily publishing
rule is: **commits for the daily path may only touch `data/journal/` and
`public/journal/`.** Validate the entire journal before publishing; use
`sh scripts/journal-guard.sh <old-sha> <new-sha>` to check fast-forward ancestry and
every commit's paths, including both sides of renames and deletions.

## Files and frontmatter

Only regular files named `YYYY-MM-DD.md` with a valid calendar date belong directly
in `data/journal/`; an empty `.gitkeep` may preserve each journal root directory.
Subdirectories and other content entries fail. Start at the first line
with `---`, then YAML, then another exact `---` line. Duplicate YAML keys and
unknown fields at every object level fail. No fields accept `null`.

All fields below are required unless marked optional. `text(N)` means a string
trimmed before validation, with 1–N characters (JavaScript string length).
Dates are strings in exact `YYYY-MM-DD` form, validated using UTC calendar dates
(the implementation accepts years 0100–9999). URLs must parse as absolute `http:`
or `https:` URLs, have a hostname, and contain no whitespace.

| Field | Type and enforced limits |
| --- | --- |
| `title` | `text(120)` |
| `date` | Date; must equal the filename date. Saturday/Sunday produces a warning. |
| `edition` | Integer number ≥ 1; unique across editions and strictly increasing with date. Gaps are allowed. |
| `description` | `text(200)` |
| `highlights` | Array of 1–3 distinct strings, each an existing story ID in this edition. Order determines highlight order. |
| `sources` | Array of at least one newsletter object; no maximum. |
| `sources[].name` | `text(80)` |
| `sources[].url` | HTTP(S) URL |
| `stories` | Array of 1–30 story objects, in body order. |
| `stories[].id` | String, at most 64 characters, matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`; unique within the edition. |
| `stories[].section` | `brasil`, `mundo`, `economia`, or `tecnologia` |
| `stories[].title` | `text(160)` |
| `stories[].sources` | Array of at least one source object; no maximum. |
| `stories[].sources[].kind` | `the-news`, `filipe-deschamps`, or `pesquisa-propria` |
| `stories[].sources[].url` | HTTP(S) URL |
| `stories[].sources[].label` | Optional `text(80)`; defaults respectively to `the news`, `Filipe Deschamps`, or `Pesquisa própria`. |
| `stories[].update_of` | Optional date of an existing, valid earlier edition, at most 30 calendar days ago. More than 7 days warns (8–30); more than 30 fails. |
| `stories[].image` | Optional object for a lead image, with the fields below. |
| `stories[].image.src` | String; local image path satisfying the image rules below. |
| `stories[].image.alt` | `text(300)` |
| `stories[].image.credit` | Optional `text(120)` |

Reserved story IDs: `destaques`, `conteudo`, `topo`, `arquivo`, `brasil`, `mundo`,
`economia`, `tecnologia`. IDs may repeat across editions. `update_of` references an
edition, not a required matching story: its link includes `#<story-id>` if that ID
exists in the target edition; otherwise it links to the edition itself. Context
and `update_of` are independent; neither requires the other.

Weekday cadence is a publishing instruction: the validator warns on weekends but
does not require every weekday, consecutive edition numbers, or a nonempty journal.

## Body Markdown

- Start each story with a standalone `<!-- story: id -->` line, matching exactly
  one frontmatter story. Every story needs one block, in frontmatter order; unknown,
  duplicate, malformed, or missing markers fail. Only blank lines may precede the
  first marker. Marker spacing is flexible, but use the canonical spelling above.
- Each story's main body must contain non-whitespace Markdown. Optionally add one
  standalone `<!-- context -->` line: the remaining text until the next story/end
  is context and must be nonempty. Context outside a story or repeated context
  markers fail. Markers inside backtick/tilde fenced code are treated as code.
- Standard Markdown paragraphs, emphasis, strong text, lists, blockquotes, inline
  code, code blocks, thematic breaks, and HTTP(S) links are accepted. Only level-4
  headings (`####`) are allowed; levels 1, 2, 3, 5, and 6 fail. The page supplies
  edition/section/story headings. No GFM or MDX extensions are enabled.
- Raw HTML (including other comments, JSX, and HTML images) fails. The two markers
  above are the only special HTML comments removed before Markdown parsing.
- Markdown links and reference-link definitions require absolute HTTP(S) URLs;
  relative links, fragment-only links, `mailto:`, and other schemes fail.
- Images must use inline Markdown syntax: `![alt](/journal/DATE/file.webp "credit")`.
  Reference-style images fail. Each image must be the only nonblank child of its
  paragraph: no adjacent text, second image, enclosing emphasis, or linked image.
  Alt text must be nonblank; inline alt text has no maximum length. The optional
  Markdown title becomes a caption/credit and has no enforced length limit.
  These rules apply to both main and context bodies.

Strip tracking query parameters before writing links. The validator warns for
story-source URLs and Markdown links/definitions with keys matching
`^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref_src|_hsenc|_hsmi)$` (case insensitive).
It does not check edition-level `sources[].url` for tracking. Other link query
parameters are allowed; tracking warnings do not fail validation.

## Images

Download images into `public/journal/YYYY-MM-DD/` for the same edition date;
never hotlink or use remote URLs. Reference them as `/journal/YYYY-MM-DD/<file>`.
The filename must start with an ASCII letter or digit, followed only by ASCII
letters, digits, `.`, `_`, or `-`. No `..`, nested paths, query strings, or fragments.

Allowed extensions (case insensitive): `webp`, `jpg`, `jpeg`, `png`, `avif`.
The referenced file must exist and be a regular file. Header detection must match
the extension (`jpg` means JPEG), with readable nonzero width and height.
Limits are **409,600 bytes (400 KiB) per file** and **4,194,304 bytes (4 MiB) per
edition**, counting each distinct referenced path once across frontmatter, main
bodies, and contexts. Equality with either limit passes. Unreferenced files do
not count toward that total and produce warnings; unexpected image-root entries
or dated folders without matching editions also warn.

Recommended bot preparation: WebP, width ≤ 1600 px, compressed within the limits.
WebP and 1600 px are recommendations, not validator requirements. Image dimensions
come from headers at build time; no explicit maximum dimensions are enforced.

## Minimal two-story example

This illustrative example requires a valid earlier `2026-10-16` edition with an
edition number below 4 for `update_of`. It is documentation only: the repository
ships no sample editions. Save it as `data/journal/2026-10-19.md` and provide
`public/journal/2026-10-19/chip.png` only when preparing real content. Tests create
these prerequisites exclusively in temporary directories. The schema itself
permits a single story.

```markdown
---
title: "Monday briefing"
date: 2026-10-19
edition: 4
description: "A demonstration update and a chip illustration."
highlights: [vila-esperanca-chuvas]
sources:
  - name: "the news"
    url: "https://example.com/news/2026-10-19"
stories:
  - id: vila-esperanca-chuvas
    section: brasil
    title: "Reconstruction update"
    update_of: 2026-10-16
    sources:
      - kind: the-news
        url: "https://example.com/reconstruction"
  - id: chip-demo
    section: tecnologia
    title: "Chip illustration"
    sources:
      - kind: pesquisa-propria
        url: "https://example.com/chip"
---

<!-- story: vila-esperanca-chuvas -->

This synthetic update follows the earlier reconstruction report.

<!-- context -->

The earlier edition describes the fictional recovery programme.

<!-- story: chip-demo -->

An illustration accompanies this synthetic chip report.

![Abstract circuit traces around a central square](/journal/2026-10-19/chip.png "Synthetic illustration")
```

## Rendering and reading time

Every route is statically generated at build time; publishing an edition means
committing the files and rebuilding.

| Destination | Presentation |
| --- | --- |
| `/journal` | Latest edition cover (canonical: its `/journal/YYYY-MM-DD` page): description, ordered highlights (first is the lead), remaining stories grouped Brasil → Mundo → Economia → Tecnologia, edition sources, recent editions. Highlighted stories are cross-linked from their sections, not duplicated. |
| `/journal/arquivo` | Archive list and weekday calendar per month; edition date, number, title, description, highlighted story titles/sections. |
| `/journal/YYYY-MM-DD` | Permanent edition with previous/next navigation and a generated OG image at `/journal/YYYY-MM-DD/og`. |
| `#destaques`, `#brasil`, `#mundo`, `#economia`, `#tecnologia` | Section anchors used by the sticky section menu. |
| `#<story-id>` | Story anchor: headline, reading time, optional lead image/credit, Markdown body, optional Contexto aside, source credit line and update badge. Inline images become figures with the Markdown title as caption. |
| `/journal/rss.xml` | RSS 2.0: one item per edition with its description and highlight links. |

Images are shown in greyscale with a light halftone screen, so colour is never
needed to read them; still write alt text that describes the content.

Reading time is computed at build time; do not add a frontmatter field for it.
Story words count the story title plus extracted main/context Markdown text;
inline code counts, image alt text and fenced/indented code contents do not.
The exact extraction/tokenization is in `plainText`/`countWords` in the core.
Story and edition minutes are `max(1, round(words / 200))`; edition words are the
sum of story words, not edition metadata or the sum of rounded story minutes.

## Local validation

```sh
node scripts/journal-validate.mjs
node scripts/journal-validate.mjs --root /path/to/fixture
node scripts/journal-validate.mjs --quiet
```

Exit **0** means no validation errors (warnings, and even zero editions, are
allowed). Exit **1** means invalid content; fix it before building. `--quiet`
suppresses warning lines, not errors or the success summary. Issues go to stderr;
success goes to stdout. Format: `error|warning <file>: <field>: <message>`; Markdown
fields include a line number. Entry-level issues can omit the field.

Example error output:

```text
error data/journal/2026-10-19.md: highlights[0]: "missing-story" is not a story id in this edition
journal: 1 error(s); fix the edition files above before building.
```

`yarn build` runs this validator before `next build --webpack`, including Docker
builds. The publishing guard checks Git history and path scope; it does not
replace content validation.
