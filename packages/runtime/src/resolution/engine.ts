/**
 * ResolutionEngine - Handles synchronous service resolution with lifetime caching.
 *
 * Encapsulates the core resolution logic:
 * - Lifetime-based caching (singleton, scoped, transient)
 * - Hook invocation (beforeResolve/afterResolve)
 * - Instance creation with dependency injection
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/core";
import { MemoMap } from "../util/memo-map.js";
import { ResolutionContext } from "./context.js";
import { FactoryError, ContainerError } from "../errors/index.js";
import type { RuntimeAdapterFor } from "../container/internal-types.js";
import { assertSyncAdapter } from "../container/internal-types.js";
import { HooksRunner, checkCacheHit } from "./hooks-runner.js";
import type { InheritanceMode } from "../types.js";
import { resolveWithMemo, buildDependencies, unwrapResultDefense } from "./core.js";

// Note: MemoMap is still needed as a parameter type

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving nested dependencies.
 *
 * Returns `unknown` because dependency values are stored in `Record<string, unknown>`
 * which is the factory's expected deps parameter type. The factory knows how to
 * extract the correct types from this record.
 *
 * This matches the container's `resolveInternal(port: Port<string, unknown>): unknown` overload.
 *
 * @internal
 */
export type SyncDependencyResolver = (
  port: Port<string, unknown>,
  scopedMemo: MemoMap,
  scopeId: string | null,
  scopeName?: string
) => unknown;

// =============================================================================
// ResolutionEngine Class
// =============================================================================

/**
 * Manages synchronous service resolution with lifetime-based caching.
 *
 * This class encapsulates the resolution algorithm:
 * 1. Check hooks configuration and invoke beforeResolve if enabled
 * 2. Check cache based on lifetime (singleton → singletonMemo, scoped → scopedMemo)
 * 3. Create instance if not cached, resolving dependencies recursively
 * 4. Store in appropriate cache if applicable
 * 5. Invoke afterResolve hook if enabled
 *
 * @example
 * ```typescript
 * const engine = new ResolutionEngine(
 *   singletonMemo,
 *   resolutionContext,
 *   hooksRunner,
 *   (port, scopedMemo, scopeId) => container.resolveInternal(port, scopedMemo, scopeId)
 * );
 *
 * const service = engine.resolve(port, adapter, scopedMemo, scopeId);
 * ```
 *
 * @internal
 */
export class ResolutionEngine {
  /**
   * Creates a new ResolutionEngine.
   *
   * @param singletonMemo - Cache for singleton-scoped instances
   * @param resolutionContext - Context for tracking resolution stack (cycle detection)
   * @param hooksRunner - Optional hooks runner for DevTools integration
   * @param resolveDependency - Callback to resolve nested dependencies
   */
  constructor(
    private readonly singletonMemo: MemoMap,
    private readonly resolutionContext: ResolutionContext,
    private readonly hooksRunner: HooksRunner | null,
    private readonly resolveDependency: SyncDependencyResolver
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Resolves a port to its service instance using the provided adapter.
   *
   * Handles lifetime-based caching and hook invocation.
   *
   * @typeParam P - The port type being resolved
   * @param port - The port to resolve
   * @param adapter - The adapter that provides the service
   * @param scopedMemo - The scoped cache for the current resolution context
   * @param scopeId - The scope ID or null for container-level resolution
   * @param inheritanceMode - Inheritance mode for child container resolutions
   * @returns The resolved service instance with full type inference
   */
  resolve<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null = null,
    scopeName?: string
  ): InferService<P> {
    if (this.hooksRunner === null) {
      return this.resolveCore(port, adapter, scopedMemo, scopeId, scopeName);
    }

    const isCacheHit = checkCacheHit(port, adapter.lifetime, this.singletonMemo, scopedMemo);
    return this.hooksRunner.runSync(
      port,
      adapter,
      scopeId,
      isCacheHit,
      inheritanceMode,
      () => this.resolveCore(port, adapter, scopedMemo, scopeId, scopeName),
      scopeName
    );
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Core resolution logic with lifetime-based caching.
   *
   * Uses shared `resolveWithMemo` utility for consistent lifetime handling.
   */
  private resolveCore<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): InferService<P> {
    return resolveWithMemo(
      port,
      adapter.lifetime,
      this.singletonMemo,
      scopedMemo,
      () => this.createInstance(port, adapter, scopedMemo, scopeId, scopeName),
      adapter.finalizer
    );
  }

  /**
   * Creates a new instance by resolving dependencies and calling the factory.
   *
   * Uses shared `buildDependencies` utility for consistent dependency resolution.
   */
  private createInstance<P extends Port<string, unknown>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): InferService<P> {
    const portName = port.__portName;

    this.resolutionContext.enter(portName);

    try {
      assertSyncAdapter(adapter, portName);

      try {
        const deps = buildDependencies(adapter.requires, requiredPort =>
          this.resolveDependency(requiredPort, scopedMemo, scopeId, scopeName)
        );
        const raw = adapter.factory(deps);

        return unwrapResultDefense<InferService<P>>(raw);
      } catch (e) {
        if (e instanceof ContainerError) {
          throw e;
        }
        throw new FactoryError(portName, e);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }
}
