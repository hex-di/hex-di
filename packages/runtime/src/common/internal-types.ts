/**
 * Shared internal types for the runtime package.
 * @internal
 */

/**
 * Type for memoization finalizers.
 * @internal
 */
type FinalizerFn<T> = {
  // Bivariant to allow storing typed finalizers in type-erased caches.
  bivarianceHack(instance: T): void | Promise<void>;
}["bivarianceHack"];

/**
 * Type for memoization finalizers.
 * @internal
 */
export type Finalizer<T = unknown> = FinalizerFn<T> | undefined;
