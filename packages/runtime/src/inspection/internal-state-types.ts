/**
 * Type definitions for container state inspection.
 *
 * These types define the shape of internal state snapshots returned by
 * the Symbol-based accessor protocol. All types use readonly properties
 * to reinforce the immutable nature of snapshots.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { Lifetime, FactoryKind } from "@hex-di/core";
import { INTERNAL_ACCESS } from "./symbols.js";
import type { InheritanceMode } from "../types/inheritance.js";

// =============================================================================
// Container Internal State
// =============================================================================

/**
 * Snapshot of container internal state for inspection.
 *
 * This interface defines the structure returned by the container's
 * INTERNAL_ACCESS accessor. All data is frozen and represents a
 * point-in-time snapshot of the container state.
 *
 * @remarks
 * - `disposed` indicates if the container has been disposed
 * - `singletonMemo` provides access to cached singleton instances
 * - `childScopes` contains references to child scope snapshots
 * - `adapterMap` maps ports to their adapter configurations
 */
export interface ContainerInternalState {
  /** Whether the container has been disposed */
  readonly disposed: boolean;

  /** Reference to the singleton MemoMap for instance inspection */
  readonly singletonMemo: MemoMapSnapshot;

  /** Array of child scope internal states */
  readonly childScopes: readonly ScopeInternalState[];

  /** Array of child container internal states */
  readonly childContainers: readonly ContainerInternalState[];

  /** Map of port to adapter information */
  readonly adapterMap: ReadonlyMap<Port<unknown, string>, AdapterInfo>;

  /**
   * Parent container's internal state for inherited resolution tracking.
   *
   * Present only for child containers with "shared" inheritance mode.
   * Enables inspector to report inherited singletons as resolved.
   */
  readonly parentState?: ContainerInternalState;

  /** Unique identifier for this container (e.g., "root", "child-1") */
  readonly containerId: string;

  /** Human-readable container name (e.g., "App Root", "Chat Dashboard") */
  readonly containerName: string;

  /**
   * Per-port inheritance modes for child containers.
   * Maps port name to inheritance mode (shared, forked, isolated).
   * Only present for child containers.
   */
  readonly inheritanceModes?: ReadonlyMap<string, InheritanceMode>;

  /**
   * Reference to the actual container wrapper object.
   *
   * Used by InspectorPlugin to access child container's INSPECTOR API directly
   * when the child may not have been registered in the apiRegistry.
   * Only present in child container snapshots within the childContainers array.
   */
  readonly wrapper?: unknown;

  /**
   * Set of port names that are overridden from the parent container.
   *
   * Enables DevTools to distinguish between:
   * - own: Adapter registered directly (new port in this container)
   * - inherited: Adapter from parent (not overridden)
   * - overridden: Adapter replaces parent's adapter for the same port
   *
   * Only present for child containers. Empty set for root containers.
   */
  readonly overridePorts: ReadonlySet<string>;

  /**
   * Checks if a port name is an override of a parent adapter.
   *
   * @param portName - The port name to check
   * @returns `true` if the port overrides a parent adapter, `false` otherwise
   */
  isOverride(portName: string): boolean;
}

/**
 * Snapshot of MemoMap state for inspection.
 *
 * Provides a read-only view of cached instances without exposing
 * the actual MemoMap instance or its mutating methods.
 */
export interface MemoMapSnapshot {
  /** Number of cached instances */
  readonly size: number;

  /** Iterable of entry metadata for each cached instance */
  readonly entries: readonly MemoEntrySnapshot[];
}

/**
 * Snapshot of a single MemoMap entry.
 */
export interface MemoEntrySnapshot {
  /** The port this entry is keyed by */
  readonly port: Port<unknown, string>;

  /** Port name for display */
  readonly portName: string;

  /** Timestamp when the instance was resolved */
  readonly resolvedAt: number;

  /** Sequential resolution order within the MemoMap */
  readonly resolutionOrder: number;
}

/**
 * Information about an adapter for inspection.
 */
export interface AdapterInfo {
  /** Port name for display */
  readonly portName: string;

  /** Service lifetime */
  readonly lifetime: Lifetime;

  /** Factory kind (sync or async) */
  readonly factoryKind: FactoryKind;

  /** Number of dependencies */
  readonly dependencyCount: number;

  /** Port names of dependencies */
  readonly dependencyNames: readonly string[];
}

// =============================================================================
// Scope Internal State
// =============================================================================

/**
 * Snapshot of scope internal state for inspection.
 *
 * This interface defines the structure returned by a scope's
 * INTERNAL_ACCESS accessor. All data is frozen and represents a
 * point-in-time snapshot of the scope state.
 *
 * @remarks
 * - `id` is a unique identifier generated at scope creation
 * - `disposed` indicates if the scope has been disposed
 * - `scopedMemo` provides access to cached scoped instances
 * - `childScopes` contains references to child scope snapshots
 */
export interface ScopeInternalState {
  /** Unique identifier for this scope (e.g., "scope-1", "scope-2") */
  readonly id: string;

