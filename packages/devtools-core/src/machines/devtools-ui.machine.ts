/**
 * DevTools UI State Machine
 *
 * Global state machine for DevTools panel UI state. Manages:
 * - Panel open/closed state
 * - Tab selection (GRAPH/INSPECTOR/TRACES)
 * - Container selection (single and multi-select)
 * - Panel sizing and positioning
 * - Tree expansion state
 *
 * @packageDocumentation
 */

import { createMachine, type Machine } from "@hex-di/flow";
import type { ContainerKind } from "@hex-di/plugin";

// =============================================================================
// Tab Types
// =============================================================================

/**
 * Tab identifier type.
 *
 * Using `string` instead of a union type to support custom plugin tabs.
 * Built-in tabs use: "graph", "services", "tracing", "inspector"
 * Custom plugins can define their own tab IDs.
 */
export type TabId = string;

/**
 * DevTools panel position options.
 */
export type DevToolsPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

// =============================================================================
// Container Entry (Minimal)
// =============================================================================

/**
 * Minimal container entry for UI state.
 * Full container data lives in ContainerDiscoveryMachine.
 */
export interface ContainerEntryMinimal {
  readonly id: string;
  readonly label: string;
  readonly kind: ContainerKind;
  readonly parentId: string | null;
}

// =============================================================================
// State Types
// =============================================================================

/**
 * DevTools UI states.
 */
export type DevToolsUIState = "closed" | "opening" | "open" | "selecting";

/**
 * DevTools UI events.
 */
export type DevToolsUIEvent =
  | "OPEN"
  | "CLOSE"
  | "TOGGLE"
  | "OPENED"
  | "SELECT_TAB"
  | "SELECT_CONTAINER"
  | "TOGGLE_CONTAINER"
  | "SELECT_ALL_CONTAINERS"
  | "DESELECT_ALL"
  | "CONTAINER_REGISTERED"
  | "CONTAINER_UNREGISTERED"
  | "CONTAINER_DISPOSED"
  | "EXPAND_CONTAINER"
  | "COLLAPSE_CONTAINER"
  | "HIGHLIGHT_SCOPE"
  | "UNHIGHLIGHT_SCOPE"
  | "RESIZE"
  | "TOGGLE_FULLSCREEN"
  | "CHANGE_POSITION"
  | "SELECTION_COMPLETE"
  | "CANCEL_SELECTION";

/**
 * DevTools UI context.
 */
export interface DevToolsUIContext {
  /** Selected container IDs (Set for uniqueness) */
  readonly selectedIds: ReadonlySet<string>;
  /** Currently active tab */
  readonly activeTab: TabId;
  /** Panel dimensions */
  readonly panelSize: { readonly width: number; readonly height: number };
  /** Whether panel is fullscreen */
  readonly isFullscreen: boolean;
  /** Panel position */
  readonly position: DevToolsPosition;
  /** Expanded container IDs in tree view */
  readonly expandedContainers: ReadonlySet<string>;
  /** Highlighted scope IDs */
  readonly highlightedScopes: ReadonlySet<string>;
  /** All registered container entries (for selection UI) */
  readonly registeredContainers: readonly ContainerEntryMinimal[];
}

// =============================================================================
// Event Payloads
// =============================================================================

interface SelectTabPayload {
  readonly tab: TabId;
}

interface SelectContainerPayload {
  readonly id: string;
}

interface ToggleContainerPayload {
  readonly id: string;
}

interface ContainerRegisteredPayload {
  readonly entry: ContainerEntryMinimal;
}

interface ContainerUnregisteredPayload {
  readonly id: string;
}

interface ContainerDisposedPayload {
  readonly id: string;
}

interface ExpandContainerPayload {
  readonly id: string;
}

interface CollapseContainerPayload {
  readonly id: string;
}

interface HighlightScopePayload {
  readonly scopeId: string;
}

interface UnhighlightScopePayload {
  readonly scopeId: string;
}

interface ResizePayload {
  readonly width: number;
  readonly height: number;
}

interface ChangePositionPayload {
  readonly position: DevToolsPosition;
}

interface SelectionCompletePayload {
  readonly ids: ReadonlySet<string>;
}

// =============================================================================
// Initial Context
// =============================================================================

/**
 * Safely reads a value from localStorage.
 * Returns undefined if localStorage is unavailable or key doesn't exist.
 */
function getStoredValue(key: string): string | undefined {
  try {
    const value = localStorage.getItem(key);
    return value ?? undefined;
  } catch {
    // localStorage unavailable (SSR, private browsing, etc.)
    return undefined;
  }
}

/**
 * Creates initial context, optionally reading persisted values from localStorage.
 *
 * Reads the following keys:
 * - hex-di-devtools-size: JSON of { width, height }
 * - hex-di-devtools-fullscreen: "true" or "false"
 * - hex-di-devtools-position: one of the DevToolsPosition values
 *
 * Note: isOpen state is not read here - the machine should start in "closed" state
 * and components can dispatch OPEN if localStorage indicates it was previously open.
 */
