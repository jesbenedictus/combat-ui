import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import disclosureCss from "./disclosure.css?inline";

export interface CuiDisclosureToggleDetail {
  open: boolean;
}

let triggerListenerInstalled = false;

function installTriggerListener(): void {
  if (triggerListenerInstalled) return;
  triggerListenerInstalled = true;
  document.addEventListener("click", (event) => {
    const trigger = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          node.hasAttribute("data-cui-disclosure-target"),
      );
    if (!trigger) return;
    const id = trigger.getAttribute("data-cui-disclosure-target");
    if (!id) return;
    const disclosure = document.getElementById(id);
    if (disclosure instanceof CuiDisclosure) {
      event.preventDefault();
      const action = trigger.getAttribute("data-cui-disclosure-action");
      if (action === "open") disclosure.open();
      else if (action === "close") disclosure.close();
      else disclosure.toggle();
    }
  });
}

export class CuiDisclosure extends CombatElement {
  static readonly tagName = "cui-disclosure";
  static override styles = [cssStyleSheet(disclosureCss)];
  static observedAttributes = ["open"];

  private readonly toggleHandler = (event: Event) => this.handleToggle(event);
  private boundDetails: HTMLDetailsElement | null = null;

  connectedCallback(): void {
    this.adoptStyles();
    if (!this.shadowRoot?.querySelector("slot")) {
      this.appendShadowTemplate(`<slot></slot>`);
    }
    this.bindDetails();
    installTriggerListener();
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

export function defineCuiDisclosure(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiDisclosure.tagName)) {
    registry.define(CuiDisclosure.tagName, CuiDisclosure);
  }
}
