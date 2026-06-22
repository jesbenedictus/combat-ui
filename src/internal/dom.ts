/**
 * Finds the first element in the composed path of an event that matches a given selector.
 * 
 * @param event The event whose composed path to search.
 * @param selector The CSS selector to match against elements in the composed path.
 * @returns The first matching element, or null if none is found.
 */
export function findInComposedPath(event: Event, selector: string): HTMLElement | null {
  return (
    event.composedPath().find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.matches(selector),
    ) ?? null
  );
}

/**
 * Reads an attribute as a finite number, returning a fallback when the
 * attribute is absent, empty, or not numeric.
 *
 * @param element The element to read the attribute from.
 * @param name The attribute name.
 * @param fallback The value returned when the attribute is missing or invalid.
 * @returns The parsed number, or the fallback.
 */
export function numberAttr(element: HTMLElement, name: string, fallback: number): number {
  const raw = element.getAttribute(name);
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isNaN(value) ? fallback : value;
}
