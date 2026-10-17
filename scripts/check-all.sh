#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

yarn lint
yarn test:lab

if [ -f tsconfig.json ]; then
  yarn typecheck
fi

if [ "${FULL:-0}" = 1 ]; then
  yarn build
fi
