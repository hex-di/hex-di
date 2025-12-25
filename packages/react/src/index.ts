/**
 * @hex-di/react - React Integration for HexDI
 *
 * Provides type-safe React integration for HexDI with Provider components,
 * typed hooks, and automatic scope lifecycle management.
 *
 * ## Key Features
 *
 * - **Type-Safe Hooks**: Resolve services with compile-time validation that
 *   the port exists in TProvides and correct return type inference.
 *
 * - **Factory Pattern**: createTypedHooks captures TProvides at creation time,
 *   avoiding global type registry and enabling multiple isolated integrations.
 *
 * - **Provider Components**: ContainerProvider for root container access,
 *   ScopeProvider for manual scope management, AutoScopeProvider for automatic
 *   scope lifecycle tied to React component lifecycle.
 *
 * - **SSR Compatible**: No global state - each createTypedHooks call creates
 *   isolated context. Works with Next.js, Remix, and other SSR frameworks.
 *
 * ## Quick Start
 *
 * @example Basic usage
 * ```typescript
 * import { createPort } from '@hex-di/ports';
 * import { createContainer } from '@hex-di/runtime';
 * import { createTypedHooks } from '@hex-di/react';
 *
 * // Define ports
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type AppPorts = typeof LoggerPort;
 *
 * // Create typed React integration
 * const { ContainerProvider, usePort } = createTypedHooks<AppPorts>();
 *
 * // Use in your React app
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <MyComponent />
 *     </ContainerProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const logger = usePort(LoggerPort); // Type-safe!
 *   return <div>{logger.name}</div>;
 * }
 * ```
 *
 * @example Automatic scope management
 * ```typescript
 * function UserPage() {
 *   return (
 *     <AutoScopeProvider>
 *       <UserProfile />
 *       <UserSettings />
 *     </AutoScopeProvider>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Factory Function (Primary API)
// =============================================================================

/**
 * Factory function for creating typed React integration.
 *
 * This is the primary API for @hex-di/react. It creates an isolated set of
 * React components and hooks bound to your TProvides type parameter.
 *
 * @see {@link createTypedHooks} - Factory function documentation
 * @see {@link TypedReactIntegration} - Return type definition
 */
export { createTypedHooks } from "./factories/index.js";

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Type definitions for the React integration.
 *
 * @see {@link TypedReactIntegration} - Return type of createTypedHooks
 * @see {@link ContainerProviderProps} - Props for ContainerProvider
 * @see {@link ScopeProviderProps} - Props for ScopeProvider
 * @see {@link AutoScopeProviderProps} - Props for AutoScopeProvider
 * @see {@link Resolver} - Type-safe resolver interface for Container/Scope
 * @see {@link ToResolver} - Utility to extract Resolver from Container/Scope
 */
export type {
  TypedReactIntegration,
  ContainerProviderProps,
  ScopeProviderProps,
  AutoScopeProviderProps,
  AsyncContainerProviderProps,
  AsyncContainerProviderComponent,
  AsyncContainerLoadingProps,
  AsyncContainerErrorProps,
  AsyncContainerReadyProps,
  Resolver,
  ToResolver,
} from "./types/index.js";

// =============================================================================
// Global Provider Components
// =============================================================================

/**
 * Global ContainerProvider component that uses the shared React context.
 *
 * This is exported for use cases where a global provider is needed, such as
 * testing utilities. For application code, prefer using `createTypedHooks()`
 * which provides better type safety.
 *
 * @see {@link ContainerProvider} - Provider component documentation
 * @see {@link ScopeProvider} - Manual scope management
 * @see {@link AutoScopeProvider} - Automatic scope lifecycle
 */
export { ContainerProvider, ScopeProvider, AutoScopeProvider } from "./providers/index.js";

/**
 * ReactiveScopeProvider for external scope lifecycle management.
 *
 * This provider enables a reactive pattern where scopes created outside React
 * can trigger automatic component unmounting when disposed. Useful for:
 * - Logout/Session End: dispose user scope -> unmount user-specific UI
 * - Resource Cleanup: connection closes -> show reconnect UI
 * - Multi-Tenant Switching: dispose workspace scope -> swap UI trees
 *
 * @see {@link ReactiveScopeProvider} - Provider component documentation
 * @see {@link ReactiveScopeProviderProps} - Props type
 */
export { ReactiveScopeProvider } from "./providers/index.js";
export type { ReactiveScopeProviderProps } from "./providers/index.js";

/**
 * Global AsyncContainerProvider component for async container initialization.
 *
 * This is exported for use cases where a global provider is needed, such as
 * testing utilities. For application code, prefer using `createTypedHooks()`
 * which provides better type safety.
 *
 * @see {@link AsyncContainerProvider} - Provider component documentation
 */
export { AsyncContainerProvider, useAsyncContainerState } from "./providers/index.js";

// =============================================================================
// Global Hooks
// =============================================================================

/**
 * Global usePort hook that uses the shared React context.
 *
 * This is exported for use cases where a global hook is needed, such as
 * testing utilities. For application code, prefer using `createTypedHooks()`
 * which provides better type safety.
 *
 * @see {@link usePort} - Hook documentation
 */
export { usePort } from "./hooks/index.js";
export { useContainer } from "./hooks/index.js";

// =============================================================================
// Declarative Component Creation
// =============================================================================

/**
 * Standalone function for creating React components with explicit dependencies.
 *
 * Following the same pattern as `createAdapter` from @hex-di/graph, this
 * function provides a declarative way to define components with their
 * DI dependencies visible at definition time.
 *
 * @see {@link createComponent} - Function documentation
 * @see {@link ComponentConfig} - Configuration type
 */
export { createComponent } from "./factories/index.js";
export type { ComponentConfig } from "./factories/index.js";

/**
 * Standalone hook for resolving multiple ports at once.
 *
 * This hook provides a convenient way to resolve multiple dependencies
 * in a single call, returning a typed object with resolved services.
 *
 * @see {@link useDeps} - Hook documentation
 */
export { useDeps } from "./hooks/index.js";

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error class for React-specific container errors.
 *
 * @see {@link MissingProviderError} - Thrown when hooks are used outside Provider
 */
export { MissingProviderError } from "./errors.js";

// =============================================================================
// Re-exports from @hex-di/ports
// =============================================================================

/**
 * Re-export types from @hex-di/ports for consumer convenience.
 *
 * These types are commonly used alongside React integration types.
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";

// =============================================================================
// Re-exports from @hex-di/runtime
// =============================================================================

/**
 * Re-export types from @hex-di/runtime for consumer convenience.
 *
 * These types are commonly used alongside React integration types.
 */
export type { Container, Scope } from "@hex-di/runtime";

/**
 * Re-export error classes from @hex-di/runtime that may propagate through hooks.
 *
 * These errors can be thrown by usePort and should be handled by Error Boundaries.
 */
export {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
} from "@hex-di/runtime";
