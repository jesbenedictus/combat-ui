import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import tabsCss from "./tabs.css?inline";

export class CuiTabs extends CombatElement {
  static readonly tagName = "cui-tabs";
  static override styles = [cssStyleSheet(tabsCss)];

  connectedCallback(): void {
    this.adoptStyles();

    if (!this.shadowRoot?.querySelector("[part='tablist']")) {
      this.appendShadowTemplate(`
        <div part="tablist" role="tablist">
          <slot name="tab"></slot>
        </div>
        <div part="panels">
          <slot name="panel"></slot>
        </div>
      `);

      this.addEventListener("click", (event) => this.handleClick(event));
      this.addEventListener("keydown", (event) => this.handleKeydown(event));
      this.shadowRoot?.querySelectorAll("slot").forEach((slot) => {
        slot.addEventListener("slotchange", () => this.sync());
      });
    }

    this.sync();
  }

  private handleClick(event: MouseEvent): void {
    const tab = event.composedPath().find((node): node is HTMLElement => {
      return node instanceof HTMLElement && node.matches("[slot='tab']");
    });

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

export function defineCuiTabs(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiTabs.tagName)) {
    registry.define(CuiTabs.tagName, CuiTabs);
  }
}
