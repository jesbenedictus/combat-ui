import style from "./page-intro.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

export class CuiPageIntro extends CombatElement {
  static override styles = [cssStyleSheet(style)];
  static readonly tagName = "cui-page-intro";

  connectedCallback(): void {
    this.adoptStyles();
    if (!this.shadowRoot?.querySelector("section")) {
      this.appendShadowTemplate(this.template());
    }
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

export function defineCuiPageIntro(registry = customElements) {
  if (!registry.get(CuiPageIntro.tagName)) {
    registry.define(CuiPageIntro.tagName, CuiPageIntro);
  }
}