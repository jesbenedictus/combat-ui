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

export class CuiForm extends CombatElement {
  static readonly tagName = "cui-form";
  static override styles = [cssStyleSheet(formCss)];

  private abortController: AbortController | null = null;
  private submitHandler: CuiFormSubmitHandler | null = null;

  connectedCallback(): void {
    this.adoptStyles();
    if (!this.shadowRoot?.querySelector("slot")) {
      this.appendShadowTemplate(`<slot></slot>`);
    }
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

export function defineCuiForm(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiForm.tagName)) {
    registry.define(CuiForm.tagName, CuiForm);
  }
}