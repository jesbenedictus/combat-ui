import { CombatElement } from "../../internal/base-element";
import { valueWithUnit } from "../../internal/css-helpers";
import { findInComposedPath } from "../../internal/dom";
import { installRemoteTrigger } from "../../internal/remote-trigger";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Vertical side-rail navigation with a collapsible icon-only mini-rail and an
 * off-canvas mobile drawer. The element renders no styling of its own — it
 * enhances light-DOM markup built from the `.cui-sidenav` class family,
 * injecting the collapse toggle, the mobile dismiss button, and the backdrop,
 * and wiring up collapse, drawer, sticky, focus-trap, scroll-lock, and ARIA
 * behavior. All brand / nav / action content stays in the light DOM so it
 * remains semantic, searchable, and SEO-friendly.
 *
 * The toggle, dismiss button, and backdrop are the chrome the component owns:
 * they are created and ARIA-wired by the element rather than authored, so their
 * contracts can't be mis-authored per page. Everything else is plain
 * `.cui-sidenav-*` markup.
 *
 * Open the drawer on mobile from anywhere on the page with a remote trigger:
 * a `data-cui-sidenav-target="<id>"` attribute whose value is the sidenav's id.
 *
 * @element cui-sidenav
 *
 * @attr {boolean} expanded - Off-canvas drawer state (below 48rem). Toggled by
 *   a remote trigger or the injected dismiss button; can also be set
 *   programmatically.
 * @attr {boolean} collapsed - Icon-only mini-rail state (≥48rem). Toggled by the
 *   injected collapse button.
 * @attr {string} side - `start` (default) or `end`. Docks the rail and slides
 *   the mobile drawer from that side.
 * @attr {boolean} sticky - Enables `position: sticky` + full-height rail at ≥48rem.
 * @attr {string} sticky-offset - CSS length used as `inset-block-start` while sticky.
 * @attr {string} sticky-z-index - CSS `z-index` for the off-canvas drawer.
 *
 * @fires {CustomEvent} cui-sidenav-open - Fires after the mobile drawer opens.
 * @fires {CustomEvent} cui-sidenav-close - Fires after the mobile drawer closes.
 * @fires {CustomEvent<{collapsed: boolean}>} cui-sidenav-collapse - Fires after
 *   the mini-rail collapses or expands.
 *
 * @example
 * <cui-sidenav id="main-sidenav" class="cui-sidenav" sticky>
 *   <div class="cui-sidenav-inner">
 *     <div class="cui-sidenav-header">
 *       <a class="cui-sidenav-brand" href="/">
 *         <span class="cui-sidenav-logo" aria-hidden="true">◆</span>
 *         <span class="cui-sidenav-label">Combat UI</span>
 *       </a>
 *     </div>
 *     <nav class="cui-sidenav-nav" aria-label="Primary">
 *       <a class="cui-nav-link" href="/" aria-current="page">
 *         <span class="cui-sidenav-icon" aria-hidden="true">▣</span>
 *         <span class="cui-sidenav-label">Dashboard</span>
 *       </a>
 *     </nav>
 *     <div class="cui-sidenav-footer"><cui-theme-toggle></cui-theme-toggle></div>
 *   </div>
 * </cui-sidenav>
 */
export class CuiSidenav extends CombatElement {
  static override tagName = "cui-sidenav";
  static observedAttributes = [
    "expanded",
    "collapsed",
    "sticky",
    "sticky-offset",
    "sticky-z-index",
  ];

