import { journalManifest } from "@/lib/journal/pwa.mjs";

export const dynamic = "force-static";

export function GET() {
  return Response.json(journalManifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
