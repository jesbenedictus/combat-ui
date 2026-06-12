import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import { installRemoteTrigger } from "../../internal/remote-trigger";
import disclosureCss from "./disclosure.css?inline";

export interface CuiDisclosureToggleDetail {
  open: boolean;
}

/**
 * Lightweight custom element that wraps a native `<details>` element so it can
 * be opened, closed, or toggled by ID from anywhere on the page, and so its
 * open state is observable as an attribute and a custom event.
 *
 * The `<details>` element stays in the light DOM, so it's contents remain
 * searchable, indexable, and stylable from the host page.
 *
 * @element cui-disclosure
 *
 * @slot - A single `<details>` element with its `<summary>` and body. The 
 *  element does not render its own UI - it only observes and controls the nested `<details>`.
 * 
 * @attr {boolean} open - Reflects the inner `<details>.open`. Set or remove
 *  this attribute to open/close the disclosure; the attribute also updates
 *  when the user toggles the disclosure by clicking the `<summary>` directly.
 * 
 * @fires {CustomEvent<CuiDisclosureToggleDetail>} cui-disclosure-toggle - 
 *  Bubbles after the disclosure opens/closes. `detail.open` is the new state.
 * 
 * @example
 * <!-- Standalone -->
 * <cui-disclosure id="faq-shipping">
 *   <details>
 *     <summary>What are the shipping options?</summary>
 *     <p>We offer standard, expedited, and overnight shipping options.</p>
 *   </details>
 * </cui-disclosure>
 * 
 * @example
 * <!-- Controlled from a remote trigger anywhere on the page -->
 * <button type="button" data-cui-disclosure-target="faq-shipping">
 *   Toggle Shipping FAQ
 * </button>
 * <button type="button"
 *         data-cui-disclosure-target="faq-shipping"
 *         data-cui-disclosure-action="open">
 *   Open shipping FAQ
 * </button>
 */
export class CuiDisclosure extends CombatElement {
  static override tagName = "cui-disclosure";
  static override styles = [cssStyleSheet(disclosureCss)];
  static observedAttributes = ["open"];

  private readonly toggleHandler = (event: Event) => this.handleToggle(event);
  private boundDetails: HTMLDetailsElement | null = null;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);
    this.bindDetails();
      installRemoteTrigger("data-cui-disclosure-target", (disclosure, trigger) => {
        if (disclosure instanceof CuiDisclosure) {
          const action = trigger.getAttribute("data-cui-disclosure-action");
          if (action === "open") disclosure.open();
          else if (action === "close") disclosure.close();
          else disclosure.toggle();
        }
      });
  }

  disconnectedCallback(): void {
    this.boundDetails?.removeEventListener("toggle", this.toggleHandler);
    this.boundDetails = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name !== "open" || !this.isConnected || oldValue === newValue) return;
    const details = this.details;
    if (!details) return;
    const shouldBeOpen = newValue !== null;
    if (details.open !== shouldBeOpen) {
      details.open = shouldBeOpen;
    }
  }

  get details(): HTMLDetailsElement | null {
    return this.querySelector(":scope > details");
  }

  get isOpen(): boolean {
    return this.details?.open ?? false;
  }

  open(): void {
    const details = this.details;
    if (details && !details.open) details.open = true;
  }

  close(): void {
    const details = this.details;
    if (details && details.open) details.open = false;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private bindDetails(): void {
    const details = this.details;
    if (details === this.boundDetails) return;
    this.boundDetails?.removeEventListener("toggle", this.toggleHandler);
    this.boundDetails = details;
    if (!details) return;
    details.addEventListener("toggle", this.toggleHandler);
    if (this.hasAttribute("open")) {
      details.open = true;
    } else if (details.open) {
      this.setAttribute("open", "");
    }
  }

  private handleToggle(event: Event): void {
    if (event.target !== this.details) return;
    const open = this.isOpen;
    this.toggleAttribute("open", open);
    this.dispatchEvent(
      new CustomEvent<CuiDisclosureToggleDetail>("cui-disclosure-toggle", {
        detail: { open },
        bubbles: true,
      }),
    );
  }
}

