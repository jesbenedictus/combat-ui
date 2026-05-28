import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import dayPlannerCss from "./day-planner.css?inline";

export interface CuiDayPlannerEvent {
  /** Source `.cui-event-card` element. */
  element: HTMLElement;
  /** Start of the event (local time). */
  start: Date;
  /** End of the event (local time). */
  end: Date;
  /** Title text from `.cui-event-card-title`. */
  title: string;
  /** Status read from `data-status` on the card. */
  status: string | null;
  /** Anchor href from the title link, if any. */
  href: string | null;
}

export interface CuiDayPlannerEventSelectDetail {
  iso: string;
  date: Date;
  event: CuiDayPlannerEvent;
}

export interface CuiDayPlannerSlotSelectDetail {
  iso: string;
  date: Date;
  /** Minutes from midnight for the slot the user activated. */
  minutes: number;
}

export interface CuiDayPlannerNavigateDetail {
  iso: string;
}

const EVENT_CARD_SELECTOR = ".cui-event-card";
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;
const DEFAULT_SLOT_MINUTES = 60;
const DEFAULT_DURATION_MINUTES = 60;
const NOW_LINE_INTERVAL_MS = 60_000;

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number.parseInt(match[1]!, 10);
  const m = Number.parseInt(match[2]!, 10);
  const d = Number.parseInt(match[3]!, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

interface ParsedEvent {
  source: CuiDayPlannerEvent;
  startMin: number;
  endMin: number;
}

interface PositionedEvent extends ParsedEvent {
  col: number;
  cols: number;
}

function packColumns(events: ParsedEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out: PositionedEvent[] = [];

  let cluster: ParsedEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = (): void => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const placed: Array<{ event: ParsedEvent; col: number }> = [];
    for (const event of cluster) {
      let col = columnEnds.findIndex((end) => end <= event.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(event.endMin);
      } else {
        columnEnds[col] = event.endMin;
      }
      placed.push({ event, col });
    }
    const cols = columnEnds.length;
    for (const entry of placed) {
      out.push({ ...entry.event, col: entry.col, cols });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const event of sorted) {
    if (cluster.length > 0 && event.startMin >= clusterEnd) {
      flush();
    }
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.endMin);
  }
  flush();

  return out;
}

function readEndFromCard(card: HTMLElement, start: Date): Date | null {
  const explicit = card.getAttribute("data-end");
  if (explicit) {
    const fromIso = new Date(explicit);
    if (!Number.isNaN(fromIso.getTime())) return fromIso;
    const hhmm = /^(\d{1,2}):(\d{2})$/.exec(explicit);
    if (hhmm) {
      const next = new Date(start);
      next.setHours(Number.parseInt(hhmm[1]!, 10), Number.parseInt(hhmm[2]!, 10), 0, 0);
      return next;
    }
  }
  const times = card.querySelectorAll<HTMLTimeElement>("time[datetime]");
  if (times.length >= 2) {
    const second = times[1]!;
    const value = second.getAttribute("datetime");
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > start.getTime()) {
        return parsed;
      }
    }
  }
  return null;
}

/**
 * Vertical day planner — a single-day timeline that decorates a
 * slotted list of `.cui-event-card` children. Events are placed
 * by start time, sized by duration, and column-packed so
 * concurrent events sit side-by-side. The source cards remain in
 * light DOM beneath the board (or visually hidden via
 * `events-hidden`) so search engines and feed readers index the
 * full event copy without depending on the component's JS.
 *
 * Reads each card's first `<time datetime>` for the start; an
 * optional second `<time datetime>` or a `data-end` attribute
 * (full ISO or `HH:MM`) provides the end. Cards without an
 * explicit end get a default `60`-minute duration.
 *
 * @element cui-day-planner
 *
 * @slot - `.cui-event-card` elements whose first `<time>` falls on
 *   the visible date. Cards on other days are placed in the slot
 *   but skipped from the timeline.
 *
 * @attr {string} date - Visible day in `YYYY-MM-DD`. Defaults to today.
 * @attr {string} start-hour - Visible window start hour (0-23). Defaults to `7`.
 * @attr {string} end-hour - Visible window end hour (1-24). Defaults to `22`.
 * @attr {"15"|"30"|"60"} slot-minutes - Minor-gridline cadence. Defaults to `60`.
 * @attr {string} locale - BCP-47 locale for the day-header label. Defaults to the document's `lang` or `navigator.language`.
 * @attr {boolean} now-line - Render the now-line when viewing today. Defaults to present.
 * @attr {boolean} events-hidden - Visually hide the slotted card list while keeping it in the DOM.
 *
 * @fires {CustomEvent<CuiDayPlannerEventSelectDetail>} cui-day-planner-event-select - Cancelable; fires when an event block is activated.
 * @fires {CustomEvent<CuiDayPlannerSlotSelectDetail>} cui-day-planner-slot-select - Fires when a row (empty slot) is activated.
 * @fires {CustomEvent<CuiDayPlannerNavigateDetail>} cui-day-planner-navigate - Fires after the visible day changes.
 *
 * @example
 * <cui-day-planner date="2026-06-15" start-hour="8" end-hour="18">
 *   <article class="cui-event-card" data-status="upcoming">
 *     <time class="cui-event-card-date" datetime="2026-06-15T10:00">…</time>
 *     <time datetime="2026-06-15T12:00"></time>
 *     <div class="cui-event-card-body">
 *       <h3 class="cui-event-card-title"><a href="/events/foo">Workshop</a></h3>
 *     </div>
 *   </article>
 * </cui-day-planner>
 */
