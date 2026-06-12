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