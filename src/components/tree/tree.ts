import treeCss from "./tree.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

export type CuiTreeDropPosition = "before" | "after" | "into";

export interface CuiTreeItemDetail {
  item: HTMLElement;
}
export interface CuiTreeDropDetail {
  source: HTMLElement;
  target: HTMLElement;
  position: CuiTreeDropPosition;
}
export interface CuiTreeContextDetail {
  originalEvent: MouseEvent;
  item: HTMLElement;
  x: number;
  y: number;
}

/**
 * Hierarchical tree with selection, expand/collapse, keyboard navigation,
 * and optional drag-and-drop reordering. Each item is a light-DOM
 * `.cui-tree-item` with a unique `data-id`; nested `<ul>`s become subtrees.
 * Consumers handle persistence — the element fires events but does not
 * mutate item structure on its own.
 *
 * @element cui-tree
 *
 * @slot - Tree markup: nested `<ul>` / `<li class="cui-tree-item">` with
 *   `data-id` on each item and optional `.cui-tree-toggle` controls for
 *   expand/collapse.
 *
 * @attr {boolean} selectable - Whether items can be selected. Default true.
 * @attr {boolean} draggable-items - Enables drag-and-drop reordering.
 *   Consumers must handle the resulting `cui-tree-drop` event to persist
 *   the new structure.
 *
 * @fires {CustomEvent<CuiTreeItemDetail>} cui-tree-item-select - Fires when
 *   an item is selected. `detail.id` is the selected `data-id`.
 * @fires {CustomEvent<CuiTreeItemDetail>} cui-tree-expand - Fires when a
 *   subtree expands.
 * @fires {CustomEvent<CuiTreeItemDetail>} cui-tree-collapse - Fires when a
 *   subtree collapses.
 * @fires {CustomEvent<CuiTreeContextDetail>} cui-tree-contextmenu - Fires
 *   on right-click / context-menu key. Call `detail.preventDefault()` to
 *   suppress the native menu and render your own.
 * @fires {CustomEvent<CuiTreeItemDetail>} cui-tree-dragstart - Fires when
 *   a drag begins.
 * @fires {CustomEvent<CuiTreeDropDetail>} cui-tree-drop - Fires on a valid
 *   drop. `detail.position` is `before`, `after`, or `inside`. Consumers
 *   apply the structural change in their event handler.
 *
 * @example
 * <cui-tree selectable draggable-items>
 *   <ul>
 *     <li class="cui-tree-item" data-id="docs">
 *       <button class="cui-tree-toggle" aria-expanded="true"></button>
 *       <span>Docs</span>
 *       <ul>
 *         <li class="cui-tree-item" data-id="docs/intro"><span>Intro</span></li>
 *       </ul>
 *     </li>
 *   </ul>
 * </cui-tree>
 */
export class CuiTree extends CombatElement {
  static readonly tagName = "cui-tree";
  static override styles = [cssStyleSheet(treeCss)];
  static observedAttributes = ["selectable", "draggable-items"];

  private abortController: AbortController | null = null;
  private mutationObserver: MutationObserver | null = null;
  private dragSource: HTMLElement | null = null;

  connectedCallback(): void {
    this.adoptStyles();
    if (!this.shadowRoot?.querySelector("slot")) {
      this.appendShadowTemplate(`<slot></slot>`);
    }

    this.bindEvents();
    this.sync();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }

  attributeChangedCallback(): void {
    this.sync();
  }

  get selectable(): boolean {
    return this.getAttribute("selectable") !== "false";
  }

  get draggableItems(): boolean {
    return this.hasAttribute("draggable-items");
  }

  select(item: HTMLElement): void {
    this.querySelectorAll<HTMLElement>(
      ".cui-tree-item[aria-selected='true']",
    ).forEach((selected) => selected.setAttribute("aria-selected", "false"));
    item.setAttribute("aria-selected", "true");
    this.dispatchEvent(
      new CustomEvent<CuiTreeItemDetail>("cui-tree-item-select", {
        detail: { item },
        bubbles: true,
      }),
    );
  }

