/**
 * UI Preferences Zustand Store
 *
 * Manages user interface preferences including:
 * - Sidebar state (collapsed/expanded)
 * - Theme (light/dark/system)
 * - Accent color
 * - Compact mode
 *
 * State is persisted to localStorage for persistence across sessions.
 *
 * @packageDocumentation
 */

import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Theme, UIPreferences } from "../types.js";
import { DEFAULT_UI_PREFERENCES } from "../types.js";

// =============================================================================
// State Type
// =============================================================================

/**
 * State shape for the UI preferences store.
 */
export interface UIPreferencesState extends UIPreferences {
  /** Sidebar width in pixels (when not collapsed) */
  readonly sidebarWidth: number;
}

/**
 * Actions available on the UI preferences store.
 */
export interface UIPreferencesActions {
  /** Toggle sidebar collapsed state */
  toggleSidebar: () => void;
  /** Set sidebar collapsed state explicitly */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Set sidebar width */
  setSidebarWidth: (width: number) => void;
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Set the accent color */
  setAccentColor: (color: string) => void;
  /** Toggle compact mode */
  toggleCompactMode: () => void;
  /** Set compact mode explicitly */
  setCompactMode: (compact: boolean) => void;
  /** Reset to default preferences */
  reset: () => void;
}

/**
 * Combined store type for UI preferences.
 */
export type UIPreferencesStore = UIPreferencesState & UIPreferencesActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: UIPreferencesState = {
  ...DEFAULT_UI_PREFERENCES,
  sidebarWidth: 256,
};

// =============================================================================
// Store Creation
// =============================================================================

/**
 * Creates a vanilla Zustand store for UI preferences.
 *
 * This is a "vanilla" store that works without React.
 * It can be used in HexDI adapters and registered with the container.
 *
 * The store automatically persists to localStorage using Zustand's persist middleware.
 *
 * @example
 * ```typescript
 * const store = createUIPreferencesStore();
 *
 * // Subscribe to changes
 * store.subscribe((state) => console.log(state.theme));
 *
 * // Get current state
 * console.log(store.getState().sidebarCollapsed);
 *
 * // Update state
 * store.getState().toggleSidebar();
 * store.getState().setTheme('dark');
 * ```
 */
export function createUIPreferencesStore() {
  return createStore<UIPreferencesStore>()(
    persist(
      set => ({
        ...initialState,

        toggleSidebar: () => {
          set(state => ({
            sidebarCollapsed: !state.sidebarCollapsed,
          }));
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed });
        },

        setSidebarWidth: (width: number) => {
          set({ sidebarWidth: Math.max(180, Math.min(400, width)) });
        },

        setTheme: (theme: Theme) => {
          set({ theme });
        },

        setAccentColor: (color: string) => {
          set({ accentColor: color });
        },

        toggleCompactMode: () => {
          set(state => ({
            compactMode: !state.compactMode,
          }));
        },

        setCompactMode: (compact: boolean) => {
          set({ compactMode: compact });
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: "taskflow-ui-preferences",
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth,
          theme: state.theme,
          accentColor: state.accentColor,
          compactMode: state.compactMode,
        }),
      }
    )
  );
}

/**
 * Type for the store instance.
 */
export type UIPreferencesStoreInstance = ReturnType<typeof createUIPreferencesStore>;
