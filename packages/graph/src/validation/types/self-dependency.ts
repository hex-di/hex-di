/**
 * Self-Dependency Detection Types.
 *
 * This module provides type utilities for detecting self-dependencies in adapters.
 * A self-dependency occurs when an adapter requires its own port, which is always
 * an error because the service cannot exist before it's created.
 *
 * @packageDocumentation
 */

import type { AdapterProvidesName, AdapterRequiresNames } from "./adapter-extraction.js";

// =============================================================================
// Self-Dependency Detection
// =============================================================================

/**
 * Detects if an adapter requires its own port (self-dependency).
 *
 * A self-dependency occurs when an adapter's `provides` port name appears
 * in its `requires` array. This is always an error because:
 * 1. It creates an immediate circular dependency (no path needed)
 * 2. The service cannot exist before it's created
 * 3. It indicates a design error in the adapter definition
 *
 * @typeParam TAdapter - The adapter type to check
 * @returns `true` if the adapter requires its own port, `false` otherwise
 *
 * @example
 * ```typescript
 * const BrokenAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [UserServicePort], // Self-dependency!
 *   factory: ({ UserService }) => ({ ... }),
 * });
 *
 * type IsSelfDep = HasSelfDependency<typeof BrokenAdapter>; // true
 * ```
 *
 * @internal
 */
export type HasSelfDependency<TAdapter> =
  // First check if there are any required ports at all
  [AdapterRequiresNames<TAdapter>] extends [never]
    ? false
    : // Then check if the provided port name is in the required port names
      AdapterProvidesName<TAdapter> extends AdapterRequiresNames<TAdapter>
      ? true
      : false;

// =============================================================================
// Batch Self-Dependency Detection
// =============================================================================

/**
 * Detects if ANY adapter in a batch has a self-dependency.
 *
 * This is used by `provideMany()` to check all adapters in a batch before
 * running cycle detection. If a self-dependency is found, we return the
 * more specific HEX006 error instead of the generic HEX002 cycle error.
 *
 * ## How It Works
 *
 * Recursively iterates through the tuple, checking each adapter:
 * ```
 * [A, B, C] -> HasSelfDependency<A> ? true : HasSelfDependencyInBatch<[B, C]>
 * ```
 *
 * Returns `true` as soon as any adapter with self-dependency is found.
 * Returns `false` only if all adapters pass the check.
 *
 * @typeParam TAdapters - Tuple of adapter types to check
 * @returns `true` if any adapter has self-dependency, `false` otherwise
 *
 * @example
 * ```typescript
 * type HasSelf = HasSelfDependencyInBatch<[AdapterA, SelfRefAdapter]>; // true
 * type NoSelf = HasSelfDependencyInBatch<[AdapterA, AdapterB]>; // false
 * ```
 *
 * @internal
 */
export type HasSelfDependencyInBatch<TAdapters extends readonly unknown[]> =
  TAdapters extends readonly [infer First, ...infer Rest extends readonly unknown[]]
    ? HasSelfDependency<First> extends true
      ? true
      : HasSelfDependencyInBatch<Rest>
    : false;

/**
 * Finds the port name of the first adapter with a self-dependency in a batch.
 *
 * This is used to generate the HEX006 error message when a self-dependency
 * is detected in a batch operation. It identifies which specific adapter
 * has the problem.
 *
 * ## How It Works
 *
 * Recursively iterates through the tuple, returning the provides name of
 * the first adapter that has a self-dependency:
 * ```
 * [A, SelfRef, B] -> SelfRef has self-dep -> "SelfRefPortName"
 * ```
 *
 * @typeParam TAdapters - Tuple of adapter types to search
 * @returns The port name of the first self-referential adapter, or `never` if none
 *
 * @example
 * ```typescript
 * type Port = FindSelfDependencyPort<[AdapterA, SelfRefAdapter]>; // "SelfRefPort"
 * type None = FindSelfDependencyPort<[AdapterA, AdapterB]>; // never
 * ```
 *
 * @internal
 */
export type FindSelfDependencyPort<TAdapters extends readonly unknown[]> =
  TAdapters extends readonly [infer First, ...infer Rest extends readonly unknown[]]
    ? HasSelfDependency<First> extends true
      ? AdapterProvidesName<First>
      : FindSelfDependencyPort<Rest>
    : never;
