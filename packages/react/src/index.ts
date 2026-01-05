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
 * - **Provider Components**: HexDiContainerProvider for root container access,
 *   HexDiScopeProvider for manual scope management, HexDiAutoScopeProvider for automatic
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
 * const { HexDiContainerProvider, usePort } = createTypedHooks<AppPorts>();
 *
 * // Use in your React app
 * function App() {
 *   return (
 *     <HexDiContainerProvider container={container}>
 *       <MyComponent />
 *     </HexDiContainerProvider>
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
 *     <HexDiAutoScopeProvider>
 *       <UserProfile />
 *       <UserSettings />
 *     </HexDiAutoScopeProvider>
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
 * @see {@link HexDiContainerProviderProps} - Props for HexDiContainerProvider
 * @see {@link HexDiScopeProviderProps} - Props for HexDiScopeProvider
 * @see {@link HexDiAutoScopeProviderProps} - Props for HexDiAutoScopeProvider
 * @see {@link Resolver} - Type-safe resolver interface for Container/Scope
 * @see {@link ToResolver} - Utility to extract Resolver from Container/Scope
 */
export type {
  TypedReactIntegration,
  HexDiContainerProviderProps,
  HexDiScopeProviderProps,
  HexDiAutoScopeProviderProps,
  HexDiAsyncContainerProviderProps,
  HexDiAsyncContainerProviderComponent,
  HexDiAsyncContainerLoadingProps,
  HexDiAsyncContainerErrorProps,
  HexDiAsyncContainerReadyProps,
  LazyContainerProviderProps,
  LazyContainerProviderComponent,
  LazyContainerLoadingProps,
  LazyContainerErrorProps,
  LazyContainerReadyProps,
  LazyContainerStatus,
  Resolver,
  ToResolver,
} from "./types/index.js";

// =============================================================================
// Global Provider Components
// =============================================================================

/**
 * Global HexDiContainerProvider component that uses the shared React context.
 *
 * This is exported for use cases where a global provider is needed, such as
 * testing utilities. For application code, prefer using `createTypedHooks()`
 * which provides better type safety.
 *
 * @see {@link HexDiContainerProvider} - Provider component documentation
 * @see {@link HexDiScopeProvider} - Manual scope management
 * @see {@link HexDiAutoScopeProvider} - Automatic scope lifecycle
 */
export {
  HexDiContainerProvider,
  HexDiScopeProvider,
  HexDiAutoScopeProvider,
} from "./providers/index.js";

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
 * Global HexDiAsyncContainerProvider component for async container initialization.
 *
 * This is exported for use cases where a global provider is needed, such as
 * testing utilities. For application code, prefer using `createTypedHooks()`
 * which provides better type safety.
 *
 * @see {@link HexDiAsyncContainerProvider} - Provider component documentation
 */
export { HexDiAsyncContainerProvider, useAsyncContainerState } from "./providers/index.js";

/**
 * HexDiLazyContainerProvider for deferred graph loading.
 *
 * This provider handles lazy-loaded child containers, showing loading/error/ready
 * states. Useful for:
 * - Code Splitting: Load plugin graphs on demand
 * - Optional Features: Load feature graphs only when needed
 * - Progressive Loading: Defer non-critical services
 *
 * @see {@link HexDiLazyContainerProvider} - Provider component documentation
 * @see {@link LazyContainerProviderProps} - Props type
 * @see {@link useLazyContainerState} - Hook for accessing loading state
 */
export { HexDiLazyContainerProvider, useLazyContainerState } from "./providers/index.js";
export type { UseLazyContainerStateResult } from "./providers/index.js";

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
export { useScope } from "./hooks/index.js";

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
export type { Container, Scope, LazyContainer } from "@hex-di/runtime";

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