function createInitialContext(): DevToolsUIContext {
  const defaultContext: DevToolsUIContext = {
    selectedIds: new Set<string>(),
    activeTab: "graph",
    panelSize: { width: 400, height: 500 },
    isFullscreen: false,
    position: "bottom-right",
    expandedContainers: new Set<string>(),
    highlightedScopes: new Set<string>(),
    registeredContainers: [],
  };

  // Try to read stored panel size
  const storedSize = getStoredValue("hex-di-devtools-size");
  let panelSize = defaultContext.panelSize;
  if (storedSize) {
    try {
      const parsed = JSON.parse(storedSize) as { width?: number; height?: number };
      if (typeof parsed.width === "number" && typeof parsed.height === "number") {
        panelSize = { width: parsed.width, height: parsed.height };
      }
    } catch {
      // Invalid JSON, use default
    }
  }

  // Try to read stored fullscreen state
  const storedFullscreen = getStoredValue("hex-di-devtools-fullscreen");
  const isFullscreen = storedFullscreen === "true";

  // Try to read stored position
  const storedPosition = getStoredValue("hex-di-devtools-position");
  const validPositions: DevToolsPosition[] = [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left",
  ];
  const position: DevToolsPosition = validPositions.includes(storedPosition as DevToolsPosition)
    ? (storedPosition as DevToolsPosition)
    : defaultContext.position;

  return {
    ...defaultContext,
    panelSize,
    isFullscreen,
    position,
  };
}

const initialContext: DevToolsUIContext = createInitialContext();

// =============================================================================
// Helper Functions
// =============================================================================

function addToSet<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const newSet = new Set(set);
  newSet.add(value);
  return newSet;
}

function removeFromSet<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const newSet = new Set(set);
  newSet.delete(value);
  return newSet;
}

function toggleInSet<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const newSet = new Set(set);
  if (newSet.has(value)) {
    newSet.delete(value);
  } else {
    newSet.add(value);
  }
  return newSet;
}

// =============================================================================
// Machine Definition
// =============================================================================

/**
 * DevTools UI state machine.
 *
 * Controls the DevTools panel visibility, tab selection, and container selection.
 * Uses Set semantics for container selection to prevent duplicates.
 */
export const devToolsUIMachine: Machine<DevToolsUIState, DevToolsUIEvent, DevToolsUIContext> =
  createMachine({
    id: "DevToolsUI",
    initial: "closed",
    context: initialContext,
    states: {
      // ========================================================================
      // Closed State
      // ========================================================================
      closed: {
        on: {
          OPEN: {
            target: "open",
          },
          TOGGLE: {
            target: "open",
          },
          // Allow tab selection even when closed (e.g., for initial state)
          SELECT_TAB: {
            target: "closed",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: { readonly type: "SELECT_TAB"; readonly payload: SelectTabPayload }
              ): DevToolsUIContext => ({
                ...ctx,
                activeTab: event.payload.tab,
              }),
            ],
          },
          // Can still receive container registrations when closed
          CONTAINER_REGISTERED: {
            target: "closed",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "CONTAINER_REGISTERED";
                  readonly payload: ContainerRegisteredPayload;
                }
              ): DevToolsUIContext => {
                // Check if already registered
                if (ctx.registeredContainers.some(c => c.id === event.payload.entry.id)) {
                  return ctx;
                }
                return {
                  ...ctx,
                  registeredContainers: [...ctx.registeredContainers, event.payload.entry],
                  // Auto-select first container
                  selectedIds:
                    ctx.selectedIds.size === 0
                      ? addToSet(ctx.selectedIds, event.payload.entry.id)
                      : ctx.selectedIds,
                };
              },
            ],
          },
          CONTAINER_UNREGISTERED: {
            target: "closed",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "CONTAINER_UNREGISTERED";
                  readonly payload: ContainerUnregisteredPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                registeredContainers: ctx.registeredContainers.filter(
                  c => c.id !== event.payload.id
                ),
                selectedIds: removeFromSet(ctx.selectedIds, event.payload.id),
                expandedContainers: removeFromSet(ctx.expandedContainers, event.payload.id),
              }),
            ],
          },
        },
      },

      // ========================================================================
      // Opening State (for animations)
      // ========================================================================
      opening: {
        on: {
          OPENED: {
            target: "open",
          },
          CLOSE: {
            target: "closed",
          },
        },
      },

      // ========================================================================
      // Open State - Main interactive state
      // ========================================================================
      open: {
        on: {
          CLOSE: {
            target: "closed",
          },
          TOGGLE: {
            target: "closed",
          },
          SELECT_TAB: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: { readonly type: "SELECT_TAB"; readonly payload: SelectTabPayload }
              ): DevToolsUIContext => ({
                ...ctx,
                activeTab: event.payload.tab,
              }),
            ],
          },
          SELECT_CONTAINER: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "SELECT_CONTAINER";
                  readonly payload: SelectContainerPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                selectedIds: new Set([event.payload.id]),
              }),
            ],
          },
          TOGGLE_CONTAINER: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "TOGGLE_CONTAINER";
                  readonly payload: ToggleContainerPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                selectedIds: toggleInSet(ctx.selectedIds, event.payload.id),
              }),
            ],
          },
          SELECT_ALL_CONTAINERS: {
            target: "open",
            actions: [
              (ctx: DevToolsUIContext): DevToolsUIContext => ({
                ...ctx,
                selectedIds: new Set(ctx.registeredContainers.map(c => c.id)),
              }),
            ],
          },
          DESELECT_ALL: {
            target: "open",
            actions: [
              (ctx: DevToolsUIContext): DevToolsUIContext => ({
                ...ctx,
                selectedIds: new Set<string>(),
              }),
            ],
          },
          CONTAINER_REGISTERED: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "CONTAINER_REGISTERED";
                  readonly payload: ContainerRegisteredPayload;
                }
              ): DevToolsUIContext => {
                // Check if already registered
                if (ctx.registeredContainers.some(c => c.id === event.payload.entry.id)) {
                  return ctx;
                }
                return {
                  ...ctx,
                  registeredContainers: [...ctx.registeredContainers, event.payload.entry],
                  // Auto-select first container
                  selectedIds:
                    ctx.selectedIds.size === 0
                      ? addToSet(ctx.selectedIds, event.payload.entry.id)
                      : ctx.selectedIds,
                };
              },
            ],
          },
          CONTAINER_UNREGISTERED: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "CONTAINER_UNREGISTERED";
                  readonly payload: ContainerUnregisteredPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                registeredContainers: ctx.registeredContainers.filter(
                  c => c.id !== event.payload.id
                ),
                selectedIds: removeFromSet(ctx.selectedIds, event.payload.id),
                expandedContainers: removeFromSet(ctx.expandedContainers, event.payload.id),
              }),
            ],
          },
          CONTAINER_DISPOSED: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "CONTAINER_DISPOSED";
                  readonly payload: ContainerDisposedPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                registeredContainers: ctx.registeredContainers.filter(
                  c => c.id !== event.payload.id
                ),
                selectedIds: removeFromSet(ctx.selectedIds, event.payload.id),
                expandedContainers: removeFromSet(ctx.expandedContainers, event.payload.id),
              }),
            ],
          },
          EXPAND_CONTAINER: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "EXPAND_CONTAINER";
                  readonly payload: ExpandContainerPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                expandedContainers: addToSet(ctx.expandedContainers, event.payload.id),
              }),
            ],
          },
          COLLAPSE_CONTAINER: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "COLLAPSE_CONTAINER";
                  readonly payload: CollapseContainerPayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                expandedContainers: removeFromSet(ctx.expandedContainers, event.payload.id),
              }),
            ],
          },
          HIGHLIGHT_SCOPE: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: { readonly type: "HIGHLIGHT_SCOPE"; readonly payload: HighlightScopePayload }
              ): DevToolsUIContext => ({
                ...ctx,
                highlightedScopes: addToSet(ctx.highlightedScopes, event.payload.scopeId),
              }),
            ],
          },
          UNHIGHLIGHT_SCOPE: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "UNHIGHLIGHT_SCOPE";
                  readonly payload: UnhighlightScopePayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                highlightedScopes: removeFromSet(ctx.highlightedScopes, event.payload.scopeId),
              }),
            ],
          },
          RESIZE: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: { readonly type: "RESIZE"; readonly payload: ResizePayload }
              ): DevToolsUIContext => ({
                ...ctx,
                panelSize: {
                  width: event.payload.width,
                  height: event.payload.height,
                },
              }),
            ],
          },
          TOGGLE_FULLSCREEN: {
            target: "open",
            actions: [
              (ctx: DevToolsUIContext): DevToolsUIContext => ({
                ...ctx,
                isFullscreen: !ctx.isFullscreen,
              }),
            ],
          },
          CHANGE_POSITION: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: { readonly type: "CHANGE_POSITION"; readonly payload: ChangePositionPayload }
              ): DevToolsUIContext => ({
                ...ctx,
                position: event.payload.position,
              }),
            ],
          },
        },
      },

      // ========================================================================
      // Selecting State - Multi-select dialog
      // ========================================================================
      selecting: {
        on: {
          SELECTION_COMPLETE: {
            target: "open",
            actions: [
              (
                ctx: DevToolsUIContext,
                event: {
                  readonly type: "SELECTION_COMPLETE";
                  readonly payload: SelectionCompletePayload;
                }
              ): DevToolsUIContext => ({
                ...ctx,
                selectedIds: event.payload.ids,
              }),
            ],
          },
          CANCEL_SELECTION: {
            target: "open",
          },
        },
      },
    },
  });
