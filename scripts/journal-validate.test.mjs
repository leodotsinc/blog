import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { closeSync, copyFileSync, cpSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { LIMITS, loadJournal } from "../lib/journal/core.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(repo, "scripts/journal-validate.mjs");
const date = "2026-10-14";
const filename = `data/journal/${date}.md`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII=", "base64");

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "blog-journal-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, relative, contents) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function edition(day = date, number = 1) {
  return {
    title: "Test edition",
    date: day,
    edition: number,
    description: "Fixture for the journal contract.",
    highlights: ["first-story"],
    sources: [{ name: "the news", url: "https://example.com/news" }],
    stories: [{
      id: "first-story",
      section: "brasil",
      title: "First story",
      sources: [{ kind: "the-news", url: "https://example.com/story" }],
    }],
  };
}

const body = "<!-- story: first-story -->\n\nA report with a [source](https://example.com/report).\n";
const markdown = (data, text = body) => `---\n${stringify(data)}---\n\n${text}`;
async function runCli(root, ...args) {
  // File-backed stdio also works in sandboxes that lose child Node pipe output.
  const capture = mkdtempSync(path.join(tmpdir(), "blog-journal-cli-"));
  const descriptors = [];
  try {
    const stdoutPath = path.join(capture, "stdout");
    const stderrPath = path.join(capture, "stderr");
    descriptors.push(openSync(stdoutPath, "w"), openSync(stderrPath, "w"));
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, "--root", root, ...args], {
        stdio: ["ignore", ...descriptors],
      });
      child.on("error", reject);
      child.on("close", resolve);
    });
    const result = { code, stdout: readFileSync(stdoutPath, "utf8"), stderr: readFileSync(stderrPath, "utf8") };
    if (code !== 0) throw Object.assign(new Error(result.stderr), result);
    return result;
  } finally {
    for (const fd of descriptors) closeSync(fd);
    rmSync(capture, { recursive: true, force: true });
  }
}

test("the real repository passes loadJournal and the CLI", async () => {
  const result = loadJournal({ root: repo });
  assert.ok(result.editions.length >= 3);
  assert.deepEqual(result.issues.filter((issue) => issue.level === "error"), []);
  const { stdout } = await runCli(repo);
  assert.match(stdout, /journal: \d+ edition\(s\) valid/);
});

test("a minimal temporary edition passes", async (t) => {
  const root = fixture(t);
  write(root, filename, markdown(edition()));
  assert.deepEqual(loadJournal({ root }).issues, []);
  const { stdout, stderr } = await runCli(root);
  assert.match(stdout, /journal: 1 edition\(s\) valid/);
  assert.equal(stderr, "");
});

const failures = [
  { name: "filename/date mismatch", field: "date", message: /does not match the file name/,
    change: (data) => { data.date = "2026-10-15"; } },
  { name: "duplicate edition number", file: "data/journal/2026-10-15.md", field: "edition", message: /already used/,
    setup: (root) => write(root, "data/journal/2026-10-15.md", markdown(edition("2026-10-15", 1))) },
  { name: "non-increasing edition", file: "data/journal/2026-10-15.md", field: "edition", message: /must be greater than/,
    change: (data) => { data.edition = 3; },
    setup: (root) => write(root, "data/journal/2026-10-15.md", markdown(edition("2026-10-15", 2))) },
  { name: "unknown highlight id", field: "highlights[0]", message: /not a story id/,
    change: (data) => { data.highlights = ["unknown-story"]; } },
  { name: "missing story body marker", field: "stories[0]", message: /has no <!-- story:/, text: "" },
  { name: "orphan marker", field: "body (line ", message: /has no matching entry/,
    text: `${body}\n<!-- story: orphan -->\n\nOrphan report.\n` },
  { name: "forbidden level-two heading", field: "body.first-story (line ", message: /heading level 2 is not allowed/,
    text: `${body}\n## Forbidden heading\n` },
  { name: "raw HTML", field: "body.first-story (line ", message: /raw HTML is not allowed/,
    text: `${body}\n<div>Forbidden HTML</div>\n` },
  { name: "remote image URL", field: "body.first-story (line ", message: /remote image .* is not allowed/,
    text: `${body}\n![Remote image](https://example.com/image.png)\n` },
  { name: "missing image file", field: "stories[0].image.src", message: /not found at public/,
    change: (data) => { data.stories[0].image = { src: `/journal/${date}/missing.png`, alt: "Missing image" }; } },
  { name: "oversize image", field: "stories[0].image.src", message: /the limit is 400 KB/,
    change: (data) => { data.stories[0].image = { src: `/journal/${date}/large.png`, alt: "Large image" }; },
    setup: (root) => write(root, `public/journal/${date}/large.png`, Buffer.concat([png, Buffer.alloc(LIMITS.imageBytes + 1 - png.length)])) },
  { name: "update_of missing edition", field: "stories[0].update_of", message: /no edition exists for/,
    change: (data) => { data.stories[0].update_of = "2026-10-13"; } },
  { name: "malformed YAML", field: "frontmatter", message: /invalid YAML/,
    raw: "---\ntitle: [unterminated\n---\n" },
  { name: "unknown frontmatter field", field: "frontmatter", message: /unknown field\(s\): surprise/,
    change: (data) => { data.surprise = true; } },
];

