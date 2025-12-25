/**
 * LazyContainerProvider with Compound Components.
 *
 * This module provides a lazy-loading container provider that handles deferred
 * graph loading via LazyContainer. The graph is loaded on-demand, showing
 * loading/error/ready states.
 *
 * @packageDocumentation
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Port } from "@hex-di/ports";
import { ContainerContext } from "../context/container-context.js";
import { ResolverContext } from "../context/resolver-context.js";
import {
  toRuntimeLazyContainer,
  type RuntimeContainerRef,
  type RuntimeLazyContainer,
} from "../internal/runtime-refs.js";
import type {
  LazyContainerProviderProps,
  LazyContainerLoadingProps,
  LazyContainerErrorProps,
  LazyContainerReadyProps,
  LazyContainerStatus,
} from "../types/lazy-container-props.js";

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
 * Internal state for lazy container loading.
 * @internal
 */
interface LazyContainerState {
  readonly status: LazyContainerStatus;
  readonly container: RuntimeContainerRef | null;
  readonly error: Error | null;
}

/**
 * Internal context value for lazy container state.
 * @internal
 */
interface LazyContainerContextValue {
  readonly state: LazyContainerState;
  readonly load: () => void;
}

// =============================================================================
// Global Contexts for Global Export
// =============================================================================

const GlobalLazyContainerContext = createContext<LazyContainerContextValue | null>(null);
GlobalLazyContainerContext.displayName = "HexDI.GlobalLazyContainerContext";

// =============================================================================
// Compound Components
// =============================================================================

/**
 * Renders children while lazy container is pending or loading.
 *
 * @example
 * ```tsx
 * <LazyContainerProvider lazyContainer={lazyPlugin}>
 *   <LazyContainerProvider.Loading>
 *     <LoadingSpinner />
 *   </LazyContainerProvider.Loading>
 * </LazyContainerProvider>
 * ```
 */
function Loading({ children }: LazyContainerLoadingProps): ReactNode {
  const context = useContext(GlobalLazyContainerContext);
  if (!context) {
    throw new Error("LazyContainerProvider.Loading must be used within LazyContainerProvider");
  }
  return context.state.status === "loading" || context.state.status === "pending" ? (
    <>{children}</>
  ) : null;
}

/**
 * Renders children only when loading fails.
 * Supports render prop pattern for error access.
 *
 * @example Static children
 * ```tsx
 * <LazyContainerProvider.Error>
 *   <div>Something went wrong</div>
 * </LazyContainerProvider.Error>
 * ```
 *
 * @example Render prop pattern
 * ```tsx
 * <LazyContainerProvider.Error>
 *   {(error) => <div>Error: {error.message}</div>}
 * </LazyContainerProvider.Error>
 * ```
 */
