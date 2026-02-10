/**
 * Resolution hooks for @hex-di/runtime.
 *
 * Provides optional lifecycle hooks that fire during service resolution.
 * These hooks enable instrumentation (like tracing) without modifying
 * core resolution logic. When hooks are not provided, there is zero overhead.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { Lifetime } from "@hex-di/core";
import type { InheritanceMode } from "../types.js";

// =============================================================================
// Hook Type Definitions
// =============================================================================

/**
 * Hook type for resolution events.
 *
 * - `'beforeResolve'`: Called before resolving a port
 * - `'afterResolve'`: Called after resolving a port (with result/duration)
 */
export type HookType = "beforeResolve" | "afterResolve";

/**
 * Hook handler type based on hook type.
 *
 * - For `'beforeResolve'`: Receives {@link ResolutionHookContext}
 * - For `'afterResolve'`: Receives {@link ResolutionResultContext}
 */
export type HookHandler<T extends HookType> = T extends "beforeResolve"
  ? (context: ResolutionHookContext) => void
  : (context: ResolutionResultContext) => void;

// =============================================================================
// Container Kind Type
// =============================================================================

/**
 * The kind of container where resolution is occurring.
 *
 * Used by plugins to track which container resolved a service:
 * - `'root'`: The root container created by `createContainer()`
 * - `'child'`: A child container created by `createChild()`
 * - `'lazy'`: A lazy container created by `createLazyChild()`
 * - `'scope'`: A scope created by `createScope()`
 */
export type ContainerKind = "root" | "child" | "lazy" | "scope";

// =============================================================================
// Hook Context Types
// =============================================================================

/**
 * Context provided to resolution hooks before resolution begins.
 *
 * Contains information about the port being resolved, its lifetime,
 * scope context, and parent resolution (for nested dependencies).
 *
 * @remarks
 * - `parentPort` is null for top-level resolutions, non-null for dependencies
 * - `isCacheHit` indicates whether the instance already exists in cache
 * - `depth` is 0 for top-level, 1 for first-level dependencies, etc.
 * - All properties are readonly to ensure hook consumers don't modify state
 *
 * @example
 * ```typescript
 * const hooks: ResolutionHooks = {
 *   beforeResolve: (context) => {
 *     console.log(`Resolving ${context.portName} at depth ${context.depth}`);
 *     if (context.parentPort) {
 *       console.log(`  Parent: ${context.parentPort.__portName}`);
 *     }
 *   },
 * };
 * ```
 */
export interface ResolutionHookContext {
  /**
   * The port being resolved.
   * Can be used to identify the service type.
   */
  readonly port: Port<unknown, string>;

  /**
   * Name of the port being resolved.
   * Convenience property equivalent to `port.__portName`.
   */
  readonly portName: string;

  /**
   * Lifetime of the adapter for this port.
   * Determines caching behavior: "singleton", "scoped", or "transient".
   */
  readonly lifetime: Lifetime;

  /**
   * ID of the scope where resolution is occurring.
   * null for container-level resolutions (singletons resolved from root).
   */
  readonly scopeId: string | null;

  /**
   * User-provided name of the scope where resolution is occurring.
   * undefined when resolving outside a scope or when the scope has an auto-generated ID.
   * Distinct from scopeId which may be auto-generated (e.g., "scope-0").
   */
  readonly scopeName: string | undefined;

  /**
   * The parent port if this is a nested dependency resolution.
   * null for top-level resolutions initiated by user code.
   */
  readonly parentPort: Port<unknown, string> | null;

  /**
   * Whether this resolution will be served from cache.
   * true if instance already exists (singleton/scoped), false for fresh creation.
   */
  readonly isCacheHit: boolean;

  /**
   * Resolution depth in the dependency tree.
   * 0 for top-level resolutions, increments for each level of dependencies.
   */
  readonly depth: number;

  /**
   * Unique ID of the container where resolution is occurring.
   * Format: "root", "child-xxx", "lazy-xxx", "scope-xxx"
   */
  readonly containerId: string;

  /**
   * Kind of container where resolution is occurring.
   * Identifies whether this is a root, child, lazy, or scope container.
   */
  readonly containerKind: ContainerKind;

  /**
   * For child containers, the inheritance mode for this port.
   * - `'shared'`: Instance from parent container
   * - `'forked'`: Snapshot copy from parent
   * - `'isolated'`: Fresh instance in child
   * - `null`: Not a child container, or port is locally defined
   */
  readonly inheritanceMode: InheritanceMode | null;

  /**
   * ID of the parent container, or null for root containers.
   * Used to trace the container hierarchy.
   */
  readonly parentContainerId: string | null;

  /**
   * Duration of the resolution in milliseconds.
   * 0 before resolution completes, set after resolution.
   */
  readonly duration: number;

