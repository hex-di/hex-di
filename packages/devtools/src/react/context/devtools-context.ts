/**
 * DevTools React Context for providing TracingAPI and graph data to components.
 *
 * @packageDocumentation
 */

import { createContext } from "react";
import type { TracingAPI, ExportedGraph } from "@hex-di/devtools-core";

/**
 * Value provided by DevToolsContext.
 *
 * Components can access TracingAPI and exported graph data through this context.
 */
export interface DevToolsContextValue {
  /** TracingAPI if container has TracingPlugin, null otherwise */
  readonly tracingAPI: TracingAPI | null;

  /** Exported graph in JSON format for visualization */
  readonly exportedGraph: ExportedGraph | null;

  /** Whether tracing is available (convenience for conditional rendering) */
  readonly hasTracing: boolean;
}

/**
 * React Context for DevTools data.
 *
 * Use DevToolsProvider to provide this context at the app root,
 * then access via useDevTools or specialized hooks like useTracingAPI.
 *
 * @example
 * ```typescript
 * import { DevToolsProvider, useTracingAPI } from "@hex-di/devtools";
 *
 * function App() {
 *   return (
 *     <DevToolsProvider graph={graph} container={container}>
 *       <TraceList />
 *     </DevToolsProvider>
 *   );
 * }
 *
 * function TraceList() {
 *   const tracingAPI = useTracingAPI();
 *   if (!tracingAPI) return <div>Tracing not available</div>;
 *   const traces = tracingAPI.getTraces();
 *   // ...
 * }
 * ```
 */
export const DevToolsContext = createContext<DevToolsContextValue | null>(null);
DevToolsContext.displayName = "HexDI.DevToolsContext";
