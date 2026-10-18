import { JournalLink } from "@/components/journal/JournalTransitions";
import { SECTIONS, capitalize, longDate, monthLabel, shortWeekday, weekdayIndex, type JournalEdition } from "@/lib/journal";

const WEEKDAYS = [
  ["Seg", "segunda-feira"],
  ["Ter", "terça-feira"],
  ["Qua", "quarta-feira"],
  ["Qui", "quinta-feira"],
  ["Sex", "sexta-feira"],
  ["Sáb", "sábado"],
  ["Dom", "domingo"],
] as const;

interface Month {
  key: string;
  label: string;
  editions: JournalEdition[];
}

/** Newest month first; editions inside each month newest first. */
export function groupByMonth(editions: JournalEdition[]): Month[] {
  const months = new Map<string, Month>();
  for (const edition of editions) {
    const key = edition.date.slice(0, 7);
    if (!months.has(key)) months.set(key, { key, label: capitalize(monthLabel(edition.date)), editions: [] });
    months.get(key)!.editions.push(edition);
  }
  return [...months.values()];
}

const sectionLabel = (id: string) => SECTIONS.find((section) => section.id === id)?.label ?? id;

export function ArchiveList({ months }: { months: Month[] }) {
  return (
    <div className="jr-months">
      {months.map((month) => (
        <section key={month.key} className="jr-month" aria-labelledby={`mes-${month.key}`}>
          <header className="jr-month__head" data-reveal>
            <h2 id={`mes-${month.key}`} className="jr-month__title">
              {month.label}
            </h2>
            <p className="jr-month__count">
              {month.editions.length} {month.editions.length === 1 ? "edição" : "edições"}
            </p>
          </header>
          <ol className="jr-entries">
            {month.editions.map((edition, index) => {
              const highlights = edition.highlights
                .map((id) => edition.stories.find((story) => story.id === id))
                .filter((story) => story !== undefined);
              return (
                <li key={edition.date} className="jr-entry" data-reveal style={{ "--jr-i": index } as React.CSSProperties}>
                  <p className="jr-entry__number" aria-hidden>
                    <span>Nº</span>
                    {edition.edition}
                  </p>
                  <div className="jr-entry__main">
                    <p className="jr-entry__date">
                      <time dateTime={edition.date}>{capitalize(longDate(edition.date))}</time>
                    </p>
                    <h3 className="jr-entry__title">
                      <JournalLink href={`/journal/${edition.date}`} className="jr-entry__link">
                        <span className="jr-sr">Edição nº {edition.edition}: </span>
                        {edition.title}
                      </JournalLink>
                    </h3>
                    <p className="jr-entry__description">{edition.description}</p>
                    <ul className="jr-entry__highlights" aria-label="Destaques">
                      {highlights.map((story) => (
                        <li key={story.id}>
                          <span className="jr-entry__section">{sectionLabel(story.section)}</span>
                          {story.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="jr-entry__arrow" aria-hidden>
                    →
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function ArchiveCalendar({ months }: { months: Month[] }) {
  return (
    <div className="jr-calendars">
      {months.map((month) => {
        const [year, monthNumber] = month.key.split("-").map(Number);
        const first = `${month.key}-01`;
        const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
        const byDay = new Map(month.editions.map((edition) => [Number(edition.date.slice(8)), edition]));
        const cells: Array<number | null> = [...Array(weekdayIndex(first)).fill(null)];
        for (let day = 1; day <= days; day += 1) cells.push(day);
        while (cells.length % 7) cells.push(null);
        const weeks = Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
        return (
          <table key={month.key} className="jr-calendar">
            <caption className="jr-calendar__caption">{month.label}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map(([short, long], index) => (
                  <th key={short} scope="col" abbr={long} data-weekend={index > 4 || undefined}>
                    {short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, row) => (
                <tr key={row}>
                  {week.map((day, column) => {
                    const edition = day ? byDay.get(day) : undefined;
                    return (
                      <td key={column} data-weekend={column > 4 || undefined} data-empty={!day || undefined}>
                        {edition ? (
                          <JournalLink
                            href={`/journal/${edition.date}`}
                            className="jr-calendar__day jr-calendar__day--edition"
                            aria-label={`Edição nº ${edition.edition}, ${shortWeekday(edition.date)} ${longDate(edition.date)}`}
                          >
                            <span className="jr-calendar__number">{day}</span>
                            <span className="jr-calendar__edition">nº {edition.edition}</span>
                          </JournalLink>
                        ) : day ? (
                          <span className="jr-calendar__day">
                            <span className="jr-calendar__number">{day}</span>
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
