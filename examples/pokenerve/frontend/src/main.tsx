/**
 * PokéNerve application entry point.
 *
 * Creates the root DI container from the validated graph, instruments it
 * for tracing, creates the query client, resolves the tracer, and renders
 * the React application with the full provider tree.
 *
 * Provider nesting order:
 *   StrictMode > HexDiContainerProvider > InspectorProvider > QueryClientProvider > App
 *
 * @packageDocumentation
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, TracerPort } from "@hex-di/tracing";
import { HexDiContainerProvider, InspectorProvider } from "@hex-di/react";
import { createQueryClient } from "@hex-di/query";
import { QueryClientProvider } from "@hex-di/query-react";
import { App } from "./App.js";
import { rootGraph } from "./graph/root-graph.js";
import "./index.css";

// =============================================================================
// 1. Create the root container from the validated graph
// =============================================================================

const container = createContainer({ graph: rootGraph, name: "PokéNerve" });

// =============================================================================
// 2. Resolve the tracer and instrument the container
// =============================================================================

const tracer = container.resolve(TracerPort);
instrumentContainer(container, tracer, {
  additionalAttributes: {
    "hexdi.app": "pokenerve",
    "hexdi.layer": "frontend",
  },
});

// =============================================================================
// 3. Create the query client backed by the DI container
// =============================================================================

const queryClient = createQueryClient({ container });

// =============================================================================
// 4. Mount the React application with provider tree
// =============================================================================

function getRootElement(): HTMLElement {
  const element = document.getElementById("root");
  if (element === null) {
    throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>');
  }
  return element;
}

const root = createRoot(getRootElement());

root.render(
  <StrictMode>
    <HexDiContainerProvider container={container}>
      <InspectorProvider inspector={container.inspector}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </InspectorProvider>
    </HexDiContainerProvider>
  </StrictMode>
);
