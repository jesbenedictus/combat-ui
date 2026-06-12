import fieldCss from "./field.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

export type CuiFieldControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export type CuiFieldValidator = (
  value: string,
  control: CuiFieldControl,
) => string | null | Promise<string | null>;

export interface CuiFieldInvalidDetail {
  key: keyof ValidityState;
  message: string;
  params: { min: string; max: string; type: string };
  validity: ValidityState;
  control: CuiFieldControl;
}

export interface CuiFieldValidDetail {
  control: CuiFieldControl;
}

const VALIDITY_KEYS: (keyof ValidityState)[] = [
  "valueMissing",
  "typeMismatch",
  "patternMismatch",
  "tooShort",
  "tooLong",
  "rangeUnderflow",
  "rangeOverflow",
  "stepMismatch",
  "badInput",
  "customError",
];

/**
 * Form-field wrapper that surfaces native `ValidityState` as user-visible
 * messages, supports server-side errors via `setError()`, async validators
 * via `addValidator()`, and i18n via slotted `error-<validityKey>` content.
 * Designed to be a child of `cui-form`, but works standalone.
 *
 * @element cui-field
 *
 * @slot - The form control (`<input>`, `<select>`, `<textarea>`, or a custom
 *   control matching `CuiFieldControl`).
 * @slot label - The field label. Will be associated with the control via
 *   `for=` / `aria-labelledby`.
 * @slot help - Descriptive help text shown beneath the control.
 * @slot error - Generic error message. Used when no `error-<key>` slot
 *   matches the failing validity key.
 * @slot error-{validityKey} - Validity-key-specific error message
 *   (`error-valueMissing`, `error-typeMismatch`, `error-tooShort`, …). The
 *   first matching slot wins.
 *
 * @attr {boolean} required - Mirrors the control's `required` attribute and
 *   marks the field visually as required.
 *
 * @fires {CustomEvent<CuiFieldValidDetail>} cui-field-valid - Fires when the
 *   field transitions to a valid state.
 * @fires {CustomEvent<CuiFieldInvalidDetail>} cui-field-invalid - Fires when
 *   validation fails. `detail.key` is the first failing `ValidityState` key;
 *   `detail.params` carries control-derived values for message interpolation.
 *
 * @example
 * <cui-field required>
 *   <label slot="label">Email</label>
 *   <input type="email" name="email" required>
 *   <span slot="help">We never share your email.</span>
 *   <span slot="error-valueMissing">Email is required.</span>
 *   <span slot="error-typeMismatch">Enter a valid email address.</span>
 * </cui-field>
 */
export class CuiField extends CombatElement {
  static override tagName = "cui-field";
  static override styles = [cssStyleSheet(fieldCss)];
  static observedAttributes = ["required"];

  private abortController: AbortController | null = null;
  private validators: CuiFieldValidator[] = [];
  private externalError: string | null = null;
  private touched = false;
  private static instanceCount = 0;
  private uid = `cui-field-${++CuiField.instanceCount}`;

  connectedCallback(): void {
    this.renderTemplate(this.template());
    this.bindEvents();
    this.sync();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  attributeChangedCallback(): void {
    this.sync();
  }

  get control(): CuiFieldControl | null {
    return this.querySelector<CuiFieldControl>("input, textarea, select");
  }

  get name(): string | null {
    return this.control?.name || null;
  }

  addValidator(validator: CuiFieldValidator): () => void {
    this.validators.push(validator);
    return () => {
      const i = this.validators.indexOf(validator);
      if (i >= 0) this.validators.splice(i, 1);
    };
  }

  setError(message: string | null): void {
    this.externalError = message;
    if (message) this.touched = true;
    this.renderMessage();
  }

  markTouched(): void {
    this.touched = true;
  }

  reset(): void {
    this.touched = false;
    this.externalError = null;
    this.control?.setCustomValidity("");
    this.renderMessage();
  }

  async validate(): Promise<boolean> {
    const control = this.control;
    if (!control) return true;
    control.setCustomValidity("");
    this.externalError = null;

    if (!control.checkValidity()) {
      this.touched = true;
      this.renderMessage();
      return false;
    }

    for (const validator of this.validators) {
      const result = await validator(control.value, control);
      if (result) {
        control.setCustomValidity(result);
        this.externalError = result;
        this.touched = true;
        this.renderMessage();
        return false;
      }
    }
    this.renderMessage();
    return true;
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const defaultSlot =
      this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])");
    defaultSlot?.addEventListener("slotchange", () => this.sync(), { signal });
    const labelSlot =
      this.shadowRoot?.querySelector<HTMLSlotElement>("slot[name='label']");
    labelSlot?.addEventListener(
      "slotchange",
      () => this.syncLabelVisibility(),
      { signal },
    );

    const errorSlots = this.shadowRoot?.querySelectorAll<HTMLSlotElement>(
      "slot[name='errors']",
    );
    errorSlots?.forEach((errorSlot) => {
      errorSlot.addEventListener("slotchange", () => this.renderMessage(), {
        signal,
      });
    });

    this.addEventListener(
      "input",
      () => {
        this.externalError = null;
        this.control?.setCustomValidity("");
        if (this.touched) this.renderMessage();
      },
      { signal, capture: true },
    );

    this.addEventListener(
      "blur",
      () => {
        this.touched = true;
        void this.validate();
      },
      { signal, capture: true },
    );

