/**
 * Container Tree State Machine
 *
 * State machine for container hierarchy discovery and lifecycle management.
 * Manages the discovery of containers via InspectorPlugin and tracks their
 * state throughout the application lifecycle.
 *
 * @packageDocumentation
 */

import { createMachine, type Machine } from "@hex-di/flow";
import type { ContainerKind, ContainerPhase, ScopeTree } from "@hex-di/core";
import type { ContainerGraphData } from "@hex-di/runtime";

// =============================================================================
// State Types
// =============================================================================

/**
 * ContainerTree machine states.
 */
export type ContainerTreeState = "idle" | "discovering" | "ready" | "error";

/**
 * ContainerTree machine events.
 */
export type ContainerTreeEvent =
  | "DISCOVER"
  | "DISCOVERY_COMPLETE"
  | "DISCOVERY_ERROR"
  | "CONTAINER_ADDED"
  | "CONTAINER_REMOVED"
  | "CONTAINER_UPDATED" // Live update of existing container data
  | "CONTAINER_DISPOSED" // Container was disposed (marks entry as disposed)
  | "CONTAINER_STATE_CHANGED"
  | "TOGGLE_EXPAND"
  | "RESET";

// =============================================================================
// Container Types
// =============================================================================

/**
 * Container entry in the tree.
 *
 * Contains COMPLETE data for the container, fetched during discovery.
 * React components should use this data directly - no inspector access needed.
 */
export interface ContainerTreeEntry {
  // =========================================================================
  // Identity & Hierarchy
  // =========================================================================
  readonly id: string;
  readonly label: string;
  readonly kind: ContainerKind;
  readonly parentId: string | null;
  readonly childIds: readonly string[];

  // =========================================================================
  // Complete Data (fetched from inspector during discovery)
  // =========================================================================

  /** Complete scope tree with all nested scopes */
  readonly scopeTree: ScopeTree;

  /** Complete graph data for visualization (adapters, dependencies) */
  readonly graphData: ContainerGraphData;

  // =========================================================================
  // Computed Stats (for quick access without traversing scopeTree)
  // =========================================================================

  /** Number of resolved services in this container */
  readonly resolvedCount: number;

  /** Total number of ports registered in this container */
  readonly totalCount: number;

  /** Names of resolved ports */
  readonly resolvedPorts: readonly string[];

  // =========================================================================
  // Lifecycle State
  // =========================================================================

  /** Current container phase */
  readonly phase: ContainerPhase;

  /** Whether the container has been disposed */
  readonly isDisposed: boolean;
}

/**
 * Container state information.
 */
export interface ContainerStateInfo {
  readonly id: string;
  readonly phase: "created" | "ready" | "disposing" | "disposed";
  readonly scopeCount: number;
  readonly lastUpdated: number;
}

// =============================================================================
// Context Type
// =============================================================================

/**
 * ContainerTree machine context.
 */
export interface ContainerTreeContext {
  /** All discovered containers */
  readonly containers: readonly ContainerTreeEntry[];
  /** Container state information by ID */
  readonly containerStates: ReadonlyMap<string, ContainerStateInfo>;
  /** Expanded container IDs in tree view */
  readonly expandedIds: ReadonlySet<string>;
  /** Last discovery error */
  readonly error: Error | null;
  /** Root container IDs (no parent) */
  readonly rootIds: readonly string[];
}

// =============================================================================
// Event Payloads
// =============================================================================

interface DiscoveryErrorPayload {
  readonly error: Error;
}

interface ContainerAddedPayload {
  readonly entry: ContainerTreeEntry;
}

interface ContainerRemovedPayload {
  readonly id: string;
}

interface ContainerStateChangedPayload {
  readonly id: string;
  readonly state: ContainerStateInfo;
}

interface ToggleExpandPayload {
  readonly id: string;
}

interface ContainerUpdatedPayload {
  readonly entry: ContainerTreeEntry;
}

