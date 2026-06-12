import articleFilterCss from "./article-filter.css?inline";
import { CombatElement, cssStyleSheet, type CombatElementConstructor } from "../../internal/base-element";

export interface CuiArticleFilterChangeDetail {
  values: string[];
  multi: boolean;
  visibleCount: number;
}

const CARD_SELECTOR = ".cui-article-card";
const TARGET_SELECTOR = ".cui-article-grid, .cui-article-list";

/**
 * Filters a sibling or selector-targeted list of article cards by category.
 * Reads `data-category` from each `.cui-article-card` and shows/hides cards
 * based on which radio/checkbox inputs inside the filter are checked.
 * 
 * @element cui-article-filter
 * 
 * @slot - Radio or checkbox inputs (typically wrapped in labels). Each input's
 *   `value` is matched against the `data-category` on the target cards.
 * 
 * @attr {string} target - CSS selector for the element containing the cards.
 *   If omitted, the filter will look for a sibling `.cui-article-grid` or `.cui-article-list` to filter.
 * 
 * @fires {CustomEvent<CuiArticleFilterChangeDetail>} cui-article-filter-change - 
 *   Fires when the visible-category set changes. `detail.selected` is the array of currently checked values.
 * 
 * @example
 * <cui-article-filter target="#news-grid">
 *   <label><input type="checkbox" value="product"> Product</label>
 *   <label><input type="checkbox" value="company"> Company</label>
 * </cui-article-filter>
 * <div id="news-grid" class="cui-article-grid">
 *   <article class="cui-article-card" data-category="product">...</article>
 *   <article class="cui-article-card" data-category="company">...</article>
 * </div>
 */
export class CuiArticleFilter extends CombatElement {
  static override tagName = "cui-article-filter";
  static override readonly styles = [cssStyleSheet(articleFilterCss)];
  static observedAttributes = ["target"];

  private abortController: AbortController | null = null;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);

    this.bindEvents();
    this.applyFilter();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  attributeChangedCallback(name: string): void {
    if (name === "target" && this.isConnected) {
      this.applyFilter();
    }
  }

  /** Selected category values from checked radios / checkboxes inside the filter. */
  get selectedValues(): string[] {
    const inputs = this.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]:checked, input[type="checkbox"]:checked',
    );
    return Array.from(inputs, (input) => input.value);
  }

  /** Re-read children and recompute visibility. Call after dynamic updates. */
  refresh(): void {
    if (this.isConnected) this.applyFilter();
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.addEventListener(
      "change",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type !== "radio" && target.type !== "checkbox") return;
        this.applyFilter();
      },
      { signal },
    );
  }

  private applyFilter(): void {
    const targetElement = this.resolveTarget();
    if (!targetElement) return;

    const values = this.selectedValues;
    const showAll = values.length === 0 || values.includes("");
    const allowed = new Set(values);
    const cards = targetElement.querySelectorAll<HTMLElement>(CARD_SELECTOR);

    let visibleCount = 0;
    for (const card of cards) {
      const category = card.dataset.category ?? "";
      const matches = showAll || allowed.has(category);
      card.toggleAttribute("hidden", !matches);
      if (matches) visibleCount += 1;
    }

    this.dispatchEvent(
      new CustomEvent<CuiArticleFilterChangeDetail>("cui-article-filter-change", {
        detail: {
          values,
          multi: this.isMulti(),
          visibleCount,
        },
        bubbles: true,
      }),
    );
  }

  private resolveTarget(): HTMLElement | null {
    const selector = this.getAttribute("target");
    if (selector) {
      const matched = (this.getRootNode() as Document | ShadowRoot).querySelector?.(selector);
      if (matched instanceof HTMLElement) return matched;
      const fromDoc = document.querySelector<HTMLElement>(selector);
      if (fromDoc) return fromDoc;
    }

    let sibling = this.nextElementSibling;
    while (sibling) {
      if (sibling instanceof HTMLElement && sibling.matches(TARGET_SELECTOR)) {
        return sibling;
      }
      const nested = sibling.querySelector?.(TARGET_SELECTOR);
      if (nested instanceof HTMLElement) return nested;
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  private isMulti(): boolean {
    return this.querySelector('input[type="checkbox"]') !== null;
  }
}