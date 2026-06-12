import { findInComposedPath } from "./dom";

const installed = new Set<string>();

/**
 * Document-level event delegation for remote triggers. A remote trigger is an element that 
 * has an attribute (e.g. `data-cui-modal-trigger`) whose value is the ID of a target element 
 * (e.g. a `<cui-modal>`). When the trigger is activated (e.g. clicked), the handler function is called 
 * with the target and trigger elements as arguments.
 * 
 * @param attribute The attribute to look for on the trigger elements.
 * @param handle The function to call when a trigger is activated.
 * @param type The type of event to listen for (default is "click").
 * @returns void
 */
export function installRemoteTrigger(
  attribute: string,
  handle: (target: HTMLElement, trigger: HTMLElement) => void,
  type: string = "click",
): void {
  if (installed.has(attribute)) return;
  installed.add(attribute);

  document.addEventListener(type, (e) => {
    const trigger = findInComposedPath(e, `[${attribute}]`);
    const id = trigger?.getAttribute(attribute);
    if (!trigger || !id) return;

    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    handle(target, trigger);
  });
}
