import type { Metadata } from "next";
import V2Landing from "@/components/v2/V2Landing";

export const metadata: Metadata = {
  title: "AI Assistente — Atendimento inteligente com toque humano",
  description:
    "Transforme sua base de conhecimento em atendimento, capture leads, agende horários e transfira conversas para sua equipe no momento certo.",
};

export default function V2Page() {
  return <V2Landing />;
}