function ErrorComponent({ children }: LazyContainerErrorProps): ReactNode {
  const context = useContext(GlobalLazyContainerContext);
  if (!context) {
    throw new Error("LazyContainerProvider.Error must be used within LazyContainerProvider");
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
 * Renders children only when lazy container has loaded successfully.
 * Provides the loaded container to the resolver context for hooks.
 *
 * @example
 * ```tsx
 * <LazyContainerProvider lazyContainer={lazyPlugin}>
 *   <LazyContainerProvider.Ready>
 *     <PluginUI />
 *   </LazyContainerProvider.Ready>
 * </LazyContainerProvider>
 * ```
 */
function Ready({ children }: LazyContainerReadyProps): ReactNode {
  const context = useContext(GlobalLazyContainerContext);
  if (!context) {
    throw new Error("LazyContainerProvider.Ready must be used within LazyContainerProvider");
  }

  if (context.state.status !== "ready" || !context.state.container) {
    return null;
  }

  // The loaded container is already converted to RuntimeContainerRef.
  const containerRef = context.state.container;

  // Provide through the main ContainerContext and ResolverContext.
  // This ensures hooks like usePort() and useContainer() work correctly.
  const mainContainerContextValue: RuntimeContainerContextValue = {
    container: containerRef,
    isChildContainer: true, // Lazy containers are always child containers
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
      Loading...
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
      Loading Error: {error.message}
    </div>
  );
}

// =============================================================================
// Main Provider Component
// =============================================================================

/**
 * Root LazyContainerProvider component.
 *
 * Handles deferred graph loading via LazyContainer. The graph is loaded
 * on mount (by default) or manually, showing loading/error/ready states.
 *
 * Supports two usage modes:
 *
 * **Compound Component Mode**: Use Loading, Error, and Ready sub-components
 * for fine-grained control over what renders in each state.
 *
 * **Simple Mode**: Pass loadingFallback and errorFallback props, or use
 * defaults. Children render when container is ready.
 *
 * @internal
 */
function LazyContainerProviderRoot<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
>({
  lazyContainer,
  children,
  autoLoad = true,
  loadingFallback,
  errorFallback,
}: LazyContainerProviderProps<TProvides, TExtends, TAsyncPorts>): ReactNode {
  // Convert lazy container to RuntimeLazyContainer for type-safe operations.
  // Memoize to avoid recreating on every render.
  const runtimeLazy: RuntimeLazyContainer = useMemo(
    () => toRuntimeLazyContainer(lazyContainer),
    [lazyContainer]
  );

  // Determine initial status based on current state and autoLoad setting
  const getInitialStatus = (): LazyContainerStatus => {
    if (lazyContainer.isLoaded) return "ready";
    if (lazyContainer.isDisposed) return "error";
    return autoLoad ? "loading" : "pending";
  };

  // State stores the loaded container as RuntimeContainerRef.
  const [state, setState] = useState<LazyContainerState>(() => ({
    status: getInitialStatus(),
    container: null,
    error: lazyContainer.isDisposed ? new Error("LazyContainer is disposed") : null,
  }));

  // Manual load trigger for autoLoad=false
  const triggerLoad = useCallback(() => {
    setState(prev => {
      if (prev.status === "pending") {
        return { ...prev, status: "loading" };
      }
      return prev;
    });
  }, []);

  // Load effect when status === "loading" OR when status === "ready" but container is null
  // (handles pre-loaded containers that need their value fetched)
  useEffect(() => {
    // If we're "ready" but have no container, we need to fetch it (pre-loaded case)
    const needsLoad =
      state.status === "loading" || (state.status === "ready" && state.container === null);

    if (!needsLoad) {
      return;
    }

    let mounted = true;

    async function performLoad() {
      try {
        const loadedContainer = await runtimeLazy.load();
        if (mounted) {
          setState({
            status: "ready",
            container: loadedContainer,
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

    void performLoad();

    return () => {
      mounted = false;
    };
  }, [state.status, state.container, runtimeLazy]);

  // Context value stores the state and load trigger
  const contextValue: LazyContainerContextValue = useMemo(
    () => ({
      state,
      load: triggerLoad,
    }),
    [state, triggerLoad]
  );

  // Check for compound component children
  const childArray = React.Children.toArray(children);
  const hasCompoundChildren = childArray.some(
    child =>
      React.isValidElement(child) &&
      (child.type === Loading || child.type === ErrorComponent || child.type === Ready)
  );

  if (hasCompoundChildren) {
    // Compound Component mode - render children directly
    return (
      <GlobalLazyContainerContext.Provider value={contextValue}>
        {children}
      </GlobalLazyContainerContext.Provider>
    );
  }

  // Simple mode - render based on state
  // When ready, provide contexts for hooks
  const mainContainerContextValue: RuntimeContainerContextValue | null = state.container
    ? {
        container: state.container,
        isChildContainer: true,
      }
    : null;

  const mainResolverContextValue: RuntimeResolverContextValue | null = state.container
    ? {
        resolver: state.container,
      }
    : null;

  return (
    <GlobalLazyContainerContext.Provider value={contextValue}>
      {(state.status === "loading" || state.status === "pending") &&
        (loadingFallback ?? <DefaultLoading />)}
      {state.status === "error" &&
        state.error &&
        (errorFallback?.(state.error) ?? <DefaultError error={state.error} />)}
      {state.status === "ready" &&
        state.container &&
        mainContainerContextValue &&
        mainResolverContextValue && (
          <ContainerContext.Provider value={mainContainerContextValue}>
            <ResolverContext.Provider value={mainResolverContextValue}>
              {children}
            </ResolverContext.Provider>
          </ContainerContext.Provider>
        )}
    </GlobalLazyContainerContext.Provider>
  );
}

// =============================================================================
// Export with Compound Components Attached
// =============================================================================

/**
 * LazyContainerProvider component with compound components.
 *
 * Handles deferred graph loading via LazyContainer, showing loading/error/ready
 * states. Provides a Compound Component API for customizable state rendering.
 *
 * @example Compound Component usage
 * ```tsx
 * function App() {
 *   const lazyPlugin = container.createLazyChild(
 *     () => import('./plugin-graph').then(m => m.PluginGraph)
 *   );
 *
 *   return (
 *     <LazyContainerProvider lazyContainer={lazyPlugin}>
 *       <LazyContainerProvider.Loading>
 *         <LoadingSpinner />
 *       </LazyContainerProvider.Loading>
 *
 *       <LazyContainerProvider.Error>
 *         {(error) => <ErrorDisplay error={error} />}
 *       </LazyContainerProvider.Error>
 *
 *       <LazyContainerProvider.Ready>
 *         <PluginUI />
 *       </LazyContainerProvider.Ready>
 *     </LazyContainerProvider>
 *   );
 * }
 * ```
 *
 * @example Simple usage with fallback props
 * ```tsx
 * <LazyContainerProvider
 *   lazyContainer={lazyPlugin}
 *   loadingFallback={<LoadingSpinner />}
 *   errorFallback={(error) => <ErrorDisplay error={error} />}
 * >
 *   <PluginUI />
 * </LazyContainerProvider>
 * ```
 *
 * @example Manual loading (autoLoad=false)
 * ```tsx
 * <LazyContainerProvider lazyContainer={lazyPlugin} autoLoad={false}>
 *   <ManualLoadUI />
 * </LazyContainerProvider>
 *
 * function ManualLoadUI() {
 *   const { load, isLoading, isLoaded } = useLazyContainerState();
 *
 *   if (isLoaded) return <LazyContainerProvider.Ready><PluginUI /></LazyContainerProvider.Ready>;
 *
 *   return (
 *     <button onClick={load} disabled={isLoading}>
 *       {isLoading ? 'Loading...' : 'Load Plugin'}
 *     </button>
 *   );
 * }
 * ```
 */
export const LazyContainerProvider = Object.assign(LazyContainerProviderRoot, {
  Loading,
  Error: ErrorComponent,
  Ready,
});

// =============================================================================
// Hook for accessing lazy container state (advanced usage)
// =============================================================================

/**
 * Result type for useLazyContainerState hook.
 */
export interface UseLazyContainerStateResult {
  /** Current loading status */
  readonly status: LazyContainerStatus;
  /** Whether the container has been loaded */
  readonly isLoaded: boolean;
  /** Whether loading is in progress */
  readonly isLoading: boolean;
  /** Whether waiting for manual load trigger */
  readonly isPending: boolean;
  /** Error if loading failed */
  readonly error: Error | null;
  /** Triggers loading when status is "pending" */
  readonly load: () => void;
}

/**
 * Hook to access the current lazy container loading state.
 *
 * This is an advanced hook for cases where you need to react to the
 * loading state outside of compound components.
 *
 * @returns The current loading state and control functions.
 * @throws If used outside LazyContainerProvider
 *
 * @example
 * ```tsx
 * function LoadButton() {
 *   const { load, isLoading, isPending } = useLazyContainerState();
 *
 *   if (!isPending) return null;
 *
 *   return (
 *     <button onClick={load} disabled={isLoading}>
 *       {isLoading ? 'Loading...' : 'Load Plugin'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLazyContainerState(): UseLazyContainerStateResult {
  const context = useContext(GlobalLazyContainerContext);
  if (!context) {
    throw new Error("useLazyContainerState must be used within LazyContainerProvider");
  }

  return {
    status: context.state.status,
    isLoaded: context.state.status === "ready",
    isLoading: context.state.status === "loading",
    isPending: context.state.status === "pending",
    error: context.state.error,
    load: context.load,
  };
}