    this.addEventListener(
      "invalid",
      (event) => {
        event.preventDefault();
        this.touched = true;
        this.renderMessage();
      },
      { signal, capture: true },
    );
  }

  private sync(): void {
    const control = this.control;
    if (!control) return;

    if (!control.id) control.id = `${this.uid}-control`;
    const labelEl =
      this.shadowRoot?.querySelector<HTMLLabelElement>("[part='label']");
    if (labelEl) labelEl.setAttribute("for", control.id);
    this.syncLabelVisibility();

    if (this.hasAttribute("required")) control.required = true;
    if (control.required) control.setAttribute("aria-required", "true");

    this.updateDescribedBy();
    this.renderMessage();
  }

  private syncLabelVisibility(): void {
    const slot =
      this.shadowRoot?.querySelector<HTMLSlotElement>("slot[name='label']");
    const labelEl =
      this.shadowRoot?.querySelector<HTMLLabelElement>("[part='label']");
    if (!slot || !labelEl) return;
    labelEl.hidden = slot.assignedElements().length === 0;
  }

  private updateDescribedBy(): void {
    const control = this.control;
    if (!control) return;

    const help = this.querySelector("[slot='help']");
    const helpId = help ? `${this.uid}-help` : null;
    if (help && !help.id) help.id = helpId!;

    const errorsId = `${this.uid}-errors`;
    const errors =
      this.shadowRoot?.querySelector<HTMLElement>("[part='errors']");
    if (errors) errors.id = errorsId;

    const refs: string[] = [];
    if (help?.id) refs.push(help.id);
    if (this.hasAttribute("data-invalid")) refs.push(errorsId);
    if (refs.length) {
      control.setAttribute("aria-describedby", refs.join(" "));
    } else {
      control.removeAttribute("aria-describedby");
    }
  }

  private renderMessage(): void {
    const control = this.control;
    if (!control) return;

    const failingKey = this.touched ? this.firstFailingKey(control) : null;

    this.toggleAttribute("data-invalid", !!failingKey);
    control.setAttribute("aria-invalid", failingKey ? "true" : "false");

    const errorSlots = this.shadowRoot?.querySelectorAll<HTMLSlotElement>(
      "[part='errors'] slot",
    );
    errorSlots?.forEach((slot) => {
      slot.style.display = "none";
    });

    const fallback = this.shadowRoot?.querySelector<HTMLElement>(
      "[part='error'] .fallback",
    );
    if (fallback) {
      fallback.hidden = true;
      fallback.textContent = "";
    }

    if (!failingKey) {
      this.updateDescribedBy();
      this.dispatchEvent(
        new CustomEvent<CuiFieldValidDetail>("cui-field-valid", {
          detail: { control },
          bubbles: true,
        }),
      );
      return;
    }

    const params = this.params(control);

    const keySlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      `slot[name="error-${failingKey}"]`,
    );
    if (keySlot?.assignedElements().length) {
      keySlot.style.display = "";
      this.updateDescribedBy();
      this.dispatchInvalid(failingKey, control, params);
      return;
    }

    const genericSlot =
      this.shadowRoot?.querySelector<HTMLSlotElement>("slot[name='error']");
    if (genericSlot?.assignedElements().length) {
      genericSlot.style.display = "";
      this.updateDescribedBy();
      this.dispatchInvalid(failingKey, control, params);
      return;
    }

    if (fallback) {
      fallback.textContent = this.externalError ?? control.validationMessage;
      fallback.hidden = false;
    }
    this.updateDescribedBy();
    this.dispatchInvalid(failingKey, control, params);
  }

  private firstFailingKey(
    control: CuiFieldControl,
  ): keyof ValidityState | null {
    const v = control.validity;
    if (v.valid) return null;
    return VALIDITY_KEYS.find((key) => v[key]) ?? null;
  }

  private params(control: CuiFieldControl): CuiFieldInvalidDetail["params"] {
    return {
      min:
        control.getAttribute("minlength") ?? control.getAttribute("min") ?? "",
      max:
        control.getAttribute("maxlength") ?? control.getAttribute("max") ?? "",
      type: control.getAttribute("type") ?? "value",
    };
  }

  private dispatchInvalid(
    key: keyof ValidityState,
    control: CuiFieldControl,
    params: CuiFieldInvalidDetail["params"],
  ): void {
    this.dispatchEvent(
      new CustomEvent<CuiFieldInvalidDetail>("cui-field-invalid", {
        detail: {
          key,
          message: this.externalError ?? control.validationMessage,
          params,
          validity: control.validity,
          control,
        },
        bubbles: true,
      }),
    );
  }

  private template(): string {
    return `
      <label part="label" hidden><slot name="label"></slot></label>
      <div part="control"><slot></slot></div>
      <slot name="help"></slot>
      <div part="errors" aria-live="polite">
        <slot name="error-valueMissing"></slot>
        <slot name="error-typeMismatch"></slot>
        <slot name="error-patternMismatch"></slot>
        <slot name="error-tooShort"></slot>
        <slot name="error-tooLong"></slot>
        <slot name="error-rangeUnderflow"></slot>
        <slot name="error-rangeOverflow"></slot>
        <slot name="error-stepMismatch"></slot>
        <slot name="error-badInput"></slot>
        <slot name="error-customError"></slot>
        <slot name="error"></slot>
        <p part="error" hidden></p>
      </div>
    `;
  }
}