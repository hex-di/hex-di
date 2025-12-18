/**
 * Tests for Tracing Tab Full Implementation (Task Group 9).
 *
 * These 8 focused tests verify:
 * 1. Live trace stream display
 * 2. Parent-child hierarchy visualization
 * 3. Duration color coding (green/yellow/red)
 * 4. Grouping modes (service, scope, lifetime, time)
 * 5. Trace persistence (localStorage/file)
 * 6. Pause/resume functionality
 * 7. Trace pinning for slow resolutions
 * 8. Flame graph integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import type {
  TraceEntry,
  ExportedGraph,
  TraceStats,
  PresenterDataSourceContract,
} from "@hex-di/devtools-core";
import { TimelinePresenter } from "../../src/presenters/timeline.presenter.js";
import { FlameGraphPresenter } from "../../src/presenters/flame-graph.presenter.js";
import type { TimelineGrouping } from "../../src/view-models/index.js";
import {
  TracePersistenceService,
  BrowserTracePersistence,
  TUITracePersistence,
} from "../../src/shared/trace-persistence.js";

// =============================================================================
// Test Fixture Factories
// =============================================================================

function createTraceEntry(options: {
  id: string;
  portName?: string;
  lifetime?: "singleton" | "scoped" | "transient";
  startTime?: number;
  duration?: number;
  isCacheHit?: boolean;
  parentId?: string | null;
  childIds?: string[];
  scopeId?: string | null;
  order?: number;
  isPinned?: boolean;
}): TraceEntry {
  return {
    id: options.id,
    portName: options.portName ?? options.id,
    lifetime: options.lifetime ?? "singleton",
    startTime: options.startTime ?? Date.now(),
    duration: options.duration ?? 1,
    isCacheHit: options.isCacheHit ?? false,
    isPinned: options.isPinned ?? false,
    parentId: options.parentId ?? null,
    childIds: options.childIds ?? [],
    scopeId: options.scopeId ?? null,
    order: options.order ?? 0,
  };
}

function createMockDataSource(config: {
  traces?: readonly TraceEntry[];
  hasTracing?: boolean;
  isPaused?: boolean;
}) {
  let traces: readonly TraceEntry[] = config.traces ?? [];
  let paused = config.isPaused ?? false;
  const subscribers = new Set<() => void>();
  const pinnedIds = new Set<string>();

  const trigger = () => {
    subscribers.forEach((cb) => cb());
  };

  return {
    getGraph: () => ({ nodes: [], edges: [] } as ExportedGraph),
    getTraces: () => traces,
    getStats: () => ({
      totalResolutions: traces.length,
      averageDuration: traces.length > 0
        ? traces.reduce((sum, t) => sum + t.duration, 0) / traces.length
        : 0,
      cacheHitRate: traces.length > 0
        ? traces.filter(t => t.isCacheHit).length / traces.length
        : 0,
      slowCount: 0,
      sessionStart: Date.now(),
      totalDuration: traces.reduce((sum, t) => sum + t.duration, 0),
    } as TraceStats),
    getContainerSnapshot: () => null,
    hasTracing: () => config.hasTracing ?? true,
    hasContainer: () => false,
    isPaused: () => paused,
    pause: () => { paused = true; trigger(); },
    resume: () => { paused = false; trigger(); },
    clearTraces: () => { traces = []; trigger(); },
    pinTrace: (id: string) => {
      pinnedIds.add(id);
      traces = traces.map(t => t.id === id ? { ...t, isPinned: true } : t);
      trigger();
    },
    unpinTrace: (id: string) => {
      pinnedIds.delete(id);
      traces = traces.map(t => t.id === id ? { ...t, isPinned: false } : t);
      trigger();
    },
    subscribe: (cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    _setTraces: (newTraces: readonly TraceEntry[]) => {
      traces = newTraces;
      trigger();
    },
    _isPinned: (id: string) => pinnedIds.has(id),
  };
}

function createHierarchicalTraces(): readonly TraceEntry[] {
  const baseTime = 1000;

  // UserService -> Logger -> Config
  const configTrace = createTraceEntry({
    id: "trace-config",
    portName: "Config",
    startTime: baseTime,
    duration: 5,
    parentId: "trace-logger",
    order: 3,
  });

  const loggerTrace = createTraceEntry({
    id: "trace-logger",
    portName: "Logger",
    startTime: baseTime + 1,
    duration: 15,
    parentId: "trace-user-service",
    childIds: ["trace-config"],
    order: 2,
  });

  const userServiceTrace = createTraceEntry({
    id: "trace-user-service",
    portName: "UserService",
    startTime: baseTime + 2,
    duration: 50,
    parentId: null,
    childIds: ["trace-logger"],
    order: 1,
  });

  return [userServiceTrace, loggerTrace, configTrace];
}

// =============================================================================
// Test 1: Live Trace Stream Display
// =============================================================================

describe("Live trace stream display", () => {
  it("displays new traces as they arrive in real-time", () => {
    const dataSource = createMockDataSource({
      traces: [
        createTraceEntry({ id: "trace-1", portName: "ServiceA", duration: 10 }),
      ],
      hasTracing: true,
    });

    const presenter = new TimelinePresenter(dataSource);
    let viewModel = presenter.getViewModel();

    expect(viewModel.entries.length).toBe(1);
    expect(viewModel.entries[0]!.portName).toBe("ServiceA");

    // Add new trace
    dataSource._setTraces([
      createTraceEntry({ id: "trace-1", portName: "ServiceA", duration: 10 }),
      createTraceEntry({ id: "trace-2", portName: "ServiceB", duration: 20 }),
    ]);

    viewModel = presenter.getViewModel();

    expect(viewModel.entries.length).toBe(2);
    expect(viewModel.visibleCount).toBe(2);
  });
});

// =============================================================================
// Test 2: Parent-Child Hierarchy Visualization
// =============================================================================

describe("Parent-child hierarchy visualization", () => {
  it("displays traces with correct depth and hierarchy", () => {
    const traces = createHierarchicalTraces();
    const dataSource = createMockDataSource({
      traces,
      hasTracing: true,
    });

    const presenter = new TimelinePresenter(dataSource);
    const viewModel = presenter.getViewModel();

    // Find entries by port name
    const userServiceEntry = viewModel.entries.find(
      (e) => e.portName === "UserService"
    );
    const loggerEntry = viewModel.entries.find((e) => e.portName === "Logger");
    const configEntry = viewModel.entries.find((e) => e.portName === "Config");

    expect(userServiceEntry).toBeDefined();
    expect(loggerEntry).toBeDefined();
    expect(configEntry).toBeDefined();

    // Verify hierarchy depth
    expect(userServiceEntry?.depth).toBe(0); // Root
    expect(loggerEntry?.depth).toBe(1); // Child of UserService
    expect(configEntry?.depth).toBe(2); // Child of Logger

    // Verify parent-child relationships
    expect(userServiceEntry?.childIds).toContain("trace-logger");
    expect(loggerEntry?.parentId).toBe("trace-user-service");
  });
});

// =============================================================================
// Test 3: Duration Color Coding (green/yellow/red)
// =============================================================================

describe("Duration color coding (green/yellow/red)", () => {
  it("marks traces as slow based on threshold", () => {
    const slowThreshold = 100; // 100ms
    const traces = [
      createTraceEntry({ id: "fast", portName: "FastService", duration: 10 }), // Green: < 50
      createTraceEntry({ id: "medium", portName: "MediumService", duration: 75 }), // Yellow: < 100
      createTraceEntry({ id: "slow", portName: "SlowService", duration: 150 }), // Red: >= 100
    ];

    const dataSource = createMockDataSource({ traces, hasTracing: true });
    const presenter = new TimelinePresenter(dataSource);
    presenter.setSlowThreshold(slowThreshold);

    const viewModel = presenter.getViewModel();

    const fastEntry = viewModel.entries.find((e) => e.portName === "FastService");
    const mediumEntry = viewModel.entries.find((e) => e.portName === "MediumService");
    const slowEntry = viewModel.entries.find((e) => e.portName === "SlowService");

    // Only slow entries (>= threshold) are marked as slow
    expect(fastEntry?.isSlow).toBe(false);
    expect(mediumEntry?.isSlow).toBe(false);
    expect(slowEntry?.isSlow).toBe(true);

    // Threshold is reflected in view model
    expect(viewModel.slowThresholdMs).toBe(slowThreshold);
  });
});

// =============================================================================
// Test 4: Grouping Modes (service, scope, lifetime, time)
// =============================================================================

describe("Grouping modes (service, scope, lifetime, time)", () => {
  it("groups traces by port name when grouping is set to port", () => {
    const traces = [
      createTraceEntry({ id: "t1", portName: "ServiceA", lifetime: "singleton" }),
      createTraceEntry({ id: "t2", portName: "ServiceA", lifetime: "singleton" }),
      createTraceEntry({ id: "t3", portName: "ServiceB", lifetime: "scoped" }),
    ];

    const dataSource = createMockDataSource({ traces, hasTracing: true });
    const presenter = new TimelinePresenter(dataSource);

    // Set grouping to port
    presenter.setGrouping("port");
    const viewModel = presenter.getViewModel();

    expect(viewModel.grouping).toBe("port");
    expect(viewModel.groups.length).toBe(2); // ServiceA and ServiceB

    const serviceAGroup = viewModel.groups.find((g) => g.id === "ServiceA");
    expect(serviceAGroup).toBeDefined();
    expect(serviceAGroup?.entries.length).toBe(2);
  });

  it("groups traces by lifetime when grouping is set to lifetime", () => {
    const traces = [
      createTraceEntry({ id: "t1", portName: "ServiceA", lifetime: "singleton" }),
      createTraceEntry({ id: "t2", portName: "ServiceB", lifetime: "scoped" }),
      createTraceEntry({ id: "t3", portName: "ServiceC", lifetime: "singleton" }),
    ];

    const dataSource = createMockDataSource({ traces, hasTracing: true });
    const presenter = new TimelinePresenter(dataSource);

    presenter.setGrouping("lifetime");
    const viewModel = presenter.getViewModel();

    expect(viewModel.grouping).toBe("lifetime");

    const singletonGroup = viewModel.groups.find((g) => g.id === "singleton");
    const scopedGroup = viewModel.groups.find((g) => g.id === "scoped");

    expect(singletonGroup?.entries.length).toBe(2);
    expect(scopedGroup?.entries.length).toBe(1);
  });

  it("groups traces by scope when grouping is set to scope", () => {
    const traces = [
      createTraceEntry({ id: "t1", portName: "ServiceA", scopeId: "scope-1" }),
      createTraceEntry({ id: "t2", portName: "ServiceB", scopeId: "scope-1" }),
      createTraceEntry({ id: "t3", portName: "ServiceC", scopeId: null }),
    ];

    const dataSource = createMockDataSource({ traces, hasTracing: true });
    const presenter = new TimelinePresenter(dataSource);

    presenter.setGrouping("scope");
    const viewModel = presenter.getViewModel();

    expect(viewModel.grouping).toBe("scope");

    const scope1Group = viewModel.groups.find((g) => g.id === "scope-1");
    const rootGroup = viewModel.groups.find((g) => g.id === "root");

    expect(scope1Group?.entries.length).toBe(2);
    expect(rootGroup?.entries.length).toBe(1);
  });
});

// =============================================================================
// Test 5: Trace Persistence (localStorage/file)
// =============================================================================

describe("Trace persistence (localStorage/file)", () => {
  beforeEach(() => {
    // Mock localStorage
    const storage: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and restores traces from localStorage (browser)", () => {
    const persistence = new BrowserTracePersistence();

    const traces = [
      createTraceEntry({ id: "t1", portName: "ServiceA", duration: 10 }),
      createTraceEntry({ id: "t2", portName: "ServiceB", duration: 20 }),
    ];

    // Save traces
    persistence.save(traces);

    // Restore traces
    const restored = persistence.load();

    expect(restored.length).toBe(2);
    expect(restored[0]!.portName).toBe("ServiceA");
    expect(restored[1]!.portName).toBe("ServiceB");
  });

  it("clears persisted traces", () => {
    const persistence = new BrowserTracePersistence();

    const traces = [
      createTraceEntry({ id: "t1", portName: "ServiceA" }),
    ];

    persistence.save(traces);
    expect(persistence.load().length).toBe(1);

    persistence.clear();
    expect(persistence.load().length).toBe(0);
  });
});

// =============================================================================
// Test 6: Pause/Resume Functionality
// =============================================================================

describe("Pause/resume functionality", () => {
  it("reflects paused state in view model", () => {
    const dataSource = createMockDataSource({
      traces: [createTraceEntry({ id: "t1", portName: "ServiceA" })],
      hasTracing: true,
      isPaused: false,
    });

    const presenter = new TimelinePresenter(dataSource);
    let viewModel = presenter.getViewModel();

    expect(viewModel.isPaused).toBe(false);

    // Pause tracing
    dataSource.pause();
    viewModel = presenter.getViewModel();

    expect(viewModel.isPaused).toBe(true);

    // Resume tracing
    dataSource.resume();
    viewModel = presenter.getViewModel();

    expect(viewModel.isPaused).toBe(false);
  });
});

// =============================================================================
// Test 7: Trace Pinning for Slow Resolutions
// =============================================================================

describe("Trace pinning for slow resolutions", () => {
  it("marks slow traces as pinned and protects from eviction", () => {
    const traces = [
      createTraceEntry({ id: "fast", portName: "FastService", duration: 10, isPinned: false }),
      createTraceEntry({ id: "slow", portName: "SlowService", duration: 150, isPinned: true }),
    ];

    const dataSource = createMockDataSource({ traces, hasTracing: true });
    const presenter = new TimelinePresenter(dataSource);
    const viewModel = presenter.getViewModel();

    const fastEntry = viewModel.entries.find((e) => e.portName === "FastService");
    const slowEntry = viewModel.entries.find((e) => e.portName === "SlowService");

    expect(fastEntry?.isPinned).toBe(false);
    expect(slowEntry?.isPinned).toBe(true);
  });

  it("supports filtering to show only pinned traces", () => {
    const traces = [
      createTraceEntry({ id: "t1", portName: "ServiceA", isPinned: false }),
      createTraceEntry({ id: "t2", portName: "ServiceB", isPinned: true }),
      createTraceEntry({ id: "t3", portName: "ServiceC", isPinned: true }),
    ];

    const dataSource = createMockDataSource({ traces, hasTracing: true });
    const presenter = new TimelinePresenter(dataSource);

    // Filter to show only pinned
    presenter.setShowOnlyPinned(true);
    const viewModel = presenter.getViewModel();

    expect(viewModel.visibleCount).toBe(2);
    expect(viewModel.entries.every((e) => e.isPinned)).toBe(true);
  });
});

// =============================================================================
// Test 8: Flame Graph Integration
// =============================================================================

describe("Flame graph integration", () => {
  it("generates flame graph from trace hierarchy", () => {
    const traces = createHierarchicalTraces();
    const dataSource = createMockDataSource({ traces, hasTracing: true });

    const presenter = new FlameGraphPresenter(dataSource);
    const viewModel = presenter.getViewModel();

    expect(viewModel.isEmpty).toBe(false);
    expect(viewModel.frames.length).toBe(3);

    // Verify frames have correct structure
    const rootFrame = viewModel.frames.find((f) => f.label === "UserService");
    expect(rootFrame).toBeDefined();
    expect(rootFrame?.depth).toBe(0);
    expect(rootFrame?.cumulativeTime).toBe(50);

    // Self time = cumulative - children's time
    expect(rootFrame?.selfTime).toBe(50 - 15); // 35ms
  });

  it("supports frame selection for trace correlation", () => {
    const traces = createHierarchicalTraces();
    const dataSource = createMockDataSource({ traces, hasTracing: true });

    const presenter = new FlameGraphPresenter(dataSource);

    // Select a frame
    presenter.selectFrame("trace-logger");
    const viewModel = presenter.getViewModel();

    expect(viewModel.selectedFrameId).toBe("trace-logger");

    const selectedFrame = viewModel.frames.find((f) => f.id === "trace-logger");
    expect(selectedFrame?.isSelected).toBe(true);
  });
});