  /**
   * Error thrown during resolution, or null on success.
   * null before resolution completes, set after resolution.
   */
  readonly error: Error | null;

  /**
   * The resolved instance, or undefined before resolution completes.
   * Set after a successful factory call; undefined on errors.
   * Enables auto-discovery of LibraryInspectors via afterResolve hooks.
   */
  readonly result?: unknown;
}

/**
 * Context provided to afterResolve hook after resolution completes.
 *
 * This is the same as ResolutionHookContext — the `duration` and `error`
 * fields are set after resolution completes by mutating the context in-place
 * (avoiding a spread allocation per resolution).
 *
 * @remarks
 * - `duration` is measured using `Date.now()` for cross-platform compatibility
 * - `error` is null on success, contains the Error instance on failure
 * - The afterResolve hook is always called, even when resolution throws
 *
 * @example
 * ```typescript
 * const hooks: ResolutionHooks = {
 *   afterResolve: (context) => {
 *     if (context.error) {
 *       console.error(`Failed to resolve ${context.portName}:`, context.error);
 *     } else {
 *       console.log(`Resolved ${context.portName} in ${context.duration}ms`);
 *     }
 *   },
 * };
 * ```
 */
export type ResolutionResultContext = ResolutionHookContext;

// =============================================================================
// Resolution Hooks Interface
// =============================================================================

/**
 * Optional lifecycle hooks for resolution instrumentation.
 *
 * Both hooks are optional. When not provided, no overhead is incurred.
 * Hooks are called synchronously during resolution.
 *
 * @remarks
 * **Hook Execution Order:**
 * - Multiple `beforeResolve` hooks fire in installation order (FIFO)
 * - Multiple `afterResolve` hooks fire in reverse installation order (LIFO)
 * This mimics middleware patterns where setup runs forward and cleanup runs backward.
 *
 * **Performance Considerations:**
 * - Hooks should not throw errors; doing so will interrupt resolution and propagate to caller
 * - Hooks should be fast to avoid impacting resolution performance (aim for <1ms)
 * - Hooks are called for ALL resolutions, including nested dependencies (high frequency)
 * - Use `@hex-di/tracing` instrumentContainer() for observability (optimized, dedicated)
 *
 * **Use Cases:**
 * - Custom tracing/logging systems beyond @hex-di/tracing
 * - Integration with external APM tools (DataDog, New Relic, etc.)
 * - Dependency injection validation or policy enforcement
 * - Testing: Capture resolution events for assertions
 *
 * @example Basic tracing implementation
 * ```typescript
 * const traces: Array<{port: string, duration: number}> = [];
 *
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   hooks: {
 *     afterResolve: (ctx) => {
 *       if (ctx.error === null) {
 *         traces.push({ port: ctx.portName, duration: ctx.duration });
 *       }
 *     },
 *   },
 * });
 * ```
 *
 * @example Dependency graph tracking
 * ```typescript
 * const hooks: ResolutionHooks = {
 *   beforeResolve: (ctx) => {
 *     if (ctx.parentPort) {
 *       console.log(`${ctx.parentPort.__portName} -> ${ctx.portName}`);
 *     }
 *   },
 * };
 * ```
 *
 * @example Error monitoring integration
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   hooks: {
 *     afterResolve: (ctx) => {
 *       if (ctx.error !== null) {
 *         sentryClient.captureException(ctx.error, {
 *           tags: { port: ctx.portName, lifetime: ctx.lifetime },
 *         });
 *       }
 *     },
 *   },
 * });
 * ```
 */
export interface ResolutionHooks {
  /**
   * Called before each resolution attempt.
   *
   * **Execution Order:**
   * - Fires AFTER adapter lookup but BEFORE cache check
   * - Called for both cache hits and cache misses
   * - Called for every port in the dependency tree (nested resolutions)
   *
   * **Context Information:**
   * - `portName`: The port being resolved (e.g., "Logger")
   * - `lifetime`: The adapter's lifetime ("singleton" | "scoped" | "request")
   * - `parentPort`: The port that depends on this one (null for top-level resolve)
   * - `scopeId`: The scope ID if resolving in a scope (null for container)
   *
   * **Common Patterns:**
   * - Start performance timers (use `afterResolve` to stop)
   * - Log dependency chains via `parentPort`
   * - Validate resolution policies (e.g., "don't resolve DB in tests")
   *
   * @param context - Information about the resolution being attempted
   *
   * @example
   * ```typescript
   * beforeResolve: (ctx) => {
   *   console.log(`[RESOLVE START] ${ctx.portName} (${ctx.lifetime})`);
   *   if (ctx.parentPort) {
   *     console.log(`  └─ required by ${ctx.parentPort.__portName}`);
   *   }
   * }
   * ```
   */
  beforeResolve?: (context: ResolutionHookContext) => void;

