import { CuiButton, defineCuiButton } from "./components/button";
import { CuiCode, defineCuiCode } from "./components/code";
import { CuiField, defineCuiField } from "./components/field";
import { CuiForm, defineCuiForm } from "./components/form";
import { CuiHero, defineCuiHero } from "./components/hero";
import { CuiModal, defineCuiModal } from "./components/modal";
import { CuiNavbar, defineCuiNavbar } from "./components/navbar";
import { CuiPageIntro, defineCuiPageIntro } from "./components/page-intro";
import { CuiReveal, defineCuiReveal } from "./components/reveal";
import {
  CuiScrollStage,
  defineCuiScrollStage,
} from "./components/scroll-stage";
import { CuiTabs, defineCuiTabs } from "./components/tabs";
import {
  CuiThemeToggle,
  defineCuiThemeToggle,
  getTheme,
  setTheme,
  type Theme,
} from "./components/theme-toggle";
import { CuiTree, defineCuiTree } from "./components/tree";
import "./index.css";

export type {
  CuiTreeContextDetail, CuiTreeDropDetail, CuiTreeDropPosition, CuiTreeItemDetail
} from "./components/tree";
export {
  attachCuiParallax,
  getScrollCoordinator,
  type ParallaxHandle,
  type ParallaxOptions,
  type ParallaxRegistration,
  type ScrollStageHandle,
  type ScrollStageOptions,
  type ScrollStageState
} from "./internal/scroll-coordinator";
export { CuiButton, CuiCode, CuiHero, CuiNavbar, CuiPageIntro, CuiReveal, CuiScrollStage, CuiTabs, CuiThemeToggle, CuiTree, defineCuiButton, defineCuiCode, defineCuiHero, defineCuiNavbar, defineCuiPageIntro, defineCuiReveal, defineCuiScrollStage, defineCuiTabs, defineCuiThemeToggle, defineCuiTree, getTheme, setTheme, type Theme };
export { CuiField, defineCuiField };
export type {
  CuiFieldControl,
  CuiFieldValidator,
  CuiFieldInvalidDetail,
  CuiFieldValidDetail,
} from "./components/field";
export { CuiForm, defineCuiForm };
export type {
  CuiFormSubmitHandler,
  CuiFormSubmitDetail,
  CuiFormErrorDetail,
} from "./components/form";
export { CuiModal, defineCuiModal };
export type { CuiModalCloseDetail } from "./components/modal";

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
  defineCuiField(registry);
  defineCuiForm(registry);
  defineCuiModal(registry);
}

defineCombatUi();
