import scrollStageCss from "./scroll-stage.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import {
  attachCuiParallax,
  getScrollCoordinator,
  type ParallaxRegistration,
  type ScrollStageHandle,
  type ScrollStageState,
} from "../../internal/scroll-coordinator";

const DEFAULTS = {
  focusBias: 0,
  hold: 0.16,
  threshold: 0.6,
} as const;

/**
 * Scroll-driven "stage" element that publishes its focus/offset/active state
 * as CSS custom properties on itself (and optionally on a tone target like
 * `:root`), so child layouts and parallax effects can react via CSS alone.
 * Pair with `cui-reveal` for entry animations or with the exported
 * `attachCuiParallax()` helper for parallax bindings.
 *
 * @element cui-scroll-stage
 *
 * @slot - Stage content. Typically a sticky inner region plus the layers
 *   that move with scroll progress.
 *
 * @attr {string} focus-bias - Where in the viewport the stage is considered
 *   "in focus". CSS length or unit-less ratio.
 * @attr {string} hold - How long to keep the stage at full focus before
 *   easing out, as a CSS length or ratio.
 * @attr {string} threshold - Minimum viewport overlap before the stage
 *   starts publishing focus (0–1).
 * @attr {string} tone - Tone value to publish on the tone target while the
 *   stage is active (e.g. `dark`, `inverse`).
 * @attr {string} tone-target - CSS selector that should receive the tone
 *   attribute. Accepts `document` or `:root` to target the root element.
 * @attr {string} sticky-top - CSS `top` value applied to the inner sticky
 *   region.
 * @attr {string} min-block-size - Minimum block-size of the stage; controls
 *   how much scroll the stage consumes.
 *
 * @example
 * <cui-scroll-stage min-block-size="200vh" sticky-top="0" tone="dark"
 *                   tone-target=":root">
 *   <div class="cui-scroll-stage-sticky">
 *     <h2>Sticky headline driven by scroll progress</h2>
 *   </div>
 * </cui-scroll-stage>
 */
export class CuiScrollStage extends CombatElement {
  static override tagName = "cui-scroll-stage";
  static override styles = [cssStyleSheet(scrollStageCss)];
  static observedAttributes = [
    "focus-bias",
    "hold",
    "threshold",
    "tone",
    "tone-target",
    "sticky-top",
    "min-block-size",
  ];

  private handle: ScrollStageHandle | null = null;
  private parallax: ParallaxRegistration | null = null;

  connectedCallback(): void {
    this.renderTemplate(`
      <div class="track" part="track">
        <div class="stage" part="stage">
          <slot></slot>
        </div>
      </div>
    `);

    this.syncCssVars();

    const tone = this.getAttribute("tone");
    this.handle = {
      element: this,
      tone,
      toneTarget: tone === null ? null : this.resolveToneTarget(),
      options: this.readOptions(),
      onUpdate: (state) => this.applyState(state),
    };

    getScrollCoordinator().registerStage(this.handle);
    this.parallax = attachCuiParallax(this);
  }

  private resolveToneTarget(): Element {
    const attr = this.getAttribute("tone-target");
    if (attr !== null && attr.trim() !== "") {
      const value = attr.trim();
      if (value === "document" || value === ":root") {
        return document.documentElement;
      }
      const found = document.querySelector(value);
      if (found !== null) return found;
    }
    return this.closest("[data-cui-tone-root]") ?? this;
  }

  disconnectedCallback(): void {
    if (this.handle !== null) {
      getScrollCoordinator().unregisterStage(this.handle);
      this.handle = null;
    }

    this.parallax?.unregister();
    this.parallax = null;
    this.style.removeProperty("--cui-stage-focus");
    this.style.removeProperty("--cui-stage-offset");
    this.style.removeProperty("--cui-stage-active");
    this.classList.remove("is-active");
  }

  attributeChangedCallback(name: string): void {
    if (this.handle === null) return;

    if (name === "tone") {
      const tone = this.getAttribute("tone");
      this.handle.tone = tone;
      this.handle.toneTarget = tone === null ? null : this.resolveToneTarget();
    } else if (name === "tone-target") {
      this.handle.toneTarget =
        this.handle.tone === null ? null : this.resolveToneTarget();
    } else if (name === "sticky-top" || name === "min-block-size") {
      this.syncCssVars();
    } else {
      this.handle.options = this.readOptions();
    }

    getScrollCoordinator().requestTick(true);
  }

  private readOptions(): ScrollStageHandle["options"] {
    return {
      focusBias: this.numberAttr("focus-bias", DEFAULTS.focusBias),
      hold: this.numberAttr("hold", DEFAULTS.hold),
      threshold: this.numberAttr("threshold", DEFAULTS.threshold),
    };
  }
   
  private numberAttr(name: string, defaultValue: number): number {
    const raw = this.getAttribute(name);
    if (raw === null || raw.trim() === "") return defaultValue;
    const value = Number(raw);
    return isNaN(value) ? defaultValue : value;
  }

  private syncCssVars(): void {
    const stickyTop = this.getAttribute("sticky-top");
    const minBlockSize = this.getAttribute("min-block-size");

    if (stickyTop !== null && stickyTop.trim() !== "") {
      this.style.setProperty("--cui-stage-sticky-top", stickyTop);
    } else {
      this.style.removeProperty("--cui-stage-sticky-top");
    }

    if (minBlockSize !== null && minBlockSize.trim() !== "") {
      this.style.setProperty("--cui-stage-min-block-size", minBlockSize);
    } else {
      this.style.removeProperty("--cui-stage-min-block-size");
    }
  }

  private applyState(state: ScrollStageState): void {
    this.style.setProperty("--cui-stage-focus", state.focus.toFixed(4));
    this.style.setProperty("--cui-stage-offset", state.offset.toFixed(4));
    this.style.setProperty("--cui-stage-active", state.active ? "1" : "0");
    this.classList.toggle("is-active", state.active);
  }
}
