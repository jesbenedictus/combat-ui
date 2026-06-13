import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import { installRemoteTrigger } from "../../internal/remote-trigger";
import modalCss from "./modal.css?inline";

export interface CuiModalCloseDetail {
  returnValue: string;
}

/**
 * Modal dialog built over the native `<dialog>` element. Backdrop dismiss,
 * ESC handling, and focus management come from the platform; this element
 * adds attribute control, an open/close JS API, typed close events, and
 * remote triggering via `data-cui-modal-target` from anywhere on the page.
 *
 * @element cui-modal
 *
 * @slot - The dialog body. Wrap with a `<div>` or semantic landmark; include
 *   a close affordance (any element with `data-cui-modal-close`) for users
 *   who can't dismiss via ESC.
 *
 * @attr {boolean} open - Reflects the dialog's open state. Set or remove to
 *   open/close imperatively.
 *
 * @fires {CustomEvent} cui-modal-open - Fires after the dialog opens.
 * @fires {CustomEvent<CuiModalCloseDetail>} cui-modal-close - Fires after
 *   the dialog closes. `detail.returnValue` carries the dialog's
 *   `returnValue` (set via `close(value)` or `<form method="dialog">`).
 * @fires {CustomEvent} cui-modal-cancel - Fires when the user cancels via
 *   ESC or backdrop click (before `cui-modal-close`).
 *
 * @example
 * <button type="button" data-cui-modal-target="confirm-delete">Delete</button>
 *
 * <cui-modal id="confirm-delete">
 *   <h2>Delete this item?</h2>
 *   <p>This cannot be undone.</p>
 *   <cui-button data-cui-modal-close>Cancel</cui-button>
 *   <cui-button data-cui-modal-close="confirm">Delete</cui-button>
 * </cui-modal>
 */
export class CuiModal extends CombatElement {
  static override tagName = "cui-modal";
  static override styles = [cssStyleSheet(modalCss)];
  static observedAttributes = ["open"];

  private abortController: AbortController | null = null;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);
    this.bindEvents();
    installRemoteTrigger("data-cui-modal-target", (modal, trigger) => {
      if (modal instanceof CuiModal) {
        modal.open();
      }
    });
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
