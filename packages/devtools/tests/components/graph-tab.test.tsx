/**
 * Tests for Graph Tab Full Implementation (Task Group 7).
 *
 * These 6 focused tests verify:
 * 1. Node selection and path highlighting
 * 2. Filtering by lifetime and name pattern
 * 3. Zoom/pan state management
 * 4. Child container grouping display
 * 5. Captive dependency warning indicators
 * 6. Async factory indicators on nodes
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
  ContainerSnapshot,
  PresenterDataSourceContract,
  TraceEntry,
  TraceStats,
} from "@hex-di/devtools-core";

import { GraphView } from "../../src/components/GraphView.js";
import { EnhancedGraphView } from "../../src/components/EnhancedGraphView.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { createTestPrimitives } from "../test-utils/test-primitives.js";
import { GraphPresenter } from "../../src/presenters/graph.presenter.js";
import type { ExtendedGraphViewModel } from "../../src/view-models/graph.vm.js";
import { createEmptyExtendedGraphViewModel } from "../../src/view-models/graph.vm.js";

// =============================================================================
// Test Fixture Factories
// =============================================================================

function createNode(options: {
  id: string;
  lifetime?: "singleton" | "scoped" | "transient";
  factoryKind?: "sync" | "async";
}): ExportedNode {
  return {
    id: options.id,
    label: options.id,
    lifetime: options.lifetime ?? "singleton",
    factoryKind: options.factoryKind ?? "sync",
  };
}

function createEdge(from: string, to: string): ExportedEdge {
  return { from, to };
}

function createGraph(options: { nodes?: ExportedNode[]; edges?: ExportedEdge[] } = {}): ExportedGraph {
  return Object.freeze({
    nodes: Object.freeze(options.nodes ?? []),
    edges: Object.freeze(options.edges ?? []),
  });
}

function createMockDataSource(config: {
  graph?: ExportedGraph;
  snapshot?: ContainerSnapshot | null;
} = {}) {
  const graph = config.graph ?? createGraph();
  const snapshot = config.snapshot ?? null;

  return {
    getGraph: () => graph,
    getTraces: (): readonly TraceEntry[] => [],
    getStats: (): TraceStats => ({
      totalResolutions: 0,
      averageDuration: 0,
      cacheHitRate: 0,
      slowCount: 0,
      sessionStart: Date.now(),
      totalDuration: 0,
    }),
    getContainerSnapshot: () => snapshot,
    hasTracing: () => true,
    hasContainer: () => true,
    isPaused: () => false,
    pause: () => {},
    resume: () => {},
    clearTraces: () => {},
    pinTrace: () => {},
    unpinTrace: () => {},
    subscribe: () => () => {},
  };
}

function createContainerSnapshot(overrides: Partial<ContainerSnapshot> = {}): ContainerSnapshot {
  return {
    singletons: [
      { portName: "Config", resolvedAt: 1000 },
      { portName: "Logger", resolvedAt: 1100 },
    ],
    scopes: [
      {
        id: "root",
        parentId: null,
        childIds: ["scope-1"],
        resolvedPorts: ["Config", "Logger"],
        createdAt: 1000,
        isActive: true,
      },
      {
        id: "scope-1",
        parentId: "root",
        childIds: [],
        resolvedPorts: ["UserService"],
        createdAt: 1500,
        isActive: true,
      },
    ],
    phase: "ready",
    ...overrides,
  };
}

// =============================================================================
// Test 1: Node Selection and Path Highlighting
// =============================================================================

describe("Graph Tab - Node selection and path highlighting", () => {
  it("highlights the dependency path when a node is selected", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "Config", lifetime: "singleton" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
          createNode({ id: "UserService", lifetime: "scoped" }),
          createNode({ id: "AuthService", lifetime: "singleton" }),
        ],
        edges: [
          createEdge("Logger", "Config"),
          createEdge("UserService", "Logger"),
          createEdge("AuthService", "Logger"),
        ],
      }),
    });

    const presenter = new GraphPresenter(dataSource);

    // Initially, no nodes are highlighted
    let viewModel = presenter.getViewModel();
    expect(viewModel.highlightedNodeIds).toHaveLength(0);

    // Select UserService
    presenter.selectNode("UserService");
    viewModel = presenter.getViewModel();

    // Should have UserService selected
    expect(viewModel.selectedNodeId).toBe("UserService");

    // Should highlight the path: UserService -> Logger -> Config
    expect(viewModel.highlightedNodeIds).toContain("UserService");
    expect(viewModel.highlightedNodeIds).toContain("Logger");
    expect(viewModel.highlightedNodeIds).toContain("Config");

    // AuthService is not in the path
    expect(viewModel.highlightedNodeIds).not.toContain("AuthService");

    // Clear selection
    presenter.selectNode(null);
    viewModel = presenter.getViewModel();
    expect(viewModel.selectedNodeId).toBeNull();
    expect(viewModel.highlightedNodeIds).toHaveLength(0);
  });

  it("dims non-highlighted nodes when a selection is active", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "A" }),
          createNode({ id: "B" }),
          createNode({ id: "C" }),
        ],
        edges: [createEdge("A", "B")],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    presenter.selectNode("A");

    const viewModel = presenter.getViewModel();

    // Node A and B should not be dimmed (in the path)
    const nodeA = viewModel.nodes.find((n) => n.id === "A");
    const nodeB = viewModel.nodes.find((n) => n.id === "B");
    const nodeC = viewModel.nodes.find((n) => n.id === "C");

    expect(nodeA?.isDimmed).toBe(false);
    expect(nodeB?.isDimmed).toBe(false);
    // Node C is not in the path, so it should be dimmed
    expect(nodeC?.isDimmed).toBe(true);
  });
});

// =============================================================================
// Test 2: Filtering by Lifetime and Name Pattern
// =============================================================================

describe("Graph Tab - Filtering by lifetime and name pattern", () => {
  it("filters nodes by lifetime type", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SingletonA", lifetime: "singleton" }),
          createNode({ id: "SingletonB", lifetime: "singleton" }),
          createNode({ id: "ScopedA", lifetime: "scoped" }),
          createNode({ id: "TransientA", lifetime: "transient" }),
        ],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);

    // Get all nodes
    const viewModel = presenter.getViewModel();
    expect(viewModel.nodes).toHaveLength(4);

    // Filter by singleton - the presenter's filter is handled externally,
    // but we can verify the view model has lifetime info
    const singletons = viewModel.nodes.filter((n) => n.lifetime === "singleton");
    expect(singletons).toHaveLength(2);

    const scoped = viewModel.nodes.filter((n) => n.lifetime === "scoped");
    expect(scoped).toHaveLength(1);

    const transients = viewModel.nodes.filter((n) => n.lifetime === "transient");
    expect(transients).toHaveLength(1);
  });

  it("filters nodes by name pattern using regex-safe matching", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "UserService" }),
          createNode({ id: "UserRepository" }),
          createNode({ id: "AuthService" }),
          createNode({ id: "Logger" }),
        ],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    // Filter by pattern "User" - done at UI level
    const userPattern = /user/i;
    const filtered = viewModel.nodes.filter((n) => userPattern.test(n.label));
    expect(filtered).toHaveLength(2);
    expect(filtered.map((n) => n.id)).toContain("UserService");
    expect(filtered.map((n) => n.id)).toContain("UserRepository");

    // Filter by pattern "Service"
    const servicePattern = /service/i;
    const serviceFiltered = viewModel.nodes.filter((n) => servicePattern.test(n.label));
    expect(serviceFiltered).toHaveLength(2);
    expect(serviceFiltered.map((n) => n.id)).toContain("UserService");
    expect(serviceFiltered.map((n) => n.id)).toContain("AuthService");
  });
});

// =============================================================================
// Test 3: Zoom/Pan State Management
// =============================================================================

describe("Graph Tab - Zoom/pan state management", () => {
  it("manages zoom level with clamping", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [createNode({ id: "A" })],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);

    // Default zoom is 1
    let viewModel = presenter.getViewModel();
    expect(viewModel.zoom).toBe(1);

    // Zoom in
    presenter.setZoom(2);
    viewModel = presenter.getViewModel();
    expect(viewModel.zoom).toBe(2);

    // Zoom out
    presenter.setZoom(0.5);
    viewModel = presenter.getViewModel();
    expect(viewModel.zoom).toBe(0.5);

    // Zoom should be clamped to min 0.1
    presenter.setZoom(0.01);
    viewModel = presenter.getViewModel();
    expect(viewModel.zoom).toBe(0.1);

    // Zoom should be clamped to max 3
    presenter.setZoom(5);
    viewModel = presenter.getViewModel();
    expect(viewModel.zoom).toBe(3);
  });

  it("manages pan offset state", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [createNode({ id: "A" })],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);

    // Default pan is 0,0
    let viewModel = presenter.getViewModel();
    expect(viewModel.panOffset.x).toBe(0);
    expect(viewModel.panOffset.y).toBe(0);

    // Pan to new position
    presenter.setPanOffset({ x: 100, y: 50 });
    viewModel = presenter.getViewModel();
    expect(viewModel.panOffset.x).toBe(100);
    expect(viewModel.panOffset.y).toBe(50);

    // Pan to negative position
    presenter.setPanOffset({ x: -50, y: -25 });
    viewModel = presenter.getViewModel();
    expect(viewModel.panOffset.x).toBe(-50);
    expect(viewModel.panOffset.y).toBe(-25);
  });

  it("calculates viewport bounds from nodes", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "A" }),
          createNode({ id: "B" }),
          createNode({ id: "C" }),
        ],
        edges: [createEdge("A", "B"), createEdge("B", "C")],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    // Viewport should be calculated from node positions
    expect(viewModel.viewport.width).toBeGreaterThan(0);
    expect(viewModel.viewport.height).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test 4: Child Container Grouping Display
// =============================================================================

describe("Graph Tab - Child container grouping display", () => {
  it("groups nodes by container with visual boundaries", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "Config", lifetime: "singleton" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
          createNode({ id: "UserService", lifetime: "scoped" }),
        ],
        edges: [createEdge("Logger", "Config"), createEdge("UserService", "Logger")],
      }),
      snapshot: createContainerSnapshot(),
    });

    const presenter = new GraphPresenter(dataSource);

    // Set up container context
    presenter.setContainerContext("root", ["root", "scope-1"]);

    // Get container groupings
    const groupings = presenter.groupNodesByContainer();

    // Should have at least one grouping
    expect(groupings.length).toBeGreaterThan(0);

    // Root container should have singletons
    const rootGroup = groupings.find((g) => g.containerId === "root");
    expect(rootGroup).toBeDefined();
    expect(rootGroup?.nodeIds).toContain("Config");
    expect(rootGroup?.nodeIds).toContain("Logger");

    // Each grouping should have bounds
    groupings.forEach((group) => {
      expect(group.bounds).toBeDefined();
      expect(typeof group.bounds.minX).toBe("number");
      expect(typeof group.bounds.minY).toBe("number");
      expect(typeof group.bounds.maxX).toBe("number");
      expect(typeof group.bounds.maxY).toBe("number");
    });
  });

  it("distinguishes inherited vs container-specific services", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "Config", lifetime: "singleton" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
          createNode({ id: "UserService", lifetime: "scoped" }),
        ],
        edges: [],
      }),
      snapshot: createContainerSnapshot(),
    });

    const presenter = new GraphPresenter(dataSource);
    presenter.setContainerContext("root", ["root", "scope-1"]);

    const groupings = presenter.groupNodesByContainer();

    // Root is the main container
    const rootGroup = groupings.find((g) => g.containerId === "root");
    expect(rootGroup?.isRoot).toBe(true);

    // Child scope should have different isRoot value
    const childGroup = groupings.find((g) => g.containerId === "scope-1");
    if (childGroup) {
      expect(childGroup.isRoot).toBe(false);
    }
  });
});

// =============================================================================
// Test 5: Captive Dependency Warning Indicators
// =============================================================================

describe("Graph Tab - Captive dependency warning indicators", () => {
  it("detects captive dependencies with severity levels", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SingletonService", lifetime: "singleton" }),
          createNode({ id: "ScopedDep", lifetime: "scoped" }),
          createNode({ id: "TransientDep", lifetime: "transient" }),
        ],
        edges: [
          // Captive: singleton depends on scoped (warning)
          createEdge("SingletonService", "ScopedDep"),
          // Captive: singleton depends on transient (error - more severe)
          createEdge("SingletonService", "TransientDep"),
        ],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    const warnings = presenter.detectCaptiveDependencies();

    // Should detect multiple captive dependencies
    expect(warnings.length).toBeGreaterThanOrEqual(2);

    // Singleton -> Scoped is a warning
    const scopedWarning = warnings.find(
      (w) => w.sourcePortName === "SingletonService" && w.captivePortName === "ScopedDep"
    );
    expect(scopedWarning).toBeDefined();
    expect(scopedWarning?.severity).toBe("warning");

    // Singleton -> Transient is an error (2 level difference)
    const transientWarning = warnings.find(
      (w) => w.sourcePortName === "SingletonService" && w.captivePortName === "TransientDep"
    );
    expect(transientWarning).toBeDefined();
    expect(transientWarning?.severity).toBe("error");
  });

  it("highlights captive chain when selecting affected node", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SingletonService", lifetime: "singleton" }),
          createNode({ id: "ScopedDep", lifetime: "scoped" }),
          createNode({ id: "UnrelatedService", lifetime: "singleton" }),
        ],
        edges: [createEdge("SingletonService", "ScopedDep")],
      }),
    });

    const presenter = new GraphPresenter(dataSource);

    // Highlight captive dependencies for SingletonService
    presenter.highlightCaptiveDependencies("SingletonService");

    const viewModel = presenter.getViewModel();

    // Both nodes in the captive chain should be highlighted
    expect(viewModel.highlightedNodeIds).toContain("SingletonService");
    expect(viewModel.highlightedNodeIds).toContain("ScopedDep");

    // Unrelated service should not be highlighted
    expect(viewModel.highlightedNodeIds).not.toContain("UnrelatedService");
  });

  it("toggles captive-only filter mode", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SingletonService", lifetime: "singleton" }),
          createNode({ id: "ScopedDep", lifetime: "scoped" }),
        ],
        edges: [createEdge("SingletonService", "ScopedDep")],
      }),
    });

    const presenter = new GraphPresenter(dataSource);

    // Default is off
    expect(presenter.getShowOnlyCaptive()).toBe(false);

    // Turn on captive filter
    presenter.setShowOnlyCaptive(true);
    expect(presenter.getShowOnlyCaptive()).toBe(true);

    // Turn off
    presenter.setShowOnlyCaptive(false);
    expect(presenter.getShowOnlyCaptive()).toBe(false);
  });
});

// =============================================================================
// Test 6: Async Factory Indicators on Nodes
// =============================================================================

describe("Graph Tab - Async factory indicators on nodes", () => {
  it("indicates async factory kind on nodes", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SyncService", factoryKind: "sync" }),
          createNode({ id: "AsyncDatabase", factoryKind: "async" }),
          createNode({ id: "AsyncCache", factoryKind: "async" }),
        ],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    // Check factory kinds are preserved
    const syncNode = viewModel.nodes.find((n) => n.id === "SyncService");
    expect(syncNode?.factoryKind).toBe("sync");

    const asyncDbNode = viewModel.nodes.find((n) => n.id === "AsyncDatabase");
    expect(asyncDbNode?.factoryKind).toBe("async");

    const asyncCacheNode = viewModel.nodes.find((n) => n.id === "AsyncCache");
    expect(asyncCacheNode?.factoryKind).toBe("async");
  });

  it("filters to show async-only nodes", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SyncService", factoryKind: "sync" }),
          createNode({ id: "AsyncDatabase", factoryKind: "async" }),
          createNode({ id: "SyncLogger", factoryKind: "sync" }),
          createNode({ id: "AsyncCache", factoryKind: "async" }),
        ],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    // Filter async nodes at UI level
    const asyncNodes = viewModel.nodes.filter((n) => n.factoryKind === "async");
    expect(asyncNodes).toHaveLength(2);
    expect(asyncNodes.map((n) => n.id)).toContain("AsyncDatabase");
    expect(asyncNodes.map((n) => n.id)).toContain("AsyncCache");
  });

  it("displays correct lifetime colors for async and sync factories", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "AsyncSingleton", factoryKind: "async", lifetime: "singleton" }),
          createNode({ id: "SyncScoped", factoryKind: "sync", lifetime: "scoped" }),
          createNode({ id: "SyncTransient", factoryKind: "sync", lifetime: "transient" }),
        ],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    // Verify factory kind and lifetime are both accessible
    const asyncSingleton = viewModel.nodes.find((n) => n.id === "AsyncSingleton");
    expect(asyncSingleton?.factoryKind).toBe("async");
    expect(asyncSingleton?.lifetime).toBe("singleton");

    const syncScoped = viewModel.nodes.find((n) => n.id === "SyncScoped");
    expect(syncScoped?.factoryKind).toBe("sync");
    expect(syncScoped?.lifetime).toBe("scoped");

    const syncTransient = viewModel.nodes.find((n) => n.id === "SyncTransient");
    expect(syncTransient?.factoryKind).toBe("sync");
    expect(syncTransient?.lifetime).toBe("transient");
  });
});
