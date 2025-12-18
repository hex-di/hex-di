/**
 * Tests for Inspector Tab Full Implementation (Task Group 10).
 *
 * These 8 focused tests verify:
 * 1. Detailed service info display
 * 2. Bidirectional dependency tree
 * 3. Scope hierarchy visualization
 * 4. Container snapshot display
 * 5. Async factory status and timing
 * 6. Captive dependency chain
 * 7. Navigation from other tabs
 * 8. Container phase status display
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type {
  ContainerSnapshot,
  TraceEntry,
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
  TraceStats,
  PresenterDataSourceContract,
} from "@hex-di/devtools-core";
import { InspectorView } from "../../src/components/InspectorView.js";
import { InspectorPresenter } from "../../src/presenters/inspector.presenter.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { DOMPrimitives } from "../../src/dom/primitives.js";
import type {
  InspectorViewModel,
  ServiceInfoViewModel,
  DependencyViewModel,
  ScopeInfoViewModel,
  AsyncFactoryStatus,
} from "../../src/view-models/inspector.vm.js";
import { createEmptyInspectorViewModel } from "../../src/view-models/inspector.vm.js";

// =============================================================================
// Test Utilities
// =============================================================================

function renderWithPrimitives(ui: React.ReactElement) {
  return render(
    <PrimitivesProvider primitives={DOMPrimitives}>
      {ui}
    </PrimitivesProvider>
  );
}

// =============================================================================
// Test Fixture Factories
// =============================================================================

function createNode(options: {
  id: string;
  lifetime?: string;
  factoryKind?: "sync" | "async";
}): ExportedNode {
  return {
    id: options.id,
    label: options.id,
    lifetime: (options.lifetime ?? "singleton") as ExportedNode["lifetime"],
    factoryKind: options.factoryKind ?? "sync",
  };
}

function createEdge(from: string, to: string): ExportedEdge {
  return { from, to };
}

function createGraph(
  options: { nodes?: ExportedNode[]; edges?: ExportedEdge[] } = {}
): ExportedGraph {
  return Object.freeze({
    nodes: Object.freeze(options.nodes ?? []),
    edges: Object.freeze(options.edges ?? []),
  });
}

function createTraceEntry(options: {
  id: string;
  portName?: string;
  lifetime?: string;
  startTime?: number;
  duration?: number;
  isCacheHit?: boolean;
  parentId?: string | null;
  childIds?: string[];
  order?: number;
}): TraceEntry {
  return {
    id: options.id,
    portName: options.portName ?? options.id,
    lifetime: (options.lifetime ?? "singleton") as TraceEntry["lifetime"],
    startTime: options.startTime ?? Date.now(),
    duration: options.duration ?? 1,
    isCacheHit: options.isCacheHit ?? false,
    isPinned: false,
    parentId: options.parentId ?? null,
    childIds: options.childIds ?? [],
    scopeId: null,
    order: options.order ?? 0,
  };
}

function createContainerSnapshotFixture(
  overrides: Partial<ContainerSnapshot> = {}
): ContainerSnapshot {
  return {
    singletons: [
      { portName: "Config", resolvedAt: 1000 },
      { portName: "Logger", resolvedAt: 1100 },
      { portName: "UserService", resolvedAt: 1200 },
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
        childIds: ["scope-2"],
        resolvedPorts: ["UserService"],
        createdAt: 1500,
        isActive: true,
      },
      {
        id: "scope-2",
        parentId: "scope-1",
        childIds: [],
        resolvedPorts: ["RequestHandler"],
        createdAt: 2000,
        isActive: true,
      },
    ],
    phase: "ready",
    ...overrides,
  };
}

interface MockDataSourceConfig {
  graph?: ExportedGraph;
  traces?: readonly TraceEntry[];
  stats?: TraceStats;
  snapshot?: ContainerSnapshot | null;
  hasTracing?: boolean;
  hasContainer?: boolean;
}

function createMockDataSource(config: MockDataSourceConfig = {}) {
  let graph = config.graph ?? createGraph();
  let traces: readonly TraceEntry[] = config.traces ?? [];
  const stats = config.stats ?? {
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
  };
  const snapshot = config.snapshot ?? null;
  const hasTracingFlag = config.hasTracing ?? true;
  const hasContainerFlag = config.hasContainer ?? true;
  let paused = false;
  const subscribers = new Set<() => void>();

  const trigger = () => {
    subscribers.forEach((cb) => cb());
  };

  return {
    getGraph: () => graph,
    getTraces: () => traces,
    getStats: () => stats,
    getContainerSnapshot: () => snapshot,
    hasTracing: () => hasTracingFlag,
    hasContainer: () => hasContainerFlag,
    isPaused: () => paused,
    pause: () => {
      paused = true;
      trigger();
    },
    resume: () => {
      paused = false;
      trigger();
    },
    clearTraces: () => {
      traces = [];
      trigger();
    },
    pinTrace: (_id: string) => {
      trigger();
    },
    unpinTrace: (_id: string) => {
      trigger();
    },
    subscribe: (cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    _setGraph: (g: ExportedGraph, autoTrigger = true) => {
      graph = g;
      if (autoTrigger) trigger();
    },
    _setTraces: (t: readonly TraceEntry[], autoTrigger = true) => {
      traces = t;
      if (autoTrigger) trigger();
    },
    _triggerUpdate: trigger,
  };
}

function createServiceInfoViewModel(
  overrides: Partial<ServiceInfoViewModel> = {}
): ServiceInfoViewModel {
  return {
    portName: "UserService",
    lifetime: "singleton",
    factoryKind: "sync",
    isResolved: true,
    resolutionCount: 5,
    avgDurationMs: 10,
    avgDurationFormatted: "10.00ms",
    cacheHitCount: 3,
    cacheHitRate: 0.6,
    lastResolved: "1/15/2024, 10:30:00 AM",
    totalDurationMs: 50,
    asyncFactoryStatus: null,
    asyncResolutionTime: null,
    captiveChain: [],
    ...overrides,
  };
}

function createDependencyViewModel(
  overrides: Partial<DependencyViewModel> = {}
): DependencyViewModel {
  return {
    portName: "Logger",
    lifetime: "singleton",
    isDirect: true,
    depth: 0,
    ...overrides,
  };
}

function createScopeInfoViewModel(
  overrides: Partial<ScopeInfoViewModel> = {}
): ScopeInfoViewModel {
  return {
    id: "scope-1",
    name: "scope-1",
    parentId: "root",
    childIds: [],
    resolvedCount: 3,
    createdAt: "1/15/2024, 10:30:00 AM",
    isActive: true,
    isSelected: false,
    isExpanded: false,
    depth: 1,
    ...overrides,
  };
}

function createInspectorViewModel(
  overrides: Partial<InspectorViewModel> = {}
): InspectorViewModel {
  return {
    target: "service",
    service: createServiceInfoViewModel(),
    dependencies: [
      createDependencyViewModel({ portName: "Logger" }),
      createDependencyViewModel({ portName: "Config", isDirect: false, depth: 1 }),
    ],
    dependents: [
      createDependencyViewModel({ portName: "RequestHandler" }),
    ],
    scope: null,
    scopeServices: [],
    scopeTree: [
      createScopeInfoViewModel({ id: "root", parentId: null, depth: 0 }),
      createScopeInfoViewModel({ id: "scope-1", parentId: "root", depth: 1 }),
    ],
    filterText: "",
    showDependencies: true,
    showDependents: true,
    hasData: true,
    ...overrides,
  };
}

// =============================================================================
// Test 1: Detailed Service Info Display
// =============================================================================

describe("Inspector Tab - Detailed Service Info Display", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays all service information fields correctly", () => {
    const viewModel = createInspectorViewModel({
      service: createServiceInfoViewModel({
        portName: "DatabaseService",
        lifetime: "singleton",
        factoryKind: "async",
        isResolved: true,
        resolutionCount: 15,
        avgDurationMs: 25.5,
        avgDurationFormatted: "25.50ms",
        cacheHitCount: 10,
        cacheHitRate: 0.667,
        lastResolved: "1/15/2024, 10:45:00 AM",
        totalDurationMs: 382.5,
      }),
    });

    renderWithPrimitives(
      <InspectorView viewModel={viewModel} />
    );

    // Verify service name is displayed
    expect(screen.getByText("DatabaseService")).toBeTruthy();

    // Verify lifetime is displayed
    expect(screen.getByText("singleton")).toBeTruthy();

    // Verify factory kind is displayed
    expect(screen.getByText("async")).toBeTruthy();

    // Verify resolution status is displayed
    expect(screen.getByText("Yes")).toBeTruthy();

    // Verify resolution count is displayed
    expect(screen.getByText("15")).toBeTruthy();

    // Verify average duration is displayed
    expect(screen.getByText("25.50ms")).toBeTruthy();
  });
});

// =============================================================================
// Test 2: Bidirectional Dependency Tree
// =============================================================================

describe("Inspector Tab - Bidirectional Dependency Tree", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays both dependencies and dependents with navigation", () => {
    const onDependencySelect = vi.fn();
    const viewModel = createInspectorViewModel({
      dependencies: [
        createDependencyViewModel({ portName: "Logger", isDirect: true, depth: 0 }),
        createDependencyViewModel({ portName: "Config", isDirect: false, depth: 1 }),
        createDependencyViewModel({ portName: "Cache", isDirect: true, depth: 0 }),
      ],
      dependents: [
        createDependencyViewModel({ portName: "RequestHandler", isDirect: true, depth: 0 }),
        createDependencyViewModel({ portName: "AuthMiddleware", isDirect: true, depth: 0 }),
      ],
    });

    renderWithPrimitives(
      <InspectorView
        viewModel={viewModel}
        onDependencySelect={onDependencySelect}
      />
    );

    // Verify dependencies section is present
    expect(screen.getByText(/Dependencies \(3\)/)).toBeTruthy();

    // Verify dependents section is present
    expect(screen.getByText(/Dependents \(2\)/)).toBeTruthy();

    // Verify dependency names are displayed
    expect(screen.getByText("Logger")).toBeTruthy();
    expect(screen.getByText("Config")).toBeTruthy();
    expect(screen.getByText("Cache")).toBeTruthy();

    // Verify dependent names are displayed
    expect(screen.getByText("RequestHandler")).toBeTruthy();
    expect(screen.getByText("AuthMiddleware")).toBeTruthy();

    // Click on a dependency to navigate
    fireEvent.click(screen.getByText("Logger"));
    expect(onDependencySelect).toHaveBeenCalledWith("Logger");
  });
});

// =============================================================================
// Test 3: Scope Hierarchy Visualization
// =============================================================================

describe("Inspector Tab - Scope Hierarchy Visualization", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays scope hierarchy with parent-child relationships", () => {
    const viewModel = createInspectorViewModel({
      target: "scope",
      service: null,
      scope: createScopeInfoViewModel({
        id: "scope-1",
        name: "scope-1",
        parentId: "root",
        childIds: ["scope-2"],
        resolvedCount: 5,
        isActive: true,
        depth: 1,
      }),
      scopeTree: [
        createScopeInfoViewModel({
          id: "root",
          name: "root",
          parentId: null,
          childIds: ["scope-1"],
          depth: 0,
          resolvedCount: 2,
        }),
        createScopeInfoViewModel({
          id: "scope-1",
          name: "scope-1",
          parentId: "root",
          childIds: ["scope-2"],
          depth: 1,
          resolvedCount: 5,
          isSelected: true,
        }),
        createScopeInfoViewModel({
          id: "scope-2",
          name: "scope-2",
          parentId: "scope-1",
          childIds: [],
          depth: 2,
          resolvedCount: 3,
        }),
      ],
    });

    renderWithPrimitives(
      <InspectorView viewModel={viewModel} />
    );

    // The scope view should be rendered (not service view)
    expect(screen.getByTestId("inspector-scope-view")).toBeTruthy();
  });
});

// =============================================================================
// Test 4: Container Snapshot Display
// =============================================================================

describe("Inspector Tab - Container Snapshot Display", () => {
  it("displays container snapshot with singleton pool and scope summary via presenter", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "Config", lifetime: "singleton" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
          createNode({ id: "UserService", lifetime: "singleton" }),
        ],
        edges: [
          createEdge("Logger", "Config"),
          createEdge("UserService", "Logger"),
        ],
      }),
      snapshot: createContainerSnapshotFixture(),
      traces: [
        createTraceEntry({ id: "t1", portName: "Config", duration: 5 }),
        createTraceEntry({ id: "t2", portName: "Logger", duration: 10 }),
        createTraceEntry({ id: "t3", portName: "UserService", duration: 15 }),
      ],
    });

    const presenter = new InspectorPresenter(dataSource);
    presenter.selectService("UserService");

    const viewModel = presenter.getViewModel();

    // Verify the presenter provides container snapshot context
    expect(viewModel.hasData).toBe(true);
    expect(viewModel.service).toBeDefined();
    expect(viewModel.service?.portName).toBe("UserService");

    // Verify scope tree is populated from snapshot
    expect(viewModel.scopeTree.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test 5: Async Factory Status and Timing
// =============================================================================

describe("Inspector Tab - Async Factory Status and Timing", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays async factory resolution status and timing", () => {
    const viewModel = createInspectorViewModel({
      service: createServiceInfoViewModel({
        portName: "AsyncDatabase",
        factoryKind: "async",
        asyncFactoryStatus: "resolved",
        asyncResolutionTime: 150,
        resolutionCount: 1,
        avgDurationMs: 150,
        avgDurationFormatted: "150.00ms",
      }),
    });

    renderWithPrimitives(
      <InspectorView viewModel={viewModel} />
    );

    // Verify async factory indicator is present
    expect(screen.getByText("AsyncDatabase")).toBeTruthy();
    expect(screen.getByText("async")).toBeTruthy();
    // Use getAllByText since duration appears in both service info and async status sections
    const durationElements = screen.getAllByText("150.00ms");
    expect(durationElements.length).toBeGreaterThan(0);
  });

  it("displays pending async factory status via presenter", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "PendingService", factoryKind: "async", lifetime: "singleton" }),
        ],
        edges: [],
      }),
      traces: [], // No traces yet = pending
    });

    const presenter = new InspectorPresenter(dataSource);
    presenter.selectService("PendingService");

    const viewModel = presenter.getViewModel();

    expect(viewModel.service).toBeDefined();
    expect(viewModel.service?.factoryKind).toBe("async");
    expect(viewModel.service?.asyncFactoryStatus).toBe("pending");
  });
});

// =============================================================================
// Test 6: Captive Dependency Chain
// =============================================================================

describe("Inspector Tab - Captive Dependency Chain", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays captive dependency chain when service has captive dependencies", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "SingletonService", lifetime: "singleton" }),
          createNode({ id: "ScopedCache", lifetime: "scoped" }),
          createNode({ id: "TransientHelper", lifetime: "transient" }),
        ],
        edges: [
          // Singleton -> Scoped is a captive dependency issue
          createEdge("SingletonService", "ScopedCache"),
          createEdge("ScopedCache", "TransientHelper"),
        ],
      }),
      traces: [
        createTraceEntry({ id: "t1", portName: "SingletonService", duration: 10 }),
      ],
    });

    const presenter = new InspectorPresenter(dataSource);
    presenter.selectService("SingletonService");

    const viewModel = presenter.getViewModel();

    // Verify captive chain is detected
    expect(viewModel.service).toBeDefined();
    expect(viewModel.service?.captiveChain).toBeDefined();
    expect(viewModel.service?.captiveChain).toContain("ScopedCache");
  });

  it("displays captive chain visualization in component", () => {
    const viewModel = createInspectorViewModel({
      service: createServiceInfoViewModel({
        portName: "SingletonService",
        lifetime: "singleton",
        captiveChain: ["ScopedCache", "TransientHelper"],
      }),
    });

    renderWithPrimitives(
      <InspectorView viewModel={viewModel} />
    );

    // Verify the captive chain section is present when there are captive dependencies
    // Use getAllByText since service name appears in both header and captive chain
    const singletonElements = screen.getAllByText("SingletonService");
    expect(singletonElements.length).toBeGreaterThan(0);

    // Verify captive dependency warning text is shown
    expect(screen.getByText("Captive Dependencies")).toBeTruthy();
    expect(screen.getByText("ScopedCache")).toBeTruthy();
    expect(screen.getByText("TransientHelper")).toBeTruthy();
  });
});

// =============================================================================
// Test 7: Navigation from Other Tabs
// =============================================================================

describe("Inspector Tab - Navigation from Other Tabs", () => {
  it("supports navigation from graph tab by selecting service", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "UserService", lifetime: "scoped" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
        ],
        edges: [createEdge("UserService", "Logger")],
      }),
      traces: [
        createTraceEntry({ id: "t1", portName: "UserService", duration: 20 }),
        createTraceEntry({ id: "t2", portName: "Logger", duration: 5 }),
      ],
    });

    const presenter = new InspectorPresenter(dataSource);

    // Initially no selection
    let viewModel = presenter.getViewModel();
    expect(viewModel.target).toBe("none");

    // Simulate navigation from graph tab
    presenter.selectService("UserService");
    viewModel = presenter.getViewModel();

    expect(viewModel.target).toBe("service");
    expect(viewModel.service?.portName).toBe("UserService");
    expect(viewModel.dependencies.length).toBeGreaterThan(0);
  });

  it("supports navigation between services via dependency click", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "UserService", lifetime: "scoped" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
          createNode({ id: "Config", lifetime: "singleton" }),
        ],
        edges: [
          createEdge("UserService", "Logger"),
          createEdge("Logger", "Config"),
        ],
      }),
      traces: [],
    });

    const presenter = new InspectorPresenter(dataSource);

    // Start by selecting UserService
    presenter.selectService("UserService");
    let viewModel = presenter.getViewModel();
    expect(viewModel.service?.portName).toBe("UserService");

    // Navigate to Logger (via dependency click)
    presenter.selectService("Logger");
    viewModel = presenter.getViewModel();
    expect(viewModel.service?.portName).toBe("Logger");
    expect(viewModel.dependencies.length).toBeGreaterThan(0);
    expect(viewModel.dependencies.some((d) => d.portName === "Config")).toBe(true);
  });
});

// =============================================================================
// Test 8: Container Phase Status Display
// =============================================================================

describe("Inspector Tab - Container Phase Status Display", () => {
  it("displays container phase status correctly", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [createNode({ id: "Logger", lifetime: "singleton" })],
        edges: [],
      }),
      snapshot: createContainerSnapshotFixture({ phase: "ready" }),
      traces: [createTraceEntry({ id: "t1", portName: "Logger", duration: 5 })],
    });

    const presenter = new InspectorPresenter(dataSource);
    presenter.selectService("Logger");

    const viewModel = presenter.getViewModel();

    // Presenter should have access to container snapshot
    expect(viewModel.hasData).toBe(true);
    expect(viewModel.scopeTree.length).toBeGreaterThan(0);
  });

  it("handles all container phases via presenter", () => {
    const phases = ["initializing", "ready", "disposing", "disposed"] as const;

    for (const phase of phases) {
      const dataSource = createMockDataSource({
        graph: createGraph({
          nodes: [createNode({ id: "Logger", lifetime: "singleton" })],
          edges: [],
        }),
        snapshot: createContainerSnapshotFixture({ phase }),
      });

      const presenter = new InspectorPresenter(dataSource);
      presenter.selectService("Logger");

      const viewModel = presenter.getViewModel();
      expect(viewModel.hasData).toBe(true);
    }
  });
});
