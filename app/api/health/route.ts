export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Readiness of this stateless web process, without contacting Spotify or another provider. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
