import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import calendarCss from "./calendar.css?inline";

export type CuiCalendarWeekdayStart = "monday" | "sunday";

export interface CuiCalendarEvent {
  /** Source `.cui-event-card` element. */
  element: HTMLElement;
  /** Event start date (local midnight). */
  date: Date;
  /** Event title — taken from `.cui-event-card-title`. */
  title: string;
  /** Status read from `data-status` on the card. */
  status: string | null;
  /** Optional anchor href found inside the title. */
  href: string | null;
}

export interface CuiCalendarDaySelectDetail {
  date: Date;
  iso: string;
  events: CuiCalendarEvent[];
}

export interface CuiCalendarEventSelectDetail {
  date: Date;
  iso: string;
  event: CuiCalendarEvent;
}

export interface CuiCalendarNavigateDetail {
  year: number;
  month: number;
}

const MAX_DAY_EVENTS = 3;
const EVENT_CARD_SELECTOR = ".cui-event-card";

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampMonth(month: number): { year: number; month: number } {
  const m = ((month % 12) + 12) % 12;
  const carry = Math.floor(month / 12);
  return { year: carry, month: m };
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number.parseInt(match[1]!, 10);
  const m = Number.parseInt(match[2]!, 10);
  const d = Number.parseInt(match[3]!, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

/**
 * Month-view calendar that decorates a slotted list of
 * `.cui-event-card` children. Reads each card's first `<time
 * datetime>` to plot an event pill onto the matching day cell;
 * the source cards remain in light DOM beneath the grid (or
 * visually hidden via `events-hidden`) so search engines and feed
 * readers index the full event copy without depending on the
 * component's JS.
 *
 * Click a day to fire `cui-calendar-day-select`; click an event
 * pill to fire `cui-calendar-event-select`; the prev / next
 * buttons fire `cui-calendar-navigate`. Keyboard nav inside the
 * grid uses arrow keys, Home / End, and PgUp / PgDn (with Shift
 * jumping a year).
 *
 * @element cui-calendar
 *
 * @slot - One or more `.cui-event-card` elements. Cards without a
 *   `<time datetime>` are skipped; multi-day events use the start
 *   date for plotting (single-cell rendering for v1).
 *
 * @attr {string} year - Initial visible year (e.g. `"2026"`). Defaults to today.
 * @attr {string} month - Initial visible month (1-12). Defaults to today.
 * @attr {"monday"|"sunday"} weekday-start - First day of the week. Defaults to `"monday"`.
 * @attr {string} locale - BCP-47 locale used for month / weekday labels. Defaults to the document's `lang` or `navigator.language`.
 * @attr {boolean} events-hidden - Visually hide the source event list while
 *   keeping it in the DOM for accessibility and SEO.
 *
 * @fires {CustomEvent<CuiCalendarDaySelectDetail>} cui-calendar-day-select - Fires when a day cell is activated.
 * @fires {CustomEvent<CuiCalendarEventSelectDetail>} cui-calendar-event-select - Fires when an event pill is activated.
 * @fires {CustomEvent<CuiCalendarNavigateDetail>} cui-calendar-navigate - Fires when the visible month changes.
 *
 * @example
 * <cui-calendar year="2026" month="6">
 *   <article class="cui-event-card" data-status="upcoming">
 *     <time class="cui-event-card-date" datetime="2026-06-15T10:00">…</time>
 *     <div class="cui-event-card-body">
 *       <h3 class="cui-event-card-title"><a href="/events/foo">Foo</a></h3>
 *     </div>
 *   </article>
 * </cui-calendar>
 */
export class CuiCalendar extends CombatElement {
  static override tagName = "cui-calendar";
  static override readonly styles = [cssStyleSheet(calendarCss)];
  static observedAttributes = [
    "year",
    "month",
    "weekday-start",
    "locale",
  ];

  private viewYear: number;
  private viewMonth: number;
  private selectedIso: string | null = null;
  private focusedIso: string | null = null;
  private events: CuiCalendarEvent[] = [];
  private grid: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private slotObserver: MutationObserver | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    super();
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
  }

  connectedCallback(): void {
    this.applyAttributes();
    this.renderFrame();
    this.collectEvents();
    this.renderGrid();
    this.observeSlotChanges();
    this.bindEvents();
  }

  disconnectedCallback(): void {
    this.slotObserver?.disconnect();
    this.slotObserver = null;
    this.abortController?.abort();
    this.abortController = null;
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.applyAttributes();
    this.renderGrid();
  }

  /** Programmatically navigate to a specific month (1-12). */
  goTo(year: number, month: number): void {
    const norm = clampMonth(month - 1);
    this.viewYear = year + norm.year;
    this.viewMonth = norm.month;
    this.setAttribute("year", String(this.viewYear));
    this.setAttribute("month", String(this.viewMonth + 1));
    this.emitNavigate();
  }

  /** Move forward one month. */
  next(): void {
    this.goTo(this.viewYear, this.viewMonth + 2);
  }

  /** Move back one month. */
  previous(): void {
    this.goTo(this.viewYear, this.viewMonth);
  }

  /** Re-read slotted event cards. Call after dynamic updates. */
  refresh(): void {
    if (!this.isConnected) return;
    this.collectEvents();
    this.renderGrid();
  }

  get weekdayStart(): CuiCalendarWeekdayStart {
    return this.getAttribute("weekday-start") === "sunday" ? "sunday" : "monday";
  }

  get locale(): string {
    return (
      this.getAttribute("locale") ||
      document.documentElement.lang ||
      (typeof navigator !== "undefined" ? navigator.language : "en") ||
      "en"
    );
  }

  private applyAttributes(): void {
    const yearAttr = Number.parseInt(this.getAttribute("year") ?? "", 10);
    const monthAttr = Number.parseInt(this.getAttribute("month") ?? "", 10);
    const now = new Date();
    if (Number.isFinite(yearAttr)) this.viewYear = yearAttr;
    else this.viewYear = now.getFullYear();
    if (Number.isFinite(monthAttr) && monthAttr >= 1 && monthAttr <= 12) {
      this.viewMonth = monthAttr - 1;
    } else {
      this.viewMonth = now.getMonth();
    }
  }

  private renderFrame(): void {
    this.renderTemplate(`
      <div class="frame" part="frame">
        <div class="header" part="header">
          <h2 class="title" part="title" aria-live="polite"></h2>
          <div class="nav" part="nav">
            <button type="button" data-action="prev" part="nav-button" aria-label="Previous month">‹</button>
            <button type="button" data-action="today" part="nav-button">Today</button>
            <button type="button" data-action="next" part="nav-button" aria-label="Next month">›</button>
          </div>
        </div>
        <div class="grid" role="grid" part="grid"></div>
        <div class="list-region" part="list">
          <slot></slot>
        </div>
      </div>
    `);

    this.titleEl = this.shadowRoot?.querySelector(".title") ?? null;
    this.grid = this.shadowRoot?.querySelector(".grid") ?? null;
  }

  private collectEvents(): void {
    const cards = this.querySelectorAll<HTMLElement>(EVENT_CARD_SELECTOR);
    const events: CuiCalendarEvent[] = [];
    for (const card of cards) {
      const time = card.querySelector<HTMLTimeElement>("time[datetime]");
      const datetime = time?.getAttribute("datetime");
      if (!datetime) continue;
      const parsed = new Date(datetime);
      if (Number.isNaN(parsed.getTime())) continue;
      const titleEl = card.querySelector(".cui-event-card-title");
      const title = (titleEl?.textContent ?? card.textContent ?? "").trim();
      const anchor = titleEl?.querySelector<HTMLAnchorElement>("a[href]");
      events.push({
        element: card,
        date: startOfDay(parsed),
        title,
        status: card.getAttribute("data-status"),
        href: anchor?.getAttribute("href") ?? null,
      });
    }
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.events = events;
  }

  private renderGrid(): void {
    if (!this.grid || !this.titleEl) return;

    const locale = this.locale;
    const monthLabel = new Date(this.viewYear, this.viewMonth, 1).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
    this.titleEl.textContent = monthLabel;

    // Reset grid children except weekday row (we'll re-render fresh).
    while (this.grid.firstChild) {
      this.grid.removeChild(this.grid.firstChild);
    }

    this.renderWeekdayRow();
    this.renderDayCells();
  }

  private renderWeekdayRow(): void {
    if (!this.grid) return;
    const locale = this.locale;
    const startsMonday = this.weekdayStart === "monday";
    // Use a known week (2024-01-01 is a Monday).
    const monday = new Date(2024, 0, 1);
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const labels: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      labels.push(fmt.format(day));
    }
    if (!startsMonday) {
      labels.unshift(labels.pop() ?? "");
    }
    for (const label of labels) {
      const cell = document.createElement("div");
      cell.className = "weekday";
      cell.setAttribute("role", "columnheader");
      cell.textContent = label;
      this.grid.appendChild(cell);
    }
  }

  private renderDayCells(): void {
    if (!this.grid) return;
    const startsMonday = this.weekdayStart === "monday";
    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const firstWeekday = firstOfMonth.getDay(); // 0=Sun … 6=Sat
    const offset = startsMonday ? (firstWeekday + 6) % 7 : firstWeekday;
    const start = new Date(this.viewYear, this.viewMonth, 1 - offset);
    const today = startOfDay(new Date());
    const todayIso = toIso(today);
    const dayLabelFmt = new Intl.DateTimeFormat(this.locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // 6 rows × 7 cols always — keeps height stable across months.
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = toIso(day);
      const outside = day.getMonth() !== this.viewMonth;
      const isToday = iso === todayIso;
      const dayEvents = this.events.filter((event) => toIso(event.date) === iso);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.iso = iso;
      if (outside) cell.dataset.outside = "true";
      if (isToday) cell.dataset.today = "true";
      cell.setAttribute("aria-label", dayLabelFmt.format(day));
      if (this.selectedIso === iso) cell.setAttribute("aria-selected", "true");
      cell.tabIndex = (this.focusedIso ?? todayIso) === iso || (this.focusedIso === null && i === 0) ? 0 : -1;

      const num = document.createElement("span");
      num.className = "day-number";
      num.textContent = String(day.getDate());
      cell.appendChild(num);

      if (dayEvents.length > 0) {
        const list = document.createElement("span");
        list.className = "day-events";
        const visible = dayEvents.slice(0, MAX_DAY_EVENTS);
        for (const event of visible) {
          const pill = document.createElement("a");
          pill.className = "event-pill";
          pill.dataset.iso = iso;
          pill.dataset.index = String(this.events.indexOf(event));
          if (event.status) pill.dataset.status = event.status;
          pill.href = event.href ?? `#${iso}`;
          pill.textContent = event.title || "Event";
          pill.title = event.title;
          list.appendChild(pill);
        }
        if (dayEvents.length > visible.length) {
          const more = document.createElement("span");
          more.className = "more";
          more.textContent = `+${dayEvents.length - visible.length} more`;
          list.appendChild(more);
        }
        cell.appendChild(list);
      }

      this.grid.appendChild(cell);
    }
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.shadowRoot?.addEventListener(
      "click",
      (event) => this.onClick(event),
      { signal },
    );

    this.shadowRoot?.addEventListener(
      "keydown",
      (event) => this.onKeydown(event as KeyboardEvent),
      { signal },
    );
  }

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const navButton = target.closest<HTMLButtonElement>("[data-action]");
    if (navButton) {
      const action = navButton.dataset.action;
      if (action === "prev") this.previous();
      else if (action === "next") this.next();
      else if (action === "today") {
        const now = new Date();
        this.goTo(now.getFullYear(), now.getMonth() + 1);
      }
      this.renderGrid();
      return;
    }

    const pill = target.closest<HTMLAnchorElement>(".event-pill");
    if (pill) {
      const iso = pill.dataset.iso;
      const index = Number.parseInt(pill.dataset.index ?? "", 10);
      if (!iso || !Number.isFinite(index)) return;
      const matched = this.events[index];
      if (!matched || toIso(matched.date) !== iso) return;
      const detail: CuiCalendarEventSelectDetail = {
        date: matched.date,
        iso,
        event: matched,
      };
      const allow = this.dispatchEvent(
        new CustomEvent<CuiCalendarEventSelectDetail>("cui-calendar-event-select", {
          detail,
          bubbles: true,
          cancelable: true,
        }),
      );
      if (!allow) event.preventDefault();
      return;
    }

    const cell = target.closest<HTMLElement>(".cell");
    if (cell) {
      const iso = cell.dataset.iso;
      if (!iso) return;
      this.selectIso(iso);
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    const cell = (event.target as HTMLElement | null)?.closest<HTMLElement>(".cell");
    if (!cell) return;
    const iso = cell.dataset.iso;
    if (!iso) return;
    const parts = parseIso(iso);
    if (!parts) return;
    const { y, m, d } = parts;
    const current = new Date(y, m - 1, d);
    let next: Date | null = null;

    switch (event.key) {
      case "ArrowLeft":
        next = new Date(y, m - 1, d - 1);
        break;
      case "ArrowRight":
        next = new Date(y, m - 1, d + 1);
        break;
      case "ArrowUp":
        next = new Date(y, m - 1, d - 7);
        break;
      case "ArrowDown":
        next = new Date(y, m - 1, d + 7);
        break;
      case "Home": {
        const day = current.getDay();
        const offset = this.weekdayStart === "monday" ? (day + 6) % 7 : day;
        next = new Date(y, m - 1, d - offset);
        break;
      }
      case "End": {
        const day = current.getDay();
        const offset = this.weekdayStart === "monday" ? (day + 6) % 7 : day;
        next = new Date(y, m - 1, d - offset + 6);
        break;
      }
      case "PageUp":
        next = new Date(event.shiftKey ? y - 1 : y, event.shiftKey ? m - 1 : m - 2, d);
        break;
      case "PageDown":
        next = new Date(event.shiftKey ? y + 1 : y, event.shiftKey ? m - 1 : m, d);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        this.selectIso(iso);
        return;
      default:
        return;
    }

    event.preventDefault();
    if (!next) return;

    const nextIso = toIso(next);
    this.focusedIso = nextIso;

    if (next.getFullYear() !== this.viewYear || next.getMonth() !== this.viewMonth) {
      this.goTo(next.getFullYear(), next.getMonth() + 1);
    }
    this.renderGrid();

    requestAnimationFrame(() => {
      const focusCell = this.grid?.querySelector<HTMLElement>(`.cell[data-iso="${nextIso}"]`);
      focusCell?.focus();
    });
  }

  private selectIso(iso: string): void {
    const parts = parseIso(iso);
    if (!parts) return;
    this.selectedIso = iso;
    const { y, m, d } = parts;
    const date = new Date(y, m - 1, d);
    const dayEvents = this.events.filter((event) => toIso(event.date) === iso);
    this.renderGrid();
    this.dispatchEvent(
      new CustomEvent<CuiCalendarDaySelectDetail>("cui-calendar-day-select", {
        detail: { date, iso, events: dayEvents },
        bubbles: true,
      }),
    );
  }

  private emitNavigate(): void {
    this.dispatchEvent(
      new CustomEvent<CuiCalendarNavigateDetail>("cui-calendar-navigate", {
        detail: { year: this.viewYear, month: this.viewMonth + 1 },
        bubbles: true,
      }),
    );
  }

  private observeSlotChanges(): void {
    this.slotObserver?.disconnect();
    this.slotObserver = new MutationObserver(() => this.refresh());
    this.slotObserver.observe(this, { childList: true, subtree: true });
  }
}
