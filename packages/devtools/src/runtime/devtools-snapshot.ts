/**
 * DevTools Snapshot Types
 *
 * Combined snapshot type aggregating all three machine contexts for the
 * DevToolsFlowRuntime. Provides a unified view of DevTools state for
 * useSyncExternalStore compatibility.
 *
 * @packageDocumentation
 */

import type {
  DevToolsUIState,
  DevToolsUIContext,
  TracingState,
  TracingContext,
  ContainerTreeState,
  ContainerTreeContext,
  ContainerTreeEntry,
} from "@hex-di/devtools-core";

// =============================================================================
// Machine Snapshot Types
// =============================================================================

/**
 * Snapshot of the UI machine state.
 */
export interface UISnapshot {
  readonly state: DevToolsUIState;
  readonly context: DevToolsUIContext;
}

/**
 * Snapshot of the Tracing machine state.
 */
export interface TracingSnapshot {
  readonly state: TracingState;
  readonly context: TracingContext;
}

/**
 * Snapshot of the ContainerTree machine state.
 */
export interface ContainerTreeSnapshot {
  readonly state: ContainerTreeState;
  readonly context: ContainerTreeContext;
}

// =============================================================================
// Combined DevTools Snapshot
// =============================================================================

/**
 * Combined snapshot aggregating all three machine contexts.
 *
 * This is the primary state type exposed to consumers via `useDevToolsRuntime()`.
 * It provides a unified view of all DevTools state in a single immutable object.
 *
 * @remarks
 * The snapshot is designed for use with React 18's `useSyncExternalStore`:
 * - Immutable: Each state change produces a new snapshot object
 * - Referentially stable: Same state = same object reference (when cached)
 * - Complete: Contains all state needed to render DevTools UI
 */
export interface DevToolsSnapshot {
  /**
   * UI machine snapshot (panel visibility, tabs, selection).
   */
  readonly ui: UISnapshot;

  /**
   * Tracing machine snapshot (trace collection, filtering).
   */
  readonly tracing: TracingSnapshot;

  /**
   * ContainerTree machine snapshot (container discovery, hierarchy).
   */
  readonly containerTree: ContainerTreeSnapshot;
}

// =============================================================================
// Event Type Discriminated Unions
// =============================================================================

/**
 * Container entry payload for UI registration events.
 * This is a minimal subset used by the UI machine.
 */
export interface ContainerEntryPayload {
  readonly id: string;
  readonly label: string;
  readonly kind: "root" | "child" | "lazy";
  readonly parentId: string | null;
}

/**
 * UI machine events with their payloads.
 */
export type UIEvent =
  | { readonly type: "UI.OPEN" }
  | { readonly type: "UI.CLOSE" }
  | { readonly type: "UI.TOGGLE" }
  | { readonly type: "UI.OPENED" }
  | { readonly type: "UI.SELECT_TAB"; readonly payload: { readonly tab: string } }
  | { readonly type: "UI.SELECT_CONTAINER"; readonly payload: { readonly id: string } }
  | { readonly type: "UI.TOGGLE_CONTAINER"; readonly payload: { readonly id: string } }
  | {
      readonly type: "UI.CONTAINER_REGISTERED";
      readonly payload: { readonly entry: ContainerEntryPayload };
    }
  | { readonly type: "UI.CONTAINER_UNREGISTERED"; readonly payload: { readonly id: string } }
  | { readonly type: "UI.EXPAND_CONTAINER"; readonly payload: { readonly id: string } }
  | { readonly type: "UI.COLLAPSE_CONTAINER"; readonly payload: { readonly id: string } };

/**
 * Tracing machine events with their payloads.
 */
export type TracingEvent =
  | { readonly type: "TRACING.ENABLE" }
  | { readonly type: "TRACING.DISABLE" }
  | { readonly type: "TRACING.START" }
  | { readonly type: "TRACING.PAUSE" }
  | { readonly type: "TRACING.RESUME" }
  | { readonly type: "TRACING.STOP" }
  | { readonly type: "TRACING.STOPPED" }
  | { readonly type: "TRACING.CLEAR" }
  | { readonly type: "TRACING.TRACE_RECEIVED"; readonly payload: { readonly trace: unknown } }
  | { readonly type: "TRACING.SET_FILTER"; readonly payload: { readonly filter: unknown } };

/**
 * ContainerTree machine events with their payloads.
 * Uses ContainerTreeEntry for full container info.
 */
export type ContainerTreeEvent =
  | { readonly type: "CONTAINER_TREE.DISCOVER" }
  | { readonly type: "CONTAINER_TREE.DISCOVERY_COMPLETE" }
  | { readonly type: "CONTAINER_TREE.DISCOVERY_ERROR"; readonly payload: { readonly error: Error } }
  | {
      readonly type: "CONTAINER_TREE.CONTAINER_ADDED";
      readonly payload: { readonly entry: ContainerTreeEntry };
    }
  | { readonly type: "CONTAINER_TREE.CONTAINER_REMOVED"; readonly payload: { readonly id: string } }
  | {
      readonly type: "CONTAINER_TREE.CONTAINER_UPDATED";
      readonly payload: { readonly entry: ContainerTreeEntry };
    }
  | {
      readonly type: "CONTAINER_TREE.CONTAINER_DISPOSED";
      readonly payload: { readonly containerId: string };
    }
  | { readonly type: "CONTAINER_TREE.TOGGLE_EXPAND"; readonly payload: { readonly id: string } };

/**
 * All DevTools events as a discriminated union.
 *
 * Events are prefixed with their machine name to enable routing:
 * - `UI.*` events are routed to the UI machine
 * - `TRACING.*` events are routed to the Tracing machine
 * - `CONTAINER_TREE.*` events are routed to the ContainerTree machine
 */
export type DevToolsFlowEvent = UIEvent | TracingEvent | ContainerTreeEvent;

// =============================================================================
// Derived Selectors
// =============================================================================

/**
 * Selects whether the DevTools panel is visible.
 */
export function selectIsOpen(snapshot: DevToolsSnapshot): boolean {
  return snapshot.ui.state === "open" || snapshot.ui.state === "opening";
}

/**
 * Selects the currently active tab.
 */
export function selectActiveTab(snapshot: DevToolsSnapshot): string {
  return snapshot.ui.context.activeTab;
}

/**
 * Selects the currently selected container IDs.
 */
export function selectSelectedContainerIds(snapshot: DevToolsSnapshot): ReadonlySet<string> {
  return snapshot.ui.context.selectedIds;
}

/**
 * Selects whether tracing is currently active.
 */
export function selectIsTracing(snapshot: DevToolsSnapshot): boolean {
  return snapshot.tracing.state === "tracing";
}

/**
 * Selects the current trace count.
 */
export function selectTraceCount(snapshot: DevToolsSnapshot): number {
  return snapshot.tracing.context.traces.length;
}

/**
 * Selects whether containers have been discovered.
 */
export function selectIsContainerTreeReady(snapshot: DevToolsSnapshot): boolean {
  return snapshot.containerTree.state === "ready";
}

/**
 * Selects all discovered containers.
 */
export function selectContainers(snapshot: DevToolsSnapshot): readonly ContainerTreeEntry[] {
  return snapshot.containerTree.context.containers;
}

// =============================================================================
// Re-export types for convenience
// =============================================================================

export type { ContainerTreeEntry };
