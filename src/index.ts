import { defineCuiButton, CuiButton } from "./components/button";

export { CuiButton, defineCuiButton };

export function defineCombatUi(
  registry: CustomElementRegistry = customElements
): void {
  defineCuiButton(registry);
}

defineCombatUi()