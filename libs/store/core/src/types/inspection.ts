/**
 * Inspection Types Module
 *
 * Defines StoreInspectorAPI, StoreSnapshot, PortSnapshot, ActionHistoryEntry,
 * SubscriberGraph, StoreInspectorEvent, and related types.
 *
 * @packageDocumentation
 */

import { createPort, createLibraryInspectorPort } from "@hex-di/core";
import type { DirectedPort } from "@hex-di/core";
import type { EffectFailedError, AsyncDerivedSelectError } from "../errors/tagged-errors.js";
import type { StoreTracingHook } from "../integration/tracing-bridge.js";

// =============================================================================
// StoreInspectorAPI
// =============================================================================

export interface StoreInspectorAPI {
  /** Snapshot of all store state at this instant */
  getSnapshot(): StoreSnapshot;

  /** Snapshot of a single port's state */
  getPortState(portName: string): PortSnapshot | undefined;

  /** List all registered state ports with metadata */
  listStatePorts(): readonly StatePortInfo[];

  /** Subscriber dependency graph */
  getSubscriberGraph(): SubscriberGraph;

  /** Action history with optional filtering */
  getActionHistory(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[];

  /** Subscribe to inspector events */
  subscribe(listener: StoreInspectorListener): () => void;
}

export type StoreInspectorListener = (event: StoreInspectorEvent) => void;

// =============================================================================
// StatePortInfo
// =============================================================================

export interface StatePortInfo {
  readonly portName: string;
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  readonly lifetime: "singleton" | "scoped";
  readonly subscriberCount: number;
  readonly hasEffects: boolean;
  readonly scopeId?: string;
}

// =============================================================================
// StoreSnapshot
// =============================================================================

export interface StoreSnapshot {
  readonly timestamp: number;
  readonly ports: readonly PortSnapshot[];
  readonly totalSubscribers: number;
  readonly pendingEffects: number;
}

// =============================================================================
// PortSnapshot (discriminated union)
// =============================================================================

export type PortSnapshot =
  | StatePortSnapshot
  | AtomPortSnapshot
  | DerivedPortSnapshot
  | AsyncDerivedPortSnapshot;

export interface StatePortSnapshot {
  readonly kind: "state";
  readonly portName: string;
  readonly state: unknown;
  readonly subscriberCount: number;
  readonly actionCount: number;
  readonly lastActionAt: number | null;
  readonly scopeId?: string;
}

export interface AtomPortSnapshot {
  readonly kind: "atom";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
  readonly scopeId?: string;
}

export interface DerivedPortSnapshot {
  readonly kind: "derived";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
  readonly isStale: boolean;
  readonly scopeId?: string;
}

export interface AsyncDerivedPortSnapshot {
  readonly kind: "async-derived";
  readonly portName: string;
  readonly status: "idle" | "loading" | "success" | "error";
  readonly data: unknown;
  readonly error: unknown | undefined;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
  readonly scopeId?: string;
}

// =============================================================================
// ActionHistory
// =============================================================================

export interface ActionHistoryEntry {
  readonly id: string;
  readonly portName: string;
  readonly actionName: string;
  readonly payload: unknown;
  readonly prevState: unknown;
  readonly nextState: unknown;
  readonly timestamp: number;
  readonly effectStatus: "none" | "pending" | "completed" | "failed";
  readonly effectError?: EffectFailedError;
  readonly parentId: string | null;
  readonly order: number;
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface ActionHistoryFilter {
  readonly portName?: string;
  readonly actionName?: string;
  readonly since?: number;
  readonly until?: number;
  readonly effectStatus?: "none" | "pending" | "completed" | "failed";
  readonly limit?: number;
  readonly traceId?: string;
}

export interface ActionHistoryConfig {
  readonly maxEntries: number;
  readonly mode: "full" | "lightweight" | "off";
  readonly samplingRate?: number;
  readonly alwaysRecord?: {
    readonly effectStatus?: readonly ("failed" | "pending")[];
    readonly portNames?: readonly string[];
    readonly actionNames?: readonly string[];
  };
}

// =============================================================================
// ActionHistory
// =============================================================================

export interface ActionHistory {
  /** Record a new action entry. Returns true if recorded, false if skipped. */
  record(entry: ActionHistoryEntry): boolean;