export class CuiDayPlanner extends CombatElement {
  static readonly tagName = "cui-day-planner";
  static override readonly styles = [cssStyleSheet(dayPlannerCss)];
  static observedAttributes = [
    "date",
    "start-hour",
    "end-hour",
    "slot-minutes",
    "locale",
    "now-line",
  ];

  private viewDate: Date;
  private events: CuiDayPlannerEvent[] = [];
  private board: HTMLElement | null = null;
  private labels: HTMLElement | null = null;
  private track: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private nowLineEl: HTMLElement | null = null;
  private slotObserver: MutationObserver | null = null;
  private abortController: AbortController | null = null;
  private nowLineTimer: number | null = null;

  constructor() {
    super();
    this.viewDate = startOfDay(new Date());
  }

  connectedCallback(): void {
    this.adoptStyles();
    this.applyAttributes();
    this.renderFrame();
    this.collectEvents();
    this.render();
    this.observeSlotChanges();
    this.bindEvents();
    this.startNowLineTimer();
  }

  disconnectedCallback(): void {
    this.slotObserver?.disconnect();
    this.slotObserver = null;
    this.abortController?.abort();
    this.abortController = null;
    if (this.nowLineTimer !== null) {
      window.clearInterval(this.nowLineTimer);
      this.nowLineTimer = null;
    }
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.applyAttributes();
    this.collectEvents();
    this.render();
  }

  /** Programmatically jump to a date (YYYY-MM-DD or Date). */
  goTo(target: string | Date): void {
    const next = typeof target === "string" ? parseIsoDate(target) : startOfDay(target);
    if (!next) return;
    this.setAttribute("date", toIso(next));
    this.emitNavigate();
  }

  /** Move forward one day. */
  next(): void {
    const next = new Date(this.viewDate);
    next.setDate(next.getDate() + 1);
    this.goTo(next);
  }

  /** Move back one day. */
  previous(): void {
    const next = new Date(this.viewDate);
    next.setDate(next.getDate() - 1);
    this.goTo(next);
  }

  /** Re-read slotted event cards. Call after dynamic updates. */
  refresh(): void {
    if (!this.isConnected) return;
    this.collectEvents();
    this.render();
  }

  get startHour(): number {
    const raw = Number.parseInt(this.getAttribute("start-hour") ?? "", 10);
    if (Number.isFinite(raw) && raw >= 0 && raw <= 23) return raw;
    return DEFAULT_START_HOUR;
  }

  get endHour(): number {
    const raw = Number.parseInt(this.getAttribute("end-hour") ?? "", 10);
    if (Number.isFinite(raw) && raw > this.startHour && raw <= 24) return raw;
    return Math.max(this.startHour + 1, DEFAULT_END_HOUR);
  }

  get slotMinutes(): number {
    const raw = Number.parseInt(this.getAttribute("slot-minutes") ?? "", 10);
    if (raw === 15 || raw === 30 || raw === 60) return raw;
    return DEFAULT_SLOT_MINUTES;
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
    const dateAttr = this.getAttribute("date");
    if (dateAttr) {
      const parsed = parseIsoDate(dateAttr);
      if (parsed) this.viewDate = parsed;
    }
  }

