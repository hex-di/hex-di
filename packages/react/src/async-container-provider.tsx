/**
 * AsyncContainerProvider with React Suspense and Compound Components.
 *
 * This module provides an async-aware container provider that automatically
 * initializes containers with async adapters before making them available
 * to React components.
 *
 * @packageDocumentation
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type ReactElement,
  type Context,
} from "react";
import type { Port } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";

// =============================================================================
// Types
// =============================================================================

/**
 * Initialization status for the async container.
 */
type AsyncContainerStatus = "loading" | "ready" | "error";

/**
 * Internal state for async container initialization.
 * @internal
 */
interface AsyncContainerState<TProvides extends Port<unknown, string>> {
  readonly status: AsyncContainerStatus;
  readonly container: Container<TProvides, any, "initialized"> | null;
  readonly error: Error | null;
}

/**
 * Internal context value for async container state.
 * @internal
 */
interface AsyncContainerContextValue<TProvides extends Port<unknown, string>> {
  readonly state: AsyncContainerState<TProvides>;
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
 * Props for the Loading compound component.
 */
export interface AsyncContainerLoadingProps {
  readonly children: ReactNode;
}

/**
 * Props for the Error compound component.
 * Supports both static children and render prop pattern.
 */
export interface AsyncContainerErrorProps {
  readonly children: ReactNode | ((error: Error) => ReactNode);
}

/**
 * Props for the Ready compound component.
 */
export interface AsyncContainerReadyProps {
  readonly children: ReactNode;
}

// =============================================================================
// Context Factory
// =============================================================================

/**
 * Creates isolated contexts for a typed AsyncContainerProvider instance.
 * @internal
 */
function createAsyncContainerContexts<TProvides extends Port<unknown, string>>(): {
  AsyncContainerContext: Context<AsyncContainerContextValue<TProvides> | null>;
  ResolverContext: Context<ResolverContextValue<TProvides> | null>;
} {
  const AsyncContainerContext =
    createContext<AsyncContainerContextValue<TProvides> | null>(null);
  AsyncContainerContext.displayName = "HexDI.AsyncContainerContext";

  const ResolverContext =
    createContext<ResolverContextValue<TProvides> | null>(null);
  ResolverContext.displayName = "HexDI.ResolverContext";

  return { AsyncContainerContext, ResolverContext };
}

/**
 * Internal context value for the resolver context.
 * @internal
 */
interface ResolverContextValue<TProvides extends Port<unknown, string>> {
  readonly getResolver: () => Container<TProvides, any, "initialized">;
}

// =============================================================================
// Global Contexts for Global Export
// =============================================================================

const GlobalAsyncContainerContext = createContext<AsyncContainerContextValue<
  Port<unknown, string>
> | null>(null);
GlobalAsyncContainerContext.displayName = "HexDI.GlobalAsyncContainerContext";

const GlobalResolverContext = createContext<ResolverContextValue<
  Port<unknown, string>
> | null>(null);
GlobalResolverContext.displayName = "HexDI.GlobalResolverContext";

// =============================================================================
// Compound Components
// =============================================================================

/**
 * Renders children only while container is initializing.
 *
 * @example
 * ```tsx
 * <AsyncContainerProvider container={container}>
 *   <AsyncContainerProvider.Loading>
 *     <LoadingSpinner />
 *   </AsyncContainerProvider.Loading>
 * </AsyncContainerProvider>
 * ```
 */
function Loading({ children }: AsyncContainerLoadingProps): ReactElement | null {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "AsyncContainerProvider.Loading must be used within AsyncContainerProvider"
    );
  }
  return context.state.status === "loading" ? <>{children}</> : null;
}

/**
 * Renders children only when initialization fails.
 * Supports render prop pattern for error access.
 *
 * @example Static children
 * ```tsx
 * <AsyncContainerProvider.Error>
 *   <div>Something went wrong</div>
 * </AsyncContainerProvider.Error>
 * ```
 *
 * @example Render prop pattern
 * ```tsx
 * <AsyncContainerProvider.Error>
 *   {(error) => <div>Error: {error.message}</div>}
 * </AsyncContainerProvider.Error>
 * ```
 */
function ErrorComponent({
  children,
}: AsyncContainerErrorProps): ReactElement | null {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "AsyncContainerProvider.Error must be used within AsyncContainerProvider"
    );
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
 * Renders children only when container is initialized and ready.
 * Provides the initialized container to the resolver context.
 *
 * @example
 * ```tsx
 * <AsyncContainerProvider container={container}>
 *   <AsyncContainerProvider.Ready>
 *     <MyApp />
 *   </AsyncContainerProvider.Ready>
 * </AsyncContainerProvider>
 * ```
 */
function Ready({ children }: AsyncContainerReadyProps): ReactElement | null {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "AsyncContainerProvider.Ready must be used within AsyncContainerProvider"
    );
  }

  if (context.state.status !== "ready" || !context.state.container) {
    return null;
  }

  // Provide the initialized container through resolver context
  const resolverContextValue: ResolverContextValue<Port<unknown, string>> = {
    getResolver: () => context.state.container!,
  };

  return (
    <GlobalResolverContext.Provider value={resolverContextValue}>
      {children}
    </GlobalResolverContext.Provider>
  );
}

