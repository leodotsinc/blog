#!/usr/bin/env node
// Validates Leo's Journal editions (data/journal/*.md + public/journal/**).
// Runs before `next build`, so a malformed edition fails the image build.
// Usage: node scripts/journal-validate.mjs [--root <dir>] [--quiet]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatIssue, loadJournal } from "../lib/journal/core.mjs";

const args = process.argv.slice(2);
const rootFlag = args.indexOf("--root");
const root = rootFlag >= 0 ? path.resolve(args[rootFlag + 1] ?? ".") : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quiet = args.includes("--quiet");

const { editions, issues } = loadJournal({ root });
const errors = issues.filter((issue) => issue.level === "error");
for (const issue of issues) {
  if (issue.level === "error") console.error(formatIssue(issue));
  else if (!quiet) console.warn(formatIssue(issue));
}

if (errors.length) {
  console.error(`journal: ${errors.length} error(s); fix the edition files above before building.`);
  process.exit(1);
}
const last = editions.at(-1);
console.log(
  `journal: ${editions.length} edition(s) valid` +
    (last ? `, latest nº ${last.edition} (${last.date}, ${last.stories.length} stories)` : "") +
    (issues.length ? `, ${issues.length} warning(s)` : ""),
);
