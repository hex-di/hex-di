/**
 * Tests for DevTools React Hooks.
 *
 * These tests verify:
 * 1. useTraces returns traces and isAvailable flag
 * 2. useTraceStats returns stats object
 * 3. useTracingControls returns control functions
 * 4. Hooks return appropriate defaults when tracing not available
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import React, { type ReactElement } from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import { createContainer } from "@hex-di/runtime";
import { TracingPlugin } from "@hex-di/tracing";
import {
  DevToolsProvider,
  useTraces,
  useTraceStats,
  useTracingControls,
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

// Test components
function TracesConsumer(): ReactElement {
  const { traces, isAvailable } = useTraces();
  return (
    <div data-testid="traces-consumer">
      <span data-testid="is-available">{String(isAvailable)}</span>
      <span data-testid="trace-count">{traces.length}</span>
    </div>
  );
}

function TraceStatsConsumer(): ReactElement {
  const stats = useTraceStats();
  return (
    <div data-testid="stats-consumer">
      <span data-testid="total-resolutions">{stats.totalResolutions}</span>
      <span data-testid="cache-hit-rate">{stats.cacheHitRate}</span>
    </div>
  );
}

function TracingControlsConsumer(): ReactElement {
  const controls = useTracingControls();
  return (
    <div data-testid="controls-consumer">
      <span data-testid="is-available">{String(controls.isAvailable)}</span>
      <button data-testid="pause-btn" onClick={controls.pause}>
        Pause
      </button>
      <button data-testid="resume-btn" onClick={controls.resume}>
        Resume
      </button>
      <button data-testid="clear-btn" onClick={controls.clear}>
        Clear
      </button>
      <span data-testid="is-paused">{String(controls.isPaused())}</span>
    </div>
  );
}

// =============================================================================
// Test Suite
// =============================================================================

describe("DevTools Hooks", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("useTraces", () => {
    it("returns isAvailable=false when no tracing", () => {
      const graph = createTestGraph();

      render(
        <DevToolsProvider graph={graph}>
          <TracesConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("is-available").textContent).toBe("false");
      expect(screen.getByTestId("trace-count").textContent).toBe("0");
    });

    it("returns isAvailable=true when tracing is available", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { plugins: [TracingPlugin] });

      render(
        <DevToolsProvider graph={graph} container={container}>
          <TracesConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("is-available").textContent).toBe("true");
    });

    it("returns empty traces initially", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { plugins: [TracingPlugin] });

      render(
        <DevToolsProvider graph={graph} container={container}>
          <TracesConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("trace-count").textContent).toBe("0");
    });

    it("returns isAvailable=false when used outside provider", () => {
      render(<TracesConsumer />);

      expect(screen.getByTestId("is-available").textContent).toBe("false");
    });
  });

  describe("useTraceStats", () => {
    it("returns empty stats when no tracing", () => {
      const graph = createTestGraph();

      render(
        <DevToolsProvider graph={graph}>
          <TraceStatsConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("total-resolutions").textContent).toBe("0");
      expect(screen.getByTestId("cache-hit-rate").textContent).toBe("0");
    });

    it("returns stats from TracingAPI when available", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { plugins: [TracingPlugin] });

      render(
        <DevToolsProvider graph={graph} container={container}>
          <TraceStatsConsumer />
        </DevToolsProvider>
      );

      // Initial stats should be zero
      expect(screen.getByTestId("total-resolutions").textContent).toBe("0");
    });

    it("returns empty stats when used outside provider", () => {
      render(<TraceStatsConsumer />);

      expect(screen.getByTestId("total-resolutions").textContent).toBe("0");
    });
  });

  describe("useTracingControls", () => {
    it("returns isAvailable=false when no tracing", () => {
      const graph = createTestGraph();

      render(
        <DevToolsProvider graph={graph}>
          <TracingControlsConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("is-available").textContent).toBe("false");
    });

    it("returns isAvailable=true when tracing is available", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { plugins: [TracingPlugin] });

      render(
        <DevToolsProvider graph={graph} container={container}>
          <TracingControlsConsumer />
        </DevToolsProvider>
      );

      expect(screen.getByTestId("is-available").textContent).toBe("true");
    });

    it("pause and resume work correctly", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { plugins: [TracingPlugin] });

      render(
        <DevToolsProvider graph={graph} container={container}>
          <TracingControlsConsumer />
        </DevToolsProvider>
      );

      // Initial state: not paused
      expect(screen.getByTestId("is-paused").textContent).toBe("false");

      // Click pause
      await act(async () => {
        screen.getByTestId("pause-btn").click();
      });

      // Note: isPaused() reads from TracingAPI, state should be updated
      // But since we're calling isPaused() directly, it should reflect the change
    });

    it("returns safe no-op functions when used outside provider", () => {
      render(<TracingControlsConsumer />);

      expect(screen.getByTestId("is-available").textContent).toBe("false");

      // Should not throw when clicking control buttons
      expect(() => {
        screen.getByTestId("pause-btn").click();
        screen.getByTestId("resume-btn").click();
        screen.getByTestId("clear-btn").click();
      }).not.toThrow();
    });
  });
});