// =============================================================================
// Default Fallback Components
// =============================================================================

/**
 * Default loading component shown when no custom loading fallback is provided.
 * @internal
 */
function DefaultLoading(): ReactElement {
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
 * Default error component shown when no custom error fallback is provided.
 * @internal
 */
function DefaultError({ error }: { error: Error }): ReactElement {
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

// =============================================================================
// Main Provider Component
// =============================================================================

/**
 * Root AsyncContainerProvider component.
 *
 * Automatically initializes the container with async adapters before
 * making it available to React components. Supports two usage modes:
 *
 * **Compound Component Mode**: Use Loading, Error, and Ready sub-components
 * for fine-grained control over what renders in each state.
 *
 * **Simple Mode**: Pass loadingFallback and errorFallback props, or use
 * defaults. Children render when container is ready.
 *
 * @internal
 */
function AsyncContainerProviderRoot<TProvides extends Port<unknown, string>>({
  container,
  children,
  loadingFallback,
  errorFallback,
}: AsyncContainerProviderProps<TProvides>): ReactElement {
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
      // Note: We don't dispose here - caller owns container lifecycle
    };
  }, [container]);

  const contextValue: AsyncContainerContextValue<TProvides> = {
    state: state as AsyncContainerState<TProvides>,
  };

  // Check for compound component children
  const childArray = React.Children.toArray(children);
  const hasCompoundChildren = childArray.some(
    (child) =>
      React.isValidElement(child) &&
      (child.type === Loading ||
        child.type === ErrorComponent ||
        child.type === Ready)
  );

  if (hasCompoundChildren) {
    // Compound Component mode - render children directly
    return (
      <GlobalAsyncContainerContext.Provider
        value={contextValue as AsyncContainerContextValue<Port<unknown, string>>}
      >
        {children}
      </GlobalAsyncContainerContext.Provider>
    );
  }

  // Simple mode - use fallback props or defaults
  const resolverContextValue: ResolverContextValue<Port<unknown, string>> = {
    getResolver: () => state.container as Container<Port<unknown, string>, any, "initialized">,
  };

  return (
    <GlobalAsyncContainerContext.Provider
      value={contextValue as AsyncContainerContextValue<Port<unknown, string>>}
    >
      {state.status === "loading" && (loadingFallback ?? <DefaultLoading />)}
      {state.status === "error" &&
        state.error &&
        (errorFallback?.(state.error) ?? <DefaultError error={state.error} />)}
      {state.status === "ready" && state.container && (
        <GlobalResolverContext.Provider value={resolverContextValue}>
          {children}
        </GlobalResolverContext.Provider>
      )}
    </GlobalAsyncContainerContext.Provider>
  );
}

// =============================================================================
// Export with Compound Components Attached
// =============================================================================

/**
 * AsyncContainerProvider component with compound components.
 *
 * Automatically initializes containers with async adapters before making
 * them available to React components. Provides a Compound Component API
 * for customizable loading, error, and ready states.
 *
 * @example Compound Component usage
 * ```tsx
 * function App() {
 *   return (
 *     <AsyncContainerProvider container={container}>
 *       <AsyncContainerProvider.Loading>
 *         <LoadingSpinner />
 *       </AsyncContainerProvider.Loading>
 *
 *       <AsyncContainerProvider.Error>
 *         {(error) => <ErrorDisplay error={error} />}
 *       </AsyncContainerProvider.Error>
 *
 *       <AsyncContainerProvider.Ready>
 *         <MyApp />
 *       </AsyncContainerProvider.Ready>
 *     </AsyncContainerProvider>
 *   );
 * }
 * ```
 *
 * @example Simple usage with fallback props
 * ```tsx
 * <AsyncContainerProvider
 *   container={container}
 *   loadingFallback={<LoadingSpinner />}
 *   errorFallback={(error) => <ErrorDisplay error={error} />}
 * >
 *   <MyApp />
 * </AsyncContainerProvider>
 * ```
 */
export const AsyncContainerProvider = Object.assign(
  AsyncContainerProviderRoot,
  {
    Loading,
    Error: ErrorComponent,
    Ready,
  }
);

/**
 * Type for the AsyncContainerProvider component with compound components.
 */
export type AsyncContainerProviderComponent<
  TProvides extends Port<unknown, string>
> = {
  (props: AsyncContainerProviderProps<TProvides>): ReactElement;
  Loading: typeof Loading;
  Error: typeof ErrorComponent;
  Ready: typeof Ready;
};

// =============================================================================
// Hook for accessing async container state (advanced usage)
// =============================================================================

/**
 * Hook to access the current async container initialization state.
 *
 * This is an advanced hook for cases where you need to react to the
 * initialization state outside of compound components.
 *
 * @returns The current initialization state
 * @throws If used outside AsyncContainerProvider
 *
 * @example
 * ```tsx
 * function InitializationStatus() {
 *   const state = useAsyncContainerState();
 *   return <div>Status: {state.status}</div>;
 * }
 * ```
 */
export function useAsyncContainerState<
  TProvides extends Port<unknown, string>
>(): AsyncContainerState<TProvides> {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "useAsyncContainerState must be used within AsyncContainerProvider"
    );
  }
  return context.state as AsyncContainerState<TProvides>;
}
