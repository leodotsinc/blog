import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function cleanGitEnv() {
  const cleanEnv = { ...process.env };
  const { stdout: localVars } = await exec("git", ["rev-parse", "--local-env-vars"]);
  for (const name of localVars.trim().split("\n")) {
    delete cleanEnv[name];
  }
  return cleanEnv;
}

test("hooks isolate Git checks from inherited repository settings", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "blog-git-hooks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cleanEnv = await cleanGitEnv();
  const git = (args) => exec("git", args, { cwd: root, env: cleanEnv });
  await git(["init", "--quiet"]);
  await git(["config", "--local", "user.email", "test@users.noreply.github.com"]);
  const configPath = join(root, ".git/config");
  const originalConfig = readFileSync(configPath, "utf8");
  mkdirSync(join(root, ".githooks"));
  mkdirSync(join(root, "scripts"));
  writeFileSync(join(root, "scripts/check-all.sh"), `#!/bin/sh
set -eu
mkdir nested
git -C nested init --quiet
git -C nested config --local hooks.regression isolated
`, { mode: 0o755 });

  for (const hook of ["pre-push", "pre-commit"]) {
    const hookPath = join(root, ".githooks", hook);
    copyFileSync(new URL(`../.githooks/${hook}`, import.meta.url), hookPath);
    await exec("sh", [hookPath], {
      cwd: root,
      env: {
        ...cleanEnv,
        GIT_DIR: join(root, ".git"),
        GIT_WORK_TREE: root,
        GIT_INDEX_FILE: join(root, ".git/index"),
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "user.email",
        GIT_CONFIG_VALUE_0: "invalid@localhost",
      },
    });
    assert.equal(readFileSync(configPath, "utf8"), originalConfig, `${hook} changed the parent repository config`);
  }
  const { stdout } = await git(["-C", "nested", "config", "--local", "--get", "hooks.regression"]);
  assert.equal(stdout.trim(), "isolated");
});

test("pre-commit accepts only GitHub noreply username forms", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "blog-git-identity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const options = { cwd: root, env: await cleanGitEnv() };
  await exec("git", ["init", "--quiet"], options);
  const hookPath = join(root, "pre-commit");
  copyFileSync(new URL("../.githooks/pre-commit", import.meta.url), hookPath);
  const cases = [
    ...["test", "a", "7", "User-123", "a--b", "22529012+leodots", "0+a", "123+7"]
      .map((local) => [`${local}@users.noreply.github.com`, true]),
    ...["", "+", "-", "+test", "123+", "abc+test", "123+test+other", "-test", "test-",
      "123+-test", "123+test-", "first.last", "first_last", "123+first.last", "123+first_last",
      "test name", "téšt", "test\nother"]
      .map((local) => [`${local}@users.noreply.github.com`, false]),
    ["", false],
    ["test@example.com", false],
    ["test@users.noreply.github.com.evil", false],
  ];

  for (const [email, accepted] of cases) {
    await t.test(`${accepted ? "accepts" : "rejects"} ${JSON.stringify(email)}`, async () => {
      await exec("git", ["config", "--local", "user.email", email], options);
      const runHook = () => exec("sh", [hookPath], options);
      if (accepted) {
        await runHook();
      } else {
        await assert.rejects(runHook, (error) => {
          assert.equal(error.code, 1);
          assert.match(error.stderr, /Commit blocked/);
          return true;
        });
      }
    });
  }
});
