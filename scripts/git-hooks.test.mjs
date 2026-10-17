import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);

test("hooks isolate Git checks from inherited repository settings", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "blog-git-hooks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cleanEnv = { ...process.env };
  const { stdout: localVars } = await exec("git", ["rev-parse", "--local-env-vars"]);
  for (const name of localVars.trim().split("\n")) {
    delete cleanEnv[name];
  }
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