interface ContainerDisposedPayload {
  readonly containerId: string;
}

// =============================================================================
// Initial Context
// =============================================================================

const initialContext: ContainerTreeContext = {
  containers: [],
  containerStates: new Map(),
  expandedIds: new Set(),
  error: null,
  rootIds: [],
};

// =============================================================================
// Helper Functions
// =============================================================================

function addContainer(
  containers: readonly ContainerTreeEntry[],
  entry: ContainerTreeEntry
): readonly ContainerTreeEntry[] {
  // Check if already exists
  if (containers.some(c => c.id === entry.id)) {
    return containers;
  }
  return [...containers, entry];
}

function removeContainer(
  containers: readonly ContainerTreeEntry[],
  id: string
): readonly ContainerTreeEntry[] {
  return containers.filter(c => c.id !== id);
}

function updateRootIds(containers: readonly ContainerTreeEntry[]): readonly string[] {
  return containers.filter(c => c.parentId === null).map(c => c.id);
}

function toggleExpand(expandedIds: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const newSet = new Set(expandedIds);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  return newSet;
}

function updateContainer(
  containers: readonly ContainerTreeEntry[],
  entry: ContainerTreeEntry
): readonly ContainerTreeEntry[] {
  return containers.map(c => (c.id === entry.id ? entry : c));
}

function disposeContainer(
  containers: readonly ContainerTreeEntry[],
  containerId: string
): readonly ContainerTreeEntry[] {
  return containers.map(c =>
    c.id === containerId ? { ...c, isDisposed: true, phase: "disposed" as const } : c
  );
}

// =============================================================================
// Machine Definition
// =============================================================================

/**
 * ContainerTree state machine.
 *
 * Manages container hierarchy discovery and lifecycle:
 * - Discovers containers via InspectorPlugin on DISCOVER
 * - Tracks container additions/removals
 * - Manages tree expansion state
 *
 * Activity spawning (ContainerDiscoveryActivity, InspectorSubscriptionActivity)
 * is handled by the React integration layer which responds to state changes.
 */
export const containerTreeMachine: Machine<
  ContainerTreeState,
  ContainerTreeEvent,
  ContainerTreeContext