  private renderFrame(): void {
    if (this.shadowRoot?.querySelector(".frame")) {
      this.board = this.shadowRoot?.querySelector(".board") ?? null;
      this.labels = this.shadowRoot?.querySelector(".labels") ?? null;
      this.track = this.shadowRoot?.querySelector(".track") ?? null;
      this.titleEl = this.shadowRoot?.querySelector(".title") ?? null;
      return;
    }

    this.appendShadowTemplate(`
      <div class="frame" part="frame">
        <div class="header" part="header">
          <h2 class="title" part="title" aria-live="polite"></h2>
          <div class="nav" part="nav">
            <button type="button" data-action="prev" part="nav-button" aria-label="Previous day">‹</button>
            <button type="button" data-action="today" part="nav-button">Today</button>
            <button type="button" data-action="next" part="nav-button" aria-label="Next day">›</button>
          </div>
        </div>
        <div class="board" part="board">
          <div class="labels" part="labels" aria-hidden="true"></div>
          <div class="track" role="grid" part="track"></div>
        </div>
        <div class="list-region" part="list">
          <slot></slot>
        </div>
      </div>
    `);

    this.board = this.shadowRoot?.querySelector(".board") ?? null;
    this.labels = this.shadowRoot?.querySelector(".labels") ?? null;
    this.track = this.shadowRoot?.querySelector(".track") ?? null;
    this.titleEl = this.shadowRoot?.querySelector(".title") ?? null;
  }