  /** Whether the scope has been disposed */
  readonly disposed: boolean;

  /** Reference to the scoped MemoMap for instance inspection */
  readonly scopedMemo: MemoMapSnapshot;

  /** Array of child scope internal states */
  readonly childScopes: readonly ScopeInternalState[];
}

// =============================================================================
// Internal Accessor Type
// =============================================================================

/**
 * Type for the internal accessor function.
 *
 * Both Container and Scope implement this accessor pattern via
 * the INTERNAL_ACCESS Symbol. The accessor is a function that
 * returns a frozen snapshot of internal state.
 *
 * @typeParam T - The type of internal state returned (Container or Scope)
 */
export type InternalAccessor<T> = () => T;

/**
 * Interface for objects that expose internal state via INTERNAL_ACCESS Symbol.
 *
 * This interface is used for type narrowing when accessing internals.
 *
 * @typeParam T - The type of internal state returned
 */
export interface HasInternalAccess<T> {
  [key: symbol]: InternalAccessor<T>;
}

/**
 * Minimal interface for container inspection access.
 *
 * This trait-like interface captures the capability to access
 * container internals via the INTERNAL_ACCESS Symbol. Any Container
 * satisfies this interface structurally (like Rust's impl Trait).
 *
 * Used by:
 * - PluginContext.getContainer() to provide container access
 * - createInspector() to accept any container variant
 *
 * @example
 * ```typescript
 * function inspectContainer(container: InternalAccessible): void {
 *   const state = container[INTERNAL_ACCESS]();
 *   console.log("Disposed:", state.disposed);
 * }
 * ```
 */
export interface InternalAccessible {
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
}

// =============================================================================
// Inspector API Types (createInspector return types)
// =============================================================================

/**
 * Container inspector interface providing runtime state inspection methods.
 *
 * The inspector provides pure functions that return serializable, frozen data
 * about the container's current state. Each method call returns a fresh
 * snapshot - there is no caching or reactive updates.
 *
 * @remarks
 * - Inspector creation is O(1) - iteration happens only when methods are called
 * - All returned data is deeply frozen with `Object.freeze()`
 * - Throws descriptive errors if the container has been disposed
 */
export interface ContainerInspector {
  /**
   * Returns a complete snapshot of the container state.
   *
   * @returns A frozen ContainerSnapshot object
   * @throws {DisposedScopeError} If the container has been disposed
   */
  snapshot(): ContainerSnapshot;

  /**
   * Returns all registered port names in alphabetical order.
   *
   * @returns A frozen array of port name strings
   * @throws {DisposedScopeError} If the container has been disposed
   */
  listPorts(): readonly string[];

  /**
   * Checks if a port has been resolved (has a cached instance).
   *
   * @param portName - The name of the port to check
   * @returns `true` if resolved, `false` if not resolved, `"scope-required"` for scoped ports
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {Error} If the port name is not registered
   */
  isResolved(portName: string): boolean | "scope-required";

  /**
   * Returns the hierarchical scope tree starting from the container.
   *
   * @returns A frozen ScopeTree structure
   * @throws {DisposedScopeError} If the container has been disposed
   */
  getScopeTree(): ScopeTree;
}

/**
 * Complete snapshot of container state for inspection.
 *
 * This is the public-facing snapshot structure returned by `inspector.snapshot()`.
 * All properties are readonly and the object is deeply frozen.
 */
export interface ContainerSnapshot {
  /** Whether the container has been disposed */
  readonly isDisposed: boolean;

  /** Array of singleton entries (both resolved and pending) */
  readonly singletons: readonly SingletonEntry[];

  /** Hierarchical scope tree starting from the container */
  readonly scopes: ScopeTree;

  /** Human-readable container name for DevTools display */
  readonly containerName: string;
}

/**
 * Information about a singleton port in the container.
 *
 * Represents both resolved and pending singleton entries.
 */
export interface SingletonEntry {
  /** Port name for display and identification */
  readonly portName: string;

  /** Service lifetime (always "singleton" for this array, but included for consistency) */
  readonly lifetime: Lifetime;

  /** Whether this singleton has been resolved (has a cached instance) */
  readonly isResolved: boolean;

  /** Timestamp when the instance was resolved, or undefined if not resolved */
  readonly resolvedAt: number | undefined;

  /** Sequential resolution order, or undefined if not resolved */
  readonly resolutionOrder: number | undefined;
}

/**
 * Hierarchical tree structure representing the container and its scopes.
 *
 * The root node represents the container itself, with children representing
 * scopes created from the container or from other scopes.
 */
export interface ScopeTree {
  /** Unique identifier ("container" for root, or "scope-N" for scopes) */
  readonly id: string;

  /** Current status of this scope */
  readonly status: "active" | "disposed";

  /** Number of resolved instances in this scope's memo */
  readonly resolvedCount: number;

  /** Total number of ports that could be resolved in this scope's context */
  readonly totalCount: number;

  /** Child scopes created from this scope */
  readonly children: readonly ScopeTree[];

  /** Port names of resolved services in this scope */
  readonly resolvedPorts: readonly string[];
}
