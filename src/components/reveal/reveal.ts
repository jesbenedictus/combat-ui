import revealCss from "./reveal.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import { valueWithUnit } from "../../internal/css-helpers";

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
  static override tagName = "cui-reveal";
  static override styles = [cssStyleSheet(revealCss)];
  static observedAttributes = ["delay", "distance", "threshold"];

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);

    this.syncVars();
  }

  attributeChangedCallback(): void {
    this.syncVars();
  }

  private syncVars(): void {
    this.setCssVar("--delay", valueWithUnit(this.getAttribute("delay"), "ms"));
    this.setCssVar("--distance", valueWithUnit(this.getAttribute("distance"), "px"));
    this.setCssVar("--threshold", valueWithUnit(this.getAttribute("threshold"), ""));
  }
}