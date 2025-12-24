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

import type { Port } from "@hex-di/ports";
import type { Lifetime } from "@hex-di/graph";
import type {
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
} from "../resolution/hooks.js";
import type { MemoMap } from "../common/memo-map.js";

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
 * Entry in the parent resolution stack.
 * Tracks which port triggered the current resolution and when.
 * @internal
 */
interface ParentStackEntry {
  readonly port: Port<unknown, string>;
  readonly startTime: number;
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
   * Stack tracking parent resolutions for depth calculation.
   * Entries are pushed before resolution and popped after.
   */
  private readonly parentStack: ParentStackEntry[] = [];

  /**
   * Creates a new HooksRunner instance.
   *
   * @param hooks - Resolution hooks to invoke. Both beforeResolve and afterResolve are optional.
   */
  constructor(private readonly hooks: ResolutionHooks) {}

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
   * @param action - The actual resolution action to execute
   * @returns The result of the action
   */
  runSync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    action: () => T
  ): T {
    const context = this.createContext(port, adapter, scopeId, isCacheHit);

    if (this.hooks.beforeResolve !== undefined) {
      this.hooks.beforeResolve(context);
    }

    const startTime = Date.now();
    this.parentStack.push({ port, startTime });

    let error: Error | null = null;
    try {
      return action();
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      this.emitAfterResolve(context, startTime, error);
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
   * @param action - The async resolution action to execute
   * @returns Promise resolving to the result of the action
   */
  runAsync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    action: () => Promise<T>
  ): Promise<T> {
    const context = this.createContext(port, adapter, scopeId, isCacheHit);

    if (this.hooks.beforeResolve !== undefined) {
      this.hooks.beforeResolve(context);
    }

    const startTime = Date.now();
    this.parentStack.push({ port, startTime });

    let error: Error | null = null;
    return action()
      .catch(err => {
        error = err instanceof Error ? err : new Error(String(err));
        throw err;
      })
      .finally(() => {
        this.emitAfterResolve(context, startTime, error);
      });
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Creates the resolution hook context from current state.
   */
  private createContext(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean
  ): ResolutionHookContext {
    const parentEntry =
      this.parentStack.length > 0 ? this.parentStack[this.parentStack.length - 1] : null;

    return {
      port,
      portName: port.__portName,
      lifetime: adapter.lifetime,
      scopeId,
      parentPort: parentEntry?.port ?? null,
      isCacheHit,
      depth: this.parentStack.length,
    };
  }

  /**
   * Emits the afterResolve hook with timing and error info.
   */
  private emitAfterResolve(
    context: ResolutionHookContext,
    startTime: number,
    error: Error | null
  ): void {
    this.parentStack.pop();
    const duration = Date.now() - startTime;

    if (this.hooks.afterResolve !== undefined) {
      const resultContext: ResolutionResultContext = {
        ...context,
        duration,
        error,
      };
      this.hooks.afterResolve(resultContext);
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