  private collectEvents(): void {
    const cards = this.querySelectorAll<HTMLElement>(EVENT_CARD_SELECTOR);
    const events: CuiDayPlannerEvent[] = [];
    for (const card of cards) {
      const time = card.querySelector<HTMLTimeElement>("time[datetime]");
      const startValue = time?.getAttribute("datetime");
      if (!startValue) continue;
      const start = new Date(startValue);
      if (Number.isNaN(start.getTime())) continue;
      const end = readEndFromCard(card, start) ??
        new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000);
      const titleEl = card.querySelector(".cui-event-card-title");
      const title = (titleEl?.textContent ?? card.textContent ?? "").trim();
      const anchor = titleEl?.querySelector<HTMLAnchorElement>("a[href]");
      events.push({
        element: card,
        start,
        end,
        title,
        status: card.getAttribute("data-status"),
        href: anchor?.getAttribute("href") ?? null,
      });
    }
    this.events = events;
  }

  private render(): void {
    if (!this.labels || !this.track || !this.titleEl) return;

    const startHour = this.startHour;
    const endHour = this.endHour;
    const hours = endHour - startHour;
    const totalMinutes = hours * 60;

    const titleFmt = new Intl.DateTimeFormat(this.locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    this.titleEl.textContent = titleFmt.format(this.viewDate);

    this.host(hours);

    this.renderLabels(startHour, endHour);
    this.renderTrack(hours, startHour, totalMinutes);
    this.renderNowLine(startHour, totalMinutes);
  }

  private host(hours: number): void {
    this.style.setProperty("--cui-day-planner-hour-rows", String(hours));
  }

  private renderLabels(startHour: number, endHour: number): void {
    if (!this.labels) return;
    while (this.labels.firstChild) this.labels.removeChild(this.labels.firstChild);
    const hourFmt = new Intl.DateTimeFormat(this.locale, { hour: "numeric" });
    for (let h = startHour; h < endHour; h += 1) {
      const cell = document.createElement("div");
      cell.className = "label";
      const sample = new Date(this.viewDate);
      sample.setHours(h, 0, 0, 0);
      cell.textContent = hourFmt.format(sample);
      this.labels.appendChild(cell);
    }
  }

  private renderTrack(hours: number, startHour: number, totalMinutes: number): void {
    if (!this.track) return;
    while (this.track.firstChild) this.track.removeChild(this.track.firstChild);

    for (let h = 0; h < hours; h += 1) {
      const row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "row");
      row.dataset.hour = String(startHour + h);
      this.track.appendChild(row);
    }

    const eventsLayer = document.createElement("div");
    eventsLayer.className = "events";
    this.track.appendChild(eventsLayer);

    const visibleStart = startHour * 60;
    const visibleEnd = visibleStart + totalMinutes;
    const iso = toIso(this.viewDate);
    const today = startOfDay(new Date());

    const parsed: ParsedEvent[] = [];
    for (const event of this.events) {
      if (toIso(startOfDay(event.start)) !== iso) continue;
      const startMin = Math.max(visibleStart, minutesFromMidnight(event.start));
      const endMin = Math.min(
        visibleEnd,
        event.end.getDate() !== event.start.getDate()
          ? visibleEnd
          : minutesFromMidnight(event.end),
      );
      if (endMin <= visibleStart || startMin >= visibleEnd) continue;
      parsed.push({ source: event, startMin, endMin });
    }

    const positioned = packColumns(parsed);
    const timeFmt = new Intl.DateTimeFormat(this.locale, {
      hour: "numeric",
      minute: "2-digit",
    });
    for (const { source, startMin, endMin, col, cols } of positioned) {
      const block = document.createElement("a");
      block.className = "event";
      if (source.status) block.dataset.status = source.status;
      block.href = source.href ?? `#${iso}`;
      block.dataset.start = String(startMin);
      block.dataset.end = String(endMin);
      block.dataset.eventIndex = String(this.events.indexOf(source));
      block.title = source.title;

      const titleSpan = document.createElement("span");
      titleSpan.className = "event-title";
      titleSpan.textContent = source.title || "Event";
      const timeSpan = document.createElement("span");
      timeSpan.className = "event-time";
      timeSpan.textContent = `${timeFmt.format(source.start)} – ${timeFmt.format(source.end)}`;

      const top = ((startMin - visibleStart) / totalMinutes) * 100;
      const height = Math.max(((endMin - startMin) / totalMinutes) * 100, 2.5);
      const widthPct = 100 / cols;
      const leftPct = col * widthPct;

      block.style.top = `${top}%`;
      block.style.height = `${height}%`;
      block.style.left = `calc(${leftPct}% + 2px)`;
      block.style.width = `calc(${widthPct}% - 4px)`;

      block.appendChild(titleSpan);
      if (endMin - startMin >= 30) {
        block.appendChild(timeSpan);
      }
      eventsLayer.appendChild(block);
    }

    // Stash for now-line rendering & focus management.
    this.track.dataset.iso = iso;
    this.track.dataset.startHour = String(startHour);
    this.track.dataset.totalMinutes = String(totalMinutes);
    this.track.dataset.isToday = String(toIso(today) === iso);
  }

  private renderNowLine(startHour: number, totalMinutes: number): void {
    if (!this.track) return;
    this.nowLineEl?.remove();
    this.nowLineEl = null;
    if (this.getAttribute("now-line") === "false") return;
    const today = startOfDay(new Date());
    if (toIso(this.viewDate) !== toIso(today)) return;
    const now = new Date();
    const minutesNow = minutesFromMidnight(now);
    const visibleStart = startHour * 60;
    const visibleEnd = visibleStart + totalMinutes;
    if (minutesNow < visibleStart || minutesNow > visibleEnd) return;
    const top = ((minutesNow - visibleStart) / totalMinutes) * 100;
    const line = document.createElement("div");
    line.className = "now-line";
    line.style.top = `${top}%`;
    line.setAttribute("aria-hidden", "true");
    this.track.appendChild(line);
    this.nowLineEl = line;
  }

  private startNowLineTimer(): void {
    if (this.nowLineTimer !== null) return;
    this.nowLineTimer = window.setInterval(() => {
      const startHour = this.startHour;
      const totalMinutes = (this.endHour - startHour) * 60;
      this.renderNowLine(startHour, totalMinutes);
    }, NOW_LINE_INTERVAL_MS);
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
  }

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.closest<HTMLButtonElement>("[data-action]");
    if (action) {
      const command = action.dataset.action;
      if (command === "prev") this.previous();
      else if (command === "next") this.next();
      else if (command === "today") this.goTo(new Date());
      return;
    }

    const block = target.closest<HTMLAnchorElement>(".event");
    if (block) {
      const idx = Number.parseInt(block.dataset.eventIndex ?? "", 10);
      const source = Number.isFinite(idx) ? this.events[idx] : undefined;
      if (!source) return;
      const detail: CuiDayPlannerEventSelectDetail = {
        iso: toIso(this.viewDate),
        date: this.viewDate,
        event: source,
      };
      const allow = this.dispatchEvent(
        new CustomEvent<CuiDayPlannerEventSelectDetail>("cui-day-planner-event-select", {
          detail,
          bubbles: true,
          cancelable: true,
        }),
      );
      if (!allow) event.preventDefault();
      return;
    }

    const row = target.closest<HTMLElement>(".row");
    if (row && this.track && this.track.contains(row)) {
      const hour = Number.parseInt(row.dataset.hour ?? "", 10);
      if (!Number.isFinite(hour)) return;
      const rect = row.getBoundingClientRect();
      const pointerY = (event as MouseEvent).clientY - rect.top;
      const ratio = Math.min(Math.max(pointerY / rect.height, 0), 1);
      const granularity = this.slotMinutes;
      const within = Math.floor((ratio * 60) / granularity) * granularity;
      const minutes = hour * 60 + within;
      this.dispatchEvent(
        new CustomEvent<CuiDayPlannerSlotSelectDetail>("cui-day-planner-slot-select", {
          detail: {
            iso: toIso(this.viewDate),
            date: this.viewDate,
            minutes,
          },
          bubbles: true,
        }),
      );
    }
  }

  private emitNavigate(): void {
    this.dispatchEvent(
      new CustomEvent<CuiDayPlannerNavigateDetail>("cui-day-planner-navigate", {
        detail: { iso: toIso(this.viewDate) },
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

export function defineCuiDayPlanner(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiDayPlanner.tagName)) {
    registry.define(CuiDayPlanner.tagName, CuiDayPlanner);
  }
}
