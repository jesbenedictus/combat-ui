/// <reference types="vite/client" />

import type { CuiField, CuiFieldInvalidDetail, CuiForm } from "../src/index";

function setSlotText(field: CuiField, text: string): void {
  const slot = field.querySelector<HTMLElement>("[slot='error']");
  if (slot) slot.textContent = text;
}

// Quick-start demo
{
  const form = document.getElementById("quick-form") as CuiForm | null;
  const log = document.getElementById("quick-form-log");
  const reset = document.getElementById("quick-form-reset");
  if (form && log) {
    form.setSubmitHandler(async (data) => {
      log.textContent = "Submitting…";
      await new Promise((r) => setTimeout(r, 800));
      log.textContent = `Submitted: ${JSON.stringify(Object.fromEntries(data))}`;
    });
    form.addEventListener("cui-form-invalid", () => {
      log.textContent = "Fix the highlighted fields and try again.";
    });
    reset?.addEventListener("click", () => {
      form.reset();
      log.textContent = "";
    });
  }
}

// Validation pipeline demo
{
  const form = document.getElementById("validation-demo") as CuiForm | null;
  const log = document.getElementById("validation-demo-log");
  if (form && log) {
    const field = form.querySelector<CuiField>("cui-field");
    if (field) {
      field.addValidator((value) =>
        value === "admin" ? "That name is reserved." : null,
      );

      field.addEventListener("cui-field-invalid", (event) => {
        const detail = (event as CustomEvent<CuiFieldInvalidDetail>).detail;
        setSlotText(field, detail.message);
        log.textContent = `Invalid: ${detail.key}`;
      });
      field.addEventListener("cui-field-valid", () => {
        setSlotText(field, "");
        log.textContent = "";
      });

      form.setSubmitHandler(async (data) => {
        await new Promise((r) => setTimeout(r, 300));
        log.textContent = `Saved: ${JSON.stringify(Object.fromEntries(data))}`;
      });
    }
  }
}

// i18n event-driven demo
{
  const field = document.getElementById("i18n-field") as CuiField | null;
  const label = document.getElementById("i18n-label");
  const switcher = document.getElementById("i18n-locale-switch");
  if (field && label && switcher) {
    type Locale = "en" | "nl" | "ja";
    const messages: Record<Locale, Record<string, string>> = {
      en: {
        label: "Email",
        valueMissing: "Please enter your email.",
        typeMismatch: "That doesn't look like a valid email.",
        tooShort: "Use at least {min} characters.",
      },
      nl: {
        label: "E-mailadres",
        valueMissing: "Vul je e-mailadres in.",
        typeMismatch: "Dat is geen geldig e-mailadres.",
        tooShort: "Gebruik minstens {min} tekens.",
      },
      ja: {
        label: "メールアドレス",
        valueMissing: "メールアドレスを入力してください。",
        typeMismatch: "有効なメールアドレスではありません。",
        tooShort: "{min} 文字以上で入力してください。",
      },
    };
    let locale: Locale = "en";

    const render = (
      key: string,
      params: Record<string, string>,
      fallback: string,
    ): string => {
      const tmpl = messages[locale][key] ?? fallback;
      return tmpl.replace(/\{(\w+)\}/g, (_, k: string) => params[k] ?? "");
    };

    field.addEventListener("cui-field-invalid", (event) => {
      const detail = (event as CustomEvent<CuiFieldInvalidDetail>).detail;
      setSlotText(
        field,
        render(detail.key, detail.params as Record<string, string>, detail.message),
      );
    });
    field.addEventListener("cui-field-valid", () => {
      setSlotText(field, "");
    });

    switcher.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target) return;
      locale = target.value as Locale;
      label.textContent = messages[locale].label ?? "";
      if (field.hasAttribute("data-invalid")) void field.validate();
    });
  }
}

// Async + server error demo
{
  const form = document.getElementById("async-demo") as CuiForm | null;
  const log = document.getElementById("async-demo-log");
  if (form && log) {
    const field = form.querySelector<CuiField>("cui-field");
    if (field) {
      const fakeCheck = (value: string): Promise<boolean> =>
        new Promise((r) =>
          setTimeout(() => r(value.toLowerCase() === "taken"), 600),
        );

      field.addEventListener("cui-field-invalid", (event) => {
        const detail = (event as CustomEvent<CuiFieldInvalidDetail>).detail;
        setSlotText(field, detail.message);
      });
      field.addEventListener("cui-field-valid", () => {
        setSlotText(field, "");
      });

      field.addValidator(async (value) => {
        log.textContent = "Checking availability…";
        const taken = await fakeCheck(value);
        log.textContent = "";
        return taken ? "That username is taken." : null;
      });

      form.setSubmitHandler(async () => {
        log.textContent = "Submitting…";
        await new Promise((r) => setTimeout(r, 600));
        field.setError("This account already exists on the server.");
        throw new Error("conflict");
      });

      form.addEventListener("cui-form-error", () => {
        log.textContent = "Server rejected the submission.";
      });
    }
  }
}

// Cross-field demo
{
  const form = document.getElementById("cross-demo") as CuiForm | null;
  const log = document.getElementById("cross-demo-log");
  if (form && log) {
    const password = document.getElementById("cross-pw") as HTMLInputElement | null;
    const confirmField = document.getElementById(
      "cross-confirm-field",
    ) as CuiField | null;

    if (password && confirmField) {
      confirmField.addEventListener("cui-field-invalid", (event) => {
        const detail = (event as CustomEvent<CuiFieldInvalidDetail>).detail;
        setSlotText(confirmField, detail.message);
      });
      confirmField.addEventListener("cui-field-valid", () => {
        setSlotText(confirmField, "");
      });

      confirmField.addValidator((value) =>
        value === password.value ? null : "Passwords don't match.",
      );

      password.addEventListener("input", () => {
        if (confirmField.hasAttribute("data-invalid")) {
          void confirmField.validate();
        }
      });

      form.setSubmitHandler(async (data) => {
        await new Promise((r) => setTimeout(r, 400));
        log.textContent = `Saved: ${Object.keys(Object.fromEntries(data)).join(", ")}`;
      });
    }
  }
}
