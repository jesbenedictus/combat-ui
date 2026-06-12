import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import formCss from "./form.css?inline";
import type { CuiField } from "../field/field";

export type CuiFormSubmitHandler = (
  data: FormData,
  form: HTMLFormElement,
) => void | Promise<void>;

export interface CuiFormSubmitDetail {
  data: FormData;
  form: HTMLFormElement;
}

export interface CuiFormErrorDetail {
  error: unknown;
  form: HTMLFormElement;
}

/**
 * Coordinates submission and validation across child `cui-field` elements.
 * Runs each field's async validators, blocks submit on failures, and
 * surfaces submit / success / error events with typed details. Set a JS
 * submit handler with `setSubmitHandler(fn)`.
 *
 * @element cui-form
 *
 * @slot - A native `<form>` element containing `cui-field`s and a submit
 *   button. The form's `action` and `method` are honored when no JS handler
 *   is attached.
 *
 * @fires {CustomEvent<CuiFormSubmitDetail>} cui-form-submit - Fires when the
 *   form passes validation and is about to submit. `detail.formData` is the
 *   `FormData` snapshot.
 * @fires {CustomEvent<CuiFormSubmitDetail>} cui-form-success - Fires after a
 *   JS submit handler resolves successfully.
 * @fires {CustomEvent<CuiFormErrorDetail>} cui-form-error - Fires when a JS
 *   submit handler rejects. `detail.error` is the thrown value.
 * @fires {CustomEvent} cui-form-invalid - Fires when submission is blocked
 *   because one or more fields failed validation.
 *
 * @example
 * <cui-form id="signup">
 *   <form action="/api/signup" method="post">
 *     <cui-field required>
 *       <label slot="label">Email</label>
 *       <input type="email" name="email" required>
 *     </cui-field>
 *     <cui-button type="submit">Sign up</cui-button>
 *   </form>
 * </cui-form>
 *
 * @example
 * // JS handler — replaces native submission
 * document.getElementById('signup').setSubmitHandler(async ({ formData }) => {
 *   await fetch('/api/signup', { method: 'POST', body: formData });
 * });
 */
export class CuiForm extends CombatElement {
  static override tagName = "cui-form";
  static override styles = [cssStyleSheet(formCss)];

  private abortController: AbortController | null = null;
  private submitHandler: CuiFormSubmitHandler | null = null;

  connectedCallback(): void {
    this.renderTemplate(`<slot></slot>`);
    this.bindEvents();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  get busy(): boolean {
    return this.hasAttribute("busy");
  }
  set busy(value: boolean) {
    this.toggleAttribute("busy", value);
  }

  setSubmitHandler(fn: CuiFormSubmitHandler | null): void {
    this.submitHandler = fn;
  }

  fields(): CuiField[] {
    return Array.from(this.querySelectorAll<CuiField>("cui-field"));
  }

  formElement(): HTMLFormElement | null {
    return this.querySelector("form");
  }

  async validate(): Promise<boolean> {
    const fields = this.fields();
    fields.forEach((field) => field.markTouched());
    const results = await Promise.all(fields.map((f) => f.validate()));
    return results.every(Boolean);
  }

  reset(): void {
    this.formElement()?.reset();
    this.fields().forEach((f) => f.reset());
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    this.addEventListener("submit", (e) => void this.handleSubmit(e), {
      signal,
    });
  }

  private async handleSubmit(event: SubmitEvent): Promise<void> {
    const form = event.target as HTMLFormElement;
    event.preventDefault();
    if (this.busy) return;

    const valid = await this.validate();
    if (!valid) {
      this.dispatchEvent(
        new CustomEvent("cui-form-invalid", { bubbles: true }),
      );
      const firstInvalid = this.fields().find((f) =>
        f.hasAttribute("data-invalid"),
      );
      firstInvalid?.control?.focus();
      return;
    }

    const data = new FormData(form);
    const proceeded = this.dispatchEvent(
      new CustomEvent<CuiFormSubmitDetail>("cui-form-submit", {
        detail: { data, form },
        bubbles: true,
        cancelable: true,
      }),
    );
    if (!proceeded) return;
    if (!this.submitHandler) return;

    this.busy = true;
    try {
      await this.submitHandler(data, form);
      this.dispatchEvent(
        new CustomEvent<CuiFormSubmitDetail>("cui-form-success", {
          detail: { data, form },
          bubbles: true,
        }),
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent<CuiFormErrorDetail>("cui-form-error", {
          detail: { error, form },
          bubbles: true,
        }),
      );
    } finally {
      this.busy = false;
    }
  }
}
