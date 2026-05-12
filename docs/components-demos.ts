/// <reference types="vite/client" />

import {
  toast,
  type CuiToastVariant,
  type CuiTreeContextDetail,
  type CuiTreeDropDetail,
  type CuiModalCloseDetail,
} from "../src/index";

// Toast demos
{
  const variants: CuiToastVariant[] = ["info", "success", "warning", "danger"];
  for (const variant of variants) {
    const btn = document.getElementById(`docs-toast-${variant}`);
    btn?.addEventListener("click", () => {
      toast[variant](`This is a ${variant} toast notification.`, {
        title: variant.charAt(0).toUpperCase() + variant.slice(1),
      });
    });
  }

  document.getElementById("docs-toast-sticky")?.addEventListener("click", () => {
    toast({
      title: "Sticky toast",
      message: "Won't auto-dismiss. Click × to close.",
      variant: "warning",
      duration: 0,
    });
  });

  document.getElementById("docs-toast-update")?.addEventListener("click", () => {
    const handle = toast({
      title: "Uploading",
      message: "0%",
      variant: "info",
      duration: 0,
    });
    let pct = 0;
    const interval = window.setInterval(() => {
      pct += 25;
      if (pct < 100) {
        handle.update({ message: `${pct}%` });
      } else {
        window.clearInterval(interval);
        handle.update({
          variant: "success",
          title: "Uploaded",
          message: "All files saved.",
          duration: 2500,
        });
      }
    }, 500);
  });
}

// Tree demo
{
  const tree = document.getElementById("docs-tree");
  const menu = document.getElementById("docs-tree-menu");
  const log = document.getElementById("docs-tree-log");
  if (tree && menu && log) {
    let menuTarget: HTMLElement | null = null;

    const labelOf = (item: HTMLElement): string =>
      item.querySelector(":scope > .cui-tree-row span")?.textContent ??
      item.dataset.id ??
      "item";

    tree.addEventListener("cui-tree-contextmenu", (event) => {
      const detail = (event as CustomEvent<CuiTreeContextDetail>).detail;
      event.preventDefault();
      menuTarget = detail.item;
      menu.style.top = `${detail.y}px`;
      menu.style.left = `${detail.x}px`;
      menu.hidden = false;
    });

    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target as Node)) menu.hidden = true;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") menu.hidden = true;
    });

    menu.addEventListener("click", (event) => {
      const action = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-action]",
      )?.dataset.action;
      if (!action || !menuTarget) return;
      if (action === "delete") {
        log.textContent = `Deleted ${labelOf(menuTarget)}.`;
        menuTarget.remove();
      } else if (action === "duplicate") {
        const copy = menuTarget.cloneNode(true) as HTMLElement;
        copy.removeAttribute("aria-selected");
        menuTarget.after(copy);
        log.textContent = `Duplicated ${labelOf(menuTarget)}.`;
      } else if (action === "rename") {
        const span = menuTarget.querySelector<HTMLElement>(
          ":scope > .cui-tree-row span",
        );
        if (span) {
          const next = prompt("Rename to", span.textContent ?? "");
          if (next) {
            span.textContent = next;
            log.textContent = `Renamed to ${next}.`;
          }
        }
      }
      menu.hidden = true;
    });

    tree.addEventListener("cui-tree-drop", (event) => {
      const { source, target, position } = (
        event as CustomEvent<CuiTreeDropDetail>
      ).detail;
      log.textContent = `Moved ${labelOf(source)} ${position} ${labelOf(target)}.`;
    });
  }
}

// Modal: confirmation demo
{
  const modal = document.getElementById("docs-confirm-modal");
  const log = document.getElementById("docs-confirm-modal-log");
  if (modal && log) {
    modal.addEventListener("cui-modal-close", (event) => {
      const value = (event as CustomEvent<CuiModalCloseDetail>).detail
        .returnValue;
      log.textContent = value
        ? `Closed with returnValue: ${value}`
        : "Closed (no return value).";
    });
  }
}

// Modal: form modal demo
{
  const modal = document.getElementById("docs-form-modal");
  const log = document.getElementById("docs-form-modal-log");
  if (modal && log) {
    modal.addEventListener("cui-modal-close", (event) => {
      const value = (event as CustomEvent<CuiModalCloseDetail>).detail
        .returnValue;
      if (value === "save") {
        const form = modal.querySelector("form");
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        log.textContent = `Saved: ${JSON.stringify(data)}`;
      } else if (value === "cancel") {
        log.textContent = "Cancelled.";
      } else {
        log.textContent = "Dismissed.";
      }
    });
  }
}
