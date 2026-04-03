/**
 * KeyboardNavigationHandler — Keyboard shortcut routing for Result Panel.
 *
 * Spec: 11-interactions.md (11.13), 15-accessibility.md (15.2)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

// ── Props ───────────────────────────────────────────────────────────────────

interface KeyboardNavigationHandlerProps {
  readonly activeView: string;
  readonly onViewSwitch: (viewIndex: number) => void;
  readonly onActivate?: () => void;
  readonly onEscape?: () => void;
  readonly onTogglePlayback?: () => void;
  readonly onStepPrev?: () => void;
  readonly onStepNext?: () => void;
  readonly onStepUp?: () => void;
  readonly onStepDown?: () => void;
  readonly onZoomIn?: () => void;
  readonly onZoomOut?: () => void;
  readonly onFitToView?: () => void;
  readonly onToggleDiff?: () => void;
  readonly onOpenFilter?: () => void;
  readonly onToggleEducational?: () => void;
  readonly onOpenSearch?: () => void;
  readonly onOpenSimulator?: () => void;
}

// ── Key Handlers ──────────────────────────────────────────────────────────

type HandlerMap = Readonly<Record<string, (props: KeyboardNavigationHandlerProps) => void>>;

/* eslint-disable @typescript-eslint/naming-convention */
const SIMPLE_KEY_HANDLERS: HandlerMap = {
  Enter: p => p.onActivate?.(),
  Escape: p => p.onEscape?.(),
  " ": p => p.onTogglePlayback?.(),
  ArrowLeft: p => p.onStepPrev?.(),
  ArrowRight: p => p.onStepNext?.(),
  ArrowUp: p => p.onStepUp?.(),
  ArrowDown: p => p.onStepDown?.(),
  "+": p => p.onZoomIn?.(),
  "-": p => p.onZoomOut?.(),
  f: p => p.onOpenFilter?.(),
  "?": p => p.onToggleEducational?.(),
  "/": p => p.onOpenSearch?.(),
};
/* eslint-enable @typescript-eslint/naming-convention */

const VIEW_CONDITIONAL_KEY_HANDLERS: Readonly<
  Record<string, { view: string; handler: (props: KeyboardNavigationHandlerProps) => void }>
> = {
  d: { view: "log", handler: p => p.onToggleDiff?.() },
  s: { view: "cases", handler: p => p.onOpenSimulator?.() },
};

// ── Component ───────────────────────────────────────────────────────────────

function KeyboardNavigationHandler(props: KeyboardNavigationHandlerProps): React.ReactElement {
  const { activeView, onViewSwitch, onFitToView } = props;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;

      // 1-7: view switching (0-indexed)
      if (key >= "1" && key <= "7") {
        onViewSwitch(Number(key) - 1);
        return;
      }

      // 0: fit to view
      if (key === "0") {
        onFitToView?.();
        return;
      }

      // Tab: allow native behavior
      if (key === "Tab") return;

      const simpleHandler = SIMPLE_KEY_HANDLERS[key];
      if (simpleHandler !== undefined) {
        simpleHandler(props);
        return;
      }

      const conditional = VIEW_CONDITIONAL_KEY_HANDLERS[key];
      if (conditional !== undefined && activeView === conditional.view) {
        conditional.handler(props);
      }
    },
    [activeView, onViewSwitch, onFitToView, props]
  );

  return (
    <div
      data-testid="keyboard-handler"
      data-tab-handled="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    />
  );
}

export { KeyboardNavigationHandler };
export type { KeyboardNavigationHandlerProps };
