import { readReleaseMetadata } from "@/lib/server/release";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public release identifiers; this endpoint has no access credentials or account data. */
export function GET() {
  const release = readReleaseMetadata();
  return Response.json(release ?? { error: "Release metadata unavailable" }, {
    status: release ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
