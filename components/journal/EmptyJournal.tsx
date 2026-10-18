import { Nameplate, Rule } from "./Masthead";

export default function EmptyJournal() {
  return (
    <div className="jr-shell jr-empty">
      <header className="jr-masthead jr-masthead--cover">
        <div className="jr-flag">
          <Nameplate as="h1" />
        </div>
        <Rule />
      </header>
      <p className="jr-dek__text">Primeira edição em breve.</p>
    </div>
  );
}
