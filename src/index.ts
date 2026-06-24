import {
  CuiArticleFilter,
} from "./components/article-filter";
import { CuiButton } from "./components/button";
import { CuiCalendar } from "./components/calendar";
import { CuiCarousel } from "./components/carousel";
import { CuiCode } from "./components/code";
import { CuiCookieBanner } from "./components/cookie-banner";
import { CuiDayPlanner } from "./components/day-planner";
import { CuiDisclosure } from "./components/disclosure";
import { CuiField } from "./components/field";
import { CuiForm } from "./components/form";
import { CuiModal } from "./components/modal";
import { CuiNavbar } from "./components/navbar";
import { CuiReveal } from "./components/reveal";
import {
  CuiScrollStage,
} from "./components/scroll-stage";
import { CuiTabs } from "./components/tabs";
import {
  CuiThemeToggle,
  getTheme,
  setTheme,
  type Theme,
} from "./components/theme-toggle";
import {
  CuiToastRegion,
  toast,
} from "./components/toast";
import { CuiTree } from "./components/tree";
import { CuiMap } from "./components/map";
import { defineElement } from "./internal/base-element";

export type { CuiArticleFilterChangeDetail } from "./components/article-filter";
export type { CuiCarouselChangeDetail } from "./components/carousel";
export type {
  CuiCookieCategory,
  CuiCookieConsent,
  CuiCookieConsentChangeDetail,
  CuiCookieConsentReason,
} from "./components/cookie-banner";
export type {
  EventCardData,
} from "./internal/event-cards";
export type {
  CuiCalendarDaySelectDetail,
  CuiCalendarEventSelectDetail,
  CuiCalendarNavigateDetail,
  CuiCalendarWeekdayStart,
} from "./components/calendar";
export type {
  CuiDayPlannerEventSelectDetail,
  CuiDayPlannerNavigateDetail,
  CuiDayPlannerSlotSelectDetail,
} from "./components/day-planner";
export type { CuiDisclosureToggleDetail } from "./components/disclosure";
export type {
  CuiFieldControl,
  CuiFieldInvalidDetail,
  CuiFieldValidator,
  CuiFieldValidDetail,
} from "./components/field";
export type {
  CuiFormErrorDetail,
  CuiFormSubmitDetail,
  CuiFormSubmitHandler,
} from "./components/form";
export type { CuiModalCloseDetail } from "./components/modal";
export type {
  CuiToastHandle,
  CuiToastOptions,
  CuiToastPlacement,
  CuiToastTone,
  CuiToastVariant,
} from "./components/toast";
export type {
  CuiTreeContextDetail,
  CuiTreeDropDetail,
  CuiTreeDropPosition,
  CuiTreeItemDetail,
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
export {
  CuiArticleFilter,
  CuiButton,
  CuiCalendar,
  CuiCarousel,
  CuiCode,
  CuiCookieBanner,
  CuiDayPlanner,
  CuiDisclosure,
  CuiField,
  CuiForm,
  CuiModal,
  CuiNavbar,
  CuiReveal,
  CuiScrollStage,
  CuiTabs,
  CuiThemeToggle,
  CuiToastRegion,
  CuiTree,
  CuiMap,
  getTheme,
  setTheme,
  toast,
  type Theme,
};

export function defineCombatUi(
  registry: CustomElementRegistry = customElements,
): void {
  const allElements = [
    CuiButton, CuiNavbar, CuiThemeToggle, CuiCode, CuiTabs,
    CuiScrollStage, CuiReveal, CuiTree, CuiField, CuiForm,
    CuiModal, CuiToastRegion, CuiDisclosure, CuiMap,
    CuiArticleFilter, CuiCalendar, CuiDayPlanner, CuiCookieBanner,
    CuiCarousel,
  ] as const;
  for (const Element of allElements) {
    defineElement(Element, registry);
  }
}
