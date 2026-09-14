import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const source = readFileSync(new URL("../lib/server/release.ts", import.meta.url), "utf8");
const { readReleaseMetadata } = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
const good = { APP_VERSION: "0.1.0", APP_REVISION: "a".repeat(40), APP_BUILD_ID: "123456" };
test("metadata exposes only immutable allowlisted fields", () => {
  assert.deepEqual(readReleaseMetadata({ ...good, SPOTIFY_CLIENT_SECRET: "private" }),
    { version: "0.1.0", revision: "a".repeat(40), build_id: "123456" });
});
test("missing or malformed values fail closed", () => {
  for (const key of Object.keys(good)) {
    assert.equal(readReleaseMetadata({ ...good, [key]: undefined }), null);
    assert.equal(readReleaseMetadata({ ...good, [key]: "bad\nvalue" }), null);
  }
  for (const value of ["latest", "v1.0.0", "1.0", "01.0.0", "1.0.0-beta.1", "1.0.0+build"])
    assert.equal(readReleaseMetadata({ ...good, APP_VERSION: value }), null);
  assert.equal(readReleaseMetadata({ ...good, APP_REVISION: "A".repeat(40) }), null);
  assert.equal(readReleaseMetadata({ ...good, APP_BUILD_ID: "not-a-run" }), null);
});
