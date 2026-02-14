/**
 * useKeyboardShortcuts hook for global keyboard shortcut registration.
 *
 * Registers document-level keydown listeners that map keyboard
 * combinations to callback functions.
 *
 * @packageDocumentation
 */

import { useEffect } from "react";

/**
 * Registers global keyboard shortcuts.
 *
 * @param shortcuts - Map of key strings to handler functions
 * @param enabled - Whether shortcuts are active (default: true)
 */
export function useKeyboardShortcuts(
  shortcuts: ReadonlyMap<string, () => void>,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled || shortcuts.size === 0) return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't fire shortcuts when user is typing in an input
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Build the key string: "Ctrl+K", "Shift+1", "Enter", etc.
      const parts: string[] = [];
      if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
      if (event.shiftKey) parts.push("Shift");
      if (event.altKey) parts.push("Alt");
      parts.push(event.key);

      const keyString = parts.join("+");
      const handler = shortcuts.get(keyString);

      if (handler !== undefined) {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}
