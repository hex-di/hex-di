import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createContainer } from "@hex-di/runtime";
import { HexDiContainerProvider } from "@hex-di/react";
import { createQueryClient } from "@hex-di/query";
import { QueryClientProvider } from "@hex-di/query-react";
import { presentationGraph } from "./graph/presentation.graph.js";
import { App } from "./app.js";
import "./styles/global.css";

function getRootElement(): HTMLElement {
  const element = document.getElementById("root");
  if (element === null) {
    throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>');
  }
  return element;
}

const container = createContainer({
  graph: presentationGraph,
  name: "ResultPresentation",
});

const queryClient = createQueryClient({
  container,
  defaults: { staleTime: Infinity },
});

const root = createRoot(getRootElement());

root.render(
  <StrictMode>
    <HexDiContainerProvider container={container}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HexDiContainerProvider>
  </StrictMode>
);
