/**
 * @hex-di/runtime - Runtime Container Layer
 *
 * The runtime layer of HexDI that creates immutable containers from validated graphs
 * and provides type-safe service resolution with lifetime management, circular
 * dependency detection, and structured error handling.
 *
 * ## Key Features
 *
 * - **Type-Safe Resolution**: Resolve services with compile-time validation that
 *   the port exists in the container and correct return type inference.
 *
 * - **Lifetime Management**: Three lifetime scopes (singleton, scoped, transient)
 *   with proper instance caching and isolation.
 *
 * - **Scope Hierarchy**: Create child scopes for request-scoped services with
 *   proper singleton inheritance and scoped instance isolation.
 *
 * - **Circular Dependency Detection**: Lazy detection at resolution time with
 *   detailed error messages showing the dependency chain.
 *
 * - **LIFO Disposal**: Proper cleanup with finalizers called in reverse creation
 *   order (last created, first disposed).
 *
 * - **Structured Errors**: Rich error hierarchy with stable codes for
 *   programmatic handling.
 *
 * ## Quick Start
 *
 * @example Basic usage
 * ```typescript
 * import { createPort } from '@hex-di/ports';
 * import { createAdapter, GraphBuilder } from '@hex-di/graph';
 * import { createContainer } from '@hex-di/runtime';
 *
 * // Define service interfaces
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create ports
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * // Create adapters
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => ({ log: console.log })
 * });
 *
 * // Build graph and create container
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 *
 * // Resolve services
 * const logger = container.resolve(LoggerPort);
 * logger.log('Hello, world!');
 *
 * // Cleanup
 * await container.dispose();
 * ```
 *
 * @example Using scopes for request-scoped services
 * ```typescript
 * // Create a scope for each request
 * async function handleRequest() {
 *   const scope = container.createScope();
 *   try {
 *     const userContext = scope.resolve(UserContextPort);
 *     // ... handle request with scoped services
 *   } finally {
 *     await scope.dispose();
 *   }
 * }
 * ```
 *
 * @example Error handling
 * ```typescript
 * import {
 *   createContainer,
 *   ContainerError,
 *   CircularDependencyError,
 *   FactoryError
 * } from '@hex-di/runtime';
 *
 * try {
 *   const service = container.resolve(SomePort);
 * } catch (error) {
 *   if (error instanceof CircularDependencyError) {
 *     console.error('Circular dependency:', error.dependencyChain);
 *   } else if (error instanceof FactoryError) {
 *     console.error('Factory failed for:', error.portName);
 *     console.error('Cause:', error.cause);
 *   } else if (error instanceof ContainerError) {
 *     console.error(`Container error [${error.code}]:`, error.message);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from Sibling Packages
// =============================================================================

/**
 * Re-export types from @hex-di/ports for consumer convenience.
 *
 * These types are commonly used alongside runtime types, so they are
 * re-exported to reduce import boilerplate in consumer code.
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";

/**
 * Re-export types from @hex-di/graph for consumer convenience.
 *
 * These types are commonly used alongside runtime types for building
 * dependency graphs and creating containers.
 */
export type {
  Graph,
  Adapter,
  Lifetime,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  ResolvedDeps,
} from "@hex-di/graph";

// =============================================================================
// Error Hierarchy
// =============================================================================

// =============================================================================
// Error Hierarchy
// =============================================================================

export {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "./common/errors.js";

// =============================================================================
// Container and Scope Types
// =============================================================================

export type {
  Container,
  Scope,
  LazyContainer,
  ContainerPhase,
  CreateContainerOptions,
  CreateChildOptions,
  ContainerDevToolsOptions,
  InheritanceMode,
  InheritanceModeConfig,
  InferContainerEffectiveProvides,
  IsRootContainer,
  IsChildContainer,
} from "./types.js";

export { ContainerBrand, ScopeBrand } from "./types.js";

// =============================================================================
// Scope Lifecycle Events
// =============================================================================

/**
 * Types for scope lifecycle event subscriptions.
 *
 * These types enable reactive UI patterns where components can respond
 * to scope disposal triggered from outside React (e.g., logout, connection loss).
 *
 * @example
 * ```typescript
 * import { type ScopeLifecycleListener } from '@hex-di/runtime';
 *
 * const listener: ScopeLifecycleListener = (event) => {
 *   if (event === 'disposing') {
 *     console.log('Scope is being disposed');
 *   }
 * };
 *
 * const unsubscribe = scope.subscribe(listener);
 * ```
 */
export type {
  ScopeLifecycleEvent,
  ScopeLifecycleListener,
  ScopeSubscription,
  ScopeDisposalState,
} from "./scope/lifecycle-events.js";

// =============================================================================
// Type Utility Functions
// =============================================================================

export type {
  InferContainerProvides,
  InferScopeProvides,
  IsResolvable,
  ServiceFromContainer,
} from "./types.js";

// =============================================================================
// Type Utilities for Context Variables
// =============================================================================

export type { ContextVariableKey } from "./types/branded-types.js";
export { createContextVariableKey } from "./types/branded-types.js";

export type { TypeSafeContext } from "./types/helpers.js";
export {
  getContextVariable,
  setContextVariable,
  getContextVariableOrDefault,
  portComparator,
} from "./types/helpers.js";

export { isPort, isPortNamed } from "./types/type-guards.js";

export { isRecord } from "./common/type-guards.js";

// =============================================================================
// Container Factory
// =============================================================================

export { createContainer } from "./container/factory.js";

// =============================================================================
// Resolution Hooks
// =============================================================================

export type {
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
  ContainerOptions,
  ContainerKind,
  HooksInstaller,
} from "./resolution/hooks.js";

// =============================================================================
// Captive Dependency Prevention Types
// =============================================================================

export type {
  // Re-exported from @hex-di/graph
  LifetimeLevel,
  LifetimeName,
  IsCaptiveDependency,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  MergeLifetimeMaps,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  CaptiveDependencyError,
  // Runtime-specific adapter-based validation types
  CaptiveDependencyErrorLegacy,
  ValidateCaptiveDependency,
  ValidateAllDependencies,
} from "./captive-dependency.js";

// =============================================================================
// Container State Inspection
// =============================================================================

export { INTERNAL_ACCESS, TRACING_ACCESS, HOOKS_ACCESS } from "./inspector/symbols.js";

export type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
  AdapterInfo,
  InternalAccessor,
  HasInternalAccess,
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
} from "./inspector/types.js";

