import { journalOg } from "@/app/journal/_og/render";

export const dynamic = "force-static";

export function GET() {
  return journalOg({
    strip: ["Todo dia útil", "Brasil · Mundo · Economia · Tecnologia", "leodots.com"],
    footer: "O essencial das newsletters do dia, em uma edição para ler com calma.",
  });
}
