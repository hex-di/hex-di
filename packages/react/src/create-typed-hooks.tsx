/**
 * Factory function for creating typed React integration.
 *
 * The createTypedHooks factory creates an isolated set of React components
 * and hooks bound to a specific TProvides type parameter. This enables
 * type-safe port resolution with compile-time validation.
 *
 * @packageDocumentation
 */

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  type ReactNode,
  type Context,
} from "react";
import type { Port, InferService } from "@hex-di/ports";
import type {
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
} from "./types.js";
import { MissingProviderError } from "./errors.js";

// =============================================================================
// Async Container Types
// =============================================================================

/**
 * Initialization status for the async container.
 * @internal
 */
type AsyncContainerStatus = "loading" | "ready" | "error";

/**
 * Internal state for async container initialization.
 * Uses ContainerLike to accept both root and child containers.
 * @internal
 */
interface AsyncContainerState<TProvides extends Port<unknown, string>> {
  readonly status: AsyncContainerStatus;
  readonly container: ContainerLike<TProvides> | null;
  readonly error: Error | null;
}

/**
 * Internal context value for async container state.
 * @internal
 */
interface AsyncContainerContextValue<TProvides extends Port<unknown, string>> {
  readonly state: AsyncContainerState<TProvides>;
}

// =============================================================================
// Container Type Detection
// =============================================================================

/**
 * Structural type representing what ContainerProvider needs from a container.
 *
 * With the unified Container type, root and child containers have different
 * conditional properties (initialize, parent). This structural type includes
 * only the common properties that both container types share, allowing
 * ContainerProvider to accept either.
 *
 * @internal
 */
interface ContainerLike<TProvides extends Port<unknown, string>> {
  resolve<P extends TProvides>(port: P): InferService<P>;
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;
  createScope(): Resolver<TProvides>;
  dispose(): Promise<void>;
  has(port: Port<unknown, string>): boolean;
  readonly isDisposed: boolean;
  readonly isInitialized: boolean;
  // parent property is accessed via try/catch for child detection
  readonly parent?: unknown;
}

/**
 * Checks if the provided container is a child container.
 *
 * With unified Container type, child containers are distinguished by
 * having a `parent` property that doesn't throw. Root containers' `parent`
 * property throws when accessed.
 *
 * @param container - The container to check
 * @returns true if the container is a child container, false otherwise
 *
 * @internal
 */
