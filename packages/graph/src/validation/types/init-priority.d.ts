/**
 * Async adapter type utilities for @hex-di/graph.
 *
 * This module provides type-level utilities for working with async adapters.
 *
 * ## Initialization Order
 *
 * Async adapter initialization order is automatically determined by the runtime
 * using topological sort based on the dependency graph. Adapters with no async
 * dependencies initialize first, and independent adapters at the same level
 * initialize in parallel for maximum performance.
 *
 * @packageDocumentation
 */
/**
 * Checks if an adapter is an async adapter.
 *
 * @typeParam TAdapter - The adapter type
 * @returns `true` if async, `false` otherwise
 */
export type IsAsyncAdapter<TAdapter> = TAdapter extends {
    factoryKind: "async";
} ? true : false;
