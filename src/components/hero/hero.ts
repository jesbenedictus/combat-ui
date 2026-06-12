import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import heroCss from "./hero.css?inline";

/**
 * Hero section with optional responsive background image and content + media
 * regions. All copy and media stay in light DOM via slots.
 *
 * @element cui-hero
 *
 * @slot - Body copy beneath the title.
 * @slot eyebrow - Small label above the title.
 * @slot title - Main hero headline. Use a heading element.
 * @slot actions - Primary and secondary CTAs (typically `cui-button`s).
 * @slot media - Hero artwork (image, illustration, video) shown alongside or
 *   behind the copy depending on layout class.
 *
 * @attr {string} background-src - URL of the background image. Sets a CSS
 *   custom property the stylesheet consumes; omit for no background.
 * @attr {string} background-position - CSS `background-position` value
 *   (`center`, `50% 30%`, …) for the background image.
 * @attr {string} background-size - CSS `background-size` value (`cover`,
 *   `contain`, …) for the background image.
 * @attr {"narrow"|"default"|"wide"} content-width - Caps the inner content's
 *   inline-size to one of the site container scales while the hero surface
 *   (background, accent fill) stays full-bleed. Omit for the wide default
 *   (`--cui-container-wide`); use `default` to align with the rest of the
 *   site content (`--cui-container`); use `narrow` for editorial copy
 *   (`--cui-container-narrow`).
 *
 * @example
 * <cui-hero background-src="/hero.jpg" background-position="center">
 *   <span slot="eyebrow">New release</span>
 *   <h1 slot="title">Modern websites without the framework tax</h1>
 *   <p>Web components and light-DOM blocks that ship in any stack.</p>
 *   <div slot="actions">
 *     <cui-button href="/start">Get started</cui-button>
 *   </div>
 * </cui-hero>
 */
export class CuiHero extends CombatElement {
  static override tagName = "cui-hero";
  static override styles = [cssStyleSheet(heroCss)];
  static observedAttributes = [
    "background-position",
    "background-size",
    "background-src",
  ];

  connectedCallback(): void {
    this.renderTemplate(`
      <section class="hero" part="hero">
        <div class="background" part="background" aria-hidden="true"></div>
        <div class="inner" part="inner">
          <div class="content" part="content">
            <slot name="eyebrow"></slot>
            <slot name="title"></slot>
            <div class="copy" part="copy">
              <slot></slot>
            </div>
            <slot name="actions"></slot>
          </div>
          <div class="media" part="media">
            <slot name="media"></slot>
          </div>
        </div>
      </section>
    `);

    this.syncBackground();
  }

  attributeChangedCallback(): void {
    this.syncBackground();
  }

  get backgroundSrc(): string | null {
    return this.getAttribute("background-src");
  }

  set backgroundSrc(value: string | null) {
    this.setNullableAttribute("background-src", value);
  }

  get backgroundPosition(): string | null {
    return this.getAttribute("background-position");
  }

  set backgroundPosition(value: string | null) {
    this.setNullableAttribute("background-position", value);
  }

  get backgroundSize(): string | null {
    return this.getAttribute("background-size");
  }

  set backgroundSize(value: string | null) {
    this.setNullableAttribute("background-size", value);
  }

  private syncBackground(): void {
    const backgroundSrc = this.getAttribute("background-src");
    const backgroundPosition = this.getAttribute("background-position");
    const backgroundSize = this.getAttribute("background-size");

    if (backgroundSrc) {
      const escapedSrc = backgroundSrc.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
      this.style.setProperty("--cui-hero-background-image", `url("${escapedSrc}")`);
    } else {
      this.style.removeProperty("--cui-hero-background-image");
    }

    if (backgroundPosition) {
      this.style.setProperty("--cui-hero-background-position", backgroundPosition);
    } else {
      this.style.removeProperty("--cui-hero-background-position");
    }

    if (backgroundSize) {
      this.style.setProperty("--cui-hero-background-size", backgroundSize);
    } else {
      this.style.removeProperty("--cui-hero-background-size");
    }
  }
}
