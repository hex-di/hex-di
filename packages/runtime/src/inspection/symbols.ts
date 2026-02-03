/**
 * Symbol definitions for container state inspection and tracing.
 *
 * This module defines Symbols used for controlled access to container internals.
 * The Symbol-based encapsulation pattern ensures that:
 *
 * 1. **Encapsulation**: Internal state is not exposed through the public API.
 *    Only code with access to the Symbol can read internal state.
 *
 * 2. **Cross-Realm Consistency**: Using `Symbol.for()` creates a global registry
 *    entry, ensuring the same Symbol is returned across different realms (e.g.,
 *    when DevTools is bundled separately from the runtime).
 *
 * 3. **Controlled Access**: The accessor method keyed by this Symbol returns a
 *    frozen snapshot, never the mutable internal state. This prevents accidental
 *    mutation while enabling inspection.
 *
 * 4. **Type Safety**: TypeScript interfaces define the expected shape of the
 *    snapshot data, providing compile-time safety for DevTools code.
 *
 * @example Using INTERNAL_ACCESS to inspect a container
 * ```typescript
 * import { INTERNAL_ACCESS } from '@hex-di/runtime';
 * import type { ContainerInternalState, Container } from '@hex-di/runtime';
 * import type { Port } from '@hex-di/core';
 *
 * function inspectContainer(container: Container<Port<unknown, string>>) {
 *   // No cast needed - Container type includes [INTERNAL_ACCESS] property
 *   const snapshot = container[INTERNAL_ACCESS]();
 *   console.log('Disposed:', snapshot.disposed);
 *   console.log('Singleton count:', snapshot.singletonMemo.size);
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Symbol used to access container and scope internal state for inspection.
 *
 * This Symbol grants controlled read-only access to container internals.
 * The accessor method keyed by this Symbol returns a frozen snapshot of
 * the internal state at the time of the call.
 *
 * Using `Symbol.for()` ensures cross-realm consistency - the same Symbol
 * is returned regardless of which bundle or context imports it. This is
 * essential for DevTools that may be loaded separately from the main app.
 *
 * @remarks
 * - The accessor returns a frozen snapshot, never mutable internal state
 * - Each call returns a fresh snapshot (no caching between calls)
 * - Throws if the container/scope has been disposed
 * - Only DevTools and testing code should use this Symbol
 *
 * @example
 * ```typescript
 * const container = createContainer(graph);
 * // No cast needed - Container type includes [INTERNAL_ACCESS] property
 * const state = container[INTERNAL_ACCESS](); // Frozen snapshot
 * ```
 */
export const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

/**
 * Symbol used to access resolution tracing capabilities on tracing-enabled containers.
 *
 * This Symbol grants access to tracing methods and data on containers created with
 * `createTracingContainer()`. It provides read-only access to trace entries, statistics,
 * and recording controls.
 *
 * Using `Symbol.for()` ensures cross-realm consistency - the same Symbol is returned
 * regardless of which bundle or context imports it. This is essential for DevTools
 * that may be loaded separately from the main app.
 *
 * @remarks
 * - Only containers created with `createTracingContainer()` have this Symbol
 * - The accessor returns frozen snapshots, never mutable internal state
 * - Methods include: getTraces(), getStats(), pause(), resume(), clear(), subscribe()
 * - Only DevTools and testing code should use this Symbol
 *
 * @example
 * ```typescript
 * import { createContainer, TRACING_ACCESS } from '@hex-di/runtime';
 *
 * const container = createContainer(graph);
 * const tracingAPI = container.tracer;
 *
 * const traces = tracingAPI.getTraces();
 * const stats = tracingAPI.getStats();
 * ```
 */
export const TRACING_ACCESS = Symbol.for("hex-di/tracing-access");

/**
 * Symbol used to access adapter lookup for child container inheritance modes.
 *
 * This Symbol grants controlled access to the parent container's adapter map,
 * enabling child containers to call the factory again for isolated mode.
 *
 * Using `Symbol.for()` ensures cross-realm consistency.
 *
 * @remarks
 * - Only used internally by child container implementation
 * - Returns the adapter for a given port, or undefined if not found
 * - Never exposed in public API
 *
 * @internal
 */
export const ADAPTER_ACCESS = Symbol.for("hex-di/adapter-access");

/**
 * Symbol used internally for legacy hook installation capabilities.
 *
 * @deprecated Use `container.addHook()` and `container.removeHook()` instead.
 * This symbol is kept for internal compatibility but is not part of the public API.
 *
 * @internal
 */
export const HOOKS_ACCESS = Symbol.for("hex-di/hooks-access");

/**
 * Symbol for accessing InspectorAPI on containers.
 *
 * Uses `Symbol.for()` for cross-realm consistency, enabling DevTools
 * loaded in separate bundles to access the same API.
 *
 * @example
 * ```typescript
 * import { createContainer, INSPECTOR } from '@hex-di/runtime';
 *
 * const container = createContainer(graph, { name: 'App' });
 *
 * const inspector = container[INSPECTOR];
 * const snapshot = inspector.getSnapshot();
 * ```
 */
export const INSPECTOR = Symbol.for("hex-di/inspector");
