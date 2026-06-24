import { CombatElement } from "../../internal/base-element";
import { findInComposedPath } from "../../internal/dom";

/**
 * Tabbed interface with ARIA `tablist`/`tab`/`tabpanel` roles and full
 * keyboard support (Left/Right, Home/End). The element renders no styling of
 * its own — it enhances light-DOM markup built from the `.cui-tabs`,
 * `.cui-tablist`, and `.cui-tab` classes, wiring up `id`, `aria-controls`,
 * `aria-selected`, roles, and panel visibility. All panels stay in the light
 * DOM so crawlers see every panel regardless of which tab is active.
 *
 * Tabs are the `.cui-tab` controls inside the `.cui-tablist`; panels are the
 * remaining direct children of the element, paired with the tabs by source
 * order. Mark the initially-open tab with `aria-selected="true"` (defaults to
 * the first tab).
 *
 * @element cui-tabs
 *
 * @example
 * <cui-tabs>
 *   <div class="cui-tablist">
 *     <button class="cui-tab" aria-selected="true">Overview</button>
 *     <button class="cui-tab">Pricing</button>
 *   </div>
 *   <section>Overview content.</section>
 *   <section>Pricing content.</section>
 * </cui-tabs>
 */
export class CuiTabs extends CombatElement {
  static override tagName = "cui-tabs";

  private eventsBound = false;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);

    if (!this.eventsBound) {
      this.eventsBound = true;
      this.addEventListener("click", (event) => this.handleClick(event));
      this.addEventListener("keydown", (event) => this.handleKeydown(event));
      this.shadowRoot
        ?.querySelector("slot")
        ?.addEventListener("slotchange", () => this.sync());
    }

    this.sync();
  }

  private handleClick(event: MouseEvent): void {
    const tab = findInComposedPath(event, ".cui-tab");

    if (tab) {
      this.selectTab(tab);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const target = event.target as HTMLElement;
    const index = tabs.indexOf(target);

    if (index === -1) {
      return;
    }

    const keyActions: Record<string, () => HTMLElement | undefined> = {
      ArrowLeft: () => tabs.at(index - 1),
      ArrowRight: () => tabs.at((index + 1) % tabs.length),
      Home: () => tabs[0],
      End: () => tabs.at(-1),
    };
    const nextTab = keyActions[event.key]?.();

    if (nextTab) {
      event.preventDefault();
      this.selectTab(nextTab);
      nextTab.focus();
    }
  }

  private sync(): void {
    const tabs = this.tabs();
    const panels = this.panels();
    const selectedTab =
      tabs.find((tab) => tab.getAttribute("data-selected") === "true") ??
      tabs[0];

    tabs.forEach((tab, index) => {
      const panel = panels[index];
      const tabId = tab.id || `${this.id || "cui-tabs"}-tab-${index}`;
      const panelId = panel?.id || `${this.id || "cui-tabs"}-panel-${index}`;

      tab.id = tabId;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panelId);
      tab.setAttribute("tabindex", tab === selectedTab ? "0" : "-1");
      tab.setAttribute("data-selected", tab === selectedTab ? "true" : "false");

      if (panel) {
        panel.id = panelId;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", tabId);
        panel.hidden = tab !== selectedTab;
      }
    });
  }

  private selectTab(selectedTab: HTMLElement): void {
    const panels = this.panels();

    this.tabs().forEach((tab, index) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute("data-selected", isSelected ? "true" : "false");
      tab.setAttribute("tabindex", isSelected ? "0" : "-1");
      const panel = panels[index];

      if (panel) {
        panel.hidden = !isSelected;
      }
    });
  }

  private tabs(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(".cui-tab"));
  }

  private panels(): HTMLElement[] {
    return Array.from(this.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !child.classList.contains("cui-tablist"),
    );
  }
}
