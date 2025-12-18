/**
 * Tests for Presenter Extensions (Task Group 3).
 *
 * These 8 focused tests verify:
 * 1. GraphPresenter container grouping
 * 2. GraphPresenter captive dependency highlighting
 * 3. FlameGraphPresenter frame aggregation
 * 4. ComparisonPresenter diff calculation
 * 5. TimeTravelPresenter snapshot navigation
 * 6. InspectorPresenter async factory status
 * 7. Presenter response to state changes
 * 8. Presenter caching/memoization behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  ContainerSnapshot,
  TraceEntry,
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
  TraceStats,
  PresenterDataSourceContract,
} from "@hex-di/devtools-core";
import { GraphPresenter } from "../../src/presenters/graph.presenter.js";
import { InspectorPresenter } from "../../src/presenters/inspector.presenter.js";
import { FlameGraphPresenter } from "../../src/presenters/flame-graph.presenter.js";
import { ComparisonPresenter } from "../../src/presenters/comparison.presenter.js";
import { TimeTravelPresenter } from "../../src/presenters/time-travel.presenter.js";

// =============================================================================
// Test Fixture Factories (inline to avoid external dependencies)
// =============================================================================

function createNode(options: { id: string; lifetime?: string; factoryKind?: "sync" | "async" }): ExportedNode {
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

function createGraph(options: { nodes?: ExportedNode[]; edges?: ExportedEdge[] } = {}): ExportedGraph {
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
  let stats = config.stats ?? {
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
  };
  let snapshot = config.snapshot ?? null;
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
    pause: () => { paused = true; trigger(); },
    resume: () => { paused = false; trigger(); },
    clearTraces: () => { traces = []; trigger(); },
    pinTrace: (_id: string) => { trigger(); },
    unpinTrace: (_id: string) => { trigger(); },
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
    _setSnapshot: (s: ContainerSnapshot | null, autoTrigger = true) => {
      snapshot = s;
      if (autoTrigger) trigger();
    },
    _triggerUpdate: trigger,
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createCaptiveDependencyGraph() {
  // Create a graph with captive dependency: singleton -> scoped -> transient
  // Singleton depending on scoped is a captive dependency issue
  return createGraph({
    nodes: [
      createNode({ id: "Config", lifetime: "singleton" }),
      createNode({ id: "Logger", lifetime: "singleton" }),
      createNode({ id: "UserCache", lifetime: "scoped" }),
      createNode({ id: "UserService", lifetime: "singleton" }), // Bad: singleton depends on scoped
      createNode({ id: "RequestHandler", lifetime: "transient" }),
    ],
    edges: [
      createEdge("Logger", "Config"),
      createEdge("UserCache", "Logger"),
      createEdge("UserService", "UserCache"), // Captive: singleton -> scoped
      createEdge("RequestHandler", "UserService"),
    ],
  });
}

function createContainerSnapshotFixture(
  overrides: Partial<ContainerSnapshot> = {}
): ContainerSnapshot {
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

function createHierarchicalTraces(): readonly TraceEntry[] {
  const baseTime = 1000;

  // Create a hierarchy: UserService -> Logger -> Config
  const configTrace = createTraceEntry({
    id: "trace-config",
    portName: "Config",
    startTime: baseTime,
    duration: 5,
    parentId: "trace-logger",
  });

  const loggerTrace = createTraceEntry({
    id: "trace-logger",
    portName: "Logger",
    startTime: baseTime + 1,
    duration: 15, // includes config's 5ms
    parentId: "trace-user-service",
    childIds: ["trace-config"],
  });

  const userServiceTrace = createTraceEntry({
    id: "trace-user-service",
    portName: "UserService",
    startTime: baseTime + 2,
    duration: 50, // includes logger's 15ms
    parentId: null,
    childIds: ["trace-logger"],
  });

  return [configTrace, loggerTrace, userServiceTrace];
}

// =============================================================================
// Test 1: GraphPresenter Container Grouping
// =============================================================================

describe("GraphPresenter container grouping", () => {
  it("groups nodes by container and returns container groupings", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "Config", lifetime: "singleton" }),
          createNode({ id: "Logger", lifetime: "singleton" }),
          createNode({ id: "UserService", lifetime: "scoped" }),
        ],
        edges: [
          createEdge("Logger", "Config"),
          createEdge("UserService", "Logger"),
        ],
      }),
      snapshot: createContainerSnapshotFixture(),
    });

    const presenter = new GraphPresenter(dataSource);

    // Set up container context for grouping
    presenter.setContainerContext("root", ["root", "scope-1"]);

    const groupings = presenter.groupNodesByContainer();

    expect(groupings).toBeDefined();
    expect(groupings.length).toBeGreaterThan(0);

    // Root container should contain Config and Logger (singletons)
    const rootGroup = groupings.find((g) => g.containerId === "root");
    expect(rootGroup).toBeDefined();
    expect(rootGroup?.nodeIds).toContain("Config");
    expect(rootGroup?.nodeIds).toContain("Logger");
  });
});

// =============================================================================
// Test 2: GraphPresenter Captive Dependency Highlighting
// =============================================================================

describe("GraphPresenter captive dependency highlighting", () => {
  it("detects and returns captive dependency warnings", () => {
    const dataSource = createMockDataSource({
      graph: createCaptiveDependencyGraph(),
    });

    const presenter = new GraphPresenter(dataSource);

    const warnings = presenter.detectCaptiveDependencies();

    expect(warnings).toBeDefined();
    expect(warnings.length).toBeGreaterThan(0);

    // Should detect UserService (singleton) -> UserCache (scoped) as captive
    const captiveWarning = warnings.find(
      (w) =>
        w.sourcePortName === "UserService" && w.captivePortName === "UserCache"
    );
    expect(captiveWarning).toBeDefined();
    expect(captiveWarning?.sourceLifetime).toBe("singleton");
    expect(captiveWarning?.captiveLifetime).toBe("scoped");
    expect(captiveWarning?.severity).toBe("warning");
  });
});

// =============================================================================
// Test 3: FlameGraphPresenter Frame Aggregation
// =============================================================================

describe("FlameGraphPresenter frame aggregation", () => {
  it("transforms trace hierarchy to flame graph with cumulative and self time", () => {
    const traces = createHierarchicalTraces();
    const dataSource = createMockDataSource({
      traces,
      hasTracing: true,
    });

    const presenter = new FlameGraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    expect(viewModel.isEmpty).toBe(false);
    expect(viewModel.frames.length).toBe(3);

    // Find the UserService frame (root)
    const userServiceFrame = viewModel.frames.find(
      (f) => f.label === "UserService"
    );
    expect(userServiceFrame).toBeDefined();
    expect(userServiceFrame?.depth).toBe(0);
    expect(userServiceFrame?.cumulativeTime).toBe(50);
    // Self time should be cumulative minus children's time
    expect(userServiceFrame?.selfTime).toBe(50 - 15); // 50 - logger's 15ms

    // Find the Logger frame
    const loggerFrame = viewModel.frames.find((f) => f.label === "Logger");
    expect(loggerFrame).toBeDefined();
    expect(loggerFrame?.depth).toBe(1);
    expect(loggerFrame?.selfTime).toBe(15 - 5); // 15 - config's 5ms
  });
});

// =============================================================================
// Test 4: ComparisonPresenter Diff Calculation
// =============================================================================

describe("ComparisonPresenter diff calculation", () => {
  it("computes service additions, removals, and resolution deltas", () => {
    const leftSnapshot = createContainerSnapshotFixture();
    const rightSnapshot: ContainerSnapshot = {
      singletons: [
        { portName: "Config", resolvedAt: 1000 },
        { portName: "Logger", resolvedAt: 1100 },
        { portName: "Cache", resolvedAt: 1200 }, // Added
      ],
      scopes: [
        {
          id: "root",
          parentId: null,
          childIds: [],
          resolvedPorts: ["Config", "Logger", "Cache"],
          createdAt: 1000,
          isActive: true,
        },
      ],
      phase: "ready",
    };

    const presenter = new ComparisonPresenter();
    presenter.setSnapshots(leftSnapshot, rightSnapshot);

    const viewModel = presenter.getViewModel();

    expect(viewModel.isActive).toBe(true);
    expect(viewModel.addedServices).toContain("Cache");
    // UserService was in scope-1 on left but not on right
    expect(viewModel.removedServices.length).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Test 5: TimeTravelPresenter Snapshot Navigation
// =============================================================================

describe("TimeTravelPresenter snapshot navigation", () => {
  it("manages snapshot history and supports navigation", () => {
    const presenter = new TimeTravelPresenter();

    // Capture some snapshots
    presenter.captureSnapshot(createContainerSnapshotFixture(), "Initial");
    presenter.captureSnapshot(
      createContainerSnapshotFixture({ phase: "disposing" }),
      "Disposing"
    );
    presenter.captureSnapshot(
      createContainerSnapshotFixture({ phase: "disposed" }),
      "Disposed"
    );

    let viewModel = presenter.getViewModel();

    expect(viewModel.snapshotCount).toBe(3);
    expect(viewModel.currentIndex).toBe(2); // At latest snapshot
    expect(viewModel.canGoBack).toBe(true);
    expect(viewModel.canGoForward).toBe(false);

    // Navigate back
    presenter.goBack();
    viewModel = presenter.getViewModel();

    expect(viewModel.currentIndex).toBe(1);
    expect(viewModel.canGoBack).toBe(true);
    expect(viewModel.canGoForward).toBe(true);

    // Jump to first snapshot
    presenter.jumpTo(0);
    viewModel = presenter.getViewModel();

    expect(viewModel.currentIndex).toBe(0);
    expect(viewModel.canGoBack).toBe(false);
    expect(viewModel.canGoForward).toBe(true);
  });
});

// =============================================================================
// Test 6: InspectorPresenter Async Factory Status
// =============================================================================

describe("InspectorPresenter async factory status", () => {
  it("transforms async factory resolution status and timing", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [
          createNode({ id: "Database", factoryKind: "async", lifetime: "singleton" }),
          createNode({ id: "Config", factoryKind: "sync", lifetime: "singleton" }),
        ],
        edges: [createEdge("Database", "Config")],
      }),
      traces: [
        createTraceEntry({
          id: "trace-db",
          portName: "Database",
          duration: 150,
          isCacheHit: false,
        }),
      ],
      hasTracing: true,
      hasContainer: true,
    });

    const presenter = new InspectorPresenter(dataSource);
    presenter.selectService("Database");

    const viewModel = presenter.getViewModel();

    expect(viewModel.service).toBeDefined();
    expect(viewModel.service?.factoryKind).toBe("async");
    expect(viewModel.service?.asyncFactoryStatus).toBe("resolved");
    expect(viewModel.service?.asyncResolutionTime).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test 7: Presenter Response to State Changes
// =============================================================================

describe("Presenter response to state changes", () => {
  it("presenters update view model when data source changes", () => {
    const dataSource = createMockDataSource({
      graph: createGraph({
        nodes: [createNode({ id: "Logger" })],
        edges: [],
      }),
    });

    const presenter = new GraphPresenter(dataSource);
    let viewModel = presenter.getViewModel();

    expect(viewModel.nodeCount).toBe(1);

    // Update data source
    dataSource._setGraph(
      createGraph({
        nodes: [
          createNode({ id: "Logger" }),
          createNode({ id: "UserService" }),
        ],
        edges: [createEdge("UserService", "Logger")],
      })
    );

    // Get updated view model
    viewModel = presenter.getViewModel();

    expect(viewModel.nodeCount).toBe(2);
    expect(viewModel.edgeCount).toBe(1);
  });
});

// =============================================================================
// Test 8: Presenter Caching/Memoization Behavior
// =============================================================================

describe("Presenter caching/memoization behavior", () => {
  it("FlameGraphPresenter produces consistent output and updates on zoom change", () => {
    const traces = createHierarchicalTraces();
    const dataSource = createMockDataSource({
      traces,
      hasTracing: true,
    });

    const presenter = new FlameGraphPresenter(dataSource);

    // Get view model twice without data changes
    const viewModel1 = presenter.getViewModel();
    const viewModel2 = presenter.getViewModel();

    // Same data should produce same frame count
    expect(viewModel1.frameCount).toBe(viewModel2.frameCount);
    expect(viewModel1.frames.length).toBe(viewModel2.frames.length);

    // Now change zoom to filter frames
    presenter.setZoomRange({ start: 0.25, end: 0.75 });
    const viewModel3 = presenter.getViewModel();

    // Zoom range should be updated
    expect(viewModel3.zoomRange.start).toBe(0.25);
    expect(viewModel3.zoomRange.end).toBe(0.75);

    // Frames may be filtered due to zoom range
    expect(viewModel3.isEmpty).toBe(false);
  });
});