  /** Query entries with optional filter */
  query(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[];

  /** Clear all recorded entries */
  clear(): void;

  /** Current entry count */
  readonly size: number;
}

// =============================================================================
// StoreRegistryEntry
// =============================================================================

/**
 * Entry representing a registered store port in the registry.
 */
export interface StoreRegistryEntry {
  readonly portName: string;
  readonly adapter: object;
  readonly lifetime: "singleton" | "scoped";
  readonly requires: readonly string[];
  readonly writesTo: readonly string[];
  getSnapshot: () => PortSnapshot;
  getSubscriberCount: () => number;
  getHasEffects: () => boolean;
}

// =============================================================================
// StoreRegistryEvent
// =============================================================================

/**
 * Event emitted by the StoreRegistry when ports are registered/unregistered.
 */
export type StoreRegistryEvent =
  | { readonly type: "port-registered"; readonly entry: StoreRegistryEntry }
  | { readonly type: "port-unregistered"; readonly portName: string }
  | {
      readonly type: "scoped-port-registered";
      readonly scopeId: string;
      readonly entry: StoreRegistryEntry;
    }
  | { readonly type: "scope-unregistered"; readonly scopeId: string };

/**
 * Listener callback for registry events.
 */
export type StoreRegistryListener = (event: StoreRegistryEvent) => void;

// =============================================================================
// StoreRegistry Interface
// =============================================================================

/**
 * Registry for tracking store port instances.
 */
export interface StoreRegistry {
  /** Register a singleton port entry. */
  register(entry: StoreRegistryEntry): void;

  /** Unregister a singleton port by name. */
  unregister(portName: string): void;

  /** Register a scoped port entry under a scope ID. */
  registerScoped(scopeId: string, entry: StoreRegistryEntry): void;

  /** Remove all port entries for a given scope ID. */
  unregisterScope(scopeId: string): void;

  /** Get all singleton entries. */
  getAll(): readonly StoreRegistryEntry[];

  /** Get all scoped entries for a given scope ID. */
  getAllScoped(scopeId: string): readonly StoreRegistryEntry[];

  /** Get a singleton entry by port name. */
  get(portName: string): StoreRegistryEntry | undefined;

  /** Subscribe to registry events. */
  subscribe(listener: StoreRegistryListener): Unsubscribe;

  /** Dispose the registry, clearing all entries and listeners. */
  dispose(): void;
}

/**
 * Function to unsubscribe from notifications.
 */
export type Unsubscribe = () => void;

// =============================================================================
// SubscriberGraph
// =============================================================================

export interface SubscriberGraph {
  readonly correlationId: string;
  readonly nodes: readonly SubscriberNode[];
  readonly edges: readonly SubscriberEdge[];
}

export interface SubscriberNode {
  readonly id: string;
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  readonly subscriberCount: number;
}

export interface SubscriberEdge {
  readonly from: string;
  readonly to: string;
  readonly type: "derives-from" | "subscribes-to" | "writes-to";
}

// =============================================================================
// StoreInspectorEvent
// =============================================================================

export type StoreInspectorEvent =
  | { readonly type: "action-dispatched"; readonly entry: ActionHistoryEntry }
  | { readonly type: "state-changed"; readonly portName: string }
  | { readonly type: "subscriber-added"; readonly portName: string; readonly count: number }
  | { readonly type: "subscriber-removed"; readonly portName: string; readonly count: number }
  | { readonly type: "effect-completed"; readonly portName: string; readonly actionName: string }
  | {
      readonly type: "effect-failed";
      readonly portName: string;
      readonly actionName: string;
      readonly error: EffectFailedError;
    }
  | { readonly type: "async-derived-failed"; readonly error: AsyncDerivedSelectError }
  | { readonly type: "snapshot-changed" };

// =============================================================================
// PortRegistryEntry
// =============================================================================

export interface PortRegistryEntry {
  readonly portName: string;
  readonly adapter: object;
  readonly lifetime: "singleton" | "scoped";
  readonly requires: readonly string[];
  readonly writesTo: readonly string[];
  getSnapshot: () => PortSnapshot;
  getSubscriberCount: () => number;
  getHasEffects: () => boolean;
}

// =============================================================================
// StoreInspectorInternal
// =============================================================================

/**
 * Extended inspector interface for internal use by adapters and services.
 * Provides mutation methods (registerPort, recordAction, emit, etc.) on
 * top of the read-only StoreInspectorAPI.
 */
export interface StoreInspectorInternal extends StoreInspectorAPI {
  /** Register a singleton port for inspection */
  registerPort(entry: PortRegistryEntry): void;

