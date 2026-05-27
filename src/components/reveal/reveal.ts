import revealCss from "./reveal.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

/**
 * Reveals its content with an entry animation as it scrolls into view, using
 * `IntersectionObserver` under the hood. Honors `prefers-reduced-motion` —
 * users with reduced motion see the content immediately, no transform.
 *
 * @element cui-reveal
 *
 * @slot - Content to reveal. Any block-level content works.
 *
 * @attr {string} delay - Delay before the reveal starts. Accepts a number
 *   (milliseconds) or any CSS time value (`200ms`, `0.3s`).
 * @attr {string} distance - Translate distance for the entry transform.
 *   Accepts a number (pixels) or any CSS length (`24px`, `2rem`).
 * @attr {string} threshold - `IntersectionObserver` threshold (0–1).
 *
 * @example
 * <cui-reveal delay="100" distance="32px">
 *   <article class="cui-card">…</article>
 * </cui-reveal>
 */
export class CuiReveal extends CombatElement {
  static readonly tagName = "cui-reveal";
  static override styles = [cssStyleSheet(revealCss)];
  static observedAttributes = ["delay", "distance", "threshold"];

  connectedCallback(): void {
    this.adoptStyles();

    if (!this.shadowRoot?.querySelector("slot")) {
      this.appendShadowTemplate(`<slot></slot>`);
    }

    this.syncVars();
  }

  attributeChangedCallback(): void {
    this.syncVars();
  }

  private syncVars(): void {
    const delay = this.getAttribute("delay");
    if (delay !== null && delay.trim() !== "") {
      const numeric = Number(delay);
      const value = Number.isNaN(numeric) ? delay : `${numeric}ms`;
      this.style.setProperty("--cui-reveal-delay", value);
    } else {
      this.style.removeProperty("--cui-reveal-delay");
    }

    const distance = this.getAttribute("distance");
    if (distance !== null && distance.trim() !== "") {
      const numeric = Number(distance);
      const value = Number.isNaN(numeric) ? distance : `${numeric}px`;
      this.style.setProperty("--cui-reveal-distance", value);
    } else {
      this.style.removeProperty("--cui-reveal-distance");
    }

    const threshold = this.getAttribute("threshold");
    if (threshold !== null && threshold.trim() !== "") {
      const numeric = Number(threshold);
      const value = Number.isNaN(numeric) ? threshold : `${numeric}`;
      this.style.setProperty("--cui-reveal-threshold", value);
    } else {
      this.style.removeProperty("--cui-reveal-threshold");
    }
  }
}

export function defineCuiReveal(registry: CustomElementRegistry = customElements): void {
  if (registry.get(CuiReveal.tagName)) return;
  registry.define(CuiReveal.tagName, CuiReveal);
}