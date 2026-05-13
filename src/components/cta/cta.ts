import ctaCss from './cta.css?inline';
import { CombatElement, cssStyleSheet } from '../../internal/base-element';

export class CuiCta extends CombatElement {
  static tagName = 'cui-cta';
  static override styles = cssStyleSheet(ctaCss);

  connectedCallback(): void {
    this.adoptStyles();

    if (!this.shadowRoot?.querySelector(".cta")) {
      this.appendShadowTemplate(`
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
}

export function defineCuiCta(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(CuiCta.tagName)) {
    registry.define(CuiCta.tagName, CuiCta);
  }
}