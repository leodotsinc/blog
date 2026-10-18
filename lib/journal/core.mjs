// Leo's Journal content core. Plain ESM so the build-time validator
// (scripts/journal-validate.mjs) and the Next pages share exactly one parser:
// what the validator accepts is what the pages render.
//
// Contract: docs/journal-format.md.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const SECTIONS = [
  { id: "brasil", label: "Brasil" },
  { id: "mundo", label: "Mundo" },
  { id: "economia", label: "Economia" },
  { id: "tecnologia", label: "Tecnologia" },
];

export const SOURCE_KINDS = {
  "the-news": "the news",
  "filipe-deschamps": "Filipe Deschamps",
  "pesquisa-propria": "Pesquisa própria",
};

// Story ids become page anchors next to the section anchors.
export const RESERVED_IDS = ["destaques", "conteudo", "topo", "arquivo", ...SECTIONS.map((s) => s.id)];

export const LIMITS = {
  imageBytes: 400 * 1024,
  editionImageBytes: 4 * 1024 * 1024,
  updateMaxDays: 30,
  updateWarnDays: 7,
  wordsPerMinute: 200,
};

const IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "avif"];
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/;
const STORY_MARKER = /^<!--\s*story:\s*(\S*)\s*-->\s*$/;
const CONTEXT_MARKER = /^<!--\s*context\s*-->\s*$/;
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref_src|_hsenc|_hsmi)$/i;

// ---------------------------------------------------------------------------
// small helpers

