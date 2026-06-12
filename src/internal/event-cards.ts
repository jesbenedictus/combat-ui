export const EVENT_CARD_SELECTOR = ".cui-event-card";

export interface EventCardData {
  element: HTMLElement;
  start: Date;
  end?: Date;
  title: string;
  status: string | null;
  href: string | null;
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
export function parseEventCards(host: HTMLElement): EventCardData[] {
  const events: EventCardData[] = [];
  for (const card of host.querySelectorAll<HTMLElement>(EVENT_CARD_SELECTOR)) {
    const dateTime = card.querySelector<HTMLElement>("time[datetime]")?.getAttribute("datetime");
    if (!dateTime) continue;
    const start = new Date(dateTime);
    if (Number.isNaN(start.getTime())) continue;

    const titleEl = card.querySelector<HTMLElement>(".cui-event-card-title");
    events.push({
      element: card,
      start,
      title: titleEl?.textContent?.trim() ?? "",
      status: card.getAttribute("data-status"),
      href: card.getAttribute("data-href"),
    });
  }
  return events;
}