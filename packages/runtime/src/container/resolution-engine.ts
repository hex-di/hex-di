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

import type { Port, InferService } from "@hex-di/ports";
import { MemoMap } from "../common/memo-map.js";
import { ResolutionContext } from "../resolution/context.js";
import { FactoryError, ContainerError } from "../common/errors.js";
import type { RuntimeAdapterFor } from "./internal-types.js";
import { assertSyncAdapter } from "./internal-types.js";
import { HooksRunner, checkCacheHit } from "./hooks-runner.js";
import type { InheritanceMode } from "../types.js";

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
 * This matches the container's `resolveInternal(port: Port<unknown, string>): unknown` overload.
 *
 * @internal
 */
export type SyncDependencyResolver = (
  port: Port<unknown, string>,
  scopedMemo: MemoMap,
  scopeId: string | null
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
  resolve<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null = null
  ): InferService<P> {
    if (this.hooksRunner === null) {
      return this.resolveCore(port, adapter, scopedMemo, scopeId);
    }

    const isCacheHit = checkCacheHit(port, adapter.lifetime, this.singletonMemo, scopedMemo);
    return this.hooksRunner.runSync(port, adapter, scopeId, isCacheHit, inheritanceMode, () =>
      this.resolveCore(port, adapter, scopedMemo, scopeId)
    );
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Core resolution logic with lifetime-based caching.
   */
  private resolveCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          port,
          () => this.createInstance(port, adapter, scopedMemo, scopeId),
          adapter.finalizer
        );

      case "scoped":
        return scopedMemo.getOrElseMemoize(
          port,
          () => this.createInstance(port, adapter, scopedMemo, scopeId),
          adapter.finalizer
        );

      case "transient":
        return this.createInstance(port, adapter, scopedMemo, scopeId);

      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  /**
   * Creates a new instance by resolving dependencies and calling the factory.
   */
  private createInstance<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    const portName = port.__portName;

    this.resolutionContext.enter(portName);

    try {
      assertSyncAdapter(adapter, portName);

      try {
        const deps: Record<string, unknown> = {};
        for (const requiredPort of adapter.requires) {
          deps[requiredPort.__portName] = this.resolveDependency(requiredPort, scopedMemo, scopeId);
        }
        return adapter.factory(deps);
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