export function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function dayNumber(value) {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function isWeekend(value) {
  const day = new Date(dayNumber(value) * 86_400_000).getUTCDay();
  return day === 0 || day === 6;
}

export function isHttpUrl(value) {
  if (typeof value !== "string" || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function trackingParams(value) {
  try {
    return [...new URL(value).searchParams.keys()].filter((key) => TRACKING_PARAM.test(key));
  } catch {
    return [];
  }
}

function formatPath(segments) {
  return segments.reduce(
    (out, segment) => (typeof segment === "number" ? `${out}[${segment}]` : out ? `${out}.${segment}` : String(segment)),
    "",
  );
}

/** Reads width/height from the file header and proves the bytes match a supported format. */
export function sniffImage(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString("ascii", 12, 16) === "IHDR") {
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) return null;
      const marker = buf[offset + 1];
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        offset += 2;
        continue;
      }
      const length = buf.readUInt16BE(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) return { format: "jpeg", height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
    return null;
  }
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 " && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
      return { format: "webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L" && buf[20] === 0x2f) {
      const [b1, b2, b3, b4] = [buf[21], buf[22], buf[23], buf[24]];
      return {
        format: "webp",
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") {
      return { format: "webp", width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    return null;
  }
  if (buf.length >= 16 && buf.toString("ascii", 4, 8) === "ftyp") {
    const boxSize = buf.readUInt32BE(0);
    const brands = [];
    for (let at = 8; at + 4 <= Math.min(boxSize, buf.length); at += 4) brands.push(buf.toString("ascii", at, at + 4));
    if (!brands.includes("avif") && !brands.includes("avis")) return null;
    const ispe = buf.indexOf("ispe");
    if (ispe < 0 || ispe + 16 > buf.length) return null;
    return { format: "avif", width: buf.readUInt32BE(ispe + 8), height: buf.readUInt32BE(ispe + 12) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// frontmatter schema

const text = (max) => z.string().trim().min(1, "must not be empty").max(max, `must be at most ${max} characters`);
const httpUrl = z.string().refine(isHttpUrl, "must be an absolute http(s) URL");
const isoDate = z.string().refine(isValidDate, "must be a calendar date written as YYYY-MM-DD");
const storyId = z
  .string()
  .max(64, "must be at most 64 characters")
  .regex(ID_PATTERN, "must be kebab-case: lowercase letters, digits and single hyphens")
  .refine((id) => !RESERVED_IDS.includes(id), (id) => ({ message: `"${id}" is reserved for page anchors` }));

const schema = z
  .object({
    title: text(120),
    date: isoDate,
    edition: z.number({ invalid_type_error: "must be a number" }).int("must be an integer").min(1, "must be >= 1"),
    description: text(200),
    highlights: z.array(z.string()).min(1, "needs 1 to 3 story ids").max(3, "needs 1 to 3 story ids"),
    sources: z
      .array(z.object({ name: text(80), url: httpUrl }).strict())
      .min(1, "needs at least one newsletter"),
    stories: z
      .array(
        z
          .object({
            id: storyId,
            section: z.enum(SECTIONS.map((s) => s.id)),
            title: text(160),
            sources: z
              .array(
                z
                  .object({
                    kind: z.enum(Object.keys(SOURCE_KINDS)),
                    url: httpUrl,
                    label: text(80).optional(),
                  })
                  .strict(),
              )
              .min(1, "needs at least one source"),
            update_of: isoDate.optional(),
            image: z.object({ src: z.string(), alt: text(300), credit: text(120).optional() }).strict().optional(),
          })
          .strict(),
      )
      .min(1, "needs at least one story")
      .max(30, "must have at most 30 stories"),
  })
  .strict();

function zodIssues(error) {
  return error.issues.map((issue) => {
    let message = issue.message;
    if (issue.code === "unrecognized_keys") message = `unknown field(s): ${issue.keys.join(", ")}`;
    if (issue.code === "invalid_type" && issue.received === "undefined") message = "is required";
    if (issue.code === "invalid_enum_value") message = `must be one of: ${issue.options.join(", ")}`;
    return { field: formatPath(issue.path) || "frontmatter", message };
  });
}

// ---------------------------------------------------------------------------
// markdown

const parser = unified().use(remarkParse);
const toHastProcessor = unified().use(remarkRehype);

function children(node) {
  return Array.isArray(node.children) ? node.children : [];
}

function walk(node, visit, parent = null) {
  visit(node, parent);
  for (const child of children(node)) walk(child, visit, node);
}

function plainText(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "image") return "";
  return children(node).map(plainText).join(node.type === "paragraph" || node.type === "listItem" ? " " : "");
}

function countWords(value) {
  return (value.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) ?? []).length;
}

function stripPositions(node) {
  delete node.position;
  for (const child of children(node)) stripPositions(child);
  return node;
}

function isBlankText(node) {
  return node.type === "text" && node.value.trim() === "";
}

/** `/journal/<date>/<file>` → issues; the image record when valid. */
function checkImage(src, ctx, field) {
  const report = (message) => ctx.error(field, message);
  if (typeof src !== "string" || !src) return report("image path is empty"), null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//")) {
    return report(`remote image "${src}" is not allowed; download it into public/journal/${ctx.date}/`), null;
  }
  const match = /^\/journal\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(src);
  if (!match || src.includes("..")) {
    return report(`image "${src}" must be /journal/${ctx.date}/<file> (letters, digits, ".", "_" or "-", no query string)`), null;
  }
  if (match[1] !== ctx.date) return report(`image "${src}" must live under /journal/${ctx.date}/`), null;
  const ext = match[2].split(".").pop().toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(ext) || !match[2].includes(".")) {
    return report(`image "${src}" must use one of: ${IMAGE_EXTENSIONS.join(", ")}`), null;
  }
  const file = path.join(ctx.publicDir, "journal", match[1], match[2]);
  if (!existsSync(file) || !statSync(file).isFile()) return report(`image "${src}" not found at public${src}`), null;
  const cached = ctx.images.get(src);
  if (cached) return cached;
  const bytes = readFileSync(file);
  if (bytes.length > LIMITS.imageBytes) {
    return report(`image "${src}" is ${Math.ceil(bytes.length / 1024)} KB; the limit is ${LIMITS.imageBytes / 1024} KB`), null;
  }
  const info = sniffImage(bytes);
  const expected = ext === "jpg" ? "jpeg" : ext;
  if (!info || info.format !== expected) {
    return report(`image "${src}" is not a valid ${expected} file (content does not match the extension)`), null;
  }
  if (!info.width || !info.height) return report(`image "${src}" has no readable dimensions`), null;
  const record = { src, width: info.width, height: info.height, bytes: bytes.length };
  ctx.images.set(src, record);
  return record;
}

function validateMarkdown(tree, ctx, field, lineOffset) {
  const at = (node) => `${field} (line ${(node.position?.start.line ?? 1) + lineOffset})`;
  walk(tree, (node, parent) => {
    switch (node.type) {
      case "html":
        ctx.error(at(node), "raw HTML is not allowed; only the story/context markers may be HTML comments");
        break;
      case "heading":
        if (node.depth !== 4) ctx.error(at(node), `heading level ${node.depth} is not allowed; use #### for subheads`);
        break;
      case "link":
      case "definition":
        if (!isHttpUrl(node.url)) ctx.error(at(node), `link "${node.url}" must be an absolute http(s) URL`);
        else if (trackingParams(node.url).length) {
          ctx.warn(at(node), `link "${node.url}" carries tracking parameters (${trackingParams(node.url).join(", ")})`);
        }
        break;
      case "imageReference":
        ctx.error(at(node), "reference-style images are not allowed; use ![alt](/journal/DATE/file.webp \"credit\")");
        break;
      case "image": {
        if (!node.alt?.trim()) ctx.error(at(node), `image "${node.url}" needs alt text`);
        const alone = parent?.type === "paragraph" && children(parent).filter((c) => !isBlankText(c)).length === 1;
        if (!alone) ctx.error(at(node), `image "${node.url}" must be alone in its own paragraph`);
        checkImage(node.url, ctx, at(node));
        break;
      }
    }
  });
}

function toHast(tree, ctx) {
  const hast = toHastProcessor.runSync(tree);
  walk(hast, (node) => {
    if (node.type !== "element") return;
    if (node.tagName === "p") {
      const content = children(node).filter((c) => !(c.type === "text" && c.value.trim() === ""));
      if (content.length === 1 && content[0].type === "element" && content[0].tagName === "img") {
        const img = content[0];
        const record = ctx.images.get(img.properties.src);
        const credit = img.properties.title;
        delete img.properties.title;
        if (record) Object.assign(img.properties, { width: record.width, height: record.height });
        node.tagName = "figure";
        node.children = [img];
        if (credit) {
          node.children.push({ type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: String(credit) }] });
        }
      }
    }
  });
  return stripPositions(hast);
}

