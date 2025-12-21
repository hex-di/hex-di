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
} from "./common/errors.js";

// =============================================================================
// Container and Scope Types
// =============================================================================

export type { Container, Scope, ContainerPhase, ChildContainer, ChildContainerBuilder, InheritanceMode } from "./types.js";

export { ContainerBrand, ScopeBrand, ChildContainerBrand } from "./types.js";

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
// Runtime Resolver Types
// =============================================================================

export type {
  RuntimeResolver,
  RuntimeContainer,
  TypedResolver,
} from "./adapters/react-resolver.js";

export {
  isRuntimeContainer,
  assertResolverProvides,
  toRuntimeResolver,
  toRuntimeContainer,
} from "./adapters/react-resolver.js";

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
} from "./resolution/hooks.js";

// =============================================================================
// Captive Dependency Prevention Types
// =============================================================================

export type {
  LifetimeLevel,
  CaptiveDependencyError,
  InferAdapterLifetime,
  ValidateCaptiveDependency,
  ValidateAllDependencies,
} from "./captive-dependency.js";

// =============================================================================
// Container State Inspection
// =============================================================================

export { INTERNAL_ACCESS, TRACING_ACCESS } from "./inspector/symbols.js";

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

export { createInspector, getInternalAccessor } from "./inspector/creation.js";
