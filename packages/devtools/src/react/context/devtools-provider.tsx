/**
 * DevToolsProvider component for providing DevTools context to the app.
 *
 * @packageDocumentation
 */

import React, { useMemo, type ReactNode, type ReactElement } from "react";
import type { Graph } from "@hex-di/graph";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { Port } from "@hex-di/ports";
import { getTracingAPI } from "@hex-di/tracing";
import { toJSON } from "../../to-json.js";
import { DevToolsContext, type DevToolsContextValue } from "./devtools-context.js";

/**
 * Props for DevToolsProvider component.
 */
export interface DevToolsProviderProps<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> {
  /** The dependency graph to visualize */
  readonly graph: Graph<TProvides, TAsyncPorts>;

  /** Optional container with potential TracingPlugin for runtime data */
  readonly container?: Container<TProvides, TExtends, TAsyncPorts, TPhase>;

  /** Child components that will have access to DevTools context */
  readonly children: ReactNode;
}

/**
 * Provides DevTools context to child components.
 *
 * Wrap your application or DevTools section with this provider to enable
 * context-based access to TracingAPI and graph data.
 *
 * @example Basic usage with graph only
 * ```typescript
 * <DevToolsProvider graph={appGraph}>
 *   <DevToolsPanel />
 * </DevToolsProvider>
 * ```
 *
 * @example With container for tracing support
 * ```typescript
 * import { createContainer } from "@hex-di/runtime";
 * import { TracingPlugin } from "@hex-di/tracing";
 *
 * const container = createContainer(graph, { plugins: [TracingPlugin] });
 *
 * <DevToolsProvider graph={graph} container={container}>
 *   <DevToolsPanel />
 *   <TraceTimeline />
 * </DevToolsProvider>
 * ```
 */
export function DevToolsProvider<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
>({
  graph,
  container,
  children,
}: DevToolsProviderProps<TProvides, TExtends, TAsyncPorts, TPhase>): ReactElement {
  const contextValue = useMemo((): DevToolsContextValue => {
    const tracingAPI = container !== undefined ? (getTracingAPI(container) ?? null) : null;
    return {
      tracingAPI,
      exportedGraph: toJSON(graph),
      hasTracing: tracingAPI !== null,
    };
  }, [graph, container]);

  return <DevToolsContext.Provider value={contextValue}>{children}</DevToolsContext.Provider>;
}
