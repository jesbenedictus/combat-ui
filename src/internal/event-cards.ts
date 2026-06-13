export const EVENT_CARD_SELECTOR = ".cui-event-card";

export interface EventCardData {
  element: HTMLElement;
  start: Date;
  end: Date;
  title: string;
  status: string | null;
  href: string | null;
}

const DEFAULT_DURATION_MINUTES = 60;

export interface ParseEventCardsOptions {
  defaultDurationMinutes?: number;
}

/**
 * Parses event cards from the given host element. An event card is identified
 * by the selector defined in `EVENT_CARD_SELECTOR`. Each card is expected to contain a `<time>` element
 * with a valid `datetime` attribute, which is used to determine the start time of the event. The title of
 * the event is extracted from an element with the class `.cui-event-card-title`. The status and href of the event
 * are extracted from the `data-status` and `data-href` attributes of the card, respectively.
 * @param host the HTMLElement to search for event cards
 * @returns the array of parsed event card data
 */
export function parseEventCards(
  host: HTMLElement,
  {
    defaultDurationMinutes = DEFAULT_DURATION_MINUTES,
  }: ParseEventCardsOptions = {},
): EventCardData[] {
  const events: EventCardData[] = [];
  for (const card of host.querySelectorAll<HTMLElement>(EVENT_CARD_SELECTOR)) {
    const dateTime = card
      .querySelector<HTMLElement>("time[datetime]")
      ?.getAttribute("datetime");
    if (!dateTime) continue;
    const start = new Date(dateTime);
    if (Number.isNaN(start.getTime())) continue;

    const titleEl = card.querySelector<HTMLElement>(".cui-event-card-title");
    events.push({
      element: card,
      start,
      end:
        readDateFromCard(card, start) ??
        new Date(start.getTime() + defaultDurationMinutes * 60_1000),
      title: titleEl?.textContent?.trim() ?? "",
      status: card.getAttribute("data-status"),
      href:
        titleEl
          ?.querySelector<HTMLAnchorElement>("a[href]")
          ?.getAttribute("href") ?? null,
    });
  }
  return events;
}

function readDateFromCard(card: HTMLElement, start: Date): Date | null {
  const explicit = card.getAttribute("data-end");
  if (explicit) {
    const fromIso = new Date(explicit);
    if (!Number.isNaN(fromIso.getTime())) {
      return fromIso;
    }
    const hhmm = /^(\d{1,2}):(\d{2})$/.exec(explicit);
    if (hhmm) {
      const next = new Date(start);
      next.setHours(parseInt(hhmm[1]!, 10), parseInt(hhmm[2]!, 10), 0, 0);
      return next;
    }
  }
  const times = card.querySelectorAll<HTMLElement>("time[datetime]");
  if (times.length >= 2) {
    const value = times[1]!.getAttribute("datetime");
    if (value) {
      const parsed = new Date(value);
      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed.getTime() > start.getTime()
      ) {
        return parsed;
      }
    }
  }
  return null;
}
