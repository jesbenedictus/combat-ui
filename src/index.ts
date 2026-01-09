import "./index.css";
import { defineCuiButton, CuiButton } from "./components/button";
import { defineCuiThemeToggle, CuiThemeToggle, getTheme, setTheme, type Theme } from "./components/theme-toggle";
import { CuiNavbar, defineCuiNavbar } from "./components/navbar";

export { CuiThemeToggle, getTheme, setTheme, defineCuiThemeToggle, type Theme };
export { CuiButton, defineCuiButton };
export { CuiNavbar, defineCuiNavbar };

export function defineCombatUi(
  registry: CustomElementRegistry = customElements
): void {
  defineCuiButton(registry);
  defineCuiNavbar(registry);
  defineCuiThemeToggle(registry);
}

defineCombatUi()