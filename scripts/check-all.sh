#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

yarn lint
node --test scripts/git-hooks.test.mjs
yarn test:lab

yarn typecheck

if [ "${FULL:-0}" = 1 ]; then
  yarn build
  node --test scripts/legal-pages-built.test.mjs
fi
