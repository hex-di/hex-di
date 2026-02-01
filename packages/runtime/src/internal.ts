/**
 * Internal exports for sibling packages.
 *
 * This module exports implementation details that are needed by sibling packages
 * (e.g., @hex-di/react, @hex-di/hono) but should not be part of the public API.
 *
 * **WARNING**: These exports are internal and may change without notice.
 * Do not import from this module in consumer code.
 *
 * @packageDocumentation
 * @internal
 */

// =============================================================================
// Container Implementations
// =============================================================================

/**
 * Root container implementation class.
 * @internal
 */
export { RootContainerImpl } from "./container/root-impl.js";

/**
 * Child container implementation class.
 * @internal
 */
export { ChildContainerImpl } from "./container/child-impl.js";

/**
 * Abstract base class for container implementations.
 * @internal
 */
export { BaseContainerImpl } from "./container/base-impl.js";

/**
 * Lazy container implementation class.
 * @internal
 */
export { LazyContainerImpl } from "./container/lazy-impl.js";

/**
 * Scope implementation class.
 * @internal
 */
export { ScopeImpl } from "./scope/impl.js";

// =============================================================================
// Internal Types
// =============================================================================

export type {
  RuntimeAdapter,
  RuntimeAdapterFor,
  DisposableChild,
  ParentContainerLike,
  RootContainerConfig,
  ChildContainerConfig,
  ContainerConfig,
  ScopeContainerAccess,
  ForkedEntry,
} from "./container/internal-types.js";

export {
  isAdapterForPort,
  isAsyncAdapter,
  assertSyncAdapter,
  isForkedEntryForPort,
  isInternalAccessible,
  asInternalAccessible,
} from "./container/internal-types.js";

// =============================================================================
// Internal Symbols
// =============================================================================

/**
 * Symbol for internal container state access.
 * @internal
 */
export {
  INTERNAL_ACCESS,
  TRACING_ACCESS,
  HOOKS_ACCESS,
  ADAPTER_ACCESS,
} from "./inspection/symbols.js";

// =============================================================================
// Internal Utilities
// =============================================================================

/**
 * MemoMap for instance caching.
 * @internal
 */
export { MemoMap, type EntryMetadata } from "./util/memo-map.js";

/**
 * Resolution context for cycle detection.
 * @internal
 */
export { ResolutionContext } from "./resolution/context.js";

/**
 * HooksRunner for hook execution.
 * @internal
 */
export { HooksRunner, checkCacheHit, type ContainerMetadata } from "./resolution/hooks-runner.js";

/**
 * InheritanceResolver for child container inheritance modes.
 * @internal
 */
export {
  InheritanceResolver,
  type IsolatedInstanceCreator,
} from "./container/internal/inheritance-resolver.js";

/**
 * AdapterRegistry for adapter lookup.
 * @internal
 */
export { AdapterRegistry } from "./container/internal/adapter-registry.js";

/**
 * LifecycleManager for disposal.
 * @internal
 */
export { LifecycleManager } from "./container/internal/lifecycle-manager.js";

/**
 * ResolutionEngine for sync resolution.
 * @internal
 */
export { ResolutionEngine, type SyncDependencyResolver } from "./resolution/engine.js";

/**
 * AsyncResolutionEngine for async resolution.
 * @internal
 */
export { AsyncResolutionEngine, type AsyncDependencyResolver } from "./resolution/async-engine.js";

/**
 * AsyncInitializer for async initialization tracking.
 * @internal
 */
export { AsyncInitializer } from "./container/internal/async-initializer.js";
