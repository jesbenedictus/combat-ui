import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import style from "./navbar.css?inline";

export class CuiNavbar extends CombatElement {
  static readonly tagName = "cui-navbar";
  static override styles = [cssStyleSheet(style)];

  private abortController: AbortController | null = null;

  connectedCallback(): void {
    this.adoptStyles();

    if (!this.shadowRoot?.querySelector("nav")) {
      this.appendShadowTemplate(`
        <nav part="nav" aria-label="Primary">
          <div class="bar" part="bar">
            <div class="brand" part="brand">
              <slot name="brand"></slot>
            </div>
            <button class="toggle" part="toggle" type="button" aria-expanded="false">
              <span class="toggle-lines" aria-hidden="true"></span>
              <span class="sr-only">Toggle navigation</span>
            </button>
          </div>
          <div class="collapse" part="collapse">
            <div class="collapse-panel" part="collapse-panel">
              <div class="links" part="links">
                <slot name="nav"></slot>
              </div>
              <div class="actions" part="actions">
                <slot name="actions"></slot>
              </div>
            </div>
          </div>
        </nav>
      `);
      this.shadowRoot
        ?.querySelector(".toggle")
        ?.addEventListener("click", () => this.toggle());
      this.addEventListener("click", (event) => this.handleClick(event));
      this.addEventListener("keydown", (event) => this.handleKeyDown(event));
    }
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

  get stickyOffset(): number {
    const offset = this.getAttribute("sticky-offset");
    return offset ? parseInt(offset) : 0;
  }
  set stickyOffset(value: number | string | null) {
    if (value === null || value === "") {
      this.removeAttribute("sticky-offset");
      return;
    }
    this.setAttribute("sticky-offset", value.toString());
  }

  get stickyZIndex(): number {
    const zIndex = this.getAttribute("sticky-z-index");
    return zIndex ? parseInt(zIndex) : 0;
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
        dropdown !== exceptDropdown &&
        !dropdown.contains(exceptDropdown)
      ) {
        dropdown.removeAttribute("data-open");
      }
    });
    this.syncDropdowns();
  }

  private sync(): void {
    const toggle = this.shadowRoot?.querySelector(".toggle");
    const collapse = this.shadowRoot?.querySelector(".collapse");

    if (!toggle || !collapse) {
      return;
    }

    const expanded = this.expanded;
    const collapseId = this.id ? `${this.id}-collapse` : "cui-navbar-collapse";
    this.setAttribute("aria-controls", collapseId);
    toggle.setAttribute("aria-expanded", expanded.toString());
  }

  private syncStickyOptions(): void {
    const stickyOffset = this.stickyOffset;
    const stickyZIndex = this.stickyZIndex;

    if (stickyOffset) {
      this.style.setProperty("--cui-navbar-sticky-offset", `${stickyOffset}`);
    } else {
      this.style.removeProperty("--cui-navbar-sticky-offset");
    }

    if (stickyZIndex) {
      this.style.setProperty("--cui-navbar-sticky-z-index", `${stickyZIndex}`);
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

      const menuId = menu.id || `${this.id || "cui-navbar"}-dropdown-${index}`;
      const expanded = dropdown.hasAttribute("data-open");
      menu.id = menuId;
      toggle.setAttribute("aria-controls", menuId);
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      menu.toggleAttribute("hidden", !expanded);
    });
  }

  private bindDocumentEvents(): void {
    if (this.abortController) {
      return;
    }

    this.abortController = new AbortController();
    document.addEventListener(
      "click",
      (event) => {
        if (!event.composedPath().includes(this)) {
          this.closeDropdowns();
        }
      },
      { signal: this.abortController?.signal }
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
    this.closeDropdowns(shouldOpen ? dropdown : null);
    dropdown.toggleAttribute("data-open", shouldOpen);
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
