import buttonCss from "./button.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

type ButtonType = "button" | "submit" | "reset";

const booleanAttributes = ["disabled", "download"] as const;
const stringAttributes = ["href", "target", "rel", "type"] as const;

/**
 * Renders a `<button>` or `<a>` with shared visual styling and disabled state
 * handling. Choose anchor mode by setting the `href` attribute, and button mode by omitting it.
 * 
 * @element cui-button
 * 
 * @attr {boolean} disabled = Disables the underlying control. For anchor mode this also prevents navigation.
 * @attr {string} href - When set, the button renders as an anchor (`<a>`) instead of a `<button>`. The value is applied to the anchor's `href` attribute.
 * @attr {string} target - Anchor target (e.g. `_blank`). Only applies when `href` is set.
 * @attr {string} rel - Anchor relationship. Only applies when `href` is set.
 * @attr {"button" | "submit" | "reset"} type - Button type. Only applies when `href` is not set. Defaults to `"button"`.
 * 
 * @example
 * <cui-button type="submit">Save</cui-button>
 * <cui-button href="/docs" target="_blank" rel="noopener">Documentation</cui-button>
 */
export class CuiButton extends CombatElement {
  static override tagName = "cui-button";
  static override styles = [cssStyleSheet(buttonCss)];

  static get observedAttributes(): string[] {
    return [...booleanAttributes, ...stringAttributes];
  }

  connectedCallback(): void {
    this.render();
    this.sync();
  }

  attributeChangedCallback(): void {
    this.render();
    this.sync();
  }

  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }

  get href(): string | null {
    return this.getAttribute("href");
  }

  set href(value: string | null) {
    this.setNullableAttribute("href", value);
  }

  get target(): string | null {
    return this.getAttribute("target");
  }

  set target(value: string | null) {
    this.setNullableAttribute("target", value);
  }

  get rel(): string | null {
    return this.getAttribute("rel");
  }

  set rel(value: string | null) {
    this.setNullableAttribute("rel", value);
  }

  get type(): ButtonType {
    const value = this.getAttribute("type");

    if (value === "submit" || value === "reset") {
      return value;
    }

    return "button";
  }

  set type(value: ButtonType | null) {
    this.setNullableAttribute("type", value);
  }

  private render(): void {
    const shouldRenderLink = this.hasAttribute("href");
    const currentControl = this.control;
    const currentIsLink = currentControl?.localName === "a";

    if (currentControl && shouldRenderLink === currentIsLink) {
      return;
    }

    currentControl?.remove();

    this.renderTemplate(
      shouldRenderLink
        ? `
          <a class="control" part="button">
            <slot></slot>
          </a>
        `
        : `
          <button class="control" part="button" type="button">
            <slot></slot>
          </button>
        `
    );

    this.control?.addEventListener("click", (event) => {
      if (this.disabled) {
        event.preventDefault();
      }
    });
  }

  private sync(): void {
    const control = this.control;

    if (!control) {
      return;
    }

    if (control instanceof HTMLButtonElement) {
      control.disabled = this.disabled;
      control.type = this.type;
      return;
    }

    control.href = this.href ?? "#";
    control.toggleAttribute("download", this.hasAttribute("download"));
    control.toggleAttribute("aria-disabled", this.disabled);
    control.tabIndex = this.disabled ? -1 : 0;

    this.syncOptionalAttribute(control, "rel");
    this.syncOptionalAttribute(control, "target");
  }

  private get control(): HTMLButtonElement | HTMLAnchorElement | null {
    return this.shadowRoot?.querySelector(".control") ?? null;
  }

  private setNullableAttribute(name: string, value: string | null): void {
    if (value === null || value === "") {
      this.removeAttribute(name);
      return;
    }

    this.setAttribute(name, value);
  }

  private syncOptionalAttribute(
    element: HTMLElement,
    name: "rel" | "target"
  ): void {
    const value = this.getAttribute(name);

    if (value) {
      element.setAttribute(name, value);
      return;
    }

    element.removeAttribute(name);
  }
}