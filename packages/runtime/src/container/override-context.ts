/**
 * OverrideContext - Manages temporary service overrides for containers.
 *
 * Provides isolated override execution where specified ports resolve to
 * override factories instead of the original implementations. The override
 * context maintains its own memoization to ensure instances created within
 * the context are isolated from the parent container.
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/core";
import { MemoMap } from "../util/memo-map.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Map of port names to factory functions that create override instances.
 *
 * Keys are port name strings (e.g., "Logger"), values are zero-argument
 * factory functions that return the override service instance.
 *
 * @internal
 */
export type OverrideFactoryMap = {
  readonly [portName: string]: (() => unknown) | undefined;
};

/**
 * Interface for containers that support override contexts.
 *
 * The container must provide methods to:
 * - Look up adapters by port
 * - Resolve ports internally with a scoped memo
 *
 * @internal
 */
export interface OverrideContainerAccess<TProvides extends Port<unknown, string>> {
  /**
   * Resolves a port using the container's internal resolution logic.
   *
   * @param port - The port to resolve
   * @param scopedMemo - The memo map for scoped instances
   * @param scopeId - Optional scope ID (null for container-level)
   * @returns The resolved service instance
   */
  resolveInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P>;

  /**
   * Gets the adapter for a port, or undefined if not found.
   *
   * @param port - The port to look up
   * @returns The adapter or undefined
   */
  getAdapter(port: Port<unknown, string>): unknown;

  /**
   * Gets the container's singleton memo map.
   */
  getSingletonMemo(): MemoMap;
}

// =============================================================================
// OverrideContext Class
// =============================================================================

/**
 * Manages temporary service overrides during callback execution.
 *
 * The OverrideContext intercepts resolution requests and redirects
 * overridden ports to their override factories. Non-overridden ports
 * delegate to the parent container. All instances created during the
 * override context execution are isolated in their own memoization map.
 *
 * ## Design Decisions
 *
 * 1. **Factory-based overrides**: Overrides are specified as factory functions
 *    rather than pre-created instances. This allows lazy instantiation and
 *    ensures each override context can create fresh instances if needed.
 *
 * 2. **Isolated memoization**: The override context maintains its own MemoMap
 *    that forks from the parent's singleton memo. This means:
 *    - Singletons from the parent are visible (inheritance)
 *    - New singletons created during override execution are isolated
 *    - Override instances are memoized within the context
 *
 * 3. **Port name matching**: Overrides are keyed by port name (string) rather
 *    than port reference. This simplifies the API and matches how ports are
 *    typically identified in user code.
 *
 * @example
 * ```typescript
 * const context = new OverrideContext(
 *   containerImpl,
 *   { Logger: () => new MockLogger() }
 * );
 *
 * const result = context.execute(() => {
 *   // Within this callback, LoggerPort resolves to MockLogger
 *   return container.resolve(LoggerPort);
 * });
 * ```
 *
 * @internal
 */
export class OverrideContext<TProvides extends Port<unknown, string>> {
  /**
   * Isolated memoization map for override instances.
   *
   * Forks from the parent's singleton memo to inherit existing singletons
   * while keeping new instances isolated.
   */
  private readonly overrideMemo: MemoMap;

  /**
   * Set of port names that are overridden.
   *
   * Used for O(1) lookup during resolution to determine if a port
   * should use an override factory.
   */
  private readonly overridePortNames: ReadonlySet<string>;

  /**
   * Creates a new OverrideContext.
   *
   * @param container - The container providing resolution and adapter access
   * @param overrideFactories - Map of port names to override factory functions
   */
  constructor(
    private readonly container: OverrideContainerAccess<TProvides>,
    private readonly overrideFactories: OverrideFactoryMap
  ) {
    // Fork from parent's singleton memo to inherit existing singletons
    this.overrideMemo = container.getSingletonMemo().fork();

    // Build set of override port names for fast lookup
    this.overridePortNames = new Set(Object.keys(overrideFactories));
  }

