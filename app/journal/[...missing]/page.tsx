import { notFound } from "next/navigation";

// Unknown journal descendants must also stay inside the journal's 404/layout.
export default function MissingJournalPage() {
  notFound();
}
