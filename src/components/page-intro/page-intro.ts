import style from "./page-intro.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

/**
 * Page-intro section with eyebrow, title, meta line, body copy, actions,
 * and optional aside. Use it as the first block on case-study, vacancy, or
 * article pages where the hero is too heavy.
 *
 * @element cui-page-intro
 *
 * @slot - Body copy (lede paragraph).
 * @slot eyebrow - Small label above the title.
 * @slot title - Page title. Use a heading element.
 * @slot meta - Compact metadata line (date, author, reading time, tags).
 * @slot actions - Optional buttons or links beneath the copy.
 * @slot aside - Optional side rail (table of contents, summary card).
 *
 * @example
 * <cui-page-intro>
 *   <span slot="eyebrow">Case study</span>
 *   <h1 slot="title">Rebuilding a 1000-page site without a redesign</h1>
 *   <p slot="meta">8 min read · March 2026</p>
 *   <p>How we migrated to baseline web standards without touching the IA.</p>
 * </cui-page-intro>
 */
export class CuiPageIntro extends CombatElement {
  static override styles = [cssStyleSheet(style)];
  static override tagName = "cui-page-intro";

  connectedCallback(): void {
      this.renderTemplate(this.template());
  }
  
  private template(): string {
    return `
        <section class="intro" part="intro">
          <div class="layout" part="layout">
            <div class="content" part="content">
              <slot name="eyebrow"></slot>
              <slot name="title"></slot>
              <slot name="meta"></slot>
              <div class="copy" part="copy">
                <slot></slot>
              </div>
              <slot name="actions"></slot>
            </div>
            <aside class="aside" part="aside">
              <slot name="aside"></slot>
            </aside>
          </div>
        </section>
      `
  }
}
