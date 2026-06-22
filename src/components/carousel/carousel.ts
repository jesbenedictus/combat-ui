import carouselCss from "./carousel.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import { findInComposedPath, numberAttr } from "../../internal/dom";
import { installRemoteTrigger } from "../../internal/remote-trigger";

export interface CuiCarouselChangeDetail {
  /** Index of the slide now active. */
  index: number;
  /** Index of the slide that was previously active, or -1 on first render. */
  previousIndex: number;
  /** The slide element now active, if any. */
  slide: HTMLElement | null;
}

const DEFAULT_INTERVAL = 5000;
const PREV_ICON =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 5-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NEXT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor"/></svg>';

/**
 * Flexible content carousel. Slides are slotted light-DOM elements, so every
 * slide stays crawlable regardless of which one is visible. Compose each slide
 * from any markup — an `<img>` / `<video>` background with overlaid text and
 * buttons (e.g. `.cui-media-overlay`), or a plain content panel. A separate
 * `fixed` slot holds chrome that persists across every slide (brand mark,
 * persistent CTA). Supports slide / fade transitions, autoplay with a
 * pause control, looping, keyboard navigation, and `prefers-reduced-motion`.
 *
 * @element cui-carousel
 *
 * @slot slide - One element per slide. Any content works; use
 *   `.cui-media-overlay` for media with overlaid copy and buttons.
 * @slot fixed - Content overlaid on top of every slide and pinned in place
 *   while slides change (logo, persistent call-to-action). Buttons here can
 *   carry `data-cui-carousel-prev` / `-next` / `-goto="<i>"` to drive the
 *   carousel; elements anywhere else on the page can do the same by adding
 *   `data-cui-carousel-target="<id>"`.
 *
 * @attr {number} index - The active slide index (zero-based). Reflected.
 * @attr {boolean} autoplay - Advance slides automatically.
 * @attr {number} interval - Autoplay delay in milliseconds. Defaults to 5000.
 * @attr {string} loop - Wrap past the ends. Defaults to on; set `loop="false"`
 *   to clamp at the first / last slide and disable the wrap.
 * @attr {"slide" | "fade" | "none"} transition - Transition style. Defaults to
 *   `slide`.
 * @attr {string} controls - Show the previous / next arrows. Defaults to on;
 *   set `controls="false"` to hide them.
 * @attr {string} pagination - Show the dot pagination. Defaults to on; set
 *   `pagination="false"` to hide it.
 * @attr {string} pause-on-hover - Pause autoplay on hover / focus. Defaults to
 *   on; set `pause-on-hover="false"` to keep playing.
 *
 * @fires {CustomEvent<CuiCarouselChangeDetail>} cui-carousel-change - Fires
 *   after the active slide changes.
 *
 * @csspart viewport - The clipping region around the slides.
 * @csspart track - The slot wrapping the slides (the moving track).
 * @csspart fixed - The persistent overlay layer.
 * @csspart controls - The previous / next arrow container.
 * @csspart previous - The previous-slide button.
 * @csspart next - The next-slide button.
 * @csspart pagination - The dot pagination container.
 * @csspart dot - A single pagination dot.
 *
 * @example
 * <cui-carousel autoplay interval="6000" aria-label="Featured work">
 *   <section slot="slide" class="cui-media-overlay" data-align="start">
 *     <img src="/one.jpg" alt="">
 *     <div class="cui-media-overlay-body">
 *       <h2 class="cui-media-overlay-title">A bold headline</h2>
 *       <cui-button data-variant="primary" href="/x">Read more</cui-button>
 *     </div>
 *   </section>
 *   <section slot="slide" class="cui-media-overlay">
 *     <img src="/two.jpg" alt="">
 *   </section>
 *   <a slot="fixed" class="cui-button" href="/all"
 *      style="place-self:end;margin:1rem">View all</a>
 * </cui-carousel>
 */
export class CuiCarousel extends CombatElement {
  static override tagName = "cui-carousel";
  static override styles = [cssStyleSheet(carouselCss)];
  static observedAttributes = [
    "index",
    "autoplay",
    "interval",
    "loop",
    "transition",
    "controls",
    "pagination",
  ];

  private currentIndex = 0;
  private timer: number | null = null;
  private hovered = false;
  private focused = false;
  private eventsBound = false;
  private reducedMotion: MediaQueryList | null = null;

  connectedCallback(): void {
    this.renderTemplate(`
      <div part="viewport" class="viewport" aria-live="polite" aria-atomic="false">
        <slot name="slide" part="track" class="track"></slot>
        <div part="fixed" class="fixed"><slot name="fixed"></slot></div>
      </div>
      <div part="controls" class="controls">
        <button class="nav prev" part="previous" type="button"
          aria-label="Previous slide">${PREV_ICON}</button>
        <button class="nav next" part="next" type="button"
          aria-label="Next slide">${NEXT_ICON}</button>
      </div>
      <div part="pagination" class="pagination" role="tablist"></div>
      <button class="playpause" type="button" hidden></button>
    `);

    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    this.setAttribute("aria-roledescription", "carousel");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-label", "Carousel");
    }

