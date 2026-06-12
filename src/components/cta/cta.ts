import ctaCss from './cta.css?inline';
import { CombatElement, cssStyleSheet } from '../../internal/base-element';

/**
 * Call-to-action section with optional eyebrow, title, body copy, and an
 * actions row. All structural pieces are slots so content stays in light DOM.
 *
 * @element cui-cta
 *
 * @slot - Body copy.
 * @slot eyebrow - Small label above the title (category, audience, etc.).
 * @slot title - The CTA headline. Use a heading element (`<h2>`, `<h3>`) for
 *   correct document outline.
 * @slot actions - One or more buttons or links. Typically `cui-button`s.
 *
 * @example
 * <cui-cta>
 *   <span slot="eyebrow">For agencies</span>
 *   <h2 slot="title">Ship sites that survive accessibility audits</h2>
 *   <p>Combat UI ships baseline-modern CSS only — no shims, no surprises.</p>
 *   <div slot="actions">
 *     <cui-button href="/start">Get started</cui-button>
 *     <cui-button href="/docs">Read the docs</cui-button>
 *   </div>
 * </cui-cta>
 */
export class CuiCta extends CombatElement {
  static override tagName = 'cui-cta';
  static override styles = [cssStyleSheet(ctaCss)];

  connectedCallback(): void {
    this.renderTemplate(`
      <section class="cta" part="cta">
        <div class="content" part="content">
          <slot name="eyebrow"></slot>
          <slot name="title"></slot>
          <slot></slot>
        </div>
        <div class="actions" part="actions">
          <slot name="actions"></slot>
        </div>
      </section>
    `);
  }
}