function isChildContainer<TProvides extends Port<unknown, string>>(
  container: ContainerLike<TProvides>
): boolean {
  // With unified Container type, check if parent access throws
  try {
    const _parent = container.parent;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Internal Context Types
// =============================================================================

/**
 * Internal context value for the container context.
 *
 * Uses ContainerLike structural type to accept both root and child containers.
 * Also supports uninitialized containers (from ContainerProvider) and
 * initialized containers (from AsyncContainerProvider).
 *
 * @internal
 */
interface ContainerContextValue<TProvides extends Port<unknown, string>> {
  readonly container: ContainerLike<TProvides>;
  readonly isChildContainer: boolean;
}

/**
 * Internal context value for the resolver context.
 *
 * Uses a getter function pattern to ensure React StrictMode compatibility.
 * Children call getResolver() at resolution time, not at render capture time,
 * ensuring they always get the current (non-disposed) scope.
 *
 * The Resolver type is a structural interface that both Container and Scope
 * satisfy, avoiding the union incompatibility issues with conditional resolve
 * signatures.
 *
 * @internal
 */
interface ResolverContextValue<TProvides extends Port<unknown, string>> {
  /**
   * Returns the current resolver (Container or Scope).
   * Called at resolution time to ensure freshness after StrictMode remounts.
   */
  readonly getResolver: () => Resolver<TProvides>;
}

/**
 * Bivariant internal interface for container/scope method extraction.
 *
 * Uses property function syntax to achieve bivariance, allowing any
 * Container, ChildContainer, or Scope to be extracted without type casts
 * at call sites. This is the SOLE location of type boundary handling.
 *
 * @internal
 */
interface ResolvableMethods {
  readonly resolve: (port: Port<unknown, string>) => unknown;
  readonly resolveAsync: (port: Port<unknown, string>) => Promise<unknown>;
  readonly createScope: () => ResolvableMethods;
  readonly dispose: () => Promise<void>;
  readonly isDisposed: boolean;
}

/**
 * Extracts methods from a container/scope, creating a ResolvableMethods object.
 *
 * This is the SOLE location of type boundary handling in create-typed-hooks.
 * The single cast is safe because Container, ChildContainer, and Scope all
 * have these methods at runtime.
 *
 * @internal
 */
function extractMethods(resolver: unknown): ResolvableMethods {
  // Safety: resolver is always a Container, ChildContainer, or Scope
  // All of these have the methods we're extracting at runtime.
  const r = resolver as ResolvableMethods;
  return {
    resolve: port => r.resolve(port),
    resolveAsync: port => r.resolveAsync(port),
    createScope: () => extractMethods(r.createScope()),
    dispose: () => r.dispose(),
    get isDisposed() {
      return r.isDisposed;
    },
  };
}

/**
 * Converts a container/scope to a typed Resolver.
 *
 * This function bridges the bivariant ResolvableMethods (which returns unknown)
 * to the typed Resolver<TProvides> (which returns typed results).
 *
 * @internal
 */
function toResolver<TProvides extends Port<unknown, string>>(
  container: unknown
): Resolver<TProvides> {
  const methods = extractMethods(container);
  return {
    resolve: <P extends TProvides>(port: P) => methods.resolve(port) as InferService<P>,
    resolveAsync: <P extends TProvides>(port: P) =>
      methods.resolveAsync(port) as Promise<InferService<P>>,
    createScope: () => toResolver<TProvides>(methods.createScope()),
    dispose: () => methods.dispose(),
    get isDisposed() {
      return methods.isDisposed;
    },
  };
}

// =============================================================================
// createTypedHooks Factory
// =============================================================================

/**
 * Creates a typed React integration with components and hooks bound to TProvides.
 *
 * This factory function creates an isolated set of React context, provider
 * components, and hooks that are bound to the TProvides type parameter.
 * Each call to createTypedHooks creates a new, independent context, ensuring
 * that multiple integrations can coexist in the same application.
 *
 * @typeParam TProvides - Union of Port types available for resolution.
 *   This type is captured at factory creation time and used to constrain
 *   the usePort and usePortOptional hooks.
 *
 * @returns A TypedReactIntegration object containing all provider components and hooks
 *
 * @remarks
 * - Each call creates a new, isolated context (no global state)
 * - Multiple integrations can coexist without interference
 * - SSR compatible - no global state or singleton patterns
 * - TProvides type is captured at creation time, not runtime
 *
 * @see {@link TypedReactIntegration} - Return type definition
 *
 * @example Basic usage
 * ```typescript
 * import { createTypedHooks } from '@hex-di/react';
 *
 * // Define your port union type
 * type AppPorts = typeof LoggerPort | typeof DatabasePort;
 *
 * // Create typed integration
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
 * @example Multiple isolated integrations
 * ```typescript
 * // Create separate integrations for different parts of your app
 * const AppIntegration = createTypedHooks<AppPorts>();
 * const AdminIntegration = createTypedHooks<AdminPorts>();
 *
 * // They are completely isolated - no context leakage
 * ```
 */
export function createTypedHooks<
  TProvides extends Port<unknown, string>,
>(): TypedReactIntegration<TProvides> {
  // ==========================================================================
  // Create isolated contexts for this factory instance
  // ==========================================================================

  /**
   * Context for the root container.
   * Created fresh for each createTypedHooks call to ensure isolation.
   */
  const ContainerContext: Context<ContainerContextValue<TProvides> | null> =
    createContext<ContainerContextValue<TProvides> | null>(null);
  ContainerContext.displayName = "HexDI.ContainerContext";

  /**
   * Context for the current resolver (Container or Scope).
   * Created fresh for each createTypedHooks call to ensure isolation.
   */
  const ResolverContext: Context<ResolverContextValue<TProvides> | null> =
    createContext<ResolverContextValue<TProvides> | null>(null);
  ResolverContext.displayName = "HexDI.ResolverContext";

  // ==========================================================================
  // Provider Components
  // ==========================================================================

  /**
   * ContainerProvider implementation for this typed integration.
   */
  function ContainerProvider({
    container,
    children,
  }: ContainerProviderProps<TProvides>): ReactNode {
    // Detect nested ContainerProvider
    const existingContext = useContext(ContainerContext);

    // Check if the new container is a child container.
    // With unified Container type, child containers are distinguished by
    // having a `parent` property that doesn't throw.
    let containerIsChild = false;
    try {
      const _parent = (container as { parent?: unknown }).parent;
      containerIsChild = true;
    } catch {
      containerIsChild = false;
    }

    // If there's an existing context and the new container is NOT a child container,
    // this is an error (cannot nest root containers)
    if (existingContext !== null && !containerIsChild) {
      throw new MissingProviderError(
        "ContainerProvider",
        "ContainerProvider (nested providers not allowed)"
      );
    }

    // Create context values
    const containerContextValue: ContainerContextValue<TProvides> = {
      container,
      isChildContainer: containerIsChild,
    };

    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => toResolver<TProvides>(container),
    };

    return (
      <ContainerContext.Provider value={containerContextValue}>
        <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
      </ContainerContext.Provider>
    );
  }

  /**
   * ScopeProvider implementation for this typed integration.
   */
  function ScopeProvider({ scope, children }: ScopeProviderProps<TProvides>): ReactNode {
    // Create resolver context value with the provided scope
    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => scope,
    };

    return (
      <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
    );
  }

  /**
   * AutoScopeProvider implementation for this typed integration.
   *
   * Uses useRef instead of useState to handle React StrictMode correctly.
   * In StrictMode, components mount/unmount/remount, but useState caches
   * the scope while useEffect cleanup disposes it. Using useRef with
   * isDisposed check allows recreation of disposed scopes.
   */
  function AutoScopeProvider({ children }: AutoScopeProviderProps): ReactNode {
    // Get current resolver context - must be inside ContainerProvider
    const resolverContext = useContext(ResolverContext);

    if (resolverContext === null) {
      throw new MissingProviderError("AutoScopeProvider", "ContainerProvider");
    }

    // Use ref to track the scope - allows recreation if disposed (StrictMode)
    // Use Resolver<TProvides> since createScope() returns Resolver
    const scopeRef = useRef<Resolver<TProvides> | null>(null);

    // Create or recreate scope if needed during initial render
    // This handles StrictMode where scope may have been disposed during unmount
    if (scopeRef.current === null || scopeRef.current.isDisposed) {
      scopeRef.current = resolverContext.getResolver().createScope();
    }

    // Dispose scope on unmount using useEffect (SSR compatible)
    useEffect(() => {
      return () => {
        // Only dispose if scope exists and not already disposed
        if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
          // Note: dispose is async but we don't await in cleanup
          // This is intentional - React cleanup functions should be sync
          void scopeRef.current.dispose();
        }
      };
    }, []);

    // CRITICAL: Getter function always returns current scope from ref
    // Children call getResolver() at resolution time (not render time),
    // ensuring they always get the CURRENT scope after StrictMode remounts
    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => {
        // Recreate scope if it was disposed (StrictMode unmount/remount)
        if (scopeRef.current === null || scopeRef.current.isDisposed) {
          scopeRef.current = resolverContext.getResolver().createScope();
        }
        return scopeRef.current;
      },
    };

    return (
      <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
    );
  }

  // ==========================================================================
  // AsyncContainerProvider with Compound Components
  // ==========================================================================

  /**
   * Context for async container initialization state.
   */
  const AsyncContainerContext: Context<AsyncContainerContextValue<TProvides> | null> =
    createContext<AsyncContainerContextValue<TProvides> | null>(null);
  AsyncContainerContext.displayName = "HexDI.AsyncContainerContext";

  /**
   * Loading compound component - renders children while initializing.
   */
  function Loading({ children }: AsyncContainerLoadingProps): ReactNode {
    const context = useContext(AsyncContainerContext);
    if (!context) {
      throw new Error("AsyncContainerProvider.Loading must be used within AsyncContainerProvider");
    }
    return context.state.status === "loading" ? <>{children}</> : null;
  }

  /**
   * Error compound component - renders children when initialization fails.
   */
  function ErrorComponent({ children }: AsyncContainerErrorProps): ReactNode {
    const context = useContext(AsyncContainerContext);
    if (!context) {
      throw new Error("AsyncContainerProvider.Error must be used within AsyncContainerProvider");
    }

    if (context.state.status !== "error" || !context.state.error) {
      return null;
    }

    if (typeof children === "function") {
      return <>{children(context.state.error)}</>;
    }
    return <>{children}</>;
  }

  /**
   * Ready compound component - renders children when container is initialized.
   */
  function Ready({ children }: AsyncContainerReadyProps): ReactNode {
    const context = useContext(AsyncContainerContext);
    if (!context) {
      throw new Error("AsyncContainerProvider.Ready must be used within AsyncContainerProvider");
    }

    if (context.state.status !== "ready" || !context.state.container) {
      return null;
    }

    // Provide both container context (for useContainer) and resolver context (for usePort)
    const initContainer = context.state.container;
    const containerIsChild = isChildContainer(initContainer);
    const containerContextValue: ContainerContextValue<TProvides> = {
      container: initContainer,
      isChildContainer: containerIsChild,
    };

    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => toResolver<TProvides>(initContainer),
    };

    return (
      <ContainerContext.Provider value={containerContextValue}>
        <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
      </ContainerContext.Provider>
    );
  }

  /**
   * Default loading component for simple mode.
   */
  function DefaultLoading(): ReactNode {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        Initializing...
      </div>
    );
  }

  /**
   * Default error component for simple mode.
   */
  function DefaultError({ error }: { error: Error }): ReactNode {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          color: "red",
        }}
      >
        Initialization Error: {error.message}
      </div>
    );
  }

  /**
   * AsyncContainerProvider root implementation.
   */
  function AsyncContainerProviderRoot({
    container,
    children,
    loadingFallback,
    errorFallback,
  }: AsyncContainerProviderProps<TProvides>): ReactNode {
    const [state, setState] = useState<AsyncContainerState<TProvides>>({
      status: "loading",
      container: null,
      error: null,
    });

    useEffect(() => {
      let mounted = true;

      async function initialize() {
        try {
          const initialized = await container.initialize();
          if (mounted) {
            setState({
              status: "ready",
              container: initialized,
              error: null,
            });
          }
        } catch (error) {
          if (mounted) {
            setState({
              status: "error",
              container: null,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        }
      }

      void initialize();

      return () => {
        mounted = false;
      };
    }, [container]);

    const contextValue: AsyncContainerContextValue<TProvides> = { state };

    // Check for compound component children
    const childArray = React.Children.toArray(children);
    const hasCompoundChildren = childArray.some(
      child =>
        React.isValidElement(child) &&
        (child.type === Loading || child.type === ErrorComponent || child.type === Ready)
    );

    if (hasCompoundChildren) {
      // Compound Component mode
      return (
        <AsyncContainerContext.Provider value={contextValue}>
          {children}
        </AsyncContainerContext.Provider>
      );
    }

    // Simple mode - provide both container and resolver contexts when ready
    const simpleContainer = state.container;
    const simpleContainerIsChild = simpleContainer ? isChildContainer(simpleContainer) : false;
    const containerContextValue: ContainerContextValue<TProvides> = {
      container: simpleContainer!,
      isChildContainer: simpleContainerIsChild,
    };

    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => toResolver<TProvides>(simpleContainer),
    };

    return (
      <AsyncContainerContext.Provider value={contextValue}>
        {state.status === "loading" && (loadingFallback ?? <DefaultLoading />)}
        {state.status === "error" &&
          state.error &&
          (errorFallback?.(state.error) ?? <DefaultError error={state.error} />)}
        {state.status === "ready" && state.container && (
          <ContainerContext.Provider value={containerContextValue}>
            <ResolverContext.Provider value={resolverContextValue}>
              {children}
            </ResolverContext.Provider>
          </ContainerContext.Provider>
        )}
      </AsyncContainerContext.Provider>
    );
  }

  // Assemble AsyncContainerProvider with compound components
  const AsyncContainerProvider: AsyncContainerProviderComponent<TProvides> = Object.assign(
    AsyncContainerProviderRoot,
    {
      Loading,
      Error: ErrorComponent,
      Ready,
    }
  );

  // ==========================================================================
  // Hooks
  // ==========================================================================

  /**
   * useContainer hook implementation for this typed integration.
   *
   * Returns the nearest Container or ChildContainer from ContainerContext.
   * When nested inside a ContainerProvider with a ChildContainer, returns
   * that child container. Uses Resolver interface for type compatibility.
   */
  function useContainer(): Resolver<TProvides> {
    const context = useContext(ContainerContext);

    if (context === null) {
      throw new MissingProviderError("useContainer", "ContainerProvider");
    }

    // Return the nearest container (may be root Container or ChildContainer)
    // Both Container and ChildContainer satisfy the Resolver interface.
    // toResolver bridges the container to Resolver<TProvides>.
    return toResolver<TProvides>(context.container);
  }

  /**
   * usePort hook implementation for this typed integration.
   */
  function usePort<P extends TProvides>(port: P): InferService<P> {
    const context = useContext(ResolverContext);

    if (context === null) {
      throw new MissingProviderError("usePort", "ContainerProvider");
    }

    // Call getResolver() to get CURRENT scope at resolution time
    // This ensures StrictMode remounts get the fresh scope, not a stale reference
    return context.getResolver().resolve(port);
  }

  /**
   * usePortOptional hook implementation for this typed integration.
   */
  function usePortOptional<P extends TProvides>(port: P): InferService<P> | undefined {
    const context = useContext(ResolverContext);

    // Return undefined if outside provider
    if (context === null) {
      return undefined;
    }

    // Attempt resolution, catch any errors and return undefined
    try {
      // Call getResolver() to get CURRENT scope at resolution time
      return context.getResolver().resolve(port) as InferService<P>;
    } catch {
      return undefined;
    }
  }

  /**
   * useScope hook implementation for this typed integration.
   *
   * Handles React StrictMode by checking isDisposed and recreating
   * the scope if it was disposed during the unmount phase.
   */
  function useScope(): Resolver<TProvides> {
    const context = useContext(ResolverContext);

    if (context === null) {
      throw new MissingProviderError("useScope", "ContainerProvider");
    }

    // Use ref to create scope lazily and preserve across renders
    const scopeRef = useRef<Resolver<TProvides> | null>(null);

    // Create or recreate scope if needed (handles StrictMode)
    if (scopeRef.current === null || scopeRef.current.isDisposed) {
      // Call getResolver() to get CURRENT resolver at creation time
      scopeRef.current = context.getResolver().createScope();
    }

    // Dispose scope on unmount
    useEffect(() => {
      return () => {
        // Only dispose if scope exists and not already disposed
        if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
          // Note: dispose is async but we don't await in cleanup
          void scopeRef.current.dispose();
        }
      };
    }, []);

    return scopeRef.current;
  }

  // ==========================================================================
  // Return the typed integration object
  // ==========================================================================

  return {
    ContainerProvider,
    ScopeProvider,
    AutoScopeProvider,
    AsyncContainerProvider,
    usePort,
    usePortOptional,
    useContainer,
    useScope,
  };
}
