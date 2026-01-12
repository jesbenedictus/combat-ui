import themeToggleStyles from "./theme-toggle.css?inline";

import {
  CombatElement,
  cssStyleSheet,
  type CombatStyles,
} from "../../internal/base-element";

const themes = ["auto", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

const themeChangeEvent = "cui-theme-change";

const defaultLabels: Record<Theme, string> = {
  auto: "Theme: auto",
  light: "Theme: light",
  dark: "Theme: dark",
};

const defaultAriaLabels: Record<Theme, string> = {
  auto: "Current theme: auto. Change theme.",
  light: "Current theme: light. Change theme.",
  dark: "Current theme: dark. Change theme.",
};

export class CuiThemeToggle extends CombatElement {
  static readonly tagName = "cui-theme-toggle";

  static override styles = [cssStyleSheet(themeToggleStyles)];

  static get observedAttributes() {
    return [
      "label-auto",
      "label-light",
      "label-dark",
      "aria-label-auto",
      "aria-label-light",
      "aria-label-dark",
    ];
  }

  private readonly handleThemeChange = () => {
    this.render();
  };

  connectedCallback() {
    this.adoptStyles();
    this.render();
    document.addEventListener(themeChangeEvent, this.handleThemeChange);
  }

  disconnectedCallback() {
    document.removeEventListener(themeChangeEvent, this.handleThemeChange);
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    if (!this.shadowRoot?.querySelector("button")) {
      this.appendShadowTemplate(`
        <button part="button" type="button">
          <span part="icon" aria-hidden="true"></span>
          <span part="label"></span>
        </button>
      `);

      this.shadowRoot
        ?.querySelector("button")
        ?.addEventListener("click", () => this.cycleTheme());
    }

    const theme = getTheme();
    const label = this.shadowRoot?.querySelector("[part='label']");
    const icon = this.shadowRoot?.querySelector("[part='icon']");

    if (label) {
      label.textContent = this.getLabel(theme);
    }
    if (icon) {
      icon.textContent = theme === "dark" ? "D" : theme === "light" ? "L" : "A";
    }

    this.shadowRoot
      ?.querySelector("button")
      ?.setAttribute("aria-label", this.getAriaLabel(theme));
  }

  private cycleTheme() {
    const currentIndex = themes.indexOf(getTheme());
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme ?? "auto");
  }

  private getLabel(theme: Theme): string {
    return this.getAttribute(`label-${theme}`) ?? defaultLabels[theme];
  }

  private getAriaLabel(theme: Theme): string {
    return this.getAttribute(`aria-label-${theme}`) ?? defaultAriaLabels[theme];
  }
}

export function getTheme(): Theme {
  const theme = document.documentElement.dataset.theme;

  return themes.includes(theme as Theme) ? (theme as Theme) : "auto";
}

export function setTheme(theme: Theme) {
  const normalizedTheme = themes.includes(theme) ? theme : "auto";
  const currentTheme = getTheme();

  if (normalizedTheme === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = normalizedTheme;
  }

  if (normalizedTheme !== currentTheme) {
    document.dispatchEvent(
      new CustomEvent(themeChangeEvent, { detail: { theme: normalizedTheme } }),
    );
  }
}

export function defineCuiThemeToggle(registry = customElements) {
  if (!registry.get("cui-theme-toggle")) {
    registry.define("cui-theme-toggle", CuiThemeToggle);
  }
}
