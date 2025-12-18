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
} from "react";
import type { Port } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";
import { ChildContainerBrand } from "@hex-di/runtime";
import {
  ContainerContext,
  ResolverContext,
} from "./context.js";
import {
  toRuntimeContainerWithInit,
  type RuntimeContainerRef,
  type RuntimeContainer,
} from "./internal/runtime-refs.js";

// =============================================================================
// Runtime Context Types (without phantom brands)
// =============================================================================

/**
 * Runtime container context value that matches ContainerContext's type.
 * Uses RuntimeContainerRef for bivariant storage.
 * @internal
 */
interface RuntimeContainerContextValue {
  readonly container: RuntimeContainerRef;
  readonly isChildContainer: boolean;
}

/**
 * Runtime resolver context value that matches ResolverContext's type.
 * Uses RuntimeContainerRef for bivariant storage.
 * @internal
 */
interface RuntimeResolverContextValue {
  readonly resolver: RuntimeContainerRef;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Initialization status for the async container.
 */
type AsyncContainerStatus = "loading" | "ready" | "error";

/**
 * Internal state for async container initialization.
 *
 * Uses RuntimeContainerRef for the initialized container, which is the
 * type-erased interface from @hex-di/runtime that allows storage without
 * complex generic propagation.
 *
 * @internal
 */
interface AsyncContainerState {
  readonly status: AsyncContainerStatus;
  readonly container: RuntimeContainerRef | null;
  readonly error: Error | null;
}

/**
 * Internal context value for async container state.
 * @internal
 */
interface AsyncContainerContextValue {
  readonly state: AsyncContainerState;
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
// Global Contexts for Global Export
// =============================================================================

const GlobalAsyncContainerContext = createContext<AsyncContainerContextValue | null>(null);
GlobalAsyncContainerContext.displayName = "HexDI.GlobalAsyncContainerContext";

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
function Loading({ children }: AsyncContainerLoadingProps): ReactNode {
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
}: AsyncContainerErrorProps): ReactNode {
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
function Ready({ children }: AsyncContainerReadyProps): ReactNode {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "AsyncContainerProvider.Ready must be used within AsyncContainerProvider"
    );
  }

  if (context.state.status !== "ready" || !context.state.container) {
    return null;
  }

  // The initialized container is already converted to RuntimeContainerRef.
  const containerRef = context.state.container;

  // Provide through the main ContainerContext and ResolverContext from context.tsx
  // This ensures hooks like usePort() and useContainer() work correctly.
  const mainContainerContextValue: RuntimeContainerContextValue = {
    container: containerRef,
    isChildContainer: false, // Async provider always provides root containers
  };

  const mainResolverContextValue: RuntimeResolverContextValue = {
    resolver: containerRef,
  };

  return (
    <ContainerContext.Provider value={mainContainerContextValue}>
      <ResolverContext.Provider value={mainResolverContextValue}>
        {children}
      </ResolverContext.Provider>
    </ContainerContext.Provider>
  );
}

// =============================================================================
// Default Fallback Components
// =============================================================================

/**
 * Default loading component shown when no custom loading fallback is provided.
 * @internal
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
 * Default error component shown when no custom error fallback is provided.
 * @internal
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
}: AsyncContainerProviderProps<TProvides>): ReactNode {
  // Convert container to RuntimeContainer for type-safe initialization.
  // This uses the bivariant interface from @hex-di/runtime.
  const runtimeContainer: RuntimeContainer = toRuntimeContainerWithInit(container);

  // State stores the initialized container as RuntimeContainerRef.
  const [state, setState] = useState<AsyncContainerState>({
    status: "loading",
    container: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // RuntimeContainer.initialize() returns RuntimeResolver (the initialized container)
        const initialized = await runtimeContainer.initialize();
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
  }, [runtimeContainer]);

  // Context value stores the state
  const contextValue: AsyncContainerContextValue = {
    state,
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
      <GlobalAsyncContainerContext.Provider value={contextValue}>
        {children}
      </GlobalAsyncContainerContext.Provider>
    );
  }

  // Simple mode - render based on state
  // When ready, provide contexts for hooks
  const mainContainerContextValue: RuntimeContainerContextValue | null = state.container
    ? {
        container: state.container,
        isChildContainer: false,
      }
    : null;

  const mainResolverContextValue: RuntimeResolverContextValue | null = state.container
    ? {
        resolver: state.container,
      }
    : null;

  return (
    <GlobalAsyncContainerContext.Provider value={contextValue}>
      {state.status === "loading" && (loadingFallback ?? <DefaultLoading />)}
      {state.status === "error" &&
        state.error &&
        (errorFallback?.(state.error) ?? <DefaultError error={state.error} />)}
      {state.status === "ready" && state.container && mainContainerContextValue && mainResolverContextValue && (
        <ContainerContext.Provider value={mainContainerContextValue}>
          <ResolverContext.Provider value={mainResolverContextValue}>
            {children}
          </ResolverContext.Provider>
        </ContainerContext.Provider>
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
  (props: AsyncContainerProviderProps<TProvides>): ReactNode;
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
 * @returns The current initialization state.
 *   If you need typed access to the container, use the Ready compound
 *   component which provides the container through context.
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
export function useAsyncContainerState(): AsyncContainerState {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "useAsyncContainerState must be used within AsyncContainerProvider"
    );
  }
  return context.state;
}