export {
  createInspector,
  getInternalAccessor,
  type InternalAccessible,
} from "./inspector/creation.js";

// =============================================================================
// Plugin System
// =============================================================================

/**
 * Plugin system for extending container functionality.
 *
 * Provides type-safe container extensibility with:
 * - Symbol-based API access: `container[PLUGIN_SYMBOL]`
 * - Plugin dependencies with compile-time validation
 * - Lifecycle hooks for resolution and scope events
 * - Zero overhead when no plugins are registered
 *
 * @example Basic plugin usage
 * ```typescript
 * import { definePlugin, createContainer } from '@hex-di/runtime';
 *
 * const LOGGING = Symbol.for('hex-di/logging');
 *
 * const LoggingPlugin = definePlugin({
 *   name: 'logging',
 *   symbol: LOGGING,
 *   createApi() {
 *     return { log: (msg: string) => console.log(msg) };
 *   },
 * });
 *
 * const container = createContainer(graph, {
 *   plugins: [LoggingPlugin],
 * });
 *
 * container[LOGGING].log('Hello!');
 * ```
 */

// Plugin definition and factory functions
export { definePlugin, requires, optionallyRequires } from "./plugin/index.js";
export type { DefinePluginConfig } from "./plugin/index.js";

// Plugin types
export type {
  Plugin,
  PluginDependency,
  PluginContext,
  PluginHooks,
  ScopeEventEmitter,
  ScopeEventInfo,
  ChildContainerInfo,
  ContainerInfo,
  AnyPlugin,
  InferPluginSymbol,
  InferPluginApi,
  InferPluginRequires,
  InferPluginEnhancedBy,
} from "./plugin/index.js";

// Plugin validation types
export type {
  PluginApiMap,
  PluginAugmentedContainer,
  ValidatePluginOrder,
  MissingPluginDependencyError as PluginMissingDependencyTypeError,
  CircularPluginDependencyError as PluginCircularDependencyTypeError,
} from "./plugin/index.js";

// Plugin errors
export {
  PluginError,
  PluginDependencyMissingError,
  PluginCircularDependencyError,
  PluginInitializationError,
  PluginNotFoundError,
  PluginAlreadyRegisteredError,
} from "./plugin/index.js";
export type { PluginErrorCode } from "./plugin/index.js";

// Plugin manager (for advanced use cases)
export { PluginManager } from "./plugin/index.js";
export type { ComposedHooks } from "./plugin/index.js";

// =============================================================================
// Plugin Wrapper Pattern (Zustand/Redux-style enhancement)
// =============================================================================

/**
 * Enhancement wrapper utilities for type-safe plugin composition.
 *
 * The wrapper pattern provides compile-time type safety for plugin APIs
 * without requiring type casts. Each wrapper adds a symbol-keyed API to
 * the container type through intersection.
 *
 * @example
 * ```typescript
 * import { createContainer, pipe, withInspector, INSPECTOR } from '@hex-di/runtime';
 *
 * const container = pipe(
 *   createContainer(graph),
 *   withInspector
 * );
 *
 * // TypeScript knows container has [INSPECTOR]: InspectorAPI
 * container[INSPECTOR].getSnapshot();
 * ```
 */
export {
  createPluginWrapper,
  getAppliedWrappers,
  getEnhancedWrapper,
  getDisposalCallbacks,
  APPLIED_WRAPPERS,
} from "./plugin/index.js";

