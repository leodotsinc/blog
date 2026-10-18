import { Nameplate, Rule } from "@/components/journal/Masthead";

export default function JournalNotFound() {
  return (
    <div className="jr-shell jr-empty">
      <header className="jr-masthead jr-masthead--archive">
        <div className="jr-flag"><Nameplate link /></div>
        <Rule />
      </header>
      <div className="jr-empty__intro">
        <h1>Edição não encontrada</h1>
        <p>Volte à capa ou consulte o arquivo do Journal.</p>
      </div>
    </div>
  );
}
