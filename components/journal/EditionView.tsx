import { JournalLink } from "@/components/journal/JournalTransitions";
import Masthead from "@/components/journal/Masthead";
import Reveal from "@/components/journal/Reveal";
import SectionNav from "@/components/journal/SectionNav";
import { ReadingMode } from "@/components/journal/Segmented";
import Story from "@/components/journal/Story";
import { capitalize, layoutEdition, longDate, plural, shortDate, type JournalEdition } from "@/lib/journal";

const SITE = "leodots.com";

function Colophon({ edition }: { edition: JournalEdition }) {
  return (
    <div className="jr-colophon__grid">
      <div>
        <p className="jr-label">Fontes desta edição</p>
        <ul className="jr-colophon__sources">
          {edition.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} rel="noopener">
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="jr-label">Como é feito</p>
        <p>
          Um resumo diário das newsletters, com pesquisa própria quando ela ajuda a entender a notícia. Cada texto
          indica as suas fontes; na dúvida, vale sempre a fonte original.
        </p>
      </div>
      <div>
        <p className="jr-label">Endereço permanente</p>
        <p>
          <JournalLink href={`/journal/${edition.date}`}>
            {SITE}/journal/{edition.date}
          </JournalLink>
        </p>
        <p className="jr-colophon__links">
          <JournalLink href="/journal/arquivo">Arquivo</JournalLink>
          <a href="/journal/rss.xml">RSS</a>
        </p>
      </div>
    </div>
  );
}

function Pager({ newer, older }: { newer?: JournalEdition; older?: JournalEdition }) {
  if (!newer && !older) return null;
  return (
    <nav className="jr-pager" aria-label="Outras edições">
      {older ? (
        <JournalLink href={`/journal/${older.date}`} className="jr-pager__link jr-pager__link--older" rel="prev">
          <span className="jr-label">← Edição anterior</span>
          <span className="jr-pager__title">
            Nº {older.edition} · {capitalize(longDate(older.date))}
          </span>
        </JournalLink>
      ) : (
        <span />
      )}
      {newer ? (
        <JournalLink href={`/journal/${newer.date}`} className="jr-pager__link jr-pager__link--newer" rel="next">
          <span className="jr-label">Próxima edição →</span>
          <span className="jr-pager__title">
            Nº {newer.edition} · {capitalize(longDate(newer.date))}
          </span>
        </JournalLink>
      ) : null}
    </nav>
  );
}

function Recent({ editions }: { editions: JournalEdition[] }) {
  if (!editions.length) return null;
  return (
    <section className="jr-recent" aria-labelledby="edicoes-anteriores">
      <div className="jr-recent__head">
        <h2 id="edicoes-anteriores" className="jr-label">
          Edições anteriores
        </h2>
        <JournalLink href="/journal/arquivo" className="jr-more">
          Arquivo completo <span aria-hidden>→</span>
        </JournalLink>
      </div>
      <ol className="jr-recent__list">
        {editions.map((edition) => {
          const lead = edition.stories.find((story) => story.id === edition.highlights[0]);
          return (
            <li key={edition.date}>
              <JournalLink href={`/journal/${edition.date}`} className="jr-recent__item">
                <span className="jr-recent__number">Nº {edition.edition}</span>
                <span className="jr-recent__date">{capitalize(shortDate(edition.date))}</span>
                <span className="jr-recent__title">{lead?.title ?? edition.title}</span>
              </JournalLink>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function EditionView({
  edition,
  variant,
  newer,
  older,
  recent = [],
}: {
  edition: JournalEdition;
  variant: "cover" | "edition";
  newer?: JournalEdition;
  older?: JournalEdition;
  recent?: JournalEdition[];
}) {
  const layout = layoutEdition(edition);
  const sections = layout.sections.filter((section) => section.stories.length || section.featured.length);
  const [lead, ...seconds] = layout.highlights;
  const navItems = [
    { id: "destaques", label: "Destaques", count: layout.highlights.length },
    ...sections.map((section) => ({
      id: section.id,
      label: section.label,
      count: section.stories.length + section.featured.length,
    })),
  ];

  return (
    <>
      <a href="#destaques" className="jr-skip">
        Pular para as notícias
      </a>
      <div className="jr-shell">
        <Masthead
          edition={edition}
          variant={variant}
          newer={newer && { date: newer.date, edition: newer.edition }}
          older={older && { date: older.date, edition: older.edition }}
        />
        <div className="jr-dek jr-enter jr-enter--4">
          <p className="jr-dek__text">{edition.description}</p>
          <ReadingMode target="jr-edition" />
        </div>
      </div>

      <SectionNav items={navItems} progressTarget="jr-edition" />

      <div id="jr-edition" className="jr-edition jr-page" data-reading="full">
        <div className="jr-shell">
          <section id="destaques" className="jr-front" aria-labelledby="destaques-titulo">
            <h2 id="destaques-titulo" className="jr-sr">
              Destaques
            </h2>
            {lead && (
              <div className="jr-front__lead">
                <Story story={lead} variant="lead" showSection />
              </div>
            )}
            {seconds.length > 0 && (
              <div className="jr-front__side">
                {seconds.map((story, index) => (
                  <Story key={story.id} story={story} variant="second" showSection index={index + 1} />
                ))}
              </div>
            )}
          </section>

          {sections.map((section, number) => (
            <section
              key={section.id}
              id={section.id}
              className="jr-section"
              aria-labelledby={`${section.id}-titulo`}
            >
              <header className="jr-section__rail" data-reveal>
                <p className="jr-section__folio" aria-hidden>
                  {String(number + 2).padStart(2, "0")}
                </p>
                <h2 id={`${section.id}-titulo`} className="jr-section__title">
                  {section.label}
                </h2>
                <p className="jr-section__count">
                  {plural(section.stories.length + section.featured.length, "notícia", "notícias")}
                </p>
                {section.featured.length > 0 && (
                  <div className="jr-section__featured">
                    <p className="jr-label">Em destaque</p>
                    <ul>
                      {section.featured.map((story) => (
                        <li key={story.id}>
                          <a href={`#${story.id}`}>
                            <span className="jr-section__featured__arrow" aria-hidden>↑</span>
                            {story.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </header>
              {section.stories.length > 0 ? (
                <div className="jr-section__stories" data-count={Math.min(section.stories.length, 3)}>
                  {section.stories.map((story, index) => (
                    <Story key={story.id} story={story} variant="brief" index={index} />
                  ))}
                </div>
              ) : (
                <p className="jr-section__empty">
                  As notícias de {section.label} desta edição estão nos Destaques.
                </p>
              )}
            </section>
          ))}

          <footer className="jr-colophon" data-reveal>
            <Colophon edition={edition} />
            {variant === "edition" ? <Pager newer={newer} older={older} /> : <Recent editions={recent} />}
          </footer>
        </div>
      </div>
      <Reveal />
    </>
  );
}
