import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Port } from "@hex-di/core";
import { ContainerContext } from "../../context/container-context.js";
import { ResolverContext } from "../../context/resolver-context.js";
import { toRuntimeLazyContainer, type RuntimeLazyContainer } from "../../internal/runtime-refs.js";
import type {
  LazyContainerProviderProps,
  LazyContainerStatus,
} from "../../types/lazy-container-props.js";
import { ErrorComponent, Loading, Ready } from "./compound-components.js";
import { GlobalLazyContainerContext } from "./context.js";
import { DefaultError, DefaultLoading } from "./default-fallbacks.js";
import type {
  LazyContainerContextValue,
  LazyContainerState,
  RuntimeContainerContextValue,
  RuntimeResolverContextValue,
} from "./internal-types.js";

export function HexDiLazyContainerProviderRoot<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
>({
  lazyContainer,
  children,
  autoLoad = true,
  loadingFallback,
  errorFallback,
}: LazyContainerProviderProps<TProvides, TExtends, TAsyncPorts>): ReactNode {
  const runtimeLazy: RuntimeLazyContainer = useMemo(
    () => toRuntimeLazyContainer(lazyContainer),
    [lazyContainer]
  );

  const getInitialStatus = (): LazyContainerStatus => {
    if (lazyContainer.isLoaded) return "ready";
    if (lazyContainer.isDisposed) return "error";
    return autoLoad ? "loading" : "pending";
  };

  const [state, setState] = useState<LazyContainerState>(() => ({
    status: getInitialStatus(),
    container: null,
    error: lazyContainer.isDisposed ? new Error("LazyContainer is disposed") : null,
  }));

  const triggerLoad = useCallback(() => {
    setState(prev => {
      if (prev.status === "pending") {
        return { ...prev, status: "loading" };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
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

  const contextValue: LazyContainerContextValue = useMemo(
    () => ({
      state,
      load: triggerLoad,
    }),
    [state, triggerLoad]
  );

  const childArray = React.Children.toArray(children);
  const hasCompoundChildren = childArray.some(
    child =>
      React.isValidElement(child) &&
      (child.type === Loading || child.type === ErrorComponent || child.type === Ready)
  );

  if (hasCompoundChildren) {
    return (
      <GlobalLazyContainerContext.Provider value={contextValue}>
        {children}
      </GlobalLazyContainerContext.Provider>
    );
  }

  return (
    <GlobalLazyContainerContext.Provider value={contextValue}>
      <SimpleContent state={state} loadingFallback={loadingFallback} errorFallback={errorFallback}>
        {children}
      </SimpleContent>
    </GlobalLazyContainerContext.Provider>
  );
}

function SimpleContent({
  state,
  loadingFallback,
  errorFallback,
  children,
}: {
  readonly state: LazyContainerState;
  readonly loadingFallback: ReactNode | undefined;
  readonly errorFallback: ((error: Error) => ReactNode) | undefined;
  readonly children: ReactNode;
}): ReactNode {
  if (state.status === "loading" || state.status === "pending") {
    return loadingFallback ?? <DefaultLoading />;
  }

  if (state.status === "error" && state.error) {
    return errorFallback?.(state.error) ?? <DefaultError error={state.error} />;
  }

  if (state.status === "ready" && state.container) {
    const containerCtx: RuntimeContainerContextValue = {
      container: state.container,
      isChildContainer: true,
    };
    const resolverCtx: RuntimeResolverContextValue = {
      resolver: state.container,
    };
    return (
      <ContainerContext.Provider value={containerCtx}>
        <ResolverContext.Provider value={resolverCtx}>{children}</ResolverContext.Provider>
      </ContainerContext.Provider>
    );
  }

  return null;
}
