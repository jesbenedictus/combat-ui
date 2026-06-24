import { CombatElement } from "../../internal/base-element";
import { valueWithUnit } from "../../internal/css-helpers";
import { findInComposedPath } from "../../internal/dom";

/**
 * Responsive site navigation with collapsible mobile panel, nested dropdowns,
 * and optional sticky positioning. The element renders no styling of its own —
 * it enhances light-DOM markup built from the `.cui-navbar` class family,
 * injecting the burger toggle button and wiring up collapse, dropdown, sticky,
 * and ARIA behavior. All brand/nav/action content stays in the light DOM so it
 * remains semantic, searchable, and SEO-friendly.
 *
 * The burger button is the one piece of chrome the component owns: it is
 * created and ARIA-wired by the element rather than authored, so the
 * `aria-expanded` / `aria-controls` contract can't be mis-authored per page.
 * Everything else is plain `.cui-navbar-*` markup.
 *
 * @element cui-navbar
 *
 * @attr {boolean} expanded - Mobile collapse panel state. Toggled by the
 *   injected burger button; can also be set programmatically.
 * @attr {boolean} sticky - Enables `position: sticky` on the navbar.
 * @attr {string} sticky-offset - CSS length used as `top` while sticky
 *   (e.g. `0`, `var(--cui-space-2)`).
 * @attr {string} sticky-z-index - CSS `z-index` while sticky.
 *
 * @example
 * <cui-navbar class="cui-navbar" sticky sticky-offset="0">
 *   <div class="cui-navbar-inner">
 *     <div class="cui-navbar-bar">
 *       <a class="cui-navbar-brand" href="/">Combat UI</a>
 *     </div>
 *     <div class="cui-navbar-collapse">
 *       <div class="cui-navbar-collapse-panel">
 *         <nav class="cui-nav cui-navbar-nav" aria-label="Primary">
 *           <a class="cui-nav-link" href="/components" aria-current="page">Components</a>
 *           <div class="cui-dropdown">
 *             <button class="cui-nav-link cui-dropdown-toggle" type="button">Resources</button>
 *             <div class="cui-dropdown-menu" hidden>
 *               <a class="cui-dropdown-item" href="/docs">Docs</a>
 *               <a class="cui-dropdown-item" href="/blog">Blog</a>
 *             </div>
 *           </div>
 *         </nav>
 *         <div class="cui-navbar-actions"><cui-theme-toggle></cui-theme-toggle></div>
 *       </div>
 *     </div>
 *   </div>
 * </cui-navbar>
 */
export class CuiNavbar extends CombatElement {
  static override tagName = "cui-navbar";
  static observedAttributes = [
    "expanded",
    "sticky",
    "sticky-offset",
    "sticky-z-index",
  ];

  private static instanceCounter = 0;
  private collapseId = `cui-navbar-collapse-${++CuiNavbar.instanceCounter}`;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);
    this.ensureToggle();
    this.bindEvents();
    this.sync();
    this.syncStickyOptions();
    this.syncDropdowns();
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

  /** The burger button this element owns, if it has been injected yet. */
  private get toggleButton(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>(".cui-navbar-toggle");
  }

  /**
   * Injects the burger toggle into `.cui-navbar-bar` (once) and wires its
   * `aria-controls` to the `.cui-navbar-collapse` panel. The button is chrome
   * the author never writes, so its ARIA contract stays component-managed.
   */
  private ensureToggle(): void {
    const bar = this.querySelector<HTMLElement>(".cui-navbar-bar");
    if (!bar || bar.querySelector(":scope > .cui-navbar-toggle")) return;

    const collapse = this.querySelector<HTMLElement>(".cui-navbar-collapse");
    if (collapse && !collapse.id) collapse.id = this.collapseId;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "cui-navbar-toggle";
    toggle.setAttribute("aria-expanded", String(this.expanded));
    if (collapse?.id) toggle.setAttribute("aria-controls", collapse.id);
    toggle.innerHTML =
      '<span class="cui-navbar-toggle-lines" aria-hidden="true"></span>' +
      '<span class="cui-visually-hidden">Toggle navigation</span>';
    bar.appendChild(toggle);
  }

  private sync(): void {
    this.toggleButton?.setAttribute("aria-expanded", String(this.expanded));
  }

  private syncStickyOptions(): void {
    const offset = this.stickyOffset;
    const zIndex = this.stickyZIndex;

    // Numeric strings get px; anything with a unit/function passes through.
    this.setCssVar("--cui-navbar-sticky-offset", valueWithUnit(offset, "px"));
    this.setCssVar(
      "--cui-navbar-sticky-z-index",
      zIndex ? String(zIndex) : null,
    );
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
    const signal = this.freshSignal();

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
    const burger = findInComposedPath(event, ".cui-navbar-toggle");
    if (burger && this.contains(burger)) {
      this.toggle();
      return;
    }

    const toggle = findInComposedPath(event, ".cui-dropdown-toggle");

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
