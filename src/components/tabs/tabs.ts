import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import { findInComposedPath } from "../../internal/dom";
import tabsCss from "./tabs.css?inline";

/**
 * Tabbed interface with ARIA `tablist`/`tab`/`tabpanel` roles and full
 * keyboard support (Left/Right, Home/End). Tabs and panels are slotted so
 * crawlers see all panel content regardless of which tab is active.
 *
 * @element cui-tabs
 *
 * @slot tab - One tab control per tab. Use `<button>` elements; the element
 *   wires up `id`, `aria-controls`, and `aria-selected` automatically.
 * @slot panel - One panel per tab, in the same order as the tab slots.
 *
 * @example
 * <cui-tabs>
 *   <button slot="tab">Overview</button>
 *   <button slot="tab">Pricing</button>
 *   <section slot="panel"><p>Overview content.</p></section>
 *   <section slot="panel"><p>Pricing content.</p></section>
 * </cui-tabs>
 */
export class CuiTabs extends CombatElement {
  static override tagName = "cui-tabs";
  static override styles = [cssStyleSheet(tabsCss)];

  private eventsBound = false;

  connectedCallback(): void {
    this.renderTemplate(`
      <div part="tablist" role="tablist">
      <slot name="tab"></slot>
      </div>
      <div part="panels">
      <slot name="panel"></slot>
      </div>
      `);
      
    if (!this.eventsBound) {
      this.eventsBound = true;
      this.addEventListener("click", (event) => this.handleClick(event));
      this.addEventListener("keydown", (event) => this.handleKeydown(event));
      this.shadowRoot?.querySelectorAll("slot").forEach((slot) => {
        slot.addEventListener("slotchange", () => this.sync());
      });
    }

    this.sync();
  }

  private handleClick(event: MouseEvent): void {
    const tab = findInComposedPath(event, "[slot='tab']");

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
      tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ??
      tabs[0];

    tabs.forEach((tab, index) => {
      const panel = panels[index];
      const tabId = tab.id || `${this.id || "cui-tabs"}-tab-${index}`;
      const panelId = panel?.id || `${this.id || "cui-tabs"}-panel-${index}`;

      tab.id = tabId;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panelId);
      tab.setAttribute("tabindex", tab === selectedTab ? "0" : "-1");
      tab.setAttribute("aria-selected", tab === selectedTab ? "true" : "false");

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
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
      tab.setAttribute("tabindex", isSelected ? "0" : "-1");
      const panel = panels[index];

      if (panel) {
        panel.hidden = !isSelected;
      }
    });
  }

  private tabs(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>("[slot='tab']"));
  }

  private panels(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>("[slot='panel']"));
  }
}

