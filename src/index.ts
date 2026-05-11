import "./index.css";
import { defineCuiButton, CuiButton } from "./components/button";
import {
  defineCuiThemeToggle,
  CuiThemeToggle,
  getTheme,
  setTheme,
  type Theme,
} from "./components/theme-toggle";
import { CuiNavbar, defineCuiNavbar } from "./components/navbar";
import { CuiCode, defineCuiCode } from "./components/code";
import { CuiTabs, defineCuiTabs } from "./components/tabs";
import { CuiHero, defineCuiHero } from "./components/hero";
import { CuiPageIntro, defineCuiPageIntro } from "./components/page-intro";
import {
  CuiScrollStage,
  defineCuiScrollStage,
} from "./components/scroll-stage";
import { CuiReveal, defineCuiReveal } from "./components/reveal";
import { CuiTree, defineCuiTree } from "./components/tree";

export { CuiThemeToggle, getTheme, setTheme, defineCuiThemeToggle, type Theme };
export { CuiButton, defineCuiButton };
export { CuiNavbar, defineCuiNavbar };
export { CuiCode, defineCuiCode };
export { CuiTabs, defineCuiTabs };
export { CuiHero, defineCuiHero };
export { CuiPageIntro, defineCuiPageIntro };
export { CuiScrollStage, defineCuiScrollStage };
export { CuiReveal, defineCuiReveal };
export { CuiTree, defineCuiTree };
export type {
  CuiTreeDropPosition,
  CuiTreeDropDetail,
  CuiTreeItemDetail,
  CuiTreeContextDetail,
} from "./components/tree";
export {
  attachCuiParallax,
  getScrollCoordinator,
  type ParallaxHandle,
  type ParallaxOptions,
  type ParallaxRegistration,
  type ScrollStageHandle,
  type ScrollStageOptions,
  type ScrollStageState,
} from "./internal/scroll-coordinator";

export function defineCombatUi(
  registry: CustomElementRegistry = customElements,
): void {
  defineCuiButton(registry);
  defineCuiNavbar(registry);
  defineCuiThemeToggle(registry);
  defineCuiCode(registry);
  defineCuiTabs(registry);
  defineCuiHero(registry);
  defineCuiPageIntro(registry);
  defineCuiScrollStage(registry);
  defineCuiReveal(registry);
  defineCuiTree(registry);
}

defineCombatUi();
