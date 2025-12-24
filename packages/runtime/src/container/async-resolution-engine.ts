/**
 * AsyncResolutionEngine - Handles asynchronous service resolution with deduplication.
 *
 * Encapsulates the async resolution logic:
 * - Lifetime-based caching (singleton, scoped, transient)
 * - Resolution deduplication (pending promise tracking)
 * - Hook invocation (beforeResolve/afterResolve)
 * - Async instance creation with dependency injection
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Lifetime } from "@hex-di/graph";
import { MemoMap } from "../common/memo-map.js";
import { ResolutionContext } from "../resolution/context.js";
import { AsyncFactoryError, ContainerError } from "../common/errors.js";
import type { RuntimeAdapter, RuntimeAdapterFor } from "./internal-types.js";
import { HooksRunner, checkCacheHit } from "./hooks-runner.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving nested dependencies asynchronously.
 *
 * Returns `Promise<unknown>` because dependency values are stored in `Record<string, unknown>`
 * which is the factory's expected deps parameter type.
 *
 * @internal
 */
export type AsyncDependencyResolver = (
  port: Port<unknown, string>,
  scopedMemo: MemoMap,
  scopeId: string | null
) => Promise<unknown>;

// =============================================================================
// AsyncResolutionEngine Class
// =============================================================================

/**
 * Manages asynchronous service resolution with deduplication and lifetime caching.
 *
 * Key features:
 * - **Deduplication**: Concurrent resolutions for the same port/scope share a single promise
 * - **Lifetime caching**: Singleton and scoped instances are cached appropriately
 * - **Hook integration**: Supports beforeResolve/afterResolve hooks for DevTools
 *
 * @example
 * ```typescript
 * const engine = new AsyncResolutionEngine(
 *   singletonMemo,
 *   resolutionContext,
 *   hooksRunner,
 *   async (port, scopedMemo, scopeId) => container.resolveAsyncInternal(port, scopedMemo, scopeId)
 * );
 *
 * const service = await engine.resolve(port, adapter, scopedMemo, scopeId);
 * ```
 *
 * @internal
 */
export class AsyncResolutionEngine {
  /**
   * Tracks pending resolutions to deduplicate concurrent requests.
   * Outer map: port → inner map
   * Inner map: scopeId → promise
   */
  private readonly pendingResolutions: Map<
    Port<unknown, string>,
    Map<string | null, Promise<unknown>>
  > = new Map();

  /**
   * Creates a new AsyncResolutionEngine.
   *
   * @param singletonMemo - Cache for singleton-scoped instances
   * @param resolutionContext - Context for tracking resolution stack
   * @param hooksRunner - Optional hooks runner for DevTools integration
   * @param resolveDependency - Callback to resolve nested dependencies
   */
  constructor(
    private readonly singletonMemo: MemoMap,
    private readonly resolutionContext: ResolutionContext,
    private readonly hooksRunner: HooksRunner | null,
    private readonly resolveDependency: AsyncDependencyResolver
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Resolves a port to its service instance asynchronously.
   *
   * Handles:
   * - Cache hit detection and hook invocation
   * - Resolution deduplication for concurrent requests
   * - Lifetime-based caching
   *
   * @typeParam P - The port type being resolved
   * @param port - The port to resolve
   * @param adapter - The adapter that provides the service
   * @param scopedMemo - The scoped cache for the current resolution context
   * @param scopeId - The scope ID or null for container-level resolution
   * @returns Promise resolving to the service instance with full type inference
   */
  resolve<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    if (this.hooksRunner === null) {
      return this.resolveCore(port, adapter, scopedMemo, scopeId);
    }

    const isCacheHit = checkCacheHit(port, adapter.lifetime, this.singletonMemo, scopedMemo);
    if (isCacheHit) {
      // For cache hits, run hooks around the cached resolution
      return this.hooksRunner.runAsync(port, adapter, scopeId, true, () =>
        this.resolveCore(port, adapter, scopedMemo, scopeId)
      );
    }

    // For non-cache hits, hooks are handled in createPendingResolutionPromise
    return this.resolveCore(port, adapter, scopedMemo, scopeId);
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Core async resolution with deduplication.
   */
  private resolveCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    const memo = this.getMemoForLifetime(adapter.lifetime, scopedMemo);
    const cached = memo?.getIfPresent(port);
    if (cached !== undefined) {
      return Promise.resolve(cached as InferService<P>);
    }

    // Check for pending resolution (deduplication)
    let scopePending = this.pendingResolutions.get(port);
    if (scopePending === undefined) {
      scopePending = new Map();
      this.pendingResolutions.set(port, scopePending);
    }

    const pending = scopePending.get(scopeId);
    if (pending !== undefined) {
      return pending as Promise<InferService<P>>;
    }

    // Create new resolution promise
    const promise = this.createPendingResolutionPromise(port, adapter, scopedMemo, scopeId, memo);
    scopePending.set(scopeId, promise);
    return promise;
  }

  /**
   * Gets the appropriate memo for caching based on lifetime.
   */
  private getMemoForLifetime(lifetime: Lifetime, scopedMemo: MemoMap): MemoMap | null {
    switch (lifetime) {
      case "singleton":
        return this.singletonMemo;
      case "scoped":
        return scopedMemo;
      default:
        return null;
    }
  }

  /**
   * Creates a pending resolution promise with hook wrapping and cleanup.
   */
  private createPendingResolutionPromise<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null
  ): Promise<InferService<P>> {
    const resolution = () => this.executeAsyncResolution(port, adapter, scopedMemo, scopeId, memo);

    // Wrap with hooks if enabled (isCacheHit=false for new resolutions)
    const promise =
      this.hooksRunner !== null
        ? this.hooksRunner.runAsync(port, adapter, scopeId, false, resolution)
        : resolution();

    // Suppress unhandled rejection warnings
    promise.catch(() => {});

    // Setup cleanup on completion
    const cleanupPromise = promise.finally(() => this.cleanupPending(port, scopeId));
    cleanupPromise.catch(() => {});

    return promise;
  }

  /**
   * Executes the actual async resolution with optional memoization.
   */
  private executeAsyncResolution<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null
  ): Promise<InferService<P>> {
    const factory = () => this.createInstanceAsync(port, adapter, scopedMemo, scopeId);
    if (memo !== null) {
      return memo.getOrElseMemoizeAsync(port, factory, adapter.finalizer);
    }
    return factory();
  }

  /**
   * Cleans up pending resolution tracking after completion.
   */
  private cleanupPending(port: Port<unknown, string>, scopeId: string | null): void {
    const currentPending = this.pendingResolutions.get(port);
    if (currentPending) {
      currentPending.delete(scopeId);
      if (currentPending.size === 0) {
        this.pendingResolutions.delete(port);
      }
    }
  }

  /**
   * Creates a new instance asynchronously by resolving dependencies and calling the factory.
   */
  private async createInstanceAsync<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    const portName = port.__portName;
    this.resolutionContext.enter(portName);

    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        deps[requiredPort.__portName] = await this.resolveDependency(
          requiredPort,
          scopedMemo,
          scopeId
        );
      }
      const instance = await adapter.factory(deps);
      return instance;
    } catch (e) {
      if (e instanceof ContainerError) {
        throw e;
      }
      throw new AsyncFactoryError(portName, e);
    } finally {
      this.resolutionContext.exit(portName);
    }
  }
}