    this.currentIndex = this.clampIndex(numberAttr(this, "index", 0));

    if (!this.eventsBound) {
      this.eventsBound = true;
      this.bindEvents();
    }

    this.reducedMotion ??= window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion.addEventListener("change", this.handleMotionChange);

    this.build();
  }

  disconnectedCallback(): void {
    this.stop();
    this.reducedMotion?.removeEventListener("change", this.handleMotionChange);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (!this.eventsBound || oldValue === newValue) return;

    if (name === "index") {
      // Ignore the reflection write `go()` makes itself; only react to
      // external attribute changes.
      const value = numberAttr(this, "index", 0);
      if (value !== this.currentIndex) this.go(value);
    } else if (name === "autoplay") {
      this.syncAutoplay();
    } else if (name === "interval") {
      if (this.playing) this.restartTimer();
    } else {
      this.sync();
    }
  }

  /** All slide elements, in document order. */
  get slides(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(":scope > [slot='slide']"));
  }

  /** Number of slides. */
  get count(): number {
    return this.slides.length;
  }

  /** The active slide index. */
  get index(): number {
    return this.currentIndex;
  }

  set index(value: number) {
    this.go(value);
  }

  /** Whether autoplay is currently advancing slides. */
  get playing(): boolean {
    return this.timer !== null;
  }

  get loop(): boolean {
    return this.getAttribute("loop") !== "false";
  }

  /** Advance to the next slide (wraps when `loop` is on). */
  next(): void {
    this.go(this.currentIndex + 1);
  }

  /** Return to the previous slide (wraps when `loop` is on). */
  prev(): void {
    this.go(this.currentIndex - 1);
  }

  /** Move to a specific slide index. */
  go(target: number, options: { focus?: boolean } = {}): void {
    const count = this.count;
    if (count === 0) return;

    const previousIndex = this.currentIndex;
    const next = this.loop
      ? ((target % count) + count) % count
      : Math.min(Math.max(target, 0), count - 1);

    this.currentIndex = next;
    this.setNullableAttribute("index", String(next));
    this.sync();

    if (this.playing) this.restartTimer();

    if (options.focus) {
      this.slides[next]?.setAttribute("tabindex", "-1");
      this.slides[next]?.focus();
    }

    if (next !== previousIndex) {
      this.dispatchEvent(
        new CustomEvent<CuiCarouselChangeDetail>("cui-carousel-change", {
          bubbles: true,
          detail: { index: next, previousIndex, slide: this.slides[next] ?? null },
        }),
      );
    }
  }

  /** Start autoplay (no-op when reduced motion is preferred). */
  play(): void {
    if (this.reducedMotion?.matches || this.count < 2) return;
    this.restartTimer();
    this.updatePlayPause();
  }

  /** Pause autoplay. */
  pause(): void {
    this.stop();
    this.updatePlayPause();
  }

  private static applyRemoteAction(carousel: CuiCarousel, trigger: HTMLElement): void {
    if (trigger.hasAttribute("data-cui-carousel-prev")) {
      carousel.prev();
    } else if (trigger.hasAttribute("data-cui-carousel-next")) {
      carousel.next();
    } else if (trigger.hasAttribute("data-cui-carousel-goto")) {
      carousel.go(Number(trigger.getAttribute("data-cui-carousel-goto")));
    }
  }

  private build(): void {
    this.buildDots();
    this.sync();
    this.syncAutoplay();
  }

  private bindEvents(): void {
    const root = this.shadowRoot;
    root?.querySelector(".prev")?.addEventListener("click", () => this.prev());
    root?.querySelector(".next")?.addEventListener("click", () => this.next());
    root?.querySelector(".playpause")?.addEventListener("click", () => {
      if (this.playing) this.pause();
      else this.play();
    });
    root?.querySelector('[part="pagination"]')?.addEventListener("click", (event) => {
      const dot = (event.target as HTMLElement | null)?.closest<HTMLElement>("[part='dot']");
      if (dot?.dataset.index) this.go(Number(dot.dataset.index));
    });

    // In-carousel controls (e.g. buttons slotted into `fixed`): step from any
    // descendant carrying an action attribute. Triggers that also name a target
    // are owned by the document-level handler below, so skip them here.
    this.addEventListener("click", (event) => {
      const trigger = findInComposedPath(
        event,
        "[data-cui-carousel-prev],[data-cui-carousel-next],[data-cui-carousel-goto]",
      );
      if (
        !trigger ||
        trigger.closest("[slot='slide']") ||
        trigger.hasAttribute("data-cui-carousel-target")
      ) {
        return;
      }
      CuiCarousel.applyRemoteAction(this, trigger);
    });

    // Remote controls anywhere on the page: `data-cui-carousel-target="<id>"`
    // plus an action attribute. Installed once, globally, for every carousel.
    installRemoteTrigger("data-cui-carousel-target", (target, trigger) => {
      if (target instanceof CuiCarousel) {
        CuiCarousel.applyRemoteAction(target, trigger);
      }
    });

    this.addEventListener("keydown", (event) => this.handleKeydown(event));

    this.addEventListener("pointerenter", () => {
      this.hovered = true;
      this.maybePause();
    });
    this.addEventListener("pointerleave", () => {
      this.hovered = false;
      this.maybeResume();
    });
    this.addEventListener("focusin", () => {
      this.focused = true;
      this.maybePause();
    });
    this.addEventListener("focusout", () => {
      this.focused = false;
      this.maybeResume();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
      else this.maybeResume();
    });

    this.shadowRoot
      ?.querySelector("slot[name='slide']")
      ?.addEventListener("slotchange", () => {
        this.currentIndex = this.clampIndex(this.currentIndex);
        this.buildDots();
        this.sync();
        this.syncAutoplay();
      });
  }

  private handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.matches("input, textarea, select, [contenteditable='true']")) return;

    const actions: Record<string, () => void> = {
      ArrowLeft: () => this.prev(),
      ArrowRight: () => this.next(),
      Home: () => this.go(0),
      End: () => this.go(this.count - 1),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  private handleMotionChange = (): void => {
    this.syncAutoplay();
    this.sync();
  };

  private sync(): void {
    const slides = this.slides;
    const count = slides.length;

    this.setCssVar("--cui-carousel-index", String(this.currentIndex));

    slides.forEach((slide, i) => {
      const active = i === this.currentIndex;
      slide.toggleAttribute("data-active", active);
      slide.toggleAttribute("inert", !active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      if (!slide.hasAttribute("role")) slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      if (!slide.hasAttribute("aria-label") && !slide.hasAttribute("aria-labelledby")) {
        slide.setAttribute("aria-label", `${i + 1} of ${count}`);
      }
    });

    // Controls visibility / disabled state.
    const showControls = this.getAttribute("controls") !== "false" && count > 1;
    const showDots = this.getAttribute("pagination") !== "false" && count > 1;
    const controls = this.shadowRoot?.querySelector<HTMLElement>('[part="controls"]');
    const pagination = this.shadowRoot?.querySelector<HTMLElement>('[part="pagination"]');
    if (controls) controls.hidden = !showControls;
    if (pagination) pagination.hidden = !showDots;

    const atStart = this.currentIndex === 0;
    const atEnd = this.currentIndex === count - 1;
    const prev = this.shadowRoot?.querySelector<HTMLButtonElement>(".prev");
    const next = this.shadowRoot?.querySelector<HTMLButtonElement>(".next");
    if (prev) prev.disabled = !this.loop && atStart;
    if (next) next.disabled = !this.loop && atEnd;

    this.shadowRoot?.querySelectorAll<HTMLElement>("[part='dot']").forEach((dot, i) => {
      dot.setAttribute("aria-current", i === this.currentIndex ? "true" : "false");
      dot.setAttribute("tabindex", i === this.currentIndex ? "0" : "-1");
    });

    // While autoplaying, silence the live region so it doesn't announce every
    // automatic move; restore it for manual navigation.
    this.shadowRoot
      ?.querySelector<HTMLElement>('[part="viewport"]')
      ?.setAttribute("aria-live", this.playing ? "off" : "polite");
  }

  private buildDots(): void {
    const pagination = this.shadowRoot?.querySelector('[part="pagination"]');
    if (!pagination) return;
    const count = this.count;
    pagination.replaceChildren();
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("part", "dot");
      dot.dataset.index = String(i);
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      pagination.append(dot);
    }
  }

  private syncAutoplay(): void {
    if (this.hasAttribute("autoplay") && !this.reducedMotion?.matches && this.count > 1) {
      this.restartTimer();
    } else {
      this.stop();
    }
    this.updatePlayPause();
  }

  private updatePlayPause(): void {
    const button = this.shadowRoot?.querySelector<HTMLButtonElement>(".playpause");
    if (!button) return;
    const show = this.hasAttribute("autoplay") && !this.reducedMotion?.matches && this.count > 1;
    button.hidden = !show;
    button.innerHTML = this.playing ? PAUSE_ICON : PLAY_ICON;
    button.setAttribute("aria-label", this.playing ? "Pause slideshow" : "Play slideshow");
  }

  private maybePause(): void {
    if (this.playing && this.getAttribute("pause-on-hover") !== "false") {
      this.stop();
      this.updatePlayPause();
    }
  }

  private maybeResume(): void {
    if (
      !this.playing &&
      this.hasAttribute("autoplay") &&
      !this.hovered &&
      !this.focused &&
      !document.hidden &&
      !this.reducedMotion?.matches &&
      this.count > 1
    ) {
      this.restartTimer();
      this.updatePlayPause();
    }
  }

  private restartTimer(): void {
    this.stop();
    const interval = numberAttr(this, "interval", DEFAULT_INTERVAL);
    this.timer = window.setInterval(() => this.next(), Math.max(interval, 1000));
    // Keep the live region quiet while the timer is running.
    this.shadowRoot
      ?.querySelector<HTMLElement>('[part="viewport"]')
      ?.setAttribute("aria-live", "off");
  }

  private stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private clampIndex(value: number): number {
    const count = this.count;
    if (count === 0) return 0;
    return Math.min(Math.max(value, 0), count - 1);
  }

}