  /**
   * Executes a function with overrides applied.
   *
   * During the execution of the callback, all resolution requests
   * are intercepted. Overridden ports use their override factories,
   * while non-overridden ports delegate to the parent container.
   *
   * @typeParam R - Return type of the callback function
   * @param fn - The function to execute with overrides
   * @returns The result of the function execution
   */
  execute<R>(fn: () => R): R {
    return fn();
  }

  /**
   * Resolves a port, checking for overrides first.
   *
   * If the port name matches an override, the override factory is called
   * and the result is memoized in the override context's memo map.
   * Otherwise, resolution delegates to the parent container using the
   * override memo (which inherits from parent's singleton memo).
   *
   * @typeParam P - The port type being resolved
   * @param port - The port to resolve
   * @returns The resolved service instance
   */
  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = port.__portName;

    // Check if this port is overridden
    if (this.overridePortNames.has(portName)) {
      return this.resolveOverride(port, portName);
    }

    // Not overridden - delegate to parent container with override memo
    // The override memo inherits from parent's singleton memo
    return this.container.resolveInternal(port, this.overrideMemo, null);
  }

  /**
   * Resolves an overridden port using its factory.
   *
   * Uses the override memo to cache the result, ensuring the same
   * override instance is returned for subsequent resolutions within
   * this context.
   *
   * @param port - The port being resolved
   * @param portName - The port name (for factory lookup)
   * @returns The override instance
   */
  private resolveOverride<P extends TProvides>(port: P, portName: string): InferService<P> {
    // Get the factory for this override
    const factory = this.overrideFactories[portName];
    if (factory === undefined) {
      // This shouldn't happen since we checked overridePortNames
      throw new Error(`Override factory not found for port '${portName}'`);
    }

    // Use memoizeOwn to cache the override instance in our own memo only.
    // This is critical: we must NOT check the parent memo because we want
    // the override to take precedence even if the original is already cached.
    return this.overrideMemo.memoizeOwn(port, () => factory() as InferService<P>);
  }

  /**
   * Checks if a port is overridden in this context.
   *
   * @param port - The port to check
   * @returns True if the port has an override factory
   */
  isOverridden(port: Port<unknown, string>): boolean {
    return this.overridePortNames.has(port.__portName);
  }

  /**
   * Disposes the override context's memo map.
   *
   * Should be called after the override context execution completes
   * to clean up any instances created during the override.
   *
   * @returns Promise that resolves when disposal is complete
   */
  async dispose(): Promise<void> {
    await this.overrideMemo.dispose();
  }
}

// =============================================================================
// Active Override Context Tracking
// =============================================================================

/**
 * Thread-local storage for the currently active override context.
 *
 * Uses a stack to support nested withOverrides calls. The top of the
 * stack is the currently active context that should intercept resolutions.
 *
 * Note: In JavaScript's single-threaded model, this is safe for synchronous
 * code. For async code, the context remains active for the duration of the
 * synchronous portion of the callback.
 *
 * @internal
 */
const activeContextStack: OverrideContext<Port<unknown, string>>[] = [];

/**
 * Pushes an override context onto the active stack.
 *
 * @param context - The context to make active
 * @internal
 */
export function pushOverrideContext(context: OverrideContext<Port<unknown, string>>): void {
  activeContextStack.push(context);
}

/**
 * Pops the current override context from the active stack.
 *
 * @returns The popped context
 * @throws Error if no context is active
 * @internal
 */
export function popOverrideContext(): OverrideContext<Port<unknown, string>> {
  const context = activeContextStack.pop();
  if (context === undefined) {
    throw new Error("No active override context to pop");
  }
  return context;
}

/**
 * Gets the currently active override context, or undefined if none.
 *
 * @returns The active context or undefined
 * @internal
 */
export function getActiveOverrideContext(): OverrideContext<Port<unknown, string>> | undefined {
  // Return the top of the stack (most recently pushed context)
  return activeContextStack[activeContextStack.length - 1];
}

/**
 * Checks if there is an active override context.
 *
 * @returns True if an override context is active
 * @internal
 */
export function hasActiveOverrideContext(): boolean {
  return activeContextStack.length > 0;
}
