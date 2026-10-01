# Contentlayer2 utils fork for the Blog

The Blog keeps `contentlayer2` and `next-contentlayer2` at 0.5.8. Only their
transitive `@contentlayer2/utils` package is locally forked. Its original
source is the official `@contentlayer2/utils@0.5.8` npm tarball:

- Upstream repository: https://github.com/timlrx/contentlayer2 , release commit
  `02f7ea407d1aee79bef0f45f32b8a5839641a6d3`.
- Upstream tarball: https://registry.npmjs.org/@contentlayer2/utils/-/utils-0.5.8.tgz
- Upstream SRI: `sha512-KCC4qp5oCASW2jtUn8o4PLaaF/w0r9675gKnBCpbcpalZzFpZrqeH25VrHOTTMZZp7EeKqoKpiz2/WWq8i66MA==`.
- License: MIT, copyright notice retained in the generated package. See
  `LICENSE` inside the archive. No registry publication of this fork is needed.

`contentlayer2-utils.patch` is the reviewable **source** delta. It removes the
obsolete OpenTelemetry 1 SDK/exporter dependencies and implements typed, neutral
Effect tracing operations. Document generation retains the Effect and Stream
values; Contentlayer build spans are no longer exported. The app does not use
Contentlayer tracing and does not set `CL_OTEL`. A small `FsStat` type describes
the fields used by both Node and memfs because current Node types expose newer
timestamp accessors that memfs does not implement.

`contentlayer2-utils-0.5.8.tgz` is the installable result, SHA-256
`6baccf940016626fc9202694e85437f25c89f526e6adbed10c22498a9cbe4cca`.
The committed Yarn resolution points only `@contentlayer2/utils` to this local
archive. `scripts/rebuild-contentlayer-fork.sh` downloads the pinned upstream
release, verifies its SRI, applies the patch, removes the retired exporter,
compiles and typechecks the package with its own TypeScript configuration, then
compares the rebuilt archive byte-for-byte with the vendored archive. The Blog
CI source job runs this verification after its frozen install. Its usual
TypeScript, tests, build and image scan gates remain active.

To update the fork, first review the new upstream source/advisories, create a
new source patch and tarball, update both expected hashes in the verification
script and this record, then run the script, `yarn install --frozen-lockfile`,
the Blog tests/build, and both builder and runtime image scans. Review the
generated six MDX documents and dynamic routes for parity. Do not treat a green
PR CI as authorization for the separate reviewed-bootstrap adoption or deploy.
