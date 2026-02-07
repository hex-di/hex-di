/**
 * Lazy container implementation for deferred graph loading.
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/core";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import type { Container, LazyContainer, CreateChildOptions } from "../types.js";
import { DisposedScopeError } from "../errors/index.js";

/**
 * Flag indicating the next child container creation originated from a lazy load.
 * Set before createChild is called, checked and cleared in registerChildContainer.
 * @internal
 */
export let nextChildIsLazy = false;

/**
 * Sets the lazy creation flag before creating a child container.
 * @internal
 */
export function markNextChildAsLazy(): void {
  nextChildIsLazy = true;
}

/**
 * Consumes and returns the lazy creation flag.
 * @internal
 */
export function consumeLazyFlag(): boolean {
  const wasLazy = nextChildIsLazy;
  nextChildIsLazy = false;
  return wasLazy;
}

/**
 * Internal container-like interface needed for lazy container operations.
 * @internal
 */
export interface LazyContainerParent<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  has(port: Port<unknown, string>): boolean;
  createChild<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    childGraph: TChildGraph,
    options: CreateChildOptions<TProvides>
  ): Container<
    TProvides,
    Exclude<InferGraphProvides<TChildGraph>, TProvides>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized"
  >;
}

/**
 * Lazy-loading container wrapper implementation.
 *
 * Defers graph loading until first `resolve()` or explicit `load()` call.
 * Concurrent loads share the same promise (deduplication).
 *
 * @internal
 */
export class LazyContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>> =
    Graph<TExtends, Port<unknown, string>, Port<unknown, string>>,
> implements LazyContainer<TProvides, TExtends, TAsyncPorts> {
  private container: Container<TProvides, TExtends, TAsyncPorts, "initialized"> | null = null;
  private loadPromise: Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">> | null =
    null;
  private _isDisposed = false;

  constructor(
    private readonly parent: LazyContainerParent<TProvides, TAsyncPorts>,
    private readonly graphLoader: () => Promise<TChildGraph>,
    private readonly options: CreateChildOptions<TProvides>
  ) {}

  /**
   * Whether the graph has been loaded and the container is ready.
   */
  get isLoaded(): boolean {
    return this.container !== null;
  }

  /**
   * Whether the lazy container has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Explicitly loads the graph and returns the underlying container.
   *
   * Concurrent calls share the same loading promise (deduplication).
   */
  async load(): Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">> {
    if (this._isDisposed) {
      throw new DisposedScopeError("LazyContainer");
    }

    // Return cached container if already loaded
    if (this.container !== null) {
      return this.container;
    }

    // Deduplicate concurrent loads
    if (this.loadPromise === null) {
      this.loadPromise = this.performLoad();
    }

    return this.loadPromise;
  }

  /**
   * Internal load implementation.
   * @internal
   */
  private async performLoad(): Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">> {
    try {
      const graph = await this.graphLoader();

      // Check if disposed during load
      if (this._isDisposed) {
        throw new DisposedScopeError("LazyContainer");
      }

      // Mark the next child creation as lazy so registerChildContainer emits correct childKind
      markNextChildAsLazy();

      // Create child container using parent's createChild
      // SAFETY: Type assertion needed because createChild returns a computed type
      // based on the graph, but we know it produces Container<TProvides, TExtends, TAsyncPorts, "initialized">
      this.container = this.parent.createChild(graph, this.options) as unknown as Container<
        TProvides,
        TExtends,
        TAsyncPorts,
        "initialized"
      >;

      return this.container;
    } catch (error) {
      // Clear the promise on failure to allow retry
      this.loadPromise = null;
      throw error;
    }
  }

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * Loads the graph on first call, then delegates to the container.
   */
  async resolve<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    const container = await this.load();
    // Use resolveAsync since graph loading is already async
    // This also handles any async ports properly
    return container.resolveAsync(port);
  }

  /**
   * Alias for resolve() - both methods behave identically.
   */
  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    const container = await this.load();
    return container.resolveAsync(port);
  }

  /**
   * Checks if a port is available for resolution.
   *
   * Before loading: Delegates to parent container.
   * After loading: Delegates to loaded child container.
   */
  has(port: Port<unknown, string>): boolean {
    if (this.container !== null) {
      return this.container.has(port);
    }
    // Before loading, we can only check parent's ports
    return this.parent.has(port);
  }

  /**
   * Disposes the lazy container.
   *
   * Handles three cases:
   * 1. Not loaded: Marks as disposed, no cleanup needed
   * 2. Currently loading: Waits for load, then disposes
   * 3. Already loaded: Disposes the container
   */
  async dispose(): Promise<void> {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    // If loading is in progress, wait for it to complete then dispose
    if (this.loadPromise !== null && this.container === null) {
      try {
        // Wait for the load to complete (or fail)
        await this.loadPromise;
      } catch {
        // Load failed - nothing to dispose
        this.loadPromise = null;
        return;
      }
    }

    // Dispose the container if loaded
    if (this.container !== null) {
      await this.container.dispose();
      this.container = null;
    }

    this.loadPromise = null;
  }
}
