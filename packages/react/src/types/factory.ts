/**
 * TypedReactIntegration type for @hex-di/react.
 *
 * This module exports the TypedReactIntegration interface which defines
 * the structure returned by createTypedHooks factory function.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { Port, InferService } from "@hex-di/ports";
import type { Resolver } from "./core.js";
import type {
  HexDiContainerProviderProps,
  HexDiScopeProviderProps,
  HexDiAutoScopeProviderProps,
  HexDiAsyncContainerProviderComponent,
} from "./provider-props.js";

// =============================================================================
// TypedReactIntegration Type
// =============================================================================

/**
 * The return type of the createTypedHooks factory function.
 *
 * This interface defines all the components and hooks provided by a typed
 * React integration instance. Each member is bound to the TProvides type
 * parameter, ensuring compile-time type safety for port resolution.
 *
 * @typeParam TProvides - Union of Port types available for resolution.
 *   All hooks are constrained to only accept ports in this union.
 *
 * @remarks
 * - Each createTypedHooks call creates a new, isolated context
 * - Multiple integrations can coexist in the same application
 * - The TProvides type is captured at factory creation time
 * - No global state is used (SSR compatible)
 *
 * @see {@link createTypedHooks} - Factory function that creates this integration
 *
 * @example Basic usage
 * ```typescript
 * import { createTypedHooks, TypedReactIntegration } from '@hex-di/react';
 *
 * // Define your port union type
 * type AppPorts = typeof LoggerPort | typeof DatabasePort;
 *
 * // Create typed integration
 * const { ContainerProvider, usePort } = createTypedHooks<AppPorts>();
 *
 * // Or explicitly type the integration
 * const integration: TypedReactIntegration<AppPorts> = createTypedHooks<AppPorts>();
 * ```
 */
export interface TypedReactIntegration<TProvides extends Port<unknown, string>> {
  // ===========================================================================
  // Provider Components
  // ===========================================================================

  /**
   * Provider component that makes a DI container available to React components.
   *
   * ContainerProvider establishes the root of a DI tree in React. All hooks
   * (usePort, useContainer, etc.) require a ContainerProvider ancestor.
   *
   * @param props - The provider props including container and children
   * @returns A React element that provides the container context
   *
   * @throws {MissingProviderError} If nested inside another ContainerProvider
   *
   * @example
   * ```tsx
   * function App() {
   *   return (
   *     <ContainerProvider container={container}>
   *       <MyComponent />
   *     </ContainerProvider>
   *   );
   * }
   * ```
   */
  readonly ContainerProvider: (props: HexDiContainerProviderProps<TProvides>) => ReactNode;

  /**
   * Provider component that overrides the resolver context with a manual scope.
   *
   * ScopeProvider allows you to inject an externally managed scope into the
   * React tree. This is useful when you need manual control over scope lifecycle.
   *
   * @param props - The provider props including scope and children
   * @returns A React element that provides the scope context
   *
   * @remarks
   * - Does NOT dispose scope on unmount - caller owns the scope lifecycle
   * - For automatic scope lifecycle, use AutoScopeProvider instead
   *
   * @example
   * ```tsx
   * function RequestHandler() {
   *   const [scope] = useState(() => container.createScope());
   *   return (
   *     <ScopeProvider scope={scope}>
   *       <RequestContent />
   *     </ScopeProvider>
   *   );
   * }
   * ```
   */
  readonly ScopeProvider: (props: HexDiScopeProviderProps<TProvides>) => ReactNode;

  /**
   * Provider component that automatically manages scope lifecycle.
   *
   * AutoScopeProvider creates a new scope on mount and disposes it on unmount,
   * tying the scope lifecycle to the React component lifecycle.
   *
   * @param props - The provider props containing children
   * @returns A React element that provides the auto-managed scope context
   *
   * @throws {MissingProviderError} If used outside a ContainerProvider
   *
   * @remarks
   * - Creates scope from current resolver on mount
   * - Automatically disposes scope on unmount
   * - Supports nesting for nested scope hierarchies
   *
   * @example
   * ```tsx
   * function UserPage() {
   *   return (
   *     <AutoScopeProvider>
   *       <UserProfile />
   *     </AutoScopeProvider>
   *   );
   * }
   * ```
   */
  readonly AutoScopeProvider: (props: HexDiAutoScopeProviderProps) => ReactNode;

