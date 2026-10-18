import { Nameplate, Rule } from "./Masthead";

export default function EmptyJournal({ variant = "cover" }: { variant?: "cover" | "archive" }) {
  const isArchive = variant === "archive";
  return (
    <div className="jr-shell jr-empty">
      <header className="jr-masthead jr-masthead--archive">
        <div className="jr-strip jr-enter jr-enter--1" aria-hidden />
        <div className="jr-flag">
          <Nameplate as={isArchive ? "p" : "h1"} link={isArchive} />
        </div>
        <Rule />
      </header>
      <div className="jr-page">
        {isArchive ? (
          <div className="jr-archive__intro jr-enter jr-enter--4">
            <h1 className="jr-archive__title">Arquivo</h1>
            <p className="jr-archive__lede">Nenhuma edição publicada ainda.</p>
          </div>
        ) : (
          <div className="jr-empty__intro jr-enter jr-enter--4">
            <p className="jr-label">Edição nº 1 · Em breve</p>
            <p className="jr-empty__message">Primeira edição em breve.</p>
          </div>
        )}
      </div>
    </div>
  );
}
