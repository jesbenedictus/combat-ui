import themeToggleStyles from "./theme-toggle.css?inline";

import { CombatElement, cssStyleSheet } from "../../internal/base-element";

const themes = ["auto", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

const themeChangeEvent = "cui-theme-change";
const themeStorageKey = "cui-theme";

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

/**
 * Button that cycles the page theme through `auto`, `light`, and `dark`. The
 * choice is persisted in `localStorage` under `cui-theme` and read at boot
 * (see the inline script in the docs `<head>`). Pairs with the exported
 * `getTheme()` / `setTheme()` helpers for programmatic control.
 *
 * @element cui-theme-toggle
 *
 * @attr {string} label-auto - Visible label when in auto mode.
 * @attr {string} label-light - Visible label when in light mode.
 * @attr {string} label-dark - Visible label when in dark mode.
 * @attr {string} aria-label-auto - Accessible name when in auto mode.
 * @attr {string} aria-label-light - Accessible name when in light mode.
 * @attr {string} aria-label-dark - Accessible name when in dark mode.
 *
 * @example
 * <cui-theme-toggle
 *   label-auto="Auto" label-light="Light" label-dark="Dark">
 * </cui-theme-toggle>
 */
export class CuiThemeToggle extends CombatElement {
  static override tagName = "cui-theme-toggle";

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

  private eventsBound = false;

  private readonly handleThemeChange = () => {
    this.render();
  };

  connectedCallback() {
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
    this.renderTemplate(`
      <button part="button" type="button">
        <span part="icon" aria-hidden="true"></span>
        <span part="label"></span>
      </button>
    `);
    if (!this.eventsBound) {
      this.eventsBound = true;
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
  applyTheme(normalizedTheme);
  storeTheme(normalizedTheme);
}

function applyTheme(theme: Theme): void {
  const currentTheme = getTheme();

  if (theme === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }

  if (theme !== currentTheme) {
    document.dispatchEvent(
      new CustomEvent(themeChangeEvent, { detail: { theme } }),
    );
  }
}

function loadStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage?.getItem(themeStorageKey);
    return themes.includes(stored as Theme) ? (stored as Theme) : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage?.setItem(themeStorageKey, theme);
  } catch {
    // localStorage may be unavailable (private mode, disabled, sandboxed iframe).
  }
}

if (typeof document !== "undefined") {
  const stored = loadStoredTheme();
  if (stored !== null) {
    applyTheme(stored);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== themeStorageKey) {
      return;
    }
    const next = event.newValue;
    applyTheme(themes.includes(next as Theme) ? (next as Theme) : "auto");
  });
}