  /** Unregister a singleton port */
  unregisterPort(portName: string): void;

  /** Register a scoped port for inspection */
  registerScopedPort(scopeId: string, entry: PortRegistryEntry): void;

  /** Remove all entries for a scope */
  unregisterScope(scopeId: string): void;

  /** Record an action (called from adapter hooks) */
  recordAction(entry: ActionHistoryEntry): void;

  /** Emit an inspector event */
  emit(event: StoreInspectorEvent): void;

  /** Access to the action history for testing */
  readonly actionHistory: ActionHistory;

  /** Pending effects counter */
  incrementPendingEffects(): void;
  decrementPendingEffects(): void;
}

// =============================================================================
// StoreInspectorPort
// =============================================================================

/**
 * Port definition for container registration of StoreInspectorAPI.
 */
export const StoreInspectorPort: DirectedPort<"StoreInspector", StoreInspectorAPI, "outbound"> =
  createPort<"StoreInspector", StoreInspectorAPI>({ name: "StoreInspector" });

export type StoreInspectorPortDef = typeof StoreInspectorPort;

// =============================================================================
// StoreInspectorInternalPort
// =============================================================================

/**
 * Port definition for the internal inspector interface.
 * Used by adapter factories with `inspection: true` to auto-register ports
 * and auto-record actions.
 */
export const StoreInspectorInternalPort: DirectedPort<
  "StoreInspectorInternal",
  StoreInspectorInternal,
  "outbound"
> = createPort<"StoreInspectorInternal", StoreInspectorInternal>({
  name: "StoreInspectorInternal",
});

export type StoreInspectorInternalPortDef = typeof StoreInspectorInternalPort;

// =============================================================================
// StoreRegistryPort
// =============================================================================

/**
 * Port definition for container registration of StoreRegistry.
 *
 * When registered in a graph, enables auto-discovery of store port adapters
 * without manual `registerPort()` calls.
 */
export const StoreRegistryPort: DirectedPort<"StoreRegistry", StoreRegistry, "outbound"> =
  createPort<"StoreRegistry", StoreRegistry>({ name: "StoreRegistry" });

export type StoreRegistryPortDef = typeof StoreRegistryPort;

// =============================================================================
// StoreTracingHookPort
// =============================================================================

/**
 * Port definition for the store tracing hook.
 * When registered in a graph, enables distributed tracing for store operations.
 */
export const StoreTracingHookPort: DirectedPort<"StoreTracingHook", StoreTracingHook, "outbound"> =
  createPort<"StoreTracingHook", StoreTracingHook>({ name: "StoreTracingHook" });

export type StoreTracingHookPortDef = typeof StoreTracingHookPort;

// =============================================================================
// StoreLibraryInspectorPort
// =============================================================================

/**
 * Port definition for the store library inspector bridge.
 *
 * When registered in a graph, provides a LibraryInspector that bridges
 * store inspection into the container's unified Library Inspector Protocol.
 */
export const StoreLibraryInspectorPort = createLibraryInspectorPort({
  name: "StoreLibraryInspector",
  description: "Library inspector bridge for store state management",
});
