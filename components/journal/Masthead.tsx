import { JournalLink } from "@/components/journal/JournalTransitions";
import { capitalize, longDate, plural, shortDate, type JournalEdition } from "@/lib/journal";

type Neighbour = Pick<JournalEdition, "date" | "edition"> | undefined;

function Ear({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return <div className={`jr-ear jr-ear--${side}`}>{children}</div>;
}

function NeighbourEar({ side, edition }: { side: "left" | "right"; edition: Neighbour }) {
  const older = side === "left";
  if (!edition) {
    return (
      <Ear side={side}>
        <span className="jr-ear__kicker">{older ? "Primeira edição" : "Edição mais recente"}</span>
        <span className="jr-ear__text">{older ? "O começo do arquivo" : "Volte amanhã cedo"}</span>
      </Ear>
    );
  }
  return (
    <Ear side={side}>
      <JournalLink href={`/journal/${edition.date}`} className="jr-ear__link" rel={older ? "prev" : "next"}>
        <span className="jr-ear__kicker">
          {older ? <span aria-hidden>← </span> : null}
          {older ? "Edição anterior" : "Próxima edição"}
          {older ? null : <span aria-hidden> →</span>}
        </span>
        <span className="jr-ear__text">
          Nº {edition.edition} · {shortDate(edition.date)}
        </span>
      </JournalLink>
    </Ear>
  );
}

export function Nameplate({ as: Tag = "p", link }: { as?: "h1" | "p" | "span"; link?: boolean }) {
  return (
    <Tag className="jr-nameplate jr-enter jr-enter--2">
      {link ? (
        <JournalLink href="/journal" className="jr-nameplate__link">
          Leo’s Journal
        </JournalLink>
      ) : (
        "Leo’s Journal"
      )}
    </Tag>
  );
}

export function Rule() {
  return <div className="jr-rule jr-enter jr-enter--3" aria-hidden />;
}

export default function Masthead({
  edition,
  variant,
  newer,
  older,
}: {
  edition: JournalEdition;
  variant: "cover" | "edition";
  newer?: Neighbour;
  older?: Neighbour;
}) {
  const sections = new Set(edition.stories.map((story) => story.section)).size;
  return (
    <header className={`jr-masthead jr-masthead--${variant}`}>
      <div className="jr-strip jr-enter jr-enter--1">
        <span>Edição nº {edition.edition}</span>
        <time dateTime={edition.date}>{capitalize(longDate(edition.date))}</time>
        <span>São Paulo · {edition.readingMinutes} min de leitura</span>
      </div>
      <div className="jr-flag">
        {variant === "cover" ? (
          <>
            <Ear side="left">
              <span className="jr-ear__kicker">Todo dia útil</span>
              <span className="jr-ear__text">O essencial das newsletters do dia</span>
            </Ear>
            <Nameplate as="h1" />
            <Ear side="right">
              <span className="jr-ear__kicker">Nesta edição</span>
              <span className="jr-ear__text">
                {plural(edition.stories.length, "notícia", "notícias")} em {plural(sections, "seção", "seções")}
              </span>
            </Ear>
          </>
        ) : (
          <>
            <NeighbourEar side="left" edition={older} />
            <h1 className="jr-flag__title">
              <Nameplate as="span" link />
              <span className="jr-sr">
                , edição nº {edition.edition}, {longDate(edition.date)}
              </span>
            </h1>
            <NeighbourEar side="right" edition={newer} />
          </>
        )}
      </div>
      <Rule />
    </header>
  );
}
