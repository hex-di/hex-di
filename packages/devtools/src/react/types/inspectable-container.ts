/**
 * Trait-like interface for container inspection.
 *
 * This interface provides a structural typing pattern (similar to Rust traits)
 * that any Container variant satisfies. It enables storing heterogeneous
 * containers in the registry without generic type parameter variance issues.
 *
 * @example Type-safe container storage
 * ```typescript
 * // Any Container satisfies InspectableContainer structurally
 * const container: Container<LoggerPort | DbPort, never, never, "initialized"> = ...;
 *
 * // Can be stored as InspectableContainer
 * const inspectable: InspectableContainer = container;
 *
 * // Use built-in inspector for basic inspection
 * const snapshot = container.inspector.getSnapshot();
 * ```
 *
 * @packageDocumentation
 */

import { INTERNAL_ACCESS, type ContainerInternalState } from "@hex-di/runtime";
import type { TracingAPI, InspectorAPI } from "@hex-di/core";

// Re-export for consumers
export { INTERNAL_ACCESS };

/**
 * Trait-like interface for container inspection.
 *
 * All Container<TProvides, TExtends, TAsyncPorts, TPhase> variants
 * satisfy this interface via structural typing (like `impl Trait` in Rust).
 *
 * This enables:
 * - Storing containers of different types in a single registry
 * - Creating RuntimeInspector for any container
 * - Type-safe access to container internals via INTERNAL_ACCESS
 * - Auto-registration with DevTools using name/parentName/kind
 * - Direct access to inspector and tracer via property-based API
 *
 * The interface uses a concrete return type (ContainerInternalState)
 * rather than generics, avoiding variance issues while maintaining
 * full type safety for inspection operations.
 */
export interface InspectableContainer {
  /**
   * Accessor for container internal state.
   *
   * Returns a frozen snapshot of the container's internal state
   * including singleton memo, adapter map, and child scopes.
   */
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;

  /**
   * Container name - serves as both identifier and display label.
   *
   * For root containers, this is set via createContainer options.
   * For child containers, this is set via createChild options.
   */
  readonly name: string;

  /**
   * Parent container's name, null for root containers.
   *
   * Child containers automatically derive this from their parent's name.
   */
  readonly parentName: string | null;

  /**
   * Container kind - "root" for root containers, "child" for child containers.
   */
  readonly kind: "root" | "child";

  /**
   * Built-in inspector API for container state inspection.
   *
   * Provides all inspection functionality including:
   * - Pull-based queries (getSnapshot, getScopeTree, listPorts, isResolved)
   * - Push-based subscriptions (subscribe)
   * - Hierarchy traversal (getChildContainers)
   * - Graph data for DevTools (getAdapterInfo, getGraphData)
   *
   * Always available on containers - no plugin configuration required.
   */
  readonly inspector: InspectorAPI;

  /**
   * Built-in tracer API for resolution tracing.
   *
   * Provides methods to retrieve traces, statistics, and subscribe to resolution events.
   * Always available on containers - no plugin configuration required.
   */
  readonly tracer: TracingAPI;
}

/**
 * Type guard to check if a value is an InspectableContainer.
 *
 * Uses both property-based checks and symbol presence to determine if an object
 * can be inspected. Prefers property-based checks for the new API pattern.
 *
 * @param value - The object to check
 * @returns true if value implements InspectableContainer
 *
 * @example
 * ```typescript
 * function inspectIfPossible(maybeContainer: object): Option<ContainerSnapshot> {
 *   if (isInspectableContainer(maybeContainer)) {
 *     // Use property-based API
 *     return Some(maybeContainer.inspector.getSnapshot());
 *   }
 *   return None;
 * }
 * ```
 */
export function isInspectableContainer(value: object): value is InspectableContainer {
  // Check for property-based API (new pattern)
  if (
    "inspector" in value &&
    value.inspector !== undefined &&
    typeof (value.inspector as { getSnapshot?: unknown }).getSnapshot === "function"
  ) {
    return true;
  }

  // Fallback: check for INTERNAL_ACCESS symbol (legacy pattern)
  return (
    INTERNAL_ACCESS in value &&
    typeof (value as Record<symbol, unknown>)[INTERNAL_ACCESS] === "function"
  );
}
