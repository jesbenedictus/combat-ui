import "./index.css";
import { defineCuiButton, CuiButton } from "./components/button";
import { defineCuiThemeToggle, CuiThemeToggle, getTheme, setTheme, type Theme } from "./components/theme-toggle";

export { CuiThemeToggle, getTheme, setTheme, defineCuiThemeToggle, type Theme };
export { CuiButton, defineCuiButton };

export function defineCombatUi(
  registry: CustomElementRegistry = customElements
): void {
  defineCuiButton(registry);
  defineCuiThemeToggle(registry);
}

defineCombatUi()