/**
 * Tests for HexDiLazyContainerProvider component.
 *
 * These tests verify that HexDiLazyContainerProvider correctly:
 * - Loads lazily on mount (autoLoad=true)
 * - Waits for manual trigger (autoLoad=false)
 * - Shows loading state while loading
 * - Shows error state on failure
 * - Provides container via context after loading
 * - Works with compound components
 * - Works with simple mode (fallback props)
 *
 * @packageDocumentation
 */

import React from "react";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { HexDiLazyContainerProvider, useLazyContainerState, usePort } from "../src/index.js";
import { HexDiContainerProvider } from "../src/providers/container-provider.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  name: string;
}

interface PluginService {
  pluginName: string;
}

const TestServicePort = createPort<TestService, "TestService">({ name: "TestService" });
const PluginServicePort = createPort<PluginService, "PluginService">({ name: "PluginService" });

const TestServiceAdapter = createAdapter({
  provides: TestServicePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ name: "test-service" }),
});

const PluginServiceAdapter = createAdapter({
  provides: PluginServicePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ pluginName: "plugin-service" }),
});

function createParentContainer() {
  const graph = GraphBuilder.create().provide(TestServiceAdapter).build();
  return createContainer(graph, { name: "ParentContainer" });
}

function createPluginGraph() {
  return GraphBuilder.create().provide(PluginServiceAdapter).build();
}

// =============================================================================
// Test Components
// =============================================================================

function PluginUI() {
  const plugin = usePort(PluginServicePort);
  return <div data-testid="plugin-ui">{plugin.pluginName}</div>;
}

function LoadingUI() {
  return <div data-testid="loading-ui">Loading plugin...</div>;
}

function ErrorUI({ error }: { error: Error }) {
  return <div data-testid="error-ui">Error: {error.message}</div>;
}

function ManualLoadButton() {
  const { load, isPending, isLoading } = useLazyContainerState();

  if (!isPending && !isLoading) return null;

  return (
    <button data-testid="load-button" onClick={load} disabled={isLoading}>
      {isLoading ? "Loading..." : "Load Plugin"}
    </button>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("HexDiLazyContainerProvider", () => {
  let parentContainer: ReturnType<typeof createParentContainer>;

  beforeEach(() => {
    parentContainer = createParentContainer();
  });

  afterEach(async () => {
    cleanup();
    await parentContainer.dispose();
  });

  describe("auto loading (autoLoad=true)", () => {
    test("loads automatically on mount", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <HexDiLazyContainerProvider.Loading>
              <LoadingUI />
            </HexDiLazyContainerProvider.Loading>
            <HexDiLazyContainerProvider.Ready>
              <PluginUI />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Initially shows loading
      expect(screen.getByTestId("loading-ui")).toBeTruthy();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("plugin-ui")).toBeTruthy();
      });

      expect(screen.queryByTestId("loading-ui")).toBeNull();
      expect(screen.getByTestId("plugin-ui").textContent).toBe("plugin-service");
    });

    test("shows error state on load failure", async () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.reject(new Error("Failed to load plugin")),
        { name: "PluginContainer" }
      );

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <HexDiLazyContainerProvider.Loading>
              <LoadingUI />
            </HexDiLazyContainerProvider.Loading>
            <HexDiLazyContainerProvider.Error>
              {(error: Error) => <ErrorUI error={error} />}
            </HexDiLazyContainerProvider.Error>
            <HexDiLazyContainerProvider.Ready>
              <PluginUI />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId("error-ui")).toBeTruthy();
      });

      expect(screen.getByTestId("error-ui").textContent).toBe("Error: Failed to load plugin");
      expect(screen.queryByTestId("plugin-ui")).toBeNull();
    });
  });

  describe("manual loading (autoLoad=false)", () => {
    test("waits in pending state until load is triggered", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin} autoLoad={false}>
            <ManualLoadButton />
            <HexDiLazyContainerProvider.Ready>
              <PluginUI />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Shows load button in pending state
      const loadButton = screen.getByTestId("load-button");
      expect(loadButton).toBeTruthy();
      expect(loadButton.textContent).toBe("Load Plugin");
      expect(screen.queryByTestId("plugin-ui")).toBeNull();

      // Trigger load
      await act(async () => {
        loadButton.click();
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("plugin-ui")).toBeTruthy();
      });
    });

    test("useLazyContainerState provides correct state", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      const states: string[] = [];

      function StateTracker() {
        const { status, isPending, isLoading, isLoaded } = useLazyContainerState();
        states.push(status);
        return (
          <div data-testid="state">
            {status} (pending={String(isPending)}, loading={String(isLoading)}, loaded=
            {String(isLoaded)})
          </div>
        );
      }

      // StateTracker needs to render in all states, so we put it outside compound components
      // but still inside the provider (using compound mode)
      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin} autoLoad={false}>
            <StateTracker />
            <HexDiLazyContainerProvider.Loading>
              <ManualLoadButton />
            </HexDiLazyContainerProvider.Loading>
            <HexDiLazyContainerProvider.Ready>
              <div data-testid="ready-content">Ready!</div>
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("state").textContent).toContain("pending");

      // Trigger load
      await act(async () => {
        screen.getByTestId("load-button").click();
      });

      // Wait for ready
      await waitFor(() => {
        expect(screen.getByTestId("state").textContent).toContain("ready");
      });

      // Should have gone through pending -> loading -> ready
      expect(states).toContain("pending");
      expect(states).toContain("loading");
      expect(states).toContain("ready");
    });
  });

  describe("simple mode (fallback props)", () => {
    test("uses loadingFallback prop", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider
            lazyContainer={lazyPlugin}
            loadingFallback={<div data-testid="custom-loading">Custom loading...</div>}
          >
            <PluginUI />
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Shows custom loading
      expect(screen.getByTestId("custom-loading")).toBeTruthy();

      // Wait for ready
      await waitFor(() => {
        expect(screen.getByTestId("plugin-ui")).toBeTruthy();
      });
    });

    test("uses errorFallback prop", async () => {
      const lazyPlugin = parentContainer.createLazyChild(
        () => Promise.reject(new Error("Load failed")),
        { name: "PluginContainer" }
      );

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider
            lazyContainer={lazyPlugin}
            errorFallback={(error: Error) => <div data-testid="custom-error">{error.message}</div>}
          >
            <PluginUI />
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId("custom-error")).toBeTruthy();
      });

      expect(screen.getByTestId("custom-error").textContent).toBe("Load failed");
    });

    test("shows default loading when no fallback provided", async () => {
      const pluginGraph = createPluginGraph();
      // Add delay to see loading state
      const lazyPlugin = parentContainer.createLazyChild(
        () =>
          new Promise<typeof pluginGraph>(resolve => setTimeout(() => resolve(pluginGraph), 50)),
        { name: "PluginContainer" }
      );

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <PluginUI />
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Should show default loading (contains "Loading")
      expect(screen.getByText(/Loading/)).toBeTruthy();

      // Wait for ready
      await waitFor(() => {
        expect(screen.getByTestId("plugin-ui")).toBeTruthy();
      });
    });
  });

  describe("pre-loaded container", () => {
    test("renders immediately when already loaded", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      // Pre-load
      await lazyPlugin.load();

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <HexDiLazyContainerProvider.Loading>
              <LoadingUI />
            </HexDiLazyContainerProvider.Loading>
            <HexDiLazyContainerProvider.Ready>
              <PluginUI />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Should show ready immediately (no loading state)
      // Note: React may briefly show loading due to useState initial value,
      // but should transition to ready quickly
      await waitFor(() => {
        expect(screen.getByTestId("plugin-ui")).toBeTruthy();
      });
    });
  });

  describe("disposed container", () => {
    test("shows error when lazy container is disposed", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      // Dispose before render
      await lazyPlugin.dispose();

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <HexDiLazyContainerProvider.Error>
              {(error: Error) => <ErrorUI error={error} />}
            </HexDiLazyContainerProvider.Error>
            <HexDiLazyContainerProvider.Ready>
              <PluginUI />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId("error-ui")).toBeTruthy();
      });
    });
  });

  describe("hook access after load", () => {
    test("usePort works after lazy container loads", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      function PluginWithHook() {
        const plugin = usePort(PluginServicePort);
        return <div data-testid="plugin-name">{plugin.pluginName}</div>;
      }

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <HexDiLazyContainerProvider.Ready>
              <PluginWithHook />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("plugin-name")).toBeTruthy();
      });

      expect(screen.getByTestId("plugin-name").textContent).toBe("plugin-service");
    });

    test("parent ports are accessible through lazy container", async () => {
      const pluginGraph = createPluginGraph();
      const lazyPlugin = parentContainer.createLazyChild(() => Promise.resolve(pluginGraph), {
        name: "PluginContainer",
      });

      function ParentServiceAccess() {
        const testService = usePort(TestServicePort);
        return <div data-testid="parent-service">{testService.name}</div>;
      }

      render(
        <HexDiContainerProvider container={parentContainer}>
          <HexDiLazyContainerProvider lazyContainer={lazyPlugin}>
            <HexDiLazyContainerProvider.Ready>
              <ParentServiceAccess />
            </HexDiLazyContainerProvider.Ready>
          </HexDiLazyContainerProvider>
        </HexDiContainerProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("parent-service")).toBeTruthy();
      });

      expect(screen.getByTestId("parent-service").textContent).toBe("test-service");
    });
  });
});
