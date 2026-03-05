/**
 * AsyncResolutionEngine - Handles asynchronous service resolution with deduplication.
 *
 * Encapsulates the async resolution logic:
 * - Lifetime-based caching (singleton, scoped, transient)
 * - Resolution deduplication (pending promise tracking)
 * - Hook invocation (beforeResolve/afterResolve)
 * - Async instance creation with dependency injection
 * - Blame context construction for error attribution
 * - Optional contract conformance checking
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService, ContractCheckMode } from "@hex-di/core";
import type { Lifetime } from "@hex-di/core";
import { createBlameContext, ContractViolationError } from "@hex-di/core";
import { MemoMap } from "../util/memo-map.js";
import { ResolutionContext } from "./context.js";
import { AsyncFactoryError, ContainerError } from "../errors/index.js";
import type { RuntimeAdapterFor } from "../container/internal-types.js";
import { HooksRunner, checkCacheHit } from "./hooks-runner.js";
import type { InheritanceMode } from "../types.js";
import { getMemoForLifetime, buildDependenciesAsync, unwrapResultDefense } from "./core.js";
import { maybeFreezeInstance } from "./freeze.js";
import { maybeCheckContract } from "./contract-check.js";

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
  port: Port<string, unknown>,
  scopedMemo: MemoMap,
  scopeId: string | null,
  scopeName?: string
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
   * Outer map: port -> inner map
   * Inner map: scopeId -> promise
   */
  private readonly pendingResolutions: Map<
    Port<string, unknown>,
    Map<string | null, Promise<unknown>>
  > = new Map();

  /** Contract check mode. Defaults to "off" for zero overhead. */
  private contractCheckMode: ContractCheckMode = "off";

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

  /**
   * Sets the contract check mode for this engine.
   *
   * @param mode - The contract check mode ("off", "warn", or "strict")
   * @internal
   */
  setContractCheckMode(mode: ContractCheckMode): void {
    this.contractCheckMode = mode;
  }

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
   * @param inheritanceMode - Inheritance mode for child container resolutions
   * @returns Promise resolving to the service instance with full type inference
   */
  resolve<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null = null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (this.hooksRunner === null) {
      return this.resolveCore(port, adapter, scopedMemo, scopeId, inheritanceMode, scopeName);
    }

    const isCacheHit = checkCacheHit(port, adapter.lifetime, this.singletonMemo, scopedMemo);
    if (isCacheHit) {
      // For cache hits, run hooks around the cached resolution
      return this.hooksRunner.runAsync(
        port,
        adapter,
        scopeId,
        true,
        inheritanceMode,
        () => this.resolveCore(port, adapter, scopedMemo, scopeId, inheritanceMode, scopeName),
        scopeName
      );
    }

    // For non-cache hits, hooks are handled in createPendingResolutionPromise
    return this.resolveCore(port, adapter, scopedMemo, scopeId, inheritanceMode, scopeName);
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Core async resolution with deduplication.
   */
  private resolveCore<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    const memo = this.getMemoCached(adapter.lifetime, scopedMemo);
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
    const promise = this.createPendingResolutionPromise(
      port,
      adapter,
      scopedMemo,
      scopeId,
      memo,
      inheritanceMode,
      scopeName
    );
    scopePending.set(scopeId, promise);
    return promise;
  }

  /**
   * Gets the appropriate memo for caching based on lifetime.
   *
   * Uses shared `getMemoForLifetime` utility for consistent lifetime handling.
   */
  private getMemoCached(lifetime: Lifetime, scopedMemo: MemoMap): MemoMap | null {
    return getMemoForLifetime(lifetime, this.singletonMemo, scopedMemo);
  }

  /**
   * Creates a pending resolution promise with hook wrapping and cleanup.
   */
  private createPendingResolutionPromise<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    const resolution = () =>
      this.executeAsyncResolution(port, adapter, scopedMemo, scopeId, memo, scopeName);

    // Wrap with hooks if enabled (isCacheHit=false for new resolutions)
    const promise =
      this.hooksRunner !== null
        ? this.hooksRunner.runAsync(
            port,
            adapter,
            scopeId,
            false,
            inheritanceMode,
            resolution,
            scopeName
          )
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
  private executeAsyncResolution<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    const factory = () => this.createInstanceAsync(port, adapter, scopedMemo, scopeId, scopeName);
    if (memo !== null) {
      return memo.getOrElseMemoizeAsync(port, factory, adapter.finalizer);
    }
    return factory();
  }

  /**
   * Cleans up pending resolution tracking after completion.
   */
  private cleanupPending(port: Port<string, unknown>, scopeId: string | null): void {
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
   *
   * Uses shared `buildDependenciesAsync` utility for consistent dependency resolution.
   * Dependencies are resolved concurrently for optimal performance.
   * On error, constructs a BlameContext with the current resolution path.
   * After successful creation, checks contract conformance (if enabled),
   * then applies freeze based on adapter config.
   */
  private async createInstanceAsync<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    const portName = port.__portName;
    this.resolutionContext.enter(portName);

    try {
      const deps = await buildDependenciesAsync(adapter.requires, requiredPort =>
        this.resolveDependency(requiredPort, scopedMemo, scopeId, scopeName)
      );
      const raw = await adapter.factory(deps);
      const instance = unwrapResultDefense(raw) as InferService<P>;

      // Contract check: after factory returns Ok, before freeze
      maybeCheckContract(instance, port, this.contractCheckMode, this.resolutionContext);

      return maybeFreezeInstance(instance, adapter.freeze);
    } catch (e) {
      // Re-throw known error types without wrapping
      if (e instanceof ContainerError || e instanceof ContractViolationError) {
        throw e;
      }
      const resolutionPath = this.resolutionContext.getPath();
      const blame = createBlameContext({
        adapterFactory: { name: portName },
        portContract: { name: portName, direction: "inbound" },
        violationType: { _tag: "FactoryError", error: e },
        resolutionPath,
      });
      throw new AsyncFactoryError(portName, e, blame);
    } finally {
      this.resolutionContext.exit(portName);
    }
  }
}
