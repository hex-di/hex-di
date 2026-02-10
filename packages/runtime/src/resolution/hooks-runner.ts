/**
 * HooksRunner - Encapsulates resolution hook execution.
 *
 * Manages beforeResolve/afterResolve hook invocation with parent stack
 * tracking for DevTools integration. When hooks are not provided, the
 * resolution path bypasses this class entirely for zero overhead.
 *
 * @packageDocumentation
 * @internal
 */

import type { Port } from "@hex-di/core";
import type { Lifetime } from "@hex-di/core";
import type { ResolutionHooks, ResolutionHookContext, ContainerKind } from "./hooks.js";
import type { InheritanceMode } from "../types.js";
import type { MemoMap } from "../util/memo-map.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Minimal adapter info needed for hook context.
 * @internal
 */
interface AdapterInfo {
  readonly lifetime: Lifetime;
}

/**
 * Container metadata for resolution context.
 * Provides information about which container is resolving.
 * @internal
 */
export interface ContainerMetadata {
  /** Unique ID of the container (e.g., "root", "child-123") */
  readonly containerId: string;

  /** Kind of container: "root", "child", "lazy", or "scope" */
  readonly containerKind: ContainerKind;

  /** ID of parent container, null for root */
  readonly parentContainerId: string | null;
}

/**
 * Resolution metadata for inheritance tracking.
 * @internal
 */
export interface ResolutionMetadata {
  /** Inheritance mode for this port, null if not from parent */
  readonly inheritanceMode: InheritanceMode | null;
}

// =============================================================================
// Mutable context type used internally
// =============================================================================

/**
 * Internal mutable version of ResolutionHookContext.
 * The public interface is readonly, but we mutate in-place to avoid spreading.
 * @internal
 */
interface MutableHookContext {
  port: Port<unknown, string>;
  portName: string;
  lifetime: Lifetime;
  scopeId: string | null;
  scopeName: string | undefined;
  parentPort: Port<unknown, string> | null;
  isCacheHit: boolean;
  depth: number;
  containerId: string;
  containerKind: ContainerKind;
  inheritanceMode: InheritanceMode | null;
  parentContainerId: string | null;
  duration: number;
  error: Error | null;
  result?: unknown;
}

// =============================================================================
// HooksRunner Class
// =============================================================================

/**
 * Manages resolution hook execution with parent stack tracking.
 *
 * This class encapsulates all hook-related logic:
 * - Creating ResolutionHookContext from port/adapter/scope info
 * - Managing the parentStack for nested dependency tracking
 * - Timing resolutions and emitting afterResolve with duration/error
 *
 * @example
 * ```typescript
 * const runner = new HooksRunner(hooks);
 *
 * // Sync resolution with hooks
 * const result = runner.runSync(port, adapter, scopeId, isCacheHit, () => {
 *   return resolveCore(port, adapter);
 * });
 *
 * // Async resolution with hooks
 * const asyncResult = await runner.runAsync(port, adapter, scopeId, isCacheHit, async () => {
 *   return resolveAsyncCore(port, adapter);
 * });
 * ```
 *
 * @internal
 */
export class HooksRunner {
  /**
   * Parallel arrays for parent stack tracking.
   * Avoids allocating ParentStackEntry objects per resolution.
   */
  private readonly _parentPorts: Port<unknown, string>[] = [];
  private readonly _parentStartTimes: number[] = [];

