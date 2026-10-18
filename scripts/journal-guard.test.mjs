import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const guard = fileURLToPath(new URL("./journal-guard.sh", import.meta.url));

async function repository(t) {
  const root = mkdtempSync(path.join(tmpdir(), "blog-journal-guard-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env };
  const { stdout: localVars } = await exec("git", ["rev-parse", "--local-env-vars"]);
  for (const name of localVars.trim().split("\n")) delete env[name];
  const options = { cwd: root, env };
  const git = (args) => exec("git", args, options);
  await git(["init", "--quiet"]);
  await git(["config", "--local", "user.name", "Journal guard tests"]);
  await git(["config", "--local", "user.email", "test@users.noreply.github.com"]);
  const write = (relative, contents = "fixture\n") => {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents);
  };
  const commit = async () => {
    await git(["add", "--all"]);
    await git(["commit", "--quiet", "-m", "test: fixture"]);
    return (await git(["rev-parse", "HEAD"])).stdout.trim();
  };
  write("README.md");
  write("data/journal/2026-10-14.md");
  const old = await commit();
  return {
    root, git, write, commit, old,
    run: (...args) => exec("sh", [guard, ...args], options),
    runAt: (directory, ...args) => exec("sh", [guard, ...args], { ...options, cwd: path.join(root, directory) }),
  };
}

async function rejected(run, reason) {
  await assert.rejects(run, (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, reason);
    return true;
  });
}

test("guard permits journal-only commits across both allowed trees", async (t) => {
  const r = await repository(t);
  r.write("data/journal/2026-10-15.md");
  await r.commit();
  r.write("public/journal/2026-10-15/photo.webp");
  const next = await r.commit();
  await r.run(r.old, next);
});

test("guard rejects a mixed commit and names its forbidden path", async (t) => {
  const r = await repository(t);
  r.write("data/journal/2026-10-15.md");
  r.write("package.json", "{}\n");
  const next = await r.commit();
  await rejected(() => r.run(r.old, next), /forbidden path .*: package\.json/);
});

test("guard rejects a non-journal file and similar directory prefixes", async (t) => {
  const r = await repository(t);
  r.write("data/journal-backup/story.md");
  r.write("public/journal-other/photo.webp");
  const next = await r.commit();
  await rejected(() => r.run(r.old, next), /data\/journal-backup\/story\.md/);
  await rejected(() => r.run(r.old, next), /public\/journal-other\/photo\.webp/);
});

test("guard rejects non-fast-forward histories", async (t) => {
  const r = await repository(t);
  r.write("data/journal/2026-10-15.md");
  const left = await r.commit();
  await r.git(["checkout", "--quiet", "--detach", r.old]);
  r.write("data/journal/2026-10-16.md");
  const right = await r.commit();
  await rejected(() => r.run(left, right), /not a fast-forward/);
  await rejected(() => r.run(left, r.old), /not a fast-forward/);
});

test("guard rejects deletion outside the journal", async (t) => {
  const r = await repository(t);
  rmSync(path.join(r.root, "README.md"));
  const next = await r.commit();
  await rejected(() => r.run(r.old, next), /forbidden path .*: README\.md/);
});

test("guard checks the whole tree from a subdirectory with relative diffs configured", async (t) => {
  const r = await repository(t);
  await r.git(["config", "--local", "diff.relative", "true"]);
  r.write("README.md", "Forbidden edit outside the current directory.\n");
  const next = await r.commit();
  await rejected(() => r.runAt("data/journal", r.old, next), /forbidden path .*: README\.md/);
});

test("guard rejects forbidden changes even when later reverted", async (t) => {
  const r = await repository(t);
  r.write("temporary.txt");
  await r.commit();
  rmSync(path.join(r.root, "temporary.txt"));
  const next = await r.commit();
  await rejected(() => r.run(r.old, next), /forbidden path .*: temporary\.txt/);
});

for (const direction of ["into", "out of"]) {
  test(`guard checks both sides of renames ${direction} the journal`, async (t) => {
    const r = await repository(t);
    const [from, to] = direction === "into"
      ? ["README.md", "data/journal/moved.md"]
      : ["data/journal/2026-10-14.md", "moved.md"];
    renameSync(path.join(r.root, from), path.join(r.root, to));
    const next = await r.commit();
    await rejected(() => r.run(r.old, next), direction === "into" ? /README\.md/ : /: moved\.md/);
  });
}

test("guard permits journal renames, deletions, and quoted filenames", async (t) => {
  const r = await repository(t);
  renameSync(path.join(r.root, "data/journal/2026-10-14.md"), path.join(r.root, "data/journal/renamed.md"));
  r.write('public/journal/2026-10-15/space quote" tab\t newline\n café.webp');
  const middle = await r.commit();
  await r.run(r.old, middle);
  rmSync(path.join(r.root, "data/journal/renamed.md"));
  const next = await r.commit();
  await r.run(r.old, next);
});

test("guard cannot be fooled by a newline followed by an allowed prefix", async (t) => {
  const r = await repository(t);
  r.write("outside\ndata/journal/trick.md");
  const next = await r.commit();
  await rejected(() => r.run(r.old, next), /forbidden path .*outside\\ndata\/journal\/trick\.md/);
});

test("guard checks commits from merged branches even if their changes are reverted", async (t) => {
  const r = await repository(t);
  await r.git(["checkout", "--quiet", "-b", "side"]);
  r.write("forbidden.txt");
  await r.commit();
  rmSync(path.join(r.root, "forbidden.txt"));
  const side = await r.commit();
  await r.git(["checkout", "--quiet", "-b", "daily", r.old]);
  r.write("data/journal/2026-10-15.md");
  await r.commit();
  await r.git(["merge", "--quiet", "--no-ff", "-m", "test: merge", side]);
  const next = (await r.git(["rev-parse", "HEAD"])).stdout.trim();
  await rejected(() => r.run(r.old, next), /forbidden path .*: forbidden\.txt/);
});

test("guard checks merge resolution changes themselves", async (t) => {
  const r = await repository(t);
  await r.git(["checkout", "--quiet", "-b", "side"]);
  r.write("data/journal/2026-10-15.md");
  const side = await r.commit();
  await r.git(["checkout", "--quiet", "-b", "daily", r.old]);
  r.write("data/journal/2026-10-16.md");
  await r.commit();
  await r.git(["merge", "--quiet", "--no-ff", "--no-commit", side]);
  r.write("README.md", "Forbidden merge resolution.\n");
  const next = await r.commit();
  await rejected(() => r.run(r.old, next), /forbidden path .*: README\.md/);
});

test("guard permits an unchanged range", async (t) => {
  const r = await repository(t);
  await r.run(r.old, r.old);
});

test("guard rejects bad arguments, unknown SHAs, and non-commit objects", async (t) => {
  const r = await repository(t);
  for (const args of [[], [r.old], [r.old, r.old, "extra"]]) {
    await rejected(() => r.run(...args), /usage:/);
  }
  const tree = (await r.git(["rev-parse", "HEAD^{tree}"])).stdout.trim();
  for (const invalid of ["", "not-a-sha", "0".repeat(40), "--help", tree]) {
    await rejected(() => r.run(invalid, r.old), /unknown commit/);
    await rejected(() => r.run(r.old, invalid), /unknown commit/);
  }
});
