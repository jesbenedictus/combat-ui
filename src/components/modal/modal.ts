import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import modalCss from "./modal.css?inline";

export interface CuiModalCloseDetail {
  returnValue: string;
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
          node.hasAttribute("data-cui-modal-target"),
      );
    if (!trigger) return;
    const id = trigger.getAttribute("data-cui-modal-target");
    if (!id) return;
    const modal = document.getElementById(id);
    if (modal instanceof CuiModal) {
      event.preventDefault();
      modal.open();
    }
  });
}

export class CuiModal extends CombatElement {
  static readonly tagName = "cui-modal";
  static override styles = [cssStyleSheet(modalCss)];
  static observedAttributes = ["open"];

  private abortController: AbortController | null = null;

  connectedCallback(): void {
    this.adoptStyles();
    if (!this.shadowRoot?.querySelector("slot")) {
      this.appendShadowTemplate(`<slot></slot>`);
    }
    this.bindEvents();
    installTriggerListener();
    if (this.hasAttribute("open")) {
      this.open();
    }
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name !== "open" || !this.isConnected) return;
    if (newValue !== null && oldValue === null) {
      this.open();
    } else if (newValue === null && oldValue !== null) {
      this.close();
    }
  }

  get dialog(): HTMLDialogElement | null {
    return this.querySelector("dialog");
  }

  get isOpen(): boolean {
    return this.dialog?.open ?? false;
  }

  get dismissible(): boolean {
    return this.getAttribute("dismissible") !== "false";
  }

  get returnValue(): string {
    return this.dialog?.returnValue ?? "";
  }

  open(): void {
    const dialog = this.dialog;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    this.toggleAttribute("open", true);
    this.dispatchEvent(new CustomEvent("cui-modal-open", { bubbles: true }));
  }

  close(returnValue?: string): void {
    const dialog = this.dialog;
    if (!dialog || !dialog.open) return;
    if (returnValue !== undefined) {
      dialog.close(returnValue);
    } else {
      dialog.close();
    }
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.addEventListener(
      "click",
      (event) => {
        const dialog = this.dialog;
        if (!dialog) return;

        if (event.target === dialog) {
          if (this.dismissible) this.close();
          return;
        }

        const closer = event
          .composedPath()
          .find(
            (node): node is HTMLElement =>
              node instanceof HTMLElement &&
              node.hasAttribute("data-cui-modal-close"),
          );
        if (closer) {
          const value =
            closer.getAttribute("data-cui-modal-close") ||
            closer.getAttribute("value") ||
            "";
          this.close(value);
        }
      },
      { signal },
    );

    this.addEventListener(
      "close",
      (event) => {
        if (event.target !== this.dialog) return;
        this.removeAttribute("open");
        this.dispatchEvent(
          new CustomEvent<CuiModalCloseDetail>("cui-modal-close", {
            detail: { returnValue: this.dialog?.returnValue ?? "" },
            bubbles: true,
          }),
        );
      },
      { signal, capture: true },
    );

    this.addEventListener(
      "cancel",
      (event) => {
        if (event.target !== this.dialog) return;
        const proceeded = this.dispatchEvent(
          new CustomEvent("cui-modal-cancel", {
            bubbles: true,
            cancelable: true,
          }),
        );
        if (!proceeded || !this.dismissible) {
          event.preventDefault();
        }
      },
      { signal, capture: true },
    );
  }
}

export function defineCuiModal(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiModal.tagName)) {
    registry.define(CuiModal.tagName, CuiModal);
  }
}
