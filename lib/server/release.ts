export interface ReleaseMetadata {
  version: string;
  revision: string;
  build_id: string;
}

/** Only immutable public build identifiers; never return arbitrary environment values. */
export function readReleaseMetadata(
  environment: Record<string, string | undefined> = process.env,
): ReleaseMetadata | null {
  const version = environment.APP_VERSION;
  const revision = environment.APP_REVISION;
  const buildId = environment.APP_BUILD_ID;
  if (!version || version.length > 32 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) ||
      !revision || !/^[0-9a-f]{40}$/.test(revision) ||
      !buildId || !/^[0-9]{1,32}$/.test(buildId)) return null;
  return { version, revision, build_id: buildId };
}