  /**
   * Called after each resolution completes (success or failure).
   *
   * **Execution Order:**
   * - Fires AFTER factory execution and cache storage
   * - ALWAYS invoked, even when resolution throws an error
   * - For multiple hooks, fires in LIFO order (last installed, first executed)
   *
   * **Context Information:**
   * - All properties from `beforeResolve` context (portName, lifetime, etc.)
   * - `duration`: Time taken to resolve (milliseconds, includes nested dependencies)
   * - `error`: Error if resolution failed, or `null` on success
   *
   * **Common Patterns:**
   * - Record resolution timing and success rate
   * - Send errors to monitoring systems
   * - Calculate dependency graph statistics
   * - Test assertions on resolution behavior
   *
   * @param context - Information about the completed resolution
   *
   * @example Success/error tracking
   * ```typescript
   * afterResolve: (ctx) => {
   *   if (ctx.error === null) {
   *     metrics.increment('resolution.success', { port: ctx.portName });
   *     metrics.histogram('resolution.duration', ctx.duration);
   *   } else {
   *     metrics.increment('resolution.error', {
   *       port: ctx.portName,
   *       error: ctx.error.constructor.name
   *     });
   *   }
   * }
   * ```
   */
  afterResolve?: (context: ResolutionResultContext) => void;
}

// =============================================================================
// Hook Installation
// =============================================================================

/**
 * Interface for installing hooks dynamically after container creation.
 *
 * Hooks are composed in order of installation for beforeResolve,
 * and reverse order for afterResolve.
 *
 * @example
 * ```typescript
 * const installer = container[HOOKS_ACCESS]();
 * const uninstall = installer.installHooks({
 *   beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *   afterResolve: (ctx) => console.log(`Done in ${ctx.duration}ms`),
 * });
 *
 * // Later, to remove the hooks:
 * uninstall();
 * ```
 */
export interface HooksInstaller {
  /**
   * Installs resolution hooks into the container.
   *
   * @param hooks - The hooks to install
   * @returns Uninstall function to remove the hooks
   */
  installHooks(hooks: ResolutionHooks): () => void;
}

// =============================================================================
// Immutable Hooks
// =============================================================================

/**
 * Configuration for sealed (immutable) resolution hooks.
 *
 * Once hooks are sealed, they cannot be modified. This prevents accidental
 * mutation of hooks after container creation and ensures predictable behavior.
 *
 * Use `sealHooks()` to create an immutable hooks configuration.
 *
 * @example
 * ```typescript
 * const hooks = sealHooks({
 *   beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *   afterResolve: (ctx) => console.log(`Done in ${ctx.duration}ms`),
 * });
 *
 * // hooks.sealed is true - these hooks are immutable
 * const container = createContainer(graph, { hooks });
 * ```
 */
export interface ImmutableHooksConfig extends ResolutionHooks {
  /**
   * Indicates these hooks are sealed and cannot be modified.
   * Always true for ImmutableHooksConfig.
   */
  readonly sealed: true;
}

/**
 * Seals resolution hooks to prevent modification.
 *
 * Creates a frozen copy of the hooks that cannot be modified. Use this when
 * you want to ensure hooks remain unchanged after container creation.
 *
 * @param hooks - The hooks to seal
 * @returns A sealed, frozen hooks configuration
 *
 * @example
 * ```typescript
 * const hooks = sealHooks({
 *   beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 * });
 *
 * // TypeScript knows hooks.sealed is true
 * console.log(hooks.sealed); // true
 *
 * // Attempting to modify will throw at runtime (Object.freeze)
 * // and fail at compile time (readonly)
 * ```
 */
export function sealHooks(hooks: ResolutionHooks): ImmutableHooksConfig {
  const sealed: ImmutableHooksConfig = {
    beforeResolve: hooks.beforeResolve,
    afterResolve: hooks.afterResolve,
    sealed: true,
  };
  return Object.freeze(sealed);
}

/**
 * Type guard to check if hooks are sealed.
 *
 * @param hooks - The hooks to check
 * @returns True if hooks are sealed (immutable)
 */
export function isSealed(hooks: ResolutionHooks): hooks is ImmutableHooksConfig {
  return (hooks as ImmutableHooksConfig).sealed === true;
}

// =============================================================================
// Container Options
// =============================================================================

/**
 * Options for createContainer.
 *
 * @example Using hooks
 * ```typescript
 * const container = createContainer(graph, {
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 */
export interface ContainerOptions {
  /**
   * Optional resolution lifecycle hooks.
   *
   * When provided, hooks are called for every resolution including
   * nested dependency resolutions. When not provided, there is zero
   * overhead - the hooks code path is not executed.
   */
  readonly hooks?: ResolutionHooks;
}
