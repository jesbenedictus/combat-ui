import { CombatElement, cssStyleSheet, defineElement } from "../../internal/base-element";
import toastCss from "./toast.css?inline";

export type CuiToastVariant = "info" | "success" | "warning" | "danger";

export type CuiToastTone = "outline" | "filled" | "solid";

export type CuiToastPlacement =
  | "start-start"
  | "start-center"
  | "start-end"
  | "end-start"
  | "end-center"
  | "end-end";

export interface CuiToastOptions {
  message: string;
  title?: string;
  variant?: CuiToastVariant;
  tone?: CuiToastTone;
  duration?: number;
  placement?: CuiToastPlacement;
}

export interface CuiToastHandle {
  readonly element: HTMLElement;
  dismiss(): void;
  update(options: Partial<CuiToastOptions>): void;
}

interface CuiToastFn {
  (options: CuiToastOptions): CuiToastHandle;
  info(message: string, options?: Partial<CuiToastOptions>): CuiToastHandle;
  success(message: string, options?: Partial<CuiToastOptions>): CuiToastHandle;
  warning(message: string, options?: Partial<CuiToastOptions>): CuiToastHandle;
  danger(message: string, options?: Partial<CuiToastOptions>): CuiToastHandle;
}

const VARIANT_ICONS: Record<CuiToastVariant, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "✕",
};

/**
 * Container for transient toast notifications. Usually created on demand by
 * the exported `toast()` function — you only place this element yourself if
 * you want to control placement or pre-render a region for SSR. Each region
 * is identified by its `placement`; calls to `toast()` are routed to the
 * region matching their requested placement, or a new region is created.
 *
 * @element cui-toast-region
 *
 * @slot - Toast elements. Normally populated by `toast()`; manual children
 *   are allowed and remain in DOM until dismissed.
 *
 * @attr {"block-start-inline-start" | "block-start-inline-end" | "block-end-inline-start" | "block-end-inline-end" | "block-start-center" | "block-end-center"} placement -
 *   Region anchor point. Default `block-end-inline-end` (bottom-right).
 *
 * @example
 * // Imperative — preferred:
 * import { toast } from '@combat-ui/core';
 * toast.success('Saved.', { duration: 3000 });
 *
 * @example
 * <!-- Declarative — only when you need a fixed placement region: -->
 * <cui-toast-region placement="block-start-center"></cui-toast-region>
 */
export class CuiToastRegion extends CombatElement {
  static override tagName = "cui-toast-region";
  static override styles = [cssStyleSheet(toastCss)];
  static observedAttributes = ["placement"];

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);

    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", "Notifications");
    }
    if (!this.hasAttribute("aria-live")) {
      this.setAttribute("aria-live", "polite");
    }
  }

  get placement(): CuiToastPlacement {
    return (
      (this.getAttribute("placement") as CuiToastPlacement | null) ?? "end-end"
    );
  }
}

const regionCache = new Map<CuiToastPlacement, CuiToastRegion>();

function ensureRegion(placement: CuiToastPlacement): CuiToastRegion {
  defineElement(CuiToastRegion);
  const cached = regionCache.get(placement);
  if (cached?.isConnected) return cached;
  const existing = document.querySelector<CuiToastRegion>(
    `cui-toast-region[placement="${placement}"]`,
  );
  if (existing) {
    regionCache.set(placement, existing);
    return existing;
  }
  const region = document.createElement(
    CuiToastRegion.tagName,
  ) as CuiToastRegion;
  region.setAttribute("placement", placement);
  document.body.appendChild(region);
  regionCache.set(placement, region);
  return region;
}

function renderAlert(options: CuiToastOptions): HTMLElement {
  const variant = options.variant ?? "info";
  const el = document.createElement("div");
  el.className = "cui-alert";
  el.setAttribute("data-variant", variant);
  if (options.tone) el.setAttribute("data-tone", options.tone);
  el.setAttribute(
    "role",
    variant === "danger" || variant === "warning" ? "alert" : "status",
  );
  el.innerHTML = `
    <span class="cui-alert-icon" aria-hidden="true"></span>
    <div class="cui-alert-body">
      <p class="cui-alert-title" hidden></p>
      <p class="cui-alert-message"></p>
    </div>
    <button type="button" class="cui-alert-dismiss" data-cui-dismiss aria-label="Dismiss">&times;</button>
  `;
  applyContent(el, options);
  return el;
}