  /**
   * Provider component that initializes async adapters before making
   * the container available to React components.
   *
   * AsyncContainerProvider automatically calls container.initialize() and
   * provides compound components for customizable loading, error, and ready
   * states.
   *
   * @param props - The provider props including container and children
   * @returns A React element that manages async initialization
   *
   * @remarks
   * - Automatically initializes the container with async adapters
   * - Supports Compound Component pattern (Loading, Error, Ready)
   * - Supports simple mode with loadingFallback and errorFallback props
   * - After initialization, all ports (sync and async) resolve synchronously
   *
   * @example Compound Component usage
   * ```tsx
   * <AsyncContainerProvider container={container}>
   *   <AsyncContainerProvider.Loading>
   *     <LoadingSpinner />
   *   </AsyncContainerProvider.Loading>
   *   <AsyncContainerProvider.Error>
   *     {(error) => <ErrorDisplay error={error} />}
   *   </AsyncContainerProvider.Error>
   *   <AsyncContainerProvider.Ready>
   *     <MyApp />
   *   </AsyncContainerProvider.Ready>
   * </AsyncContainerProvider>
   * ```
   */
  readonly AsyncContainerProvider: HexDiAsyncContainerProviderComponent<TProvides>;

  // ===========================================================================
  // Resolution Hooks
  // ===========================================================================

  /**
   * Hook that resolves a service instance from the nearest resolver context.
   *
   * This hook provides type-safe service resolution with compile-time validation
   * that the requested port is in the TProvides union.
   *
   * @typeParam P - The specific Port being resolved (must extend TProvides)
   * @param port - The port token to resolve
   * @returns The service instance with the correct type inferred from the port
   *
   * @throws {MissingProviderError} If called outside a ContainerProvider tree
   * @throws {DisposedScopeError} If the container or scope has been disposed
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   *
   * @example
   * ```tsx
   * function MyComponent() {
   *   const logger = usePort(LoggerPort);
   *   logger.log('Component rendered');
   *   return <div>Hello</div>;
   * }
   * ```
   */
  readonly usePort: <P extends TProvides>(port: P) => InferService<P>;

  /**
   * Hook that optionally resolves a service instance from the nearest resolver context.
   *
   * Unlike usePort, this hook returns undefined instead of throwing when:
   * - Called outside a ContainerProvider tree
   * - Resolution fails for any reason
   *
   * @typeParam P - The specific Port being resolved (must extend TProvides)
   * @param port - The port token to resolve
   * @returns The service instance if resolution succeeds, undefined otherwise
   *
   * @remarks
   * - Never throws - returns undefined on any failure
   * - Useful for optional features that gracefully degrade
   *
   * @example
   * ```tsx
   * function MyComponent() {
   *   const analytics = usePortOptional(AnalyticsPort);
   *   analytics?.trackEvent('rendered');
   *   return <div>Hello</div>;
   * }
   * ```
   */
  readonly usePortOptional: <P extends TProvides>(port: P) => InferService<P> | undefined;

  // ===========================================================================
  // Container/Scope Access Hooks
  // ===========================================================================

  /**
   * Hook that returns the root Container from the nearest ContainerProvider.
   *
   * Use this hook when you need direct access to the container for advanced
   * operations like creating manual scopes or accessing the dispose method.
   *
   * @returns A Resolver interface for service resolution
   *
   * @throws {MissingProviderError} If called outside a ContainerProvider
   *
   * @remarks
   * - For service resolution, prefer usePort instead
   * - This is an escape hatch for advanced scenarios
   * - Returns Resolver<TProvides> which provides resolve, resolveAsync,
   *   createScope, and dispose methods without conditional type complexity.
   *
   * @example
   * ```tsx
   * function RequestHandler() {
   *   const container = useContainer();
   *   const [scope] = useState(() => container.createScope());
   *   // ...
   * }
   * ```
   */
  readonly useContainer: () => Resolver<TProvides>;

  /**
   * Hook that creates a scope and ties its lifecycle to the component.
   *
   * This hook creates a new scope from the current resolver and automatically
   * disposes it when the component unmounts.
   *
   * @returns A Resolver instance (the scope) that is disposed when the component unmounts
   *
   * @throws {MissingProviderError} If called outside a ContainerProvider tree
   *
   * @remarks
   * - The scope is created once and preserved across re-renders
   * - Each component instance gets its own scope
   * - The scope is disposed on unmount via useEffect cleanup
   * - Returns Resolver<TProvides> which provides resolve, resolveAsync, createScope, and dispose
   *
   * @example
   * ```tsx
   * function ScopedSection() {
   *   const scope = useScope();
   *   // Use scope.resolve() or pass to ScopeProvider
   *   return <div>{scope.resolve(LoggerPort).name}</div>;
   * }
   * ```
   */
  readonly useScope: () => Resolver<TProvides>;
}