export type {
  PluginWrapper,
  EnhanceableContainer,
  WrapperContext,
  WithPlugin,
  ApplyWrapper,
  AppliedWrapper,
  WrapperTracking,
} from "./plugin/index.js";

// Composition utilities
export { pipe, compose2, compose3, compose4, compose5 } from "./plugin/index.js";

// =============================================================================
// Inspector Plugin
// =============================================================================

/**
 * Container state inspection plugin for DevTools and debugging.
 *
 * Provides:
 * - Container state snapshots (singletons, scopes, phase)
 * - Container kind detection (root, child, lazy, scope)
 * - Real-time event subscriptions
 * - Child container discovery
 * - Dependency graph visualization data
 *
 * @example Basic usage with plugin
 * ```typescript
 * import { createContainer, InspectorPlugin, INSPECTOR } from '@hex-di/runtime';
 *
 * const container = createContainer(graph, {
 *   plugins: [InspectorPlugin],
 * });
 *
 * const snapshot = container[INSPECTOR].getSnapshot();
 * console.log(`Container kind: ${snapshot.kind}`);
 *
 * // Subscribe to events
 * container[INSPECTOR].subscribe((event) => {
 *   if (event.type === 'resolution') {
 *     console.log(`Resolved ${event.portName} in ${event.duration}ms`);
 *   }
 * });
 * ```
 *
 * @example Using wrapper pattern
 * ```typescript
 * import { createContainer, pipe, withInspector, INSPECTOR } from '@hex-di/runtime';
 *
 * const container = pipe(
 *   createContainer(graph),
 *   withInspector
 * );
 *
 * // Full type safety - TypeScript knows container has [INSPECTOR]
 * container[INSPECTOR].getSnapshot();
 * ```
 */

// Inspector symbol and plugin
export { INSPECTOR, InspectorPlugin } from "./plugins/inspector/index.js";

// Inspector factory (pull-only, no subscription)
export { createInspector as createInspectorAPI } from "./plugins/inspector/index.js";

// Inspector wrapper
export { withInspector, type WithInspector } from "./plugins/inspector/index.js";

// Inspector type guards
export {
  hasInspector,
  getInspectorAPI,
  hasSubscription,
  type ContainerWithInspector,
} from "./plugins/inspector/index.js";

// Inspector helper functions
export { detectContainerKind, detectPhase, buildTypedSnapshot } from "./plugins/inspector/index.js";

// Inspector types
export type {
  InspectorAPI,
  InspectorWithSubscription,
  InspectorEvent,
  InspectorListener,
  AdapterInfo as InspectorAdapterInfo,
  VisualizableAdapter,
  ContainerGraphData,
  ContainerKind as InspectorContainerKind,
  ContainerPhase as InspectorContainerPhase,
  ContainerSnapshot as InspectorContainerSnapshot,
  ScopeTree as InspectorScopeTree,
} from "./plugins/inspector/index.js";

// =============================================================================
// Tracing Plugin
// =============================================================================

/**
 * Resolution tracing plugin for performance monitoring and debugging.
 *
 * Provides:
 * - Resolution timing and statistics
 * - Parent-child dependency tracking
 * - Cache hit detection
 * - Configurable retention policies
 * - Real-time subscription support
 *
 * @example Basic usage
 * ```typescript
 * import { createContainer, TracingPlugin, TRACING } from '@hex-di/runtime';
 *
 * const container = createContainer(graph, {
 *   plugins: [TracingPlugin],
 * });
 *
 * const tracing = container[TRACING];
 * const traces = tracing.getTraces();
 * const stats = tracing.getStats();
 * ```
 *
 * @example Using wrapper pattern
 * ```typescript
 * import { createContainer, pipe, withTracing, TRACING } from '@hex-di/runtime';
 *
 * const container = pipe(
 *   createContainer(graph),
 *   withTracing
 * );
 *
 * container[TRACING].subscribe((trace) => {
 *   console.log(`Resolved ${trace.portName} in ${trace.duration}ms`);
 * });
 * ```
 */

// Tracing symbol and plugin
export {
  TRACING,
  TracingPlugin,
  createTracingPlugin,
  type TracingPluginOptions,
} from "./plugins/tracing/index.js";

// Tracing wrapper
export { withTracing, type WithTracing } from "./plugins/tracing/index.js";

// Tracing collectors
export { MemoryCollector, NoOpCollector, CompositeCollector } from "./plugins/tracing/index.js";

export type { TraceCollector, TraceSubscriber, Unsubscribe } from "./plugins/tracing/index.js";

// Tracing type guards and helpers
export { hasTracing, getTracingAPI, type ContainerWithTracing } from "./plugins/tracing/index.js";

// Re-export tracing types from @hex-di/plugin
export type {
  TraceEntry,
  TraceStats,
  TraceRetentionPolicy,
  TraceFilter,
  TracingAPI,
} from "@hex-di/plugin";

export { DEFAULT_RETENTION_POLICY } from "@hex-di/plugin";
