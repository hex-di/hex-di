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
// Error Hierarchy
// =============================================================================
/**
 * Error classes for container-related failures.
 *
 * All errors extend {@link ContainerError} which provides:
 * - `code`: Stable string constant for programmatic handling
 * - `isProgrammingError`: Boolean indicating if error is a programming mistake
 *
 * @see {@link ContainerError} - Abstract base class for all container errors
 * @see {@link CircularDependencyError} - Thrown when circular dependency detected
 * @see {@link FactoryError} - Thrown when adapter factory throws
 * @see {@link DisposedScopeError} - Thrown when resolving from disposed scope
 * @see {@link ScopeRequiredError} - Thrown when resolving scoped port from container
 * @see {@link AsyncFactoryError} - Thrown when async factory throws
 * @see {@link AsyncInitializationRequiredError} - Thrown when resolving async port before init
 */
export { ContainerError, CircularDependencyError, FactoryError, DisposedScopeError, ScopeRequiredError, AsyncFactoryError, AsyncInitializationRequiredError, } from "./errors.js";
/**
 * Brand symbols for Container, Scope, and ChildContainer nominal typing.
 *
 * These symbols are used internally for nominal typing and are exposed
 * primarily for testing purposes to create properly typed mock containers
 * and scopes.
 *
 * @see {@link ContainerBrand} - Unique symbol for Container nominal typing
 * @see {@link ScopeBrand} - Unique symbol for Scope nominal typing
 * @see {@link ChildContainerBrand} - Unique symbol for ChildContainer nominal typing
 */
export { ContainerBrand, ScopeBrand, ChildContainerBrand } from "./types.js";
export { isRuntimeContainer, assertResolverProvides, toRuntimeResolver, toRuntimeContainer, } from "./runtime-resolver.js";
// =============================================================================
// Container Factory
// =============================================================================
/**
 * Factory function for creating containers from validated graphs.
 *
 * @see {@link createContainer} - Create an immutable container from a Graph
 */
export { createContainer } from "./container.js";
// =============================================================================
// Container State Inspection
// =============================================================================
/**
 * Symbol-based access protocol for container state inspection.
 *
 * The INTERNAL_ACCESS Symbol grants controlled read-only access to container
 * and scope internal state. This enables DevTools to inspect runtime behavior
 * without exposing mutable implementation details.
 *
 * @see {@link INTERNAL_ACCESS} - Symbol for accessing internal state
 * @see {@link TRACING_ACCESS} - Symbol for accessing tracing capabilities
 * @see {@link ContainerInternalState} - Container internal state snapshot type
 * @see {@link ScopeInternalState} - Scope internal state snapshot type
 * @see {@link MemoMapSnapshot} - MemoMap snapshot type for instance inspection
 * @see {@link InternalAccessor} - Accessor function type
 */
export { INTERNAL_ACCESS, TRACING_ACCESS } from "./inspector-symbols.js";
/**
 * Factory function for creating container inspectors.
 *
 * The inspector provides runtime state inspection capabilities for DevTools
 * and debugging purposes. It returns serializable, frozen snapshots of
 * container state without exposing mutable internals.
 *
 * @see {@link createInspector} - Create an inspector for a container
 * @see {@link getInternalAccessor} - Get the internal accessor from a container
 * @see {@link ContainerInspector} - Interface returned by createInspector
 * @see {@link ContainerSnapshot} - Snapshot structure returned by inspector.snapshot()
 * @see {@link ScopeTree} - Hierarchical scope tree structure
 */
export { createInspector, getInternalAccessor } from "./create-inspector.js";