for (const entry of failures) {
  test(`rejects ${entry.name} with file and field, and CLI exit 1`, async (t) => {
    const root = fixture(t);
    const data = edition();
    entry.change?.(data);
    write(root, filename, entry.raw ?? markdown(data, entry.text ?? body));
    entry.setup?.(root);
    const expectedFile = entry.file ?? filename;
    const errors = loadJournal({ root }).issues.filter((issue) => issue.level === "error");
    assert.ok(errors.some((issue) => issue.file === expectedFile && issue.field.startsWith(entry.field) && entry.message.test(issue.message)),
      JSON.stringify(errors));
    await assert.rejects(() => runCli(root), (error) => {
      assert.equal(error.code, 1);
      const diagnostic = error.stderr.split("\n").find((line) =>
        line.startsWith(`error ${expectedFile}: ${entry.field}`) && entry.message.test(line));
      assert.ok(diagnostic, error.stderr);
      assert.match(error.stderr, /journal: \d+ error\(s\); fix the edition files above before building\./);
      return true;
    });
  });
}

test("the documented two-story example validates with its stated prerequisites", async (t) => {
  const root = fixture(t);
  cpSync(path.join(repo, "data/journal"), path.join(root, "data/journal"), { recursive: true });
  cpSync(path.join(repo, "public/journal"), path.join(root, "public/journal"), { recursive: true });
  const doc = readFileSync(path.join(repo, "docs/journal-format.md"), "utf8");
  const example = /```markdown\n([\s\S]*?)\n```/.exec(doc)?.[1];
  assert.ok(example, "documentation must contain a complete Markdown edition");
  write(root, "data/journal/2026-10-19.md", example);
  mkdirSync(path.join(root, "public/journal/2026-10-19"), { recursive: true });
  copyFileSync(path.join(root, "public/journal/2026-10-16/chip.webp"), path.join(root, "public/journal/2026-10-19/chip.webp"));
  const result = loadJournal({ root });
  assert.deepEqual(result.issues, []);
  const added = result.editions.find((item) => item.date === "2026-10-19");
  assert.equal(added.stories.length, 2);
  assert.ok(added.stories[0].context);
  assert.equal(added.stories[0].update.href, "/journal/2026-10-16#vila-esperanca-chuvas");
  assert.deepEqual(added.images, ["/journal/2026-10-19/chip.webp"]);
  await runCli(root);
});

for (const [days, level] of [[7, null], [8, "warning"], [30, "warning"], [31, "error"]]) {
  test(`update_of ${days}-day boundary ${level ?? "passes without warning"}`, async (t) => {
    const root = fixture(t);
    const earlier = new Date(Date.UTC(2026, 9, 14) - days * 86_400_000).toISOString().slice(0, 10);
    write(root, `data/journal/${earlier}.md`, markdown(edition(earlier)));
    const data = edition(date, 2);
    data.stories[0].update_of = earlier;
    write(root, filename, markdown(data));
    const issues = loadJournal({ root }).issues.filter((issue) => issue.field === "stories[0].update_of");
    assert.deepEqual(issues.map((issue) => issue.level), level ? [level] : []);
    if (level !== "error") {
      const { stdout } = await runCli(root);
      assert.match(stdout, /edition\(s\) valid/);
    }
  });
}