// ---------------------------------------------------------------------------
// one file

function splitFrontmatter(source) {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end < 0) return null;
  return { yaml: lines.slice(1, end).join("\n"), bodyLines: lines.slice(end + 1), bodyStart: end + 2 };
}

function splitStories(bodyLines, bodyStart, ctx) {
  const blocks = [];
  let current = null;
  let fence = null;
  bodyLines.forEach((line, index) => {
    const lineNo = bodyStart + index;
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
    }
    const story = fence ? null : STORY_MARKER.exec(line);
    if (story) {
      current = { id: story[1], line: lineNo, main: [], context: null, mainStart: lineNo + 1, contextStart: 0 };
      blocks.push(current);
      return;
    }
    if (!fence && CONTEXT_MARKER.test(line)) {
      if (!current) ctx.error(`body (line ${lineNo})`, "<!-- context --> must be inside a story");
      else if (current.context) ctx.error(`body (line ${lineNo})`, `story "${current.id}" has more than one <!-- context --> marker`);
      else {
        current.context = [];
        current.contextStart = lineNo + 1;
      }
      return;
    }
    if (!current) {
      if (line.trim()) ctx.error(`body (line ${lineNo})`, "text before the first <!-- story: id --> marker");
      return;
    }
    (current.context ?? current.main).push(line);
  });
  return blocks;
}

