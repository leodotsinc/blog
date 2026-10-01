#!/usr/bin/env bash
set -euo pipefail

# Rebuild the reviewed @contentlayer2/utils 0.5.8 fork from the npm release.
# This script downloads only the public upstream tarball, builds in a temporary
# directory, checks types, and compares the result with the vendored archive.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

test -x "$repo_root/node_modules/.bin/tsc"
npm pack '@contentlayer2/utils@0.5.8' --silent --pack-destination "$work_dir" >/dev/null
upstream="$work_dir/contentlayer2-utils-0.5.8.tgz"
expected_upstream='KCC4qp5oCASW2jtUn8o4PLaaF/w0r9675gKnBCpbcpalZzFpZrqeH25VrHOTTMZZp7EeKqoKpiz2/WWq8i66MA=='
actual_upstream="$(openssl dgst -sha512 -binary "$upstream" | openssl base64 -A)"
test "$actual_upstream" = "$expected_upstream"

tar -xzf "$upstream" -C "$work_dir"
patch -d "$work_dir/package" -p1 --batch < "$repo_root/vendor/contentlayer2-utils.patch"
# A deleted TypeScript file can remain empty after patch(1); remove its old JS
# and declarations too, so neither compilation nor packaging retains OTel 1.
rm -f "$work_dir/package/src/tracing-effect/otel-exporter-trace-otlp-grpc.ts"
rm -f "$work_dir/package/dist/tracing-effect/otel-exporter-trace-otlp-grpc."*
ln -s "$repo_root/node_modules" "$work_dir/package/node_modules"
"$repo_root/node_modules/.bin/tsc" -p "$work_dir/package/tsconfig.fork.json" --pretty false
"$repo_root/node_modules/.bin/tsc" -p "$work_dir/package/tsconfig.fork.json" --noEmit --pretty false

npm pack "$work_dir/package" --silent --pack-destination "$work_dir" >/dev/null
built="$work_dir/contentlayer2-utils-0.5.8.tgz"
expected_sha256='6baccf940016626fc9202694e85437f25c89f526e6adbed10c22498a9cbe4cca'
actual_sha256="$(shasum -a 256 "$built" | cut -d ' ' -f 1)"
test "$actual_sha256" = "$expected_sha256"
cmp "$built" "$repo_root/vendor/contentlayer2-utils-0.5.8.tgz"
echo "Contentlayer fork verified: $actual_sha256"
