import { CuiButton, defineCuiButton } from "./components/button";
import { CuiCode, defineCuiCode } from "./components/code";
import { CuiCta, defineCuiCta } from "./components/cta";
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
import {
  CuiToastRegion,
  defineCuiToastRegion,
  toast,
} from "./components/toast";
import { CuiTree, defineCuiTree } from "./components/tree";
import "./index.css";

export type {
  CuiFieldControl, CuiFieldInvalidDetail, CuiFieldValidator, CuiFieldValidDetail
} from "./components/field";
export type {
  CuiFormErrorDetail, CuiFormSubmitDetail, CuiFormSubmitHandler
} from "./components/form";
export type { CuiModalCloseDetail } from "./components/modal";
export type {
  CuiToastHandle, CuiToastOptions, CuiToastPlacement, CuiToastTone, CuiToastVariant
} from "./components/toast";
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
export { CuiButton, CuiCode, CuiCta, CuiField, CuiForm, CuiHero, CuiModal, CuiNavbar, CuiPageIntro, CuiReveal, CuiScrollStage, CuiTabs, CuiThemeToggle, CuiToastRegion, CuiTree, defineCuiButton, defineCuiCode, defineCuiCta, defineCuiField, defineCuiForm, defineCuiHero, defineCuiModal, defineCuiNavbar, defineCuiPageIntro, defineCuiReveal, defineCuiScrollStage, defineCuiTabs, defineCuiThemeToggle, defineCuiToastRegion, defineCuiTree, getTheme, setTheme, toast, type Theme };

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
  defineCuiToastRegion(registry);
  defineCuiCta(registry);
}

defineCombatUi();
