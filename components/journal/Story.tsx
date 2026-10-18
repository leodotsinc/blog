import Image from "next/image";

import { JournalLink } from "@/components/journal/JournalTransitions";
import { StoryHeadline } from "@/components/journal/Reading";
import StoryBody from "@/components/journal/StoryBody";
import { SECTIONS, shortDate, type JournalStory } from "@/lib/journal";

export type StoryVariant = "lead" | "second" | "brief";

const IMAGE_SIZES: Record<StoryVariant, string> = {
  lead: "(min-width: 1280px) 780px, (min-width: 1024px) 62vw, 100vw",
  second: "(min-width: 1280px) 380px, (min-width: 1024px) 30vw, 100vw",
  brief: "(min-width: 1024px) 420px, (min-width: 720px) 45vw, 100vw",
};

const sectionLabel = (id: string) => SECTIONS.find((section) => section.id === id)?.label ?? id;

export function UpdateBadge({ update }: { update: NonNullable<JournalStory["update"]> }) {
  return (
    <JournalLink href={update.href} className="jr-update">
      <span className="jr-update__tag">Atualização</span>
      <span className="jr-update__ref">
        da edição nº {update.edition}, {shortDate(update.date)}
      </span>
      <span className="jr-update__arrow" aria-hidden>
        →
      </span>
    </JournalLink>
  );
}

function Credits({ story }: { story: JournalStory }) {
  return (
    <footer className="jr-credit">
      <span className="jr-credit__label">{story.sources.length > 1 ? "Fontes" : "Fonte"}</span>
      <ul className="jr-credit__list">
        {story.sources.map((source) => (
          <li key={source.url + source.label}>
            <a href={source.url} rel="noopener">
              {source.kind === "pesquisa-propria" && source.label !== "Pesquisa própria" ? (
                <>
                  <span className="jr-credit__kind">Pesquisa própria</span> {source.label}
                </>
              ) : (
                source.label
              )}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}

export default function Story({
  story,
  variant,
  showSection = false,
  index = 0,
}: {
  story: JournalStory;
  variant: StoryVariant;
  showSection?: boolean;
  index?: number;
}) {
  const titleId = `${story.id}-titulo`;
  const contentId = `${story.id}-conteudo`;
  const hasKicker = showSection || story.update;
  return (
    <article
      id={story.id}
      className={`jr-story jr-story--${variant}`}
      aria-labelledby={titleId}
      data-reveal
      style={{ "--jr-i": index } as React.CSSProperties}
    >
      {hasKicker && (
        <div className="jr-story__kicker">
          {showSection && (
            <a href={`#${story.section}`} className="jr-kicker">
              {sectionLabel(story.section)}
            </a>
          )}
          {story.update && <UpdateBadge update={story.update} />}
        </div>
      )}
      <StoryHeadline storyId={story.id} titleId={titleId} contentId={contentId} title={story.title} />
      {/* Layout-neutral in "full" mode; collapses below the headline in "headlines". */}
      <div id={contentId} className="jr-story__more">
        <div className="jr-story__more-inner">
          <p className="jr-story__meta">
            {story.readingMinutes} min de leitura
          </p>
          {story.image && (
            <figure className="jr-figure jr-figure--lead">
              <Image
                src={story.image.src}
                alt={story.image.alt}
                width={story.image.width}
                height={story.image.height}
                sizes={IMAGE_SIZES[variant]}
                className="jr-figure__img"
              />
              {story.image.credit && <figcaption>{story.image.credit}</figcaption>}
            </figure>
          )}
          <div className="jr-body">
            <StoryBody tree={story.body} sizes={IMAGE_SIZES[variant]} />
          </div>
          {story.context && (
            <aside className="jr-context" aria-labelledby={`${story.id}-contexto`}>
              <p id={`${story.id}-contexto`} className="jr-context__label">
                Contexto
              </p>
              <StoryBody tree={story.context} sizes={IMAGE_SIZES.brief} />
            </aside>
          )}
          <Credits story={story} />
        </div>
      </div>
    </article>
  );
}
