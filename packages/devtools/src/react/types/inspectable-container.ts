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
 * // Create inspector for the actual container
 * const inspector = createInspector(inspectable);
 * ```
 *
 * @packageDocumentation
 */

import { INTERNAL_ACCESS, type ContainerInternalState } from "@hex-di/runtime";

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
}

/**
 * Type guard to check if a value is an InspectableContainer.
 *
 * Uses the INTERNAL_ACCESS symbol presence to determine if an object
 * can be inspected. This is a runtime check that enables safe casting
 * of containers from external sources.
 *
 * @param value - The object to check
 * @returns true if value implements InspectableContainer
 *
 * @example
 * ```typescript
 * function inspectIfPossible(maybeContainer: object): Option<ContainerInspector> {
 *   if (isInspectableContainer(maybeContainer)) {
 *     return Some(createInspector(maybeContainer));
 *   }
 *   return None;
 * }
 * ```
 */
export function isInspectableContainer(value: object): value is InspectableContainer {
  return (
    INTERNAL_ACCESS in value &&
    typeof (value as Record<symbol, unknown>)[INTERNAL_ACCESS] === "function"
  );
}
