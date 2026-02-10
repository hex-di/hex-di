/**
 * Library Inspector Protocol Types
 *
 * Defines the protocol that ecosystem libraries (Flow, Store, Logger, etc.)
 * implement to participate in the container's unified inspection system.
 *
 * @packageDocumentation
 */

import type { ContainerSnapshot } from "./container-types.js";
import { createPort } from "../ports/factory.js";
import type { DirectedPort } from "../ports/types.js";

// =============================================================================
// Library Event Types
// =============================================================================

/**
 * Event emitted by a library inspector.
 *
 * Wraps library-specific events with source identification for the
 * container's unified event stream.
 */
export interface LibraryEvent {
  /** Library name (matches LibraryInspector.name) */
  readonly source: string;
  /** Library-specific event type string */
  readonly type: string;
  /** Library-specific event payload */
  readonly payload: Readonly<Record<string, unknown>>;
  /** Event timestamp (Date.now()) */
  readonly timestamp: number;
}

/**
 * Listener callback for library inspector events.
 */
export type LibraryEventListener = (event: LibraryEvent) => void;

// =============================================================================
// Library Inspector Protocol
// =============================================================================

/**
 * Protocol that all library inspectors implement to participate
 * in the container's unified inspection system.
 *
 * Libraries implement this interface to make their domain-specific
 * inspection data discoverable and queryable through the container.
 */
export interface LibraryInspector {
  /** Unique library identifier. Must be lowercase kebab-case. */
  readonly name: string;

  /**
   * Returns a frozen snapshot of the library's current state.
   * The shape is library-specific but always a frozen record.
   */
  getSnapshot(): Readonly<Record<string, unknown>>;

  /**
   * Subscribe to library-specific events.
   * Returns an unsubscribe function.
   * Optional -- libraries without push-based events omit this.
   */
  subscribe?(listener: LibraryEventListener): () => void;

  /**
   * Dispose the library inspector and clean up resources.
   * Optional -- called when the container disposes.
   */
  dispose?(): void;
}

// =============================================================================
// Unified Snapshot
// =============================================================================

/**
 * Combined snapshot of container state and all registered library snapshots.
 *
 * Provides a single, frozen, queryable view of the entire application
 * state across all libraries.
 */
export interface UnifiedSnapshot {
  /** Snapshot timestamp */
  readonly timestamp: number;
  /** Container state snapshot */
  readonly container: ContainerSnapshot;
  /** Library snapshots keyed by library name */
  readonly libraries: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Names of registered libraries at snapshot time, sorted alphabetically */
  readonly registeredLibraries: readonly string[];
}

// =============================================================================
// Library Query Types
// =============================================================================

/**
 * A single entry in a flattened cross-library query result.
 *
 * Represents one key-value pair from a library's snapshot,
 * tagged with the library name for cross-cutting queries.
 */
export interface LibraryQueryEntry {
  readonly library: string;
  readonly key: string;
  readonly value: unknown;
}

/**
 * Result type for library query methods.
 * Identical to LibraryQueryEntry — named alias for API clarity.
 */
export type LibraryQueryResult = LibraryQueryEntry;

/**
 * Predicate function for filtering library query entries.
 */
export type LibraryQueryPredicate = (entry: LibraryQueryEntry) => boolean;

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Runtime type guard for the LibraryInspector protocol.
 *
 * Checks structural conformance:
 * 1. Value is a non-null object
 * 2. Has `name` property of type string with length > 0
 * 3. Has `getSnapshot` property of type function
 * 4. If `subscribe` is present, it must be a function
 * 5. If `dispose` is present, it must be a function
 */
export function isLibraryInspector(value: unknown): value is LibraryInspector {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("name" in value) || typeof value.name !== "string" || value.name.length === 0) {
    return false;
  }

  if (!("getSnapshot" in value) || typeof value.getSnapshot !== "function") {
    return false;
  }

  if ("subscribe" in value && typeof value.subscribe !== "function") {
    return false;
  }

  if ("dispose" in value && typeof value.dispose !== "function") {
    return false;
  }

  return true;
}

// =============================================================================
// Convenience Factory
// =============================================================================

/**
 * Creates a port typed as `LibraryInspector` with the `"library-inspector"` category.
 *
 * This is a convenience factory for libraries implementing the Library Inspector Protocol.
 * The returned port carries `"library-inspector"` at the type level, enabling compile-time
 * category queries via `PortsByCategory` and `HasCategory`.
 *
 * @param config - Port configuration (name, optional description and tags)
 * @returns A `DirectedPort<LibraryInspector, TName, "outbound", "library-inspector">`
 *
 * @example
 * ```typescript
 * const FlowInspectorPort = createLibraryInspectorPort({
 *   name: "FlowInspector",
 *   description: "Flow library inspection",
 * });
 * // Type: DirectedPort<LibraryInspector, "FlowInspector", "outbound", "library-inspector">
 * ```
 */
export function createLibraryInspectorPort<const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly tags?: readonly string[];
}): DirectedPort<LibraryInspector, TName, "outbound", "library-inspector"> {
  return createPort<TName, LibraryInspector, "outbound", "library-inspector">({
    ...config,
    category: "library-inspector",
    direction: "outbound",
  });
}