  private static instanceCounter = 0;
  private sidenavId = `cui-sidenav-${++CuiSidenav.instanceCounter}`;
  private mobileQuery: MediaQueryList | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private scrollLocked = false;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);
    if (!this.id) {
      this.id = this.sidenavId;
    }
    this.ensureChrome();
    this.bindEvents();
    this.syncStickyOptions();
    this.sync();
    installRemoteTrigger("data-cui-sidenav-target", (target) => {
      if (target instanceof CuiSidenav) {
        target.toggle();
      }
    });
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }
    this.syncStickyOptions();
    this.sync();
    if (name === "expanded") {
      this.onExpandedChange();
    } else if (name === "collapsed") {
      this.dispatchEvent(
        new CustomEvent<{ collapsed: boolean }>("cui-sidenav-collapse", {
          detail: { collapsed: this.collapsed },
          bubbles: true,
        }),
      );
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.lockScroll(false);
  }

  get expanded(): boolean {
    return this.hasAttribute("expanded");
  }
  set expanded(value: boolean) {
    this.toggleAttribute("expanded", value);
  }

  get collapsed(): boolean {
    return this.hasAttribute("collapsed");
  }
  set collapsed(value: boolean) {
    this.toggleAttribute("collapsed", value);
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
    this.setNullableAttribute("sticky-offset", value);
  }

  get stickyZIndex(): number {
    const zIndex = this.getAttribute("sticky-z-index");
    return zIndex ? Number.parseInt(zIndex, 10) : 0;
  }
  set stickyZIndex(value: number | string | null) {
    this.setNullableAttribute("sticky-z-index", value);
  }

  /** Whether the viewport is below the 48rem drawer breakpoint. */
  get isMobile(): boolean {
    return this.mobileQuery?.matches ?? false;
  }

  /** Open / close the off-canvas mobile drawer. */
  toggle(force?: boolean): void {
    this.expanded = force ?? !this.expanded;
  }

  open(): void {
    this.expanded = true;
  }

  close(): void {
    this.expanded = false;
  }

  /** Collapse / expand the icon-only mini-rail. */
  collapse(force?: boolean): void {
    this.collapsed = force ?? !this.collapsed;
  }

  private get header(): HTMLElement | null {
    return this.querySelector<HTMLElement>(".cui-sidenav-header");
  }

  private get inner(): HTMLElement | null {
    return this.querySelector<HTMLElement>(".cui-sidenav-inner");
  }

  private get collapseToggle(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>(".cui-sidenav-toggle");
  }

  /**
   * Injects the backdrop, collapse toggle, and dismiss button (once each) and
   * wires their ARIA. These are chrome the author never writes, so the
   * contracts stay component-managed. CSS shows the collapse toggle only at
   * ≥48rem and the dismiss button only below it, so the header carries exactly
   * one visible control per breakpoint.
   */
  private ensureChrome(): void {
    if (!this.querySelector(":scope > .cui-sidenav-backdrop")) {
      const backdrop = document.createElement("div");
      backdrop.className = "cui-sidenav-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      this.appendChild(backdrop);
    }

    const header = this.header;
    if (!header) {
      return;
    }

    if (!header.querySelector(":scope > .cui-sidenav-toggle")) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "cui-sidenav-toggle";
      toggle.setAttribute("aria-pressed", String(this.collapsed));
      toggle.setAttribute("aria-controls", this.id);
      toggle.innerHTML =
        '<span class="cui-visually-hidden">Collapse sidebar</span>';
      header.appendChild(toggle);
    }

    if (!header.querySelector(":scope > .cui-sidenav-dismiss")) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "cui-sidenav-dismiss";
      dismiss.setAttribute("aria-label", "Close navigation");
      dismiss.setAttribute("aria-controls", this.id);
      header.appendChild(dismiss);
    }
  }

  private bindEvents(): void {
    const signal = this.freshSignal();

    this.addEventListener("click", (event) => this.handleClick(event), {
      signal,
    });
    this.addEventListener("keydown", (event) => this.handleKeyDown(event), {
      signal,
    });

    this.mobileQuery = window.matchMedia("(width < 48rem)");
    this.mobileQuery.addEventListener("change", () => this.onMediaChange(), {
      signal,
    });
  }

  private handleClick(event: MouseEvent): void {
    if (findInComposedPath(event, ".cui-sidenav-toggle")) {
      this.collapse();
      return;
    }
    if (findInComposedPath(event, ".cui-sidenav-dismiss")) {
      this.close();
      return;
    }
    if (findInComposedPath(event, ".cui-sidenav-backdrop")) {
      this.close();
      return;
    }
    // On mobile, navigating via a link dismisses the drawer.
    if (
      this.isMobile &&
      this.expanded &&
      findInComposedPath(event, ".cui-sidenav-nav a[href]")
    ) {
      this.close();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isMobile || !this.expanded) {
      return;
    }
    if (event.key === "Escape") {
      this.close();
    } else if (event.key === "Tab") {
      this.trapTab(event);
    }
  }

  private onMediaChange(): void {
    // Crossing to desktop turns the drawer into a persistent rail — release the
    // scroll lock so the page scrolls normally.
    if (!this.isMobile) {
      this.lockScroll(false);
    }
    this.sync();
  }

  private onExpandedChange(): void {
    if (!this.isMobile) {
      return;
    }
    if (this.expanded) {
      this.previouslyFocused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      this.lockScroll(true);
      this.focusFirst();
      this.dispatchEvent(new CustomEvent("cui-sidenav-open", { bubbles: true }));
    } else {
      this.lockScroll(false);
      this.previouslyFocused?.focus();
      this.previouslyFocused = null;
      this.dispatchEvent(
        new CustomEvent("cui-sidenav-close", { bubbles: true }),
      );
    }
  }

  private sync(): void {
    const toggle = this.collapseToggle;
    if (toggle) {
      const label = this.collapsed ? "Expand sidebar" : "Collapse sidebar";
      toggle.setAttribute("aria-pressed", String(this.collapsed));
      toggle.setAttribute("aria-label", label);
      const sr = toggle.querySelector(".cui-visually-hidden");
      if (sr) {
        sr.textContent = label;
      }
    }

    document
      .querySelectorAll<HTMLElement>(`[data-cui-sidenav-target="${this.id}"]`)
      .forEach((trigger) => {
        trigger.setAttribute("aria-expanded", String(this.expanded));
        if (!trigger.hasAttribute("aria-controls")) {
          trigger.setAttribute("aria-controls", this.id);
        }
      });
  }

  private syncStickyOptions(): void {
    this.setCssVar(
      "--cui-sidenav-sticky-offset",
      valueWithUnit(this.stickyOffset, "px"),
    );
    const zIndex = this.stickyZIndex;
    this.setCssVar("--cui-sidenav-z-index", zIndex ? String(zIndex) : null);
  }

  private focusableItems(): HTMLElement[] {
    const root = this.inner;
    if (!root) {
      return [];
    }
    return Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  private focusFirst(): void {
    this.focusableItems()[0]?.focus();
  }

  private trapTab(event: KeyboardEvent): void {
    const items = this.focusableItems();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      return;
    }
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private lockScroll(locked: boolean): void {
    if (locked === this.scrollLocked) {
      return;
    }
    this.scrollLocked = locked;
    document.body.style.overflow = locked ? "hidden" : "";
  }
}
