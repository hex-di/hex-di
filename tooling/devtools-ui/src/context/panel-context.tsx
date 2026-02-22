/**
 * PanelStateProvider and usePanelState for panel state management.
 *
 * Provides panel-specific state (active panel, search text, scroll position)
 * to panel components. State is preserved when switching panels.
 *
 * @packageDocumentation
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Per-panel state that is preserved across panel switches.
 */
interface PanelState {
  readonly searchText: string;
  readonly scrollTop: number;
  readonly expandedNodes: ReadonlySet<string>;
  readonly selectedItem: string | undefined;
}

/**
 * Default state for a fresh panel.
 */
const defaultPanelState: PanelState = {
  searchText: "",
  scrollTop: 0,
  expandedNodes: new Set(),
  selectedItem: undefined,
};

/**
 * Context value for the panel state system.
 */
interface PanelStateContextValue {
  readonly activePanelId: string;
  setActivePanelId(id: string): void;
  getPanelState(panelId: string): PanelState;
  updatePanelState(panelId: string, update: Partial<PanelState>): void;
}

const PanelStateContext = createContext<PanelStateContextValue | null>(null);
PanelStateContext.displayName = "HexDI.PanelStateContext";

interface PanelStateProviderProps {
  readonly defaultPanelId?: string;
  readonly children: React.ReactNode;
}

/**
 * PanelStateProvider manages the active panel and preserves per-panel state.
 */
function PanelStateProvider({
  defaultPanelId = "overview",
  children,
}: PanelStateProviderProps): React.ReactElement {
  const [activePanelId, setActivePanelId] = useState(defaultPanelId);
  const [panelStates, setPanelStates] = useState<ReadonlyMap<string, PanelState>>(new Map());

  const getPanelState = useCallback(
    (panelId: string): PanelState => {
      return panelStates.get(panelId) ?? defaultPanelState;
    },
    [panelStates]
  );

  const updatePanelState = useCallback((panelId: string, update: Partial<PanelState>) => {
    setPanelStates(prev => {
      const existing = prev.get(panelId) ?? defaultPanelState;
      const next = new Map(prev);
      next.set(panelId, { ...existing, ...update });
      return next;
    });
  }, []);

  const contextValue = useMemo<PanelStateContextValue>(
    () => ({
      activePanelId,
      setActivePanelId,
      getPanelState,
      updatePanelState,
    }),
    [activePanelId, getPanelState, updatePanelState]
  );

  return <PanelStateContext.Provider value={contextValue}>{children}</PanelStateContext.Provider>;
}

/**
 * Access the panel state management context.
 *
 * @throws {Error} If used outside a PanelStateProvider.
 */
function usePanelState(): PanelStateContextValue {
  const context = useContext(PanelStateContext);

  if (context === null) {
    throw new Error(
      "usePanelState must be used within a PanelStateProvider. " +
        "Ensure your component is wrapped in a PanelStateProvider component."
    );
  }

  return context;
}

export { PanelStateProvider, usePanelState };
export type { PanelState, PanelStateContextValue, PanelStateProviderProps };
