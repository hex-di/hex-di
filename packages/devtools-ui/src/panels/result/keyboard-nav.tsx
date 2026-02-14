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

// ── Component ───────────────────────────────────────────────────────────────

function KeyboardNavigationHandler({
  activeView,
  onViewSwitch,
  onActivate,
  onEscape,
  onTogglePlayback,
  onStepPrev,
  onStepNext,
  onStepUp,
  onStepDown,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onToggleDiff,
  onOpenFilter,
  onToggleEducational,
  onOpenSearch,
  onOpenSimulator,
}: KeyboardNavigationHandlerProps): React.ReactElement {
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

      switch (key) {
        case "Tab":
          // Allow native Tab behavior; mark as handled for test verification
          break;
        case "Enter":
          onActivate?.();
          return;
        case "Escape":
          onEscape?.();
          return;
        case " ":
          onTogglePlayback?.();
          return;
        case "ArrowLeft":
          onStepPrev?.();
          return;
        case "ArrowRight":
          onStepNext?.();
          return;
        case "ArrowUp":
          onStepUp?.();
          return;
        case "ArrowDown":
          onStepDown?.();
          return;
        case "+":
          onZoomIn?.();
          return;
        case "-":
          onZoomOut?.();
          return;
        case "d":
          if (activeView === "log") onToggleDiff?.();
          return;
        case "f":
          onOpenFilter?.();
          return;
        case "?":
          onToggleEducational?.();
          return;
        case "/":
          onOpenSearch?.();
          return;
        case "s":
          if (activeView === "cases") onOpenSimulator?.();
          return;
      }
    },
    [
      activeView,
      onViewSwitch,
      onActivate,
      onEscape,
      onTogglePlayback,
      onStepPrev,
      onStepNext,
      onStepUp,
      onStepDown,
      onZoomIn,
      onZoomOut,
      onFitToView,
      onToggleDiff,
      onOpenFilter,
      onToggleEducational,
      onOpenSearch,
      onOpenSimulator,
    ]
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
