import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setLastCreatedInspector,
  getLastCreatedInspector,
  clearLastCreatedInspector,
} from "../../src/sandbox/container-bridge.js";
import type { InspectorAPI } from "@hex-di/core";

// =============================================================================
// Minimal mock inspector for instrumentation tests
// =============================================================================

function createMockInspector(): InspectorAPI {
  return {
    getSnapshot: vi.fn(() => ({
      kind: "root" as const,
      phase: "initialized" as const,
      isInitialized: true,
      asyncAdaptersTotal: 0,
      asyncAdaptersInitialized: 0,
      singletons: [],
      scopes: {
        id: "root",
        status: "active" as const,
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
      isDisposed: false,
      containerName: "Test",
    })),
    getScopeTree: vi.fn(() => ({
      id: "root",
      status: "active" as const,
      resolvedCount: 0,
      totalCount: 0,
      children: [],
      resolvedPorts: [],
    })),
    getGraphData: vi.fn(() => ({
      adapters: [],
      containerName: "Test",
      kind: "root" as const,
      parentName: null,
    })),
    getUnifiedSnapshot: vi.fn(() => ({
      timestamp: Date.now(),
      container: {
        kind: "root" as const,
        phase: "initialized" as const,
        isInitialized: true,
        asyncAdaptersTotal: 0,
        asyncAdaptersInitialized: 0,
        singletons: [],
        scopes: {
          id: "root",
          status: "active" as const,
          resolvedCount: 0,
          totalCount: 0,
          children: [],
          resolvedPorts: [],
        },
        isDisposed: false,
        containerName: "Test",
      },
      libraries: {},
      registeredLibraries: [],
    })),
    getAdapterInfo: vi.fn(() => []),
    getLibraryInspectors: vi.fn(() => new Map()),
    getAllResultStatistics: vi.fn(() => new Map()),
    subscribe: vi.fn(() => () => {}),
    listPorts: vi.fn(() => []),
    isResolved: vi.fn(() => false),
    getContainerKind: vi.fn(() => "root" as const),
    getPhase: vi.fn(() => "initialized" as const),
    isDisposed: false,
    getChildContainers: vi.fn(() => []),
    getResultStatistics: vi.fn(() => undefined),
    getHighErrorRatePorts: vi.fn(() => []),
    registerLibrary: vi.fn(() => () => {}),
    getLibraryInspector: vi.fn(() => undefined),
    queryLibraries: vi.fn(() => []),
    queryByLibrary: vi.fn(() => []),
    queryByKey: vi.fn(() => []),
  };
}

// =============================================================================
// Tests for the instrumentation pattern used in worker-entry.ts
//
// The worker wraps createContainer so that after each call, the container's
// inspector is captured via setLastCreatedInspector(). These tests verify
// the bridge state management that the instrumentation depends on.
// =============================================================================

describe("worker createContainer instrumentation", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("setLastCreatedInspector captures inspector for later retrieval", () => {
    const inspector = createMockInspector();

    // Simulates what the worker wrapper does after createContainer returns
    setLastCreatedInspector(inspector);

    expect(getLastCreatedInspector()).toBe(inspector);
  });

  it("multiple calls capture the last inspector (last container wins)", () => {
    const inspector1 = createMockInspector();
    const inspector2 = createMockInspector();

    setLastCreatedInspector(inspector1);
    expect(getLastCreatedInspector()).toBe(inspector1);

    setLastCreatedInspector(inspector2);
    expect(getLastCreatedInspector()).toBe(inspector2);
    expect(getLastCreatedInspector()).not.toBe(inspector1);
  });

  it("clearLastCreatedInspector resets state between execution runs", () => {
    const inspector = createMockInspector();
    setLastCreatedInspector(inspector);
    expect(getLastCreatedInspector()).toBe(inspector);

    // Simulates what executeUserCode does before running new code
    clearLastCreatedInspector();

    expect(getLastCreatedInspector()).toBeUndefined();
  });

  it("clear then set cycle works correctly across runs", () => {
    const inspectorRun1 = createMockInspector();
    const inspectorRun2 = createMockInspector();

    // Run 1
    setLastCreatedInspector(inspectorRun1);
    expect(getLastCreatedInspector()).toBe(inspectorRun1);

    // Clear before run 2
    clearLastCreatedInspector();
    expect(getLastCreatedInspector()).toBeUndefined();

    // Run 2
    setLastCreatedInspector(inspectorRun2);
    expect(getLastCreatedInspector()).toBe(inspectorRun2);
  });
});
