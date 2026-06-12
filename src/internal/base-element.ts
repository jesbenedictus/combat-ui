const sheetCache = new Map<string, CSSStyleSheet>();

export type CombatStyles = CSSStyleSheet | CSSStyleSheet[] | string | string[];

const constructableSupported = "adoptedStyleSheets" in Document.prototype && "replaceSync" in CSSStyleSheet.prototype;

export function supportsConstructableStyleSheets(): boolean {
  return constructableSupported;
}

export function cssStyleSheet(cssText: string): CSSStyleSheet {
  let sheet = sheetCache.get(cssText);

  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheetCache.set(cssText, sheet);
  }

  return sheet;
}

function normalizeStyles(styles: CombatStyles): Array<CSSStyleSheet | string> {
  return Array.isArray(styles) ? styles : [styles];
}

export class CombatElement extends HTMLElement {
  static readonly styles: CombatStyles = [];
  public static readonly tagName: string;

  private rendered: boolean = false;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  protected renderTemplate(html: string): void {
    this.adoptStyles();
    if (!this.shadowRoot || this.rendered) {
      return;
    }
    this.rendered = true;
    this.appendShadowTemplate(html);
  }

  protected setNullableAttribute(name: string, value: string | number | null): void {
    if (value === null || value === "") {
      this.removeAttribute(name);
    } else {
      this.setAttribute(name, String(value));
    }
  }

  protected setCssVar(variable: string, value: string | null): void {
    if (value === null) {
      this.style.removeProperty(variable);
    } else {
      this.style.setProperty(variable, value);
    }
  }

  private adoptStyles(): void {
   const root = this.shadowRoot;
   if (!root || root.adoptedStyleSheets.length > 0) return;

   const styles = (this.constructor as typeof CombatElement).styles;
   const list = Array.isArray(styles) ? styles : [styles];
   root.adoptedStyleSheets = list.map((s) =>
    typeof s === "string" ? cssStyleSheet(s) : s,
   );
  }

  private appendShadowTemplate(html: string): void {
    if (!this.shadowRoot) {
      return;
    }

    const template = document.createElement("template");
    template.innerHTML = html;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  private hasAdoptedStyles(): boolean {
    if (!this.shadowRoot) {
      return false;
    }

    return (
      this.shadowRoot.querySelector("style[data-combat-ui='styles']") !== null ||
      this.shadowRoot.adoptedStyleSheets.length > 0
    );
  }
}

export interface CombatElementConstructor {
  new (): CombatElement;
  readonly tagName: string;
}

export function defineElement(
  ctor: CombatElementConstructor,
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(ctor.tagName)) {
    registry.define(ctor.tagName, ctor);
  }
}