/**
 * Brain View context for toggling the diagnostic overlay.
 *
 * Provides state and actions for the Brain View panel, which displays
 * real-time DI container diagnostics (neural map, synapse events,
 * memory usage, thought log, and vitals).
 *
 * Keyboard shortcut: Ctrl+Shift+B to toggle the overlay.
 *
 * @packageDocumentation
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BrainPanel =
  | "neural-map"
  | "synapse"
  | "memory"
  | "thought"
  | "vitals"
  | "query-cache"
  | "store-state"
  | "saga-activity";

interface BrainViewState {
  readonly isOpen: boolean;
  readonly activePanel: BrainPanel;
  readonly panelHeight: number;
  readonly toggleBrainView: () => void;
  readonly setActivePanel: (panel: BrainPanel) => void;
  readonly setPanelHeight: (height: number) => void;
}

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const PANEL_HEIGHT_KEY = "pokenerve-brain-panel-height";
const DEFAULT_PANEL_HEIGHT = 40;

function loadPanelHeight(): number {
  try {
    const stored = localStorage.getItem(PANEL_HEIGHT_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && parsed >= 15 && parsed <= 80) {
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable (SSR, privacy mode, etc.)
  }
  return DEFAULT_PANEL_HEIGHT;
}

function savePanelHeight(height: number): void {
  try {
    localStorage.setItem(PANEL_HEIGHT_KEY, String(height));
  } catch {
    // Silently ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BrainViewContext = createContext<BrainViewState | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface BrainViewProviderProps {
  readonly children: ReactNode;
}

function BrainViewProvider({ children }: BrainViewProviderProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<BrainPanel>("neural-map");
  const [panelHeight, setPanelHeightRaw] = useState(loadPanelHeight);

  const toggleBrainView = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSetActivePanel = useCallback((panel: BrainPanel) => {
    setActivePanel(panel);
  }, []);

  const handleSetPanelHeight = useCallback((height: number) => {
    const clamped = Math.min(80, Math.max(15, height));
    setPanelHeightRaw(clamped);
    savePanelHeight(clamped);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+B
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey && event.shiftKey && event.key === "B") {
        event.preventDefault();
        toggleBrainView();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleBrainView]);

  const value = useMemo<BrainViewState>(
    () => ({
      isOpen,
      activePanel,
      panelHeight,
      toggleBrainView,
      setActivePanel: handleSetActivePanel,
      setPanelHeight: handleSetPanelHeight,
    }),
    [isOpen, activePanel, panelHeight, toggleBrainView, handleSetActivePanel, handleSetPanelHeight]
  );

  return <BrainViewContext.Provider value={value}>{children}</BrainViewContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useBrainView(): BrainViewState {
  const context = useContext(BrainViewContext);
  if (context === null) {
    throw new Error("useBrainView must be used within a BrainViewProvider");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BrainViewProvider, useBrainView };
export type { BrainPanel, BrainViewState, BrainViewProviderProps };