function applyContent(el: HTMLElement, options: CuiToastOptions): void {
  const variant = options.variant ?? "info";
  const iconEl = el.querySelector(".cui-alert-icon");
  const titleEl = el.querySelector<HTMLElement>(".cui-alert-title");
  const messageEl = el.querySelector(".cui-alert-message");

  if (iconEl) iconEl.textContent = VARIANT_ICONS[variant];
  if (titleEl) {
    if (options.title) {
      titleEl.textContent = options.title;
      titleEl.hidden = false;
    } else {
      titleEl.textContent = "";
      titleEl.hidden = true;
    }
  }
  if (messageEl) messageEl.textContent = options.message;
}

function dismissAlert(el: HTMLElement): void {
  if (el.hasAttribute("data-cui-dismissing")) return;
  el.setAttribute("data-cui-dismissing", "");

  let done = false;
  const cleanup = (): void => {
    if (done) return;
    done = true;
    el.dispatchEvent(new CustomEvent("cui-alert-dismiss", { bubbles: true }));
    el.remove();
  };

  const style = getComputedStyle(el);
  const durations = style.transitionDuration
    .split(",")
    .map((d) => parseFloat(d))
    .filter((n) => !Number.isNaN(n));
  const longestSec = durations.length ? Math.max(...durations) : 0;

  if (longestSec > 0) {
    el.addEventListener("transitionend", cleanup, { once: true });
    window.setTimeout(cleanup, longestSec * 1000 + 80);
  } else {
    cleanup();
  }
}

let dismissHandlerInstalled = false;

function installDismissHandler(): void {
  if (dismissHandlerInstalled) return;
  dismissHandlerInstalled = true;
  document.addEventListener("click", (event) => {
    const dismisser = event
      .composedPath()
      .find(
        (n): n is HTMLElement =>
          n instanceof HTMLElement && n.hasAttribute("data-cui-dismiss"),
      );
    if (!dismisser) return;
    const alert = dismisser.closest<HTMLElement>(".cui-alert");
    if (alert) dismissAlert(alert);
  });
}

function createToast(options: CuiToastOptions): CuiToastHandle {
  const placement = options.placement ?? "end-end";
  const region = ensureRegion(placement);
  const element = renderAlert(options);
  region.appendChild(element);

  let currentOptions: CuiToastOptions = { ...options };
  let timer: number | null = null;

  const startTimer = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    const duration = currentOptions.duration ?? 4000;
    if (duration > 0) {
      timer = window.setTimeout(() => handle.dismiss(), duration);
    }
  };

  const handle: CuiToastHandle = {
    get element() {
      return element;
    },
    dismiss() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      dismissAlert(element);
    },
    update(next) {
      currentOptions = { ...currentOptions, ...next };
      applyContent(element, currentOptions);
      if (next.variant) {
        element.setAttribute("data-variant", next.variant);
        element.setAttribute(
          "role",
          next.variant === "danger" || next.variant === "warning"
            ? "alert"
            : "status",
        );
      }
      if ("tone" in next) {
        if (next.tone) {
          element.setAttribute("data-tone", next.tone);
        } else {
          element.removeAttribute("data-tone");
        }
      }
      startTimer();
    },
  };

  startTimer();
  return handle;
}

export const toast: CuiToastFn = Object.assign(createToast, {
  info: (message: string, opts: Partial<CuiToastOptions> = {}) =>
    createToast({ ...opts, message, variant: "info" }),
  success: (message: string, opts: Partial<CuiToastOptions> = {}) =>
    createToast({ ...opts, message, variant: "success" }),
  warning: (message: string, opts: Partial<CuiToastOptions> = {}) =>
    createToast({ ...opts, message, variant: "warning" }),
  danger: (message: string, opts: Partial<CuiToastOptions> = {}) =>
    createToast({ ...opts, message, variant: "danger" }),
});

