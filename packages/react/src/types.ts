/**
 * Type definitions for @hex-di/react.
 *
 * This module exports the TypedReactIntegration interface which defines
 * the structure returned by createTypedHooks factory function.
 *
 * @packageDocumentation
 */

import type { ReactElement, ReactNode, ComponentType } from "react";
import type { Port, InferService } from "@hex-di/ports";
import type { Container, ContainerPhase, Scope } from "@hex-di/runtime";

// =============================================================================
// Resolver Type
// =============================================================================

/**
 * A type-safe resolver interface that abstracts over Container and Scope.
 *
 * This type captures the common resolution capability needed by React hooks
 * without exposing phase-dependent conditional types that cause union
 * incompatibility when creating `Container | Scope` unions.
 *
 * **Problem Solved:**
 * Container and Scope have phase-dependent `resolve` signatures:
 * ```typescript
 * // Initialized: resolve<P extends TProvides>(port: P) => InferService<P>
 * // Uninitialized: resolve<P extends Exclude<TProvides, TAsyncPorts>>(port: P) => InferService<P>
 * ```
 * A union of these produces "This expression is not callable" because TypeScript
 * sees two incompatible function overloads.
 *
 * **Solution:**
 * Define an interface with a single, non-conditional `resolve` signature.
 * Both Container and Scope structurally satisfy this interface when initialized.
 *
 * **Design Decision:**
 * We use the most permissive signature (all TProvides resolvable) because:
 * 1. React hooks are typically used with initialized containers
 * 2. AsyncContainerProvider ensures initialization before children render
 * 3. For uninitialized usage, runtime errors provide the safety net
 *
 * @typeParam TProvides - Union of Port types that can be resolved
 *
 * @remarks
 * This type is structural - any object with matching methods satisfies it.
 * No type casts are needed when assigning Container or Scope to Resolver.
 */
export interface Resolver<TProvides extends Port<unknown, string>> {
  /**
   * Resolves a service instance for the given port synchronously.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   */
  resolve<P extends TProvides>(port: P): InferService<P>;

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   */
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * @returns A new resolver (Scope) for the child scope
   */
  createScope(): Resolver<TProvides>;

  /**
   * Disposes the resolver and all its cached instances.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * Finalizers are called in LIFO order (last created first disposed).
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the resolver has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   */
  readonly isDisposed: boolean;
}

/**
 * Type-level utility to extract a Resolver type from a Container or Scope.
 *
 * Uses conditional type inference to extract TProvides and return
 * a Resolver interface that both Container and Scope can satisfy.
 *
 * @typeParam T - A Container or Scope type
 * @returns Resolver<TProvides> if T is a valid Container or Scope, never otherwise
 *
 * @example
 * ```typescript
 * type AppContainer = Container<typeof LoggerPort | typeof DbPort>;
 * type AppResolver = ToResolver<AppContainer>;
 * // Resolver<typeof LoggerPort | typeof DbPort>
 * ```
 */
export type ToResolver<T> =
  T extends Container<infer P, infer _TAsync, infer _TPhase>
    ? Resolver<P>
    : T extends Scope<infer P, infer _TAsync, infer _TPhase>
      ? Resolver<P>
      : never;

// =============================================================================
// Provider Component Props Types
// =============================================================================

/**
 * Props for the ContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface ContainerProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The pre-created Container instance to provide to the React tree.
   */
  readonly container: Container<TProvides>;

  /**
   * React children that will have access to the container via hooks.
   */
  readonly children: ReactNode;
}

/**
 * Props for the ScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @remarks
 * Accepts Resolver<TProvides> which is satisfied by both Container and Scope.
 * This allows passing the result of useScope() directly to ScopeProvider.
 */
export interface ScopeProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The externally managed resolver (scope or container) to provide to the React tree.
   * Accepts any Resolver<TProvides> - typically a Scope from useScope() or createScope().
   */
  readonly scope: Resolver<TProvides>;

  /**
   * React children that will resolve services from this scope.
   */
  readonly children: ReactNode;
}

/**
 * Props for the AutoScopeProvider component.
 */
export interface AutoScopeProviderProps {
  /**
   * React children that will resolve services from the auto-managed scope.
   */
  readonly children: ReactNode;
}

/**
 * Props for the AsyncContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface AsyncContainerProviderProps<
  TProvides extends Port<unknown, string>
> {
  /**
   * The uninitialized Container instance to initialize and provide.
   * Must be created with createContainer() and NOT yet initialized.
   */
  readonly container: Container<TProvides, any, "uninitialized">;

  /**
   * React children - can be compound components or regular children.
   */
  readonly children: ReactNode;

  /**
   * Optional loading fallback for simple mode.
   * Used when children are not compound components.
   */
  readonly loadingFallback?: ReactNode;

  /**
   * Optional error fallback for simple mode.
   * Used when children are not compound components.
   */
  readonly errorFallback?: (error: Error) => ReactNode;
}

/**
 * Props for the AsyncContainerProvider.Loading compound component.
 */
export interface AsyncContainerLoadingProps {
  readonly children: ReactNode;
}

/**
 * Props for the AsyncContainerProvider.Error compound component.
 * Supports both static children and render prop pattern.
 */
export interface AsyncContainerErrorProps {
  readonly children: ReactNode | ((error: Error) => ReactNode);
}

/**
 * Props for the AsyncContainerProvider.Ready compound component.
 */
export interface AsyncContainerReadyProps {
  readonly children: ReactNode;
}

/**
 * Type for the AsyncContainerProvider component with compound components.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface AsyncContainerProviderComponent<
  TProvides extends Port<unknown, string>
> {
  (props: AsyncContainerProviderProps<TProvides>): ReactElement;
  Loading: ComponentType<AsyncContainerLoadingProps>;
  Error: ComponentType<AsyncContainerErrorProps>;
  Ready: ComponentType<AsyncContainerReadyProps>;
}

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
  readonly ContainerProvider: (
    props: ContainerProviderProps<TProvides>
  ) => ReactElement;

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
  readonly ScopeProvider: (
    props: ScopeProviderProps<TProvides>
  ) => ReactElement;

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
  readonly AutoScopeProvider: (props: AutoScopeProviderProps) => ReactElement;

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
  readonly AsyncContainerProvider: AsyncContainerProviderComponent<TProvides>;

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
  readonly usePortOptional: <P extends TProvides>(
    port: P
  ) => InferService<P> | undefined;

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
