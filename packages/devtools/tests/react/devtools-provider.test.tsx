/**
 * Tests for DevToolsProvider and Context.
 *
 * These tests verify:
 * 1. DevToolsProvider creates valid context
 * 2. Context contains exportedGraph when graph is provided
 * 3. Context contains tracingAPI when container with TracingPlugin is provided
 * 4. Context returns null when used outside provider
 * 5. hasTracing flag correctly reflects TracingPlugin presence
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import { createContainer, pipe } from "@hex-di/runtime";
import { withTracing } from "@hex-di/tracing";
import {
  DevToolsProvider,
  useDevTools,
  useTracingAPI,
  useExportedGraph,
} from "../../src/react/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

function createTestGraph(): Graph<Port<unknown, string>> {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).build();
}

// Test components that use hooks
function DevToolsConsumer(): React.ReactElement {
  const devtools = useDevTools();
  return (
    <div data-testid="devtools-consumer">
      <span data-testid="has-context">{String(devtools !== null)}</span>
      <span data-testid="has-tracing">{String(devtools?.hasTracing ?? false)}</span>
      <span data-testid="has-graph">{String(devtools?.exportedGraph !== null)}</span>
    </div>
  );
}

function TracingAPIConsumer(): React.ReactElement {
  const tracingAPI = useTracingAPI();
  return (
    <div data-testid="tracing-consumer">
      <span data-testid="has-tracing-api">{String(tracingAPI !== null)}</span>
    </div>
  );
}

function ExportedGraphConsumer(): React.ReactElement {
  const graph = useExportedGraph();
  return (
    <div data-testid="graph-consumer">
      <span data-testid="has-exported-graph">{String(graph !== null)}</span>
      <span data-testid="node-count">{graph?.nodes.length ?? 0}</span>
    </div>
  );
}

// =============================================================================
// Test Suite
// =============================================================================

describe("DevToolsProvider", () => {
  afterEach(() => {
    cleanup();
  });

  describe("context creation", () => {
    it("provides context to child components", () => {
      const graph = createTestGraph();

      render(
        <DevToolsProvider graph={graph}>
          <DevToolsConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("has-context").textContent).toBe("true");
    });

    it("provides exportedGraph when graph is provided", () => {
      const graph = createTestGraph();

      render(
        <DevToolsProvider graph={graph}>
          <ExportedGraphConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("has-exported-graph").textContent).toBe("true");
      expect(screen.getByTestId("node-count").textContent).toBe("1"); // Logger
    });

    it("provides tracingAPI when container with TracingPlugin is provided", () => {
      const graph = createTestGraph();
      const container = pipe(createContainer(graph), withTracing);

      render(
        <DevToolsProvider graph={graph} container={container}>
          <DevToolsConsumer />
          <TracingAPIConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("has-tracing").textContent).toBe("true");
      expect(screen.getByTestId("has-tracing-api").textContent).toBe("true");
    });

    it("returns null tracingAPI when container has no TracingPlugin", () => {
      const graph = createTestGraph();
      const container = createContainer(graph);

      render(
        <DevToolsProvider graph={graph} container={container}>
          <DevToolsConsumer />
          <TracingAPIConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("has-tracing").textContent).toBe("false");
      expect(screen.getByTestId("has-tracing-api").textContent).toBe("false");
    });

    it("returns null tracingAPI when no container is provided", () => {
      const graph = createTestGraph();

      render(
        <DevToolsProvider graph={graph}>
          <TracingAPIConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("has-tracing-api").textContent).toBe("false");
    });
  });

  describe("outside provider", () => {
    it("useDevTools returns null when used outside provider", () => {
      render(<DevToolsConsumer />);

      expect(screen.getByTestId("has-context").textContent).toBe("false");
    });

    it("useTracingAPI returns null when used outside provider", () => {
      render(<TracingAPIConsumer />);

      expect(screen.getByTestId("has-tracing-api").textContent).toBe("false");
    });

    it("useExportedGraph returns null when used outside provider", () => {
      render(<ExportedGraphConsumer />);

      expect(screen.getByTestId("has-exported-graph").textContent).toBe("false");
    });
  });
});
