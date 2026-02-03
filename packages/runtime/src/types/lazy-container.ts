/**
 * LazyContainer type definitions for @hex-di/runtime.
 *
 * LazyContainer provides deferred graph loading for code-splitting support.
 * The graph is not loaded until first resolution or explicit load() call.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { Container } from "./container.js";

// =============================================================================
// Lazy Container Type
// =============================================================================

/**
 * A lazy-loading container wrapper that defers graph loading until first use.
 *
 * LazyContainer is returned by `container.createLazyChild()` and enables
 * code-splitting for dependency injection graphs. The graph is loaded
 * asynchronously on the first call to `resolve()` or `load()`.
 *
 * @typeParam TProvides - Union of Port types inherited from the parent container.
 * @typeParam TExtends - Union of Port types added by the lazy-loaded graph.
 * @typeParam TAsyncPorts - Union of Port types that have async factories.
 *
 * @remarks
 * - All resolution methods return Promises since graph loading is async
 * - `load()` can be called to pre-load the graph before resolution
 * - `has()` delegates to parent before loading, includes child graph ports after
 * - Concurrent `load()` calls share the same loading promise (deduplication)
 * - Disposing before load completes marks as disposed without error
 *
 * @example Basic usage with dynamic import
 * ```typescript
 * const lazyPlugin = container.createLazyChild(
 *   () => import('./plugin-graph').then(m => m.PluginGraph)
 * );
 *
 * // Graph loaded on first resolve
 * const service = await lazyPlugin.resolve(PluginPort);
 *
 * // Subsequent resolves use cached container
 * const same = await lazyPlugin.resolve(PluginPort); // No load
 * ```
 *
 * @example Pre-loading for eager initialization
 * ```typescript
 * const lazyPlugin = container.createLazyChild(loadPluginGraph);
 *
 * // Explicitly load in the background
 * const containerPromise = lazyPlugin.load();
 *
 * // Later, await the container
 * const pluginContainer = await containerPromise;
 * const service = pluginContainer.resolve(PluginPort); // Sync
 * ```
 *
 * @see {@link Container.createLazyChild} - Factory method that creates LazyContainer
 * @see {@link Container.createChildAsync} - Alternative that returns Promise<Container>
 */
// Note: LazyContainers don't have plugin APIs. They delegate to the loaded Container.
export type LazyContainer<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> = LazyContainerMembers<TProvides, TExtends, TAsyncPorts>;

/**
 * Internal type containing LazyContainer method definitions.
 * @internal
 */
type LazyContainerMembers<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = {
  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * On first call, loads the graph and creates the child container.
   * Subsequent calls use the cached container for resolution.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   *
   * @throws {DisposedScopeError} If the lazy container has been disposed
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   */
  resolve<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * Alias for `resolve()` - both methods behave identically since
   * graph loading is inherently asynchronous.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   */
  resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /**
   * Explicitly loads the graph and returns the underlying container.
   *
   * Use this method to:
   * - Pre-load the graph in the background
   * - Access the sync container API after loading
   * - Control when loading occurs
   *
   * Concurrent calls share the same loading promise (deduplication).
   *
   * @returns A promise that resolves to the loaded child container
   *
   * @throws {DisposedScopeError} If the lazy container has been disposed
   */
  load(): Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">>;

  /**
   * Whether the graph has been loaded and the container is ready.
   *
   * Once loaded, `resolve()` calls use the cached container.
   */
  readonly isLoaded: boolean;

  /**
   * Whether the lazy container has been disposed.
   *
   * After disposal, all methods will throw DisposedScopeError.
   */
  readonly isDisposed: boolean;

  /**
   * Checks if a port is available for resolution.
   *
   * Before loading: Delegates to parent container.
   * After loading: Includes both parent and child graph ports.
   *
   * @param port - The port token to check
   * @returns true if the port can be resolved
   */
  has(port: Port<unknown, string>): boolean;

  /**
   * Disposes the lazy container.
   *
   * If the graph is loaded, disposes the underlying child container.
   * If loading is in progress, waits for load completion then disposes.
   * If not yet loaded, marks as disposed without loading.
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;
};