  /**
   * Creates a new HooksRunner instance.
   *
   * @param hooks - Resolution hooks to invoke. Both beforeResolve and afterResolve are optional.
   * @param containerMetadata - Metadata about the container (id, kind, parentId)
   */
  constructor(
    private readonly hooks: ResolutionHooks,
    private readonly containerMetadata: ContainerMetadata
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Runs a synchronous action with hook invocation.
   *
   * Calls beforeResolve (if provided), executes the action, then calls
   * afterResolve (if provided) with timing and error info.
   *
   * @param port - The port being resolved
   * @param adapter - Adapter info (for lifetime)
   * @param scopeId - Scope ID or null for container-level
   * @param isCacheHit - Whether this resolution will be served from cache
   * @param inheritanceMode - Inheritance mode for this port (for child containers)
   * @param action - The actual resolution action to execute
   * @returns The result of the action
   */
  runSync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    action: () => T,
    scopeName?: string
  ): T {
    const context = this._createContext(
      port,
      adapter,
      scopeId,
      isCacheHit,
      inheritanceMode,
      scopeName
    );

    if (this.hooks.beforeResolve !== undefined) {
      this.hooks.beforeResolve(context);
    }

    const startTime = Date.now();
    this._parentPorts.push(port);
    this._parentStartTimes.push(startTime);

    let error: Error | null = null;
    try {
      const result = action();
      context.result = result;
      return result;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      this._emitAfterResolve(context, startTime, error);
    }
  }

  /**
   * Runs an asynchronous action with hook invocation.
   *
   * Calls beforeResolve (if provided), executes the async action, then calls
   * afterResolve (if provided) with timing and error info.
   *
   * @param port - The port being resolved
   * @param adapter - Adapter info (for lifetime)
   * @param scopeId - Scope ID or null for container-level
   * @param isCacheHit - Whether this resolution will be served from cache
   * @param inheritanceMode - Inheritance mode for this port (for child containers)
   * @param action - The async resolution action to execute
   * @returns Promise resolving to the result of the action
   */
  runAsync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    action: () => Promise<T>,
    scopeName?: string
  ): Promise<T> {
    const context = this._createContext(
      port,
      adapter,
      scopeId,
      isCacheHit,
      inheritanceMode,
      scopeName
    );

    if (this.hooks.beforeResolve !== undefined) {
      this.hooks.beforeResolve(context);
    }

    const startTime = Date.now();
    this._parentPorts.push(port);
    this._parentStartTimes.push(startTime);

    let error: Error | null = null;
    return action()
      .then(result => {
        context.result = result;
        return result;
      })
      .catch(err => {
        error = err instanceof Error ? err : new Error(String(err));
        throw err;
      })
      .finally(() => {
        this._emitAfterResolve(context, startTime, error);
      });
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Creates the resolution hook context from current state.
   * Initializes duration=0 and error=null for later in-place mutation.
   */
  private _createContext(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): MutableHookContext {
    const len = this._parentPorts.length;
    const parentPort = len > 0 ? this._parentPorts[len - 1] : null;

    return {
      port,
      portName: port.__portName,
      lifetime: adapter.lifetime,
      scopeId,
      scopeName,
      parentPort: parentPort ?? null,
      isCacheHit,
      depth: len,
      containerId: this.containerMetadata.containerId,
      containerKind: this.containerMetadata.containerKind,
      inheritanceMode,
      parentContainerId: this.containerMetadata.parentContainerId,
      duration: 0,
      error: null,
    };
  }

  /**
   * Emits the afterResolve hook by mutating context in-place (no spread).
   */
  private _emitAfterResolve(
    context: MutableHookContext,
    startTime: number,
    error: Error | null
  ): void {
    this._parentPorts.pop();
    this._parentStartTimes.pop();

    if (this.hooks.afterResolve !== undefined) {
      // Mutate in-place instead of creating new object via spread
      context.duration = Date.now() - startTime;
      context.error = error;
      this.hooks.afterResolve(context as ResolutionHookContext);
    }
  }
}

// =============================================================================
// Static Helpers
// =============================================================================

/**
 * Checks if a port's instance is already cached based on lifetime.
 *
 * @param port - The port to check
 * @param lifetime - The adapter's lifetime
 * @param singletonMemo - Container's singleton cache
 * @param scopedMemo - Current scope's cache
 * @returns true if the instance is already cached
 *
 * @internal
 */
export function checkCacheHit(
  port: Port<unknown, string>,
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap
): boolean {
  switch (lifetime) {
    case "singleton":
      return singletonMemo.has(port);
    case "scoped":
      return scopedMemo.has(port);
    case "transient":
      return false;
    default:
      return false;
  }
}