  expand(item: HTMLElement, force?: boolean): void {
    if (!this.hasChildren(item)) return;
    const next = force ?? item.getAttribute("aria-expanded") !== "true";
    item.setAttribute("aria-expanded", String(next));
    this.dispatchEvent(
      new CustomEvent<CuiTreeItemDetail>(
        next ? "cui-tree-expand" : "cui-tree-collapse",
        {
          detail: { item },
          bubbles: true,
        },
      ),
    );
  }

  private sync(): void {
    const root = this.querySelector<HTMLElement>(
      ":scope > ul, :scope > [role='tree']",
    );
    if (!root) return;

    root.setAttribute("role", "tree");
    this.indexItems(root, 1);
  }

  private indexItems(parent: HTMLElement, level: number): void {
    const items = Array.from(parent.children).filter(
      (n): n is HTMLElement =>
        n instanceof HTMLElement && n.classList.contains("cui-tree-item"),
    );
    items.forEach((item, i) => {
      item.setAttribute("role", "treeitem");
      item.setAttribute("aria-level", String(level));
      item.setAttribute("aria-setsize", String(items.length));
      item.setAttribute("aria-posinset", String(i + 1));
      item.style.setProperty("--cui-tree-level", String(level));
      if (!item.hasAttribute("aria-selected"))
        item.setAttribute("aria-selected", "false");
      if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "-1");
      item.draggable = this.draggableItems;

      const group = item.querySelector<HTMLElement>(
        ":scope > ul, :scope > .cui-tree-children",
      );
      if (group) {
        if (!item.hasAttribute("aria-expanded"))
          item.setAttribute("aria-expanded", "false");
        group.setAttribute("role", "group");
        this.indexItems(group, level + 1);
      }
    });
    if (
      items.length > 0 &&
      !items.some((i) => i.getAttribute("tabindex") === "0")
    ) {
      items[0]?.setAttribute("tabindex", "0");
    }
  }

  private hasChildren(item: HTMLElement): boolean {
    return !!item.querySelector(":scope > ul, :scope > .cui-tree-children");
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.addEventListener("click", (event) => this.handleClick(event), {
      signal,
    });
    this.addEventListener("keydown", (event) => this.handleKeydown(event), {
      signal,
    });
    this.addEventListener("contextmenu", (event) => this.handleContext(event), {
      signal,
    });
    this.addEventListener("dragstart", (event) => this.handleDragStart(event), {
      signal,
    });
    this.addEventListener("dragover", (event) => this.handleDragOver(event), {
      signal,
    });
    this.addEventListener("dragleave", (event) => this.handleDragLeave(event), {
      signal,
    });
    this.addEventListener("drop", (event) => this.handleDrop(event), {
      signal,
    });
    this.addEventListener("dragend", () => this.clearDropMarkers(), {
      signal,
    });

    this.mutationObserver?.disconnect();
    this.mutationObserver = new MutationObserver(() => this.sync());
    this.mutationObserver.observe(this, { childList: true, subtree: true });
  }

  private findItem(target: EventTarget | null): HTMLElement | null {
    return target instanceof HTMLElement
      ? target.closest(".cui-tree-item")
      : null;
  }

  private handleClick(event: MouseEvent): void {
    const item = this.findItem(event.target);
    if (!item) return;
    const onToggle = (event.target as HTMLElement).closest(".cui-tree-toggle");
    if (onToggle && this.hasChildren(item)) {
      this.expand(item);
      return;
    }
    if (this.selectable) this.select(item);
  }

  private handleKeydown(event: KeyboardEvent): void {
    const current = this.findItem(event.target);
    if (!current) return;
    const visible = this.visibleItems();
    const i = visible.indexOf(current);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.focusItem(visible[i + 1]);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.focusItem(visible[i - 1]);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (
          this.hasChildren(current) &&
          current.getAttribute("aria-expanded") !== "true"
        ) {
          this.expand(current, true);
        } else {
          this.focusItem(visible[i + 1]);
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (
          this.hasChildren(current) &&
          current.getAttribute("aria-expanded") === "true"
        ) {
          this.expand(current, false);
        } else {
          this.focusItem(
            current.parentElement?.closest<HTMLElement>(".cui-tree-item") ??
              null,
          );
        }
        break;
      case "Home":
        event.preventDefault();
        this.focusItem(visible[0]);
        break;
      case "End":
        event.preventDefault();
        this.focusItem(visible.at(-1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (this.selectable) this.select(current);
        if (this.hasChildren(current)) this.expand(current);
        break;
    }
  }

  private focusItem(item: HTMLElement | null | undefined): void {
    if (!item) return;
    this.querySelectorAll<HTMLElement>(".cui-tree-item[tabindex='0']").forEach(
      (el) => el.setAttribute("tabindex", "-1"),
    );
    item.setAttribute("tabindex", "0");
    item.focus();
  }

  private visibleItems(): HTMLElement[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(".cui-tree-item"),
    ).filter((el) => {
      let parent = el.parentElement?.closest<HTMLElement>(".cui-tree-item");
      while (parent) {
        if (parent.getAttribute("aria-expanded") !== "true") return false;
        parent = parent.parentElement?.closest<HTMLElement>(".cui-tree-item");
      }
      return true;
    });
  }

  private handleContext(event: MouseEvent): void {
    const item = this.findItem(event.target);
    if (!item) return;
    const proceeded = this.dispatchEvent(
      new CustomEvent<CuiTreeContextDetail>("cui-tree-contextmenu", {
        detail: {
          item,
          originalEvent: event,
          x: event.clientX,
          y: event.clientY,
        },
        bubbles: true,
        cancelable: true,
      }),
    );
    if (!proceeded) event.preventDefault();
  }

  private handleDragStart(event: DragEvent): void {
    if (!this.draggableItems) return;
    const item = this.findItem(event.target);
    if (!item) return;
    this.dragSource = item;
    event.dataTransfer?.setData("text/plain", item.dataset.id ?? "");
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    item.setAttribute("data-dragging", "");
    this.dispatchEvent(
      new CustomEvent<CuiTreeItemDetail>("cui-tree-dragstart", {
        detail: { item },
        bubbles: true,
      }),
    );
  }

  private handleDragOver(event: DragEvent): void {
    if (!this.dragSource) return;
    const target = this.findItem(event.target);
    if (
      !target ||
      target === this.dragSource ||
      this.dragSource.contains(target)
    )
      return;
    event.preventDefault();
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const zone: CuiTreeDropPosition =
      y < rect.height / 3
        ? "before"
        : y > (rect.height * 2) / 3
          ? "after"
          : "into";
    this.clearDropMarkers();
    target.setAttribute("data-drop-position", zone);
  }

  private handleDragLeave(event: DragEvent): void {
    const target = this.findItem(event.target);
    if (target && !target.contains(event.relatedTarget as Node)) {
      target.removeAttribute("data-drop-position");
    }
  }

  private handleDrop(event: DragEvent): void {
    if (!this.dragSource) return;
    const target = this.findItem(event.target);
    const position = target?.getAttribute(
      "data-drop-position",
    ) as CuiTreeDropPosition | null;
    const source = this.dragSource;

    this.clearDropMarkers();
    source.removeAttribute("data-dragging");
    this.dragSource = null;

    if (!target || !position || target === source || source.contains(target))
      return;
    event.preventDefault();

    const proceeded = this.dispatchEvent(
      new CustomEvent<CuiTreeDropDetail>("cui-tree-drop", {
        detail: { source, target, position },
        bubbles: true,
        cancelable: true,
      }),
    );
    if (proceeded) this.moveItem(source, target, position);
    this.sync();
  }

  private moveItem(
    source: HTMLElement,
    target: HTMLElement,
    position: CuiTreeDropPosition,
  ): void {
    if (position === "into") {
      let group = target.querySelector<HTMLElement>(
        ":scope > ul, :scope > .cui-tree-children",
      );
      if (!group) {
        group = document.createElement("ul");
        group.className = "cui-tree-children";
        target.appendChild(group);
      }
      group.appendChild(source);
      target.setAttribute("aria-expanded", "true");
      return;
    }
    target.parentElement?.insertBefore(
      source,
      position === "before" ? target : target.nextElementSibling,
    );
  }

  private clearDropMarkers(): void {
    this.querySelectorAll<HTMLElement>("[data-drop-position]").forEach((el) =>
      el.removeAttribute("data-drop-position"),
    );
  }
}

export function defineCuiTree(
  registry: CustomElementRegistry = customElements,
): void {
  if (!registry.get(CuiTree.tagName)) {
    registry.define(CuiTree.tagName, CuiTree);
  }
}
