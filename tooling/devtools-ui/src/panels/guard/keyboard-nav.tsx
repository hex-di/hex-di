/**
 * GuardKeyboardNav — Keyboard shortcut routing for the Guard Panel.
 *
 * Sets up keyboard event handlers for view switching, navigation,
 * and panel actions. Renders no visible content.
 *
 * Spec: 11-interactions.md (11.13), 15-accessibility.md (15.2)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import type { GuardViewId } from "./types.js";

// ── View Index Mapping ──────────────────────────────────────────────────────

const VIEW_ORDER: readonly GuardViewId[] = [
  "tree",
  "log",
  "paths",
  "sankey",
  "timeline",
  "roles",
  "overview",
];

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardKeyboardNavProps {
  readonly activeView: GuardViewId;
  readonly onAction: (action: GuardKeyboardAction) => void;
}

type GuardKeyboardAction =
  | { readonly type: "switch-view"; readonly view: GuardViewId }
  | { readonly type: "activate" }
  | { readonly type: "escape" }
  | { readonly type: "toggle-educational" }
  | { readonly type: "open-search" }
  | { readonly type: "open-filter" }
  | { readonly type: "navigate-up" }
  | { readonly type: "navigate-down" }
  | { readonly type: "navigate-left" }
  | { readonly type: "navigate-right" }
  | { readonly type: "zoom-in" }
  | { readonly type: "zoom-out" }
  | { readonly type: "fit-to-view" };

const GUARD_KEY_ACTION_MAP: Record<string, GuardKeyboardAction["type"]> = {
  Enter: "activate",
  Escape: "escape",
  "?": "toggle-educational",
  "/": "open-search",
  f: "open-filter",
  ArrowUp: "navigate-up",
  ArrowDown: "navigate-down",
  ArrowLeft: "navigate-left",
  ArrowRight: "navigate-right",
  "+": "zoom-in",
  "-": "zoom-out",
};

// ── Component ───────────────────────────────────────────────────────────────

function GuardKeyboardNav({
  activeView: _activeView,
  onAction,
}: GuardKeyboardNavProps): React.ReactElement {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;

      // 1-7: view switching
      if (key >= "1" && key <= "7") {
        const index = Number(key) - 1;
        const view = VIEW_ORDER[index];
        if (view) {
          onAction({ type: "switch-view", view });
        }
        return;
      }

      // 0: fit to view
      if (key === "0") {
        onAction({ type: "fit-to-view" });
        return;
      }

      const actionType = GUARD_KEY_ACTION_MAP[key];
      if (actionType !== undefined) {
        onAction({ type: actionType });
      }
    },
    [onAction]
  );

  return (
    <div
      data-testid="guard-keyboard-nav"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    />
  );
}

export { GuardKeyboardNav };
export type { GuardKeyboardNavProps, GuardKeyboardAction };
