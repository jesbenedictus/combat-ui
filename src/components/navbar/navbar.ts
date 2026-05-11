import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import style from "./navbar.css?inline";

export class CuiNavbar extends CombatElement {
  static readonly tagName = "cui-navbar";
  static override styles = [cssStyleSheet(style)];
  static observedAttributes = [
    "expanded",
    "sticky",
    "sticky-offset",
    "sticky-z-index",
  ];

  private abortController: AbortController | null = null;
  private static instanceCounter = 0;
  private collapseId = `cui-navbar-collapse-${++CuiNavbar.instanceCounter}`;

  connectedCallback(): void {
    this.adoptStyles();

    if (!this.shadowRoot?.querySelector("nav")) {
      this.appendShadowTemplate(this.template());
    }

    this.bindEvents();
    this.sync();
    this.syncStickyOptions();
    this.syncDropdowns();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  attributeChangedCallback(): void {
    this.sync();
    this.syncStickyOptions();
  }

  get expanded(): boolean {
    return this.hasAttribute("expanded");
  }
  set expanded(value: boolean) {
    this.toggleAttribute("expanded", value);
  }

  get sticky(): boolean {
    return this.hasAttribute("sticky");
  }
  set sticky(value: boolean) {
    this.toggleAttribute("sticky", value);
  }

  get stickyOffset(): string | null {
    return this.getAttribute("sticky-offset");
  }
  set stickyOffset(value: string | number | null) {
    if (value === null || value === "") {
      this.removeAttribute("sticky-offset");
      return;
    }
    this.setAttribute("sticky-offset", String(value));
  }

  get stickyZIndex(): number {
    const zIndex = this.getAttribute("sticky-z-index");
    return zIndex ? Number.parseInt(zIndex, 10) : 0;
  }
  set stickyZIndex(value: number | string | null) {
    if (value === null || value === "") {
      this.removeAttribute("sticky-z-index");
      return;
    }
    this.setAttribute("sticky-z-index", value.toString());
  }

  toggle(force?: boolean): void {
    const expanded = force ?? !this.expanded;
    this.expanded = expanded;
  }

  closeDropdowns(exceptDropdown: HTMLElement | null = null): void {
    this.querySelectorAll(".cui-dropdown[data-open]").forEach((dropdown) => {
      if (
        exceptDropdown &&
        (dropdown === exceptDropdown || dropdown.contains(exceptDropdown))
      ) {
        return; // keep the clicked dropdown + its ancestors open
      }
      dropdown.removeAttribute("data-open");
    });
    this.syncDropdowns();
  }

  private template(): string {
    return `
      <nav part="nav" aria-label="Primary">
        <div class="bar" part="bar">
          <div class="brand" part="brand">
            <slot name="brand"></slot>
          </div>
          <button class="toggle" part="toggle" type="button"
                  aria-expanded="false" aria-controls="${this.collapseId}">
            <span class="toggle-lines" aria-hidden="true"></span>
            <span class="sr-only">Toggle navigation</span>
          </button>
        </div>
        <div id="${this.collapseId}" class="collapse" part="collapse">
          <div class="collapse-panel" part="collapse-panel">
            <div class="links" part="links"><slot name="nav"></slot></div>
            <div class="actions" part="actions"><slot name="actions"></slot></div>
          </div>
        </div>
      </nav>
    `;
  }

  private sync(): void {
    const toggle = this.shadowRoot?.querySelector(".toggle");

    if (!toggle) {
      return;
    }

    toggle.setAttribute("aria-expanded", String(this.expanded));
  }

  private syncStickyOptions(): void {
    const offset = this.stickyOffset;
    const zIndex = this.stickyZIndex;

    if (offset) {
      // Numeric strings get px; anything with a unit/function passes through.
      const value = /^-?\d+(\.\d+)?$/.test(offset) ? `${offset}px` : offset;
      this.style.setProperty("--cui-navbar-sticky-offset", value);
    } else {
      this.style.removeProperty("--cui-navbar-sticky-offset");
    }

    if (zIndex) {
      this.style.setProperty("--cui-navbar-sticky-z-index", String(zIndex));
    } else {
      this.style.removeProperty("--cui-navbar-sticky-z-index");
    }
  }

  private syncDropdowns(): void {
    this.querySelectorAll(".cui-dropdown").forEach((dropdown, index) => {
      const toggle = dropdown.querySelector(":scope > .cui-dropdown-toggle");
      const menu = dropdown.querySelector(":scope > .cui-dropdown-menu");

      if (!toggle || !menu) {
        return;
      }

      const menuId = menu.id || `${this.collapseId}-dropdown-menu-${index}`;
      const expanded = dropdown.hasAttribute("data-open");
      menu.id = menuId;
      toggle.setAttribute("aria-controls", menuId);
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      menu.toggleAttribute("hidden", !expanded);
    });
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.shadowRoot
      ?.querySelector(".toggle")
      ?.addEventListener("click", () => this.toggle(), { signal });
    this.addEventListener("click", (event) => this.handleClick(event), {
      signal,
    });
    this.addEventListener("keydown", (event) => this.handleKeyDown(event), {
      signal,
    });
    document.addEventListener(
      "click",
      (event) => {
        if (!event.composedPath().includes(this)) {
          this.closeDropdowns();
        }
      },
      { signal },
    );
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") {
      return;
    }
    this.closeDropdowns();
    this.removeAttribute("expanded");
    this.sync();
  }

  private handleClick(event: MouseEvent): void {
    const toggle = event.composedPath().find((node): node is HTMLElement => {
      return (
        node instanceof HTMLElement && node.matches(".cui-dropdown-toggle")
      );
    });

    if (!toggle) {
      return;
    }

    const dropdown = toggle.closest<HTMLElement>(".cui-dropdown");
    if (!dropdown || !dropdown.contains(toggle)) {
      return;
    }

    event.preventDefault();

    const shouldOpen = !dropdown.hasAttribute("data-open");
    if (shouldOpen) {
      this.closeDropdowns(dropdown);
      dropdown.setAttribute("data-open", "");
    } else {
      dropdown.removeAttribute("data-open");
      dropdown
        .querySelectorAll<HTMLElement>(".cui-dropdown[data-open]")
        .forEach((nested) => nested.removeAttribute("data-open"));
    }
    this.syncDropdowns();
  }
}

export function defineCuiNavbar(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiNavbar.tagName)) {
    registry.define(CuiNavbar.tagName, CuiNavbar);
  }
}