function readEdition(file, ctx) {
  const source = readFileSync(file, "utf8");
  const parts = splitFrontmatter(source);
  if (!parts) {
    ctx.error("frontmatter", 'file must start with a YAML block delimited by "---" lines');
    return null;
  }
  let data;
  try {
    data = parseYaml(parts.yaml, { schema: "core", uniqueKeys: true, prettyErrors: false });
  } catch (error) {
    ctx.error("frontmatter", `invalid YAML: ${String(error.message).split("\n")[0]}`);
    return null;
  }
  const parsed = schema.safeParse(data ?? {});
  if (!parsed.success) {
    for (const issue of zodIssues(parsed.error)) ctx.error(issue.field, issue.message);
    return null;
  }
  const fm = parsed.data;
  ctx.date = fm.date;
  if (fm.date !== ctx.fileDate) ctx.error("date", `"${fm.date}" does not match the file name ${ctx.fileDate}.md`);
  if (isWeekend(fm.date)) ctx.warn("date", `${fm.date} is a weekend; editions are expected on weekdays`);

  const ids = new Map();
  fm.stories.forEach((story, index) => {
    if (ids.has(story.id)) ctx.error(`stories[${index}].id`, `duplicate story id "${story.id}" (also stories[${ids.get(story.id)}])`);
    else ids.set(story.id, index);
    if (story.image) checkImage(story.image.src, ctx, `stories[${index}].image.src`);
    story.sources.forEach((src, si) => {
      const tracking = trackingParams(src.url);
      if (tracking.length) ctx.warn(`stories[${index}].sources[${si}].url`, `carries tracking parameters (${tracking.join(", ")})`);
    });
  });
  const seenHighlights = new Set();
  fm.highlights.forEach((id, index) => {
    if (seenHighlights.has(id)) ctx.error(`highlights[${index}]`, `"${id}" is listed twice`);
    seenHighlights.add(id);
    if (!ids.has(id)) ctx.error(`highlights[${index}]`, `"${id}" is not a story id in this edition`);
  });

  const blocks = splitStories(parts.bodyLines, parts.bodyStart, ctx);
  const byId = new Map();
  for (const block of blocks) {
    const where = `body (line ${block.line})`;
    if (!ID_PATTERN.test(block.id)) ctx.error(where, `marker id "${block.id}" must be kebab-case`);
    else if (byId.has(block.id)) ctx.error(where, `story "${block.id}" has more than one body block`);
    else if (!ids.has(block.id)) ctx.error(where, `marker "${block.id}" has no matching entry in stories`);
    else byId.set(block.id, block);
  }
  for (const story of fm.stories) {
    if (!byId.has(story.id)) ctx.error(`stories[${ids.get(story.id)}]`, `story "${story.id}" has no <!-- story: ${story.id} --> body block`);
  }
  const markerOrder = blocks.map((b) => b.id).filter((id) => byId.has(id));
  const storyOrder = fm.stories.map((s) => s.id).filter((id) => byId.has(id));
  if (markerOrder.join() !== storyOrder.join()) {
    ctx.error("body", `story blocks must follow the frontmatter order: ${storyOrder.join(", ")}`);
  }

  const stories = fm.stories.map((story) => {
    const block = byId.get(story.id);
    if (!block) return null;
    const mainText = block.main.join("\n");
    const field = `body.${story.id}`;
    if (!mainText.trim()) ctx.error(`${field} (line ${block.line})`, "story text is empty");
    if (block.context && !block.context.join("\n").trim()) {
      ctx.error(`${field} (line ${block.contextStart - 1})`, "<!-- context --> block is empty");
    }
    const mainTree = parser.parse(mainText);
    validateMarkdown(mainTree, ctx, field, block.mainStart - 1);
    const contextTree = block.context ? parser.parse(block.context.join("\n")) : null;
    if (contextTree) validateMarkdown(contextTree, ctx, `${field}.context`, block.contextStart - 1);
    const words =
      countWords(story.title) + countWords(plainText(mainTree)) + (contextTree ? countWords(plainText(contextTree)) : 0);
    return { story, mainTree, contextTree, words };
  });

  if (ctx.failed()) return null;

  const totalBytes = [...ctx.images.values()].reduce((sum, image) => sum + image.bytes, 0);
  if (totalBytes > LIMITS.editionImageBytes) {
    ctx.error("images", `edition images total ${(totalBytes / 1024 / 1024).toFixed(2)} MB; the limit is 4 MB`);
    return null;
  }

  const rendered = stories.map(({ story, mainTree, contextTree, words }) => ({
    id: story.id,
    section: story.section,
    title: story.title,
    sources: story.sources.map((s) => ({ kind: s.kind, label: s.label ?? SOURCE_KINDS[s.kind], url: s.url })),
    updateOf: story.update_of ?? null,
    update: null,
    image: story.image
      ? {
          src: story.image.src,
          alt: story.image.alt,
          credit: story.image.credit ?? null,
          width: ctx.images.get(story.image.src).width,
          height: ctx.images.get(story.image.src).height,
        }
      : null,
    body: toHast(mainTree, ctx),
    context: contextTree ? toHast(contextTree, ctx) : null,
    words,
    readingMinutes: Math.max(1, Math.round(words / LIMITS.wordsPerMinute)),
  }));
  const words = rendered.reduce((sum, s) => sum + s.words, 0);
  return {
    file: ctx.file,
    date: fm.date,
    edition: fm.edition,
    title: fm.title,
    description: fm.description,
    highlights: fm.highlights,
    sources: fm.sources,
    stories: rendered,
    words,
    readingMinutes: Math.max(1, Math.round(words / LIMITS.wordsPerMinute)),
    images: [...ctx.images.keys()],
  };
}

// ---------------------------------------------------------------------------
// the whole journal

/**
 * Loads and validates every edition under `<root>/data/journal`.
 * Returns `{ editions, issues }`; editions are sorted by date (oldest first)
 * and are only complete when no issue has level "error".
 */
export function loadJournal({ root }) {
  const contentDir = path.join(root, "data", "journal");
  const publicDir = path.join(root, "public");
  const issues = [];
  const editions = [];
  const rel = (file) => path.relative(root, file).split(path.sep).join("/");

  const entries = existsSync(contentDir) ? readdirSync(contentDir, { withFileTypes: true }) : [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(contentDir, entry.name);
    const match = FILE_PATTERN.exec(entry.name);
    if (!entry.isFile() || !match || !isValidDate(match[1])) {
      issues.push({ level: "error", file: rel(file), field: "", message: "only files named YYYY-MM-DD.md (a real date) belong in data/journal" });
      continue;
    }
    let errors = 0;
    const ctx = {
      file: rel(file),
      fileDate: match[1],
      date: match[1],
      publicDir,
      images: new Map(),
      error(field, message) {
        errors += 1;
        issues.push({ level: "error", file: rel(file), field, message });
      },
      warn(field, message) {
        issues.push({ level: "warning", file: rel(file), field, message });
      },
      failed: () => errors > 0,
    };
    const edition = readEdition(file, ctx);
    if (edition) editions.push(edition);
  }

  editions.sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(editions.map((e) => [e.date, e]));
  const byNumber = new Map();
  editions.forEach((edition, index) => {
    const error = (field, message) => issues.push({ level: "error", file: edition.file, field, message });
    if (byNumber.has(edition.edition)) {
      error("edition", `number ${edition.edition} is already used by ${byNumber.get(edition.edition).file}`);
    } else byNumber.set(edition.edition, edition);
    const previous = editions[index - 1];
    if (previous && edition.edition <= previous.edition && previous.edition !== edition.edition) {
      error("edition", `number ${edition.edition} must be greater than ${previous.edition} (${previous.file}, an earlier date)`);
    }
    edition.stories.forEach((story, si) => {
      if (!story.updateOf) return;
      const field = `stories[${si}].update_of`;
      const target = byDate.get(story.updateOf);
      const days = dayNumber(edition.date) - dayNumber(story.updateOf);
      if (days <= 0) return error(field, `${story.updateOf} must be earlier than the edition date ${edition.date}`);
      if (!target) return error(field, `no edition exists for ${story.updateOf}`);
      if (days > LIMITS.updateMaxDays) return error(field, `${story.updateOf} is ${days} days old; updates may point back at most ${LIMITS.updateMaxDays} days`);
      if (days > LIMITS.updateWarnDays) {
        issues.push({ level: "warning", file: edition.file, field, message: `${story.updateOf} is ${days} days old (more than ${LIMITS.updateWarnDays})` });
      }
      const sameStory = target.stories.some((s) => s.id === story.id);
      story.update = {
        date: target.date,
        edition: target.edition,
        href: `/journal/${target.date}${sameStory ? `#${story.id}` : ""}`,
      };
    });
  });

  // Stray image folders and files are harmless but usually a bot mistake.
  const imageRoot = path.join(publicDir, "journal");
  if (existsSync(imageRoot)) {
    for (const dir of readdirSync(imageRoot, { withFileTypes: true })) {
      const location = rel(path.join(imageRoot, dir.name));
      const edition = byDate.get(dir.name);
      if (!dir.isDirectory() || !isValidDate(dir.name)) {
        issues.push({ level: "warning", file: location, field: "", message: "unexpected entry; images belong in public/journal/YYYY-MM-DD/" });
        continue;
      }
      if (!edition) {
        if (!issues.some((i) => i.level === "error" && i.file.endsWith(`${dir.name}.md`))) {
          issues.push({ level: "warning", file: location, field: "", message: "image folder without a matching edition" });
        }
        continue;
      }
      for (const name of readdirSync(path.join(imageRoot, dir.name))) {
        if (!edition.images.includes(`/journal/${dir.name}/${name}`)) {
          issues.push({ level: "warning", file: `${location}/${name}`, field: "", message: "image is not referenced by the edition" });
        }
      }
    }
  }

  return { editions, issues };
}

export function formatIssue(issue) {
  const where = issue.field ? `${issue.file}: ${issue.field}` : issue.file;
  return `${issue.level === "error" ? "error" : "warning"} ${where}: ${issue.message}`;
}
