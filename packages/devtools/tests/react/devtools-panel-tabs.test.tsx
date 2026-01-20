/**
 * Tests for DevToolsPanel (tabs-only mode).
 *
 * These tests verify:
 * 1. DevToolsPanel renders with default tabs mode
 * 2. initialTab prop works correctly
 * 3. plugins prop accepts custom plugins
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import { DevToolsPanel } from "../../src/react/index.js";
import { defaultPlugins } from "../../src/plugins/presets.js";
import type { DevToolsPlugin, PluginProps } from "../../src/runtime/index.js";

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

/**
 * Create a custom test plugin for verifying plugin prop works.
 */
function createTestPlugin(id: string, label: string): DevToolsPlugin {
  return {
    id,
    label,
    component: (_props: PluginProps) =>
      React.createElement("div", { "data-testid": `plugin-${id}` }, `Custom Plugin: ${label}`),
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("DevToolsPanel (tabs-only mode)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("renders with default tabs mode", () => {
    it("renders the DevTools panel header", () => {
      const graph = createTestGraph();

      render(React.createElement(DevToolsPanel, { graph }));

      expect(screen.getByText("HexDI DevTools")).toBeDefined();
    });

    it("renders the panel container with correct testid", () => {
      const graph = createTestGraph();

      render(React.createElement(DevToolsPanel, { graph }));

      expect(screen.getByTestId("devtools-panel")).toBeDefined();
    });

    it("renders tab navigation", () => {
      const graph = createTestGraph();

      render(React.createElement(DevToolsPanel, { graph }));

      // Tab navigation should be present
      expect(screen.getByRole("tablist")).toBeDefined();
    });

    it("renders with default plugins", () => {
      const graph = createTestGraph();

      render(React.createElement(DevToolsPanel, { graph }));

      // Default plugins include "graph" tab
      expect(screen.getByRole("tab", { name: /graph/i })).toBeDefined();
    });
  });

  describe("initialTab prop", () => {
    it("defaults to graph tab when no initialTab provided", () => {
      const graph = createTestGraph();

      render(React.createElement(DevToolsPanel, { graph }));

      // The graph tab should be selected by default
      const graphTab = screen.getByRole("tab", { name: /graph/i });
      expect(graphTab.getAttribute("aria-selected")).toBe("true");
    });

    it("selects the specified initialTab", async () => {
      const graph = createTestGraph();

      render(React.createElement(DevToolsPanel, { graph, initialTab: "services" }));

      // The services tab should be selected (async due to queueMicrotask in store)
      await waitFor(() => {
        const servicesTab = screen.getByRole("tab", { name: /services/i });
        expect(servicesTab.getAttribute("aria-selected")).toBe("true");
      });
    });

    it("falls back to first plugin if initialTab is invalid", () => {
      const graph = createTestGraph();

      // Testing invalid tab ID - the panel should fall back to first plugin
      // TabId is now string type, so "non-existent" is a valid string, just not a valid tab
      render(React.createElement(DevToolsPanel, { graph, initialTab: "non-existent" }));

      // Should fall back to first plugin (graph)
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThan(0);
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("plugins prop", () => {
    it("accepts custom plugins array", () => {
      const graph = createTestGraph();
      const customPlugin = createTestPlugin("custom-test", "Custom Test");

      render(React.createElement(DevToolsPanel, { graph, plugins: [customPlugin] }));

      // The custom plugin tab should be rendered
      expect(screen.getByRole("tab", { name: /custom test/i })).toBeDefined();
    });

    it("renders custom plugin content when selected", async () => {
      const graph = createTestGraph();
      const customPlugin = createTestPlugin("custom-test", "Custom Test");

      // Provide initialTab to select the custom plugin since FSM defaults to "graph"
      render(
        React.createElement(DevToolsPanel, {
          graph,
          plugins: [customPlugin],
          initialTab: "custom-test",
        })
      );

      // The custom plugin content should be visible (async due to queueMicrotask in store)
      await waitFor(() => {
        expect(screen.getByTestId("plugin-custom-test")).toBeDefined();
        expect(screen.getByText("Custom Plugin: Custom Test")).toBeDefined();
      });
    });

    it("merges custom plugins with default plugins when spreading", () => {
      const graph = createTestGraph();
      const customPlugin = createTestPlugin("custom-test", "Custom Test");

      render(
        React.createElement(DevToolsPanel, {
          graph,
          plugins: [...defaultPlugins(), customPlugin],
        })
      );

      // Both default and custom plugin tabs should be rendered
      expect(screen.getByRole("tab", { name: /graph/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /custom test/i })).toBeDefined();
    });
  });
});
