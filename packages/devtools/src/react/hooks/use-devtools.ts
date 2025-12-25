/**
 * Core DevTools hooks for accessing context data.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { TracingAPI, ExportedGraph } from "@hex-di/devtools-core";
import { DevToolsContext, type DevToolsContextValue } from "../context/devtools-context.js";

/**
 * Access the full DevTools context value.
 *
 * Returns null if used outside of DevToolsProvider.
 *
 * @returns DevToolsContextValue or null
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const devtools = useDevTools();
 *   if (!devtools) return <div>DevTools not available</div>;
 *   const { tracingAPI, exportedGraph, hasTracing } = devtools;
 *   // ...
 * }
 * ```
 */
export function useDevTools(): DevToolsContextValue | null {
  return useContext(DevToolsContext);
}

/**
 * Access TracingAPI from DevTools context.
 *
 * Returns null if:
 * - Used outside of DevToolsProvider
 * - Container was not provided to DevToolsProvider
 * - Container does not have TracingPlugin registered
 *
 * @returns TracingAPI or null
 *
 * @example
 * ```typescript
 * function TraceViewer() {
 *   const tracingAPI = useTracingAPI();
 *   if (!tracingAPI) return <div>Tracing not available</div>;
 *
 *   const traces = tracingAPI.getTraces();
 *   const stats = tracingAPI.getStats();
 *   // ...
 * }
 * ```
 */
export function useTracingAPI(): TracingAPI | null {
  const ctx = useContext(DevToolsContext);
  return ctx?.tracingAPI ?? null;
}

/**
 * Access the exported graph from DevTools context.
 *
 * Returns null if used outside of DevToolsProvider.
 *
 * @returns ExportedGraph or null
 *
 * @example
 * ```typescript
 * function GraphViewer() {
 *   const graph = useExportedGraph();
 *   if (!graph) return <div>Graph not available</div>;
 *
 *   return (
 *     <div>
 *       <div>Nodes: {graph.nodes.length}</div>
 *       <div>Edges: {graph.edges.length}</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useExportedGraph(): ExportedGraph | null {
  const ctx = useContext(DevToolsContext);
  return ctx?.exportedGraph ?? null;
}