> = createMachine({
  id: "ContainerTree",
  initial: "idle",
  context: initialContext,
  states: {
    // ========================================================================
    // Idle State - Waiting to start discovery
    // ========================================================================
    idle: {
      on: {
        DISCOVER: {
          target: "discovering",
        },
        // Can still receive container events in idle (for manual registration)
        CONTAINER_ADDED: {
          target: "idle",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: { readonly type: "CONTAINER_ADDED"; readonly payload: ContainerAddedPayload }
            ): ContainerTreeContext => {
              const containers = addContainer(ctx.containers, event.payload.entry);
              return {
                ...ctx,
                containers,
                rootIds: updateRootIds(containers),
              };
            },
          ],
        },
        CONTAINER_REMOVED: {
          target: "idle",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: {
                readonly type: "CONTAINER_REMOVED";
                readonly payload: ContainerRemovedPayload;
              }
            ): ContainerTreeContext => {
              const containers = removeContainer(ctx.containers, event.payload.id);
              const expandedIds = new Set(ctx.expandedIds);
              expandedIds.delete(event.payload.id);
              const containerStates = new Map(ctx.containerStates);
              containerStates.delete(event.payload.id);
              return {
                ...ctx,
                containers,
                expandedIds,
                containerStates,
                rootIds: updateRootIds(containers),
              };
            },
          ],
        },
      },
    },

    // ========================================================================
    // Discovering State - Discovery in progress
    // ========================================================================
    discovering: {
      // Activity spawning handled by React layer via entry effects
      on: {
        DISCOVERY_COMPLETE: {
          target: "ready",
        },
        DISCOVERY_ERROR: {
          target: "error",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: { readonly type: "DISCOVERY_ERROR"; readonly payload: DiscoveryErrorPayload }
            ): ContainerTreeContext => ({
              ...ctx,
              error: event.payload.error,
            }),
          ],
        },
        CONTAINER_ADDED: {
          target: "discovering",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: { readonly type: "CONTAINER_ADDED"; readonly payload: ContainerAddedPayload }
            ): ContainerTreeContext => {
              const containers = addContainer(ctx.containers, event.payload.entry);
              return {
                ...ctx,
                containers,
                rootIds: updateRootIds(containers),
              };
            },
          ],
        },
      },
    },

    // ========================================================================
    // Ready State - Discovery complete, containers available
    // ========================================================================
    ready: {
      on: {
        CONTAINER_ADDED: {
          target: "ready",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: { readonly type: "CONTAINER_ADDED"; readonly payload: ContainerAddedPayload }
            ): ContainerTreeContext => {
              const containers = addContainer(ctx.containers, event.payload.entry);
              return {
                ...ctx,
                containers,
                rootIds: updateRootIds(containers),
              };
            },
          ],
        },
        CONTAINER_REMOVED: {
          target: "ready",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: {
                readonly type: "CONTAINER_REMOVED";
                readonly payload: ContainerRemovedPayload;
              }
            ): ContainerTreeContext => {
              const containers = removeContainer(ctx.containers, event.payload.id);
              const expandedIds = new Set(ctx.expandedIds);
              expandedIds.delete(event.payload.id);
              const containerStates = new Map(ctx.containerStates);
              containerStates.delete(event.payload.id);
              return {
                ...ctx,
                containers,
                expandedIds,
                containerStates,
                rootIds: updateRootIds(containers),
              };
            },
          ],
        },
        CONTAINER_STATE_CHANGED: {
          target: "ready",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: {
                readonly type: "CONTAINER_STATE_CHANGED";
                readonly payload: ContainerStateChangedPayload;
              }
            ): ContainerTreeContext => {
              const containerStates = new Map(ctx.containerStates);
              containerStates.set(event.payload.id, event.payload.state);
              return {
                ...ctx,
                containerStates,
              };
            },
          ],
        },
        CONTAINER_UPDATED: {
          target: "ready",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: {
                readonly type: "CONTAINER_UPDATED";
                readonly payload: ContainerUpdatedPayload;
              }
            ): ContainerTreeContext => ({
              ...ctx,
              containers: updateContainer(ctx.containers, event.payload.entry),
            }),
          ],
        },
        CONTAINER_DISPOSED: {
          target: "ready",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: {
                readonly type: "CONTAINER_DISPOSED";
                readonly payload: ContainerDisposedPayload;
              }
            ): ContainerTreeContext => ({
              ...ctx,
              containers: disposeContainer(ctx.containers, event.payload.containerId),
            }),
          ],
        },
        TOGGLE_EXPAND: {
          target: "ready",
          actions: [
            (
              ctx: ContainerTreeContext,
              event: { readonly type: "TOGGLE_EXPAND"; readonly payload: ToggleExpandPayload }
            ): ContainerTreeContext => ({
              ...ctx,
              expandedIds: toggleExpand(ctx.expandedIds, event.payload.id),
            }),
          ],
        },
        DISCOVER: {
          target: "discovering",
          actions: [
            (ctx: ContainerTreeContext): ContainerTreeContext => ({
              ...ctx,
              error: null,
            }),
          ],
        },
        RESET: {
          target: "idle",
          actions: [(): ContainerTreeContext => initialContext],
        },
      },
    },

    // ========================================================================
    // Error State - Discovery failed
    // ========================================================================
    error: {
      on: {
        DISCOVER: {
          target: "discovering",
          actions: [
            (ctx: ContainerTreeContext): ContainerTreeContext => ({
              ...ctx,
              error: null,
            }),
          ],
        },
        RESET: {
          target: "idle",
          actions: [(): ContainerTreeContext => initialContext],
        },
      },
    },
  },
});
