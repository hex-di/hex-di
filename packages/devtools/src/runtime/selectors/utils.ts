/**
 * Selector Utilities
 *
 * Provides memoization utilities for selectors.
 * Selectors are pure functions that derive state from the runtime.
 *
 * @packageDocumentation
 */

import type { DevToolsRuntimeState } from "../types.js";

/**
 * A selector function that derives a value from state.
 *
 * @typeParam T - The return type of the selector
 */
export type Selector<T> = (state: DevToolsRuntimeState) => T;

/**
 * A parameterized selector that takes additional arguments.
 *
 * @typeParam T - The return type of the selector
 * @typeParam Args - Tuple type of additional arguments
 */
export type ParameterizedSelector<T, Args extends readonly unknown[]> = (
  state: DevToolsRuntimeState,
  ...args: Args
) => T;

/**
 * Cache entry discriminated union for type-safe caching.
 *
 * @internal
 */
type CacheEntry<T> =
  | { readonly hasValue: false }
  | { readonly hasValue: true; readonly state: DevToolsRuntimeState; readonly result: T };

/**
 * Creates the initial empty cache state.
 *
 * @internal
 */
function createEmptyCache<T>(): CacheEntry<T> {
  return { hasValue: false };
}

/**
 * Creates a memoized selector that caches the last computed result.
 *
 * The selector uses reference equality to determine if the input state
 * has changed. If the state reference is the same, the cached result
 * is returned. This is optimized for the common case where state
 * changes between calls but occasionally remains the same (e.g.,
 * during React re-renders caused by parent components).
 *
 * This implementation uses a simple single-entry cache, which is sufficient
 * for most use cases with `useSyncExternalStore` where the same state
 * reference is used until a mutation occurs.
 *
 * @example
 * ```typescript
 * const selectExpensiveValue = createSelector((state) => {
 *   // Expensive computation
 *   return state.plugins.map(p => ({ ...p, computed: true }));
 * });
 *
 * const value1 = selectExpensiveValue(state); // Computes
 * const value2 = selectExpensiveValue(state); // Returns cached
 * ```
 *
 * @param compute - Function that computes the derived value
 * @returns A memoized selector function
 */
export function createSelector<T>(compute: Selector<T>): Selector<T> {
  // Use a mutable reference holder to allow cache updates
  // The discriminated union ensures type-safe access
  let cache: CacheEntry<T> = createEmptyCache();

  return function memoizedSelector(state: DevToolsRuntimeState): T {
    // If cache is valid and state reference matches, return cached result
    if (cache.hasValue && state === cache.state) {
      return cache.result;
    }

    // Compute new result
    const result = compute(state);

    // Update cache with new entry
    cache = { hasValue: true, state, result };

    return result;
  };
}

/**
 * Creates a memoized selector with additional arguments.
 *
 * This is useful for selectors that need to accept parameters
 * in addition to state (e.g., selecting a plugin by id).
 *
 * Note: This implementation caches based on state reference only.
 * For full argument memoization, consider using a more sophisticated
 * caching strategy or external libraries like reselect.
 *
 * @example
 * ```typescript
 * const selectPluginByIdBase = (state: DevToolsRuntimeState, id: string) => {
 *   return state.plugins.find(p => p.id === id);
 * };
 *
 * // Note: This selector is not memoized per argument,
 * // only by state reference. For id-specific memoization,
 * // use createSelector at the call site.
 * ```
 *
 * @param compute - Function that computes the derived value
 * @returns The selector function (not memoized for arguments)
 */
export function createParameterizedSelector<T, Args extends readonly unknown[]>(
  compute: ParameterizedSelector<T, Args>
): ParameterizedSelector<T, Args> {
  // For parameterized selectors, we don't memoize by default
  // because the argument combinations can be unbounded.
  // Users can wrap specific calls with createSelector if needed.
  return compute;
}

/**
 * Composes two selectors into a single memoized selector.
 *
 * This provides a type-safe way to combine selector results without
 * requiring type casts. For more than two selectors, chain multiple
 * compose2Selectors calls.
 *
 * @example
 * ```typescript
 * const selectActiveTabId = (state: DevToolsRuntimeState) => state.activeTabId;
 * const selectPlugins = (state: DevToolsRuntimeState) => state.plugins;
 *
 * const selectActivePlugin = compose2Selectors(
 *   selectActiveTabId,
 *   selectPlugins,
 *   (activeTabId, plugins) => plugins.find(p => p.id === activeTabId)
 * );
 * ```
 *
 * @param selector1 - First input selector
 * @param selector2 - Second input selector
 * @param combiner - Function that combines the selector results
 * @returns A memoized composed selector
 */
export function compose2Selectors<A, B, R>(
  selector1: Selector<A>,
  selector2: Selector<B>,
  combiner: (a: A, b: B) => R
): Selector<R> {
  type CombinedCache =
    | { readonly hasValue: false }
    | {
        readonly hasValue: true;
        readonly state: DevToolsRuntimeState;
        readonly a: A;
        readonly b: B;
        readonly result: R;
      };

  let cache: CombinedCache = { hasValue: false };

  return function composedSelector(state: DevToolsRuntimeState): R {
    // Short-circuit on state reference match
    if (cache.hasValue && state === cache.state) {
      return cache.result;
    }

    // Compute input values
    const a = selector1(state);
    const b = selector2(state);

    // Check if inputs match cached inputs (reference equality)
    if (cache.hasValue && a === cache.a && b === cache.b) {
      // Update state reference but return cached result
      cache = { ...cache, state };
      return cache.result;
    }

    // Compute new result
    const result = combiner(a, b);

    // Update cache
    cache = { hasValue: true, state, a, b, result };

    return result;
  };
}

/**
 * Composes three selectors into a single memoized selector.
 *
 * This provides a type-safe way to combine selector results.
 *
 * @param selector1 - First input selector
 * @param selector2 - Second input selector
 * @param selector3 - Third input selector
 * @param combiner - Function that combines the selector results
 * @returns A memoized composed selector
 */
export function compose3Selectors<A, B, C, R>(
  selector1: Selector<A>,
  selector2: Selector<B>,
  selector3: Selector<C>,
  combiner: (a: A, b: B, c: C) => R
): Selector<R> {
  type CombinedCache =
    | { readonly hasValue: false }
    | {
        readonly hasValue: true;
        readonly state: DevToolsRuntimeState;
        readonly a: A;
        readonly b: B;
        readonly c: C;
        readonly result: R;
      };

  let cache: CombinedCache = { hasValue: false };

  return function composedSelector(state: DevToolsRuntimeState): R {
    // Short-circuit on state reference match
    if (cache.hasValue && state === cache.state) {
      return cache.result;
    }

    // Compute input values
    const a = selector1(state);
    const b = selector2(state);
    const c = selector3(state);

    // Check if inputs match cached inputs (reference equality)
    if (cache.hasValue && a === cache.a && b === cache.b && c === cache.c) {
      // Update state reference but return cached result
      cache = { ...cache, state };
      return cache.result;
    }

    // Compute new result
    const result = combiner(a, b, c);

    // Update cache
    cache = { hasValue: true, state, a, b, c, result };

    return result;
  };
}
