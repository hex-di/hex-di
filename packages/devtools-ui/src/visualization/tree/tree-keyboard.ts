/**
 * Tree keyboard navigation utilities.
 *
 * Defines the keyboard handling logic for tree components:
 * ArrowDown/Up for traversal, ArrowRight/Left for expand/collapse,
 * Enter to toggle, Home/End for first/last.
 *
 * @packageDocumentation
 */

/**
 * Actions that a tree keyboard handler can request.
 */
export type TreeKeyAction =
  | { readonly type: "focus-next" }
  | { readonly type: "focus-prev" }
  | { readonly type: "expand" }
  | { readonly type: "collapse" }
  | { readonly type: "toggle" }
  | { readonly type: "focus-first" }
  | { readonly type: "focus-last" }
  | { readonly type: "select" }
  | { readonly type: "none" };

/**
 * Maps a keyboard event to a tree navigation action.
 */
export function mapKeyToAction(key: string): TreeKeyAction {
  switch (key) {
    case "ArrowDown":
      return { type: "focus-next" };
    case "ArrowUp":
      return { type: "focus-prev" };
    case "ArrowRight":
      return { type: "expand" };
    case "ArrowLeft":
      return { type: "collapse" };
    case "Enter":
      return { type: "select" };
    case "Home":
      return { type: "focus-first" };
    case "End":
      return { type: "focus-last" };
    default:
      return { type: "none" };
  }
}
