import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export function GET() {
  return new Response(readFileSync(join(process.cwd(), "lib/journal/service-worker.js"), "utf8"), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/journal",
    },
  });
}
