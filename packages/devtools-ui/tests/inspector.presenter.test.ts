/**
 * Tests for InspectorPresenter.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockDataSource,
  createComplexTestGraph,
  createTestGraph,
  createEmptyGraph,
  createTestTraces,
  createTraceEntry,
  createStatsFromTraces,
  type MockDataSourceActions,
} from "@hex-di/devtools-testing";
import type {
  PresenterDataSourceContract,
  ContainerSnapshot,
  ScopeInfo,
} from "@hex-di/devtools-core";
import { InspectorPresenter } from "../src/presenters/inspector.presenter.js";

// Helper to create test scope data
function createScopeInfo(overrides: Partial<ScopeInfo> & { id: string }): ScopeInfo {
  return {
    id: overrides.id,
    parentId: overrides.parentId ?? null,
    childIds: overrides.childIds ?? [],
    resolvedPorts: overrides.resolvedPorts ?? [],
    createdAt: overrides.createdAt ?? Date.now(),
    isActive: overrides.isActive ?? true,
  };
}

// Helper to create test snapshot
function createSnapshot(scopes: readonly ScopeInfo[]): ContainerSnapshot {
  return {
    scopes,
    singletons: [],
    phase: "ready",
  };
}

describe("InspectorPresenter", () => {
  let mockDataSource: PresenterDataSourceContract & MockDataSourceActions;
  let presenter: InspectorPresenter;
  const baseTime = 1000000;

  beforeEach(() => {
    const traces = createTestTraces(baseTime);
    const scopes: readonly ScopeInfo[] = [
      createScopeInfo({
        id: "root",
        childIds: ["scope-1"],
        resolvedPorts: ["Logger", "Config"],
      }),
      createScopeInfo({
        id: "scope-1",
        parentId: "root",
        resolvedPorts: ["UserService"],
      }),
    ];

    mockDataSource = createMockDataSource({
      graph: createComplexTestGraph(),
      traces,
      stats: createStatsFromTraces(traces),
      snapshot: createSnapshot(scopes),
      hasTracing: true,
      hasContainer: true,
    });
    presenter = new InspectorPresenter(mockDataSource);
  });

  // ===========================================================================
  // Basic View Model
  // ===========================================================================

  describe("getViewModel", () => {
    it("should return empty view model when no data available", () => {
      mockDataSource = createMockDataSource({
        hasTracing: false,
        hasContainer: false,
      });
      presenter = new InspectorPresenter(mockDataSource);
      const vm = presenter.getViewModel();

      expect(vm.hasData).toBe(false);
    });

    it("should return view model with data when container is available", () => {
      const vm = presenter.getViewModel();

      expect(vm.hasData).toBe(true);
    });

    it("should return view model with data when tracing is available", () => {
      mockDataSource = createMockDataSource({
        hasTracing: true,
        hasContainer: false,
        graph: createTestGraph(),
        traces: createTestTraces(baseTime),
      });
      presenter = new InspectorPresenter(mockDataSource);
      const vm = presenter.getViewModel();

      expect(vm.hasData).toBe(true);
    });

    it("should include default settings", () => {
      const vm = presenter.getViewModel();

      expect(vm.target).toBe("none");
      expect(vm.filterText).toBe("");
      expect(vm.showDependencies).toBe(true);
      expect(vm.showDependents).toBe(true);
    });
  });

  // ===========================================================================
  // Service Selection
  // ===========================================================================

  describe("selectService", () => {
    it("should set target to service when selecting", () => {
      presenter.selectService("Logger");
      const vm = presenter.getViewModel();

      expect(vm.target).toBe("service");
    });

    it("should return service info when selected", () => {
      presenter.selectService("Logger");
      const vm = presenter.getViewModel();

      expect(vm.service).not.toBeNull();
      expect(vm.service!.portName).toBe("Logger");
      expect(vm.service!.lifetime).toBe("singleton");
    });

    it("should include resolution statistics", () => {
      // Add traces for Logger
      mockDataSource._setTraces([
        createTraceEntry({
          id: "t1",
          portName: "Logger",
          duration: 5,
          isCacheHit: false,
        }),
        createTraceEntry({
          id: "t2",
          portName: "Logger",
          duration: 0.1,
          isCacheHit: true,
        }),
        createTraceEntry({
          id: "t3",
          portName: "Logger",
          duration: 0.1,
          isCacheHit: true,
        }),
      ]);

      presenter.selectService("Logger");
      const vm = presenter.getViewModel();

      expect(vm.service!.resolutionCount).toBe(3);
      expect(vm.service!.cacheHitCount).toBe(2);
      expect(vm.service!.cacheHitRate).toBeCloseTo(2 / 3);
      expect(vm.service!.avgDurationMs).toBeGreaterThan(0);
    });

    it("should set target to none when deselecting", () => {
      presenter.selectService("Logger");
      presenter.selectService(null);
      const vm = presenter.getViewModel();

      expect(vm.target).toBe("none");
      expect(vm.service).toBeNull();
    });

    it("should return null for non-existent service", () => {
      presenter.selectService("NonExistent");
      const vm = presenter.getViewModel();

      expect(vm.service).toBeNull();
    });
  });

  // ===========================================================================
  // Dependencies
  // ===========================================================================

  describe("dependencies", () => {
    it("should return dependencies for selected service", () => {
      presenter.selectService("UserService");
      const vm = presenter.getViewModel();

      expect(vm.dependencies.length).toBeGreaterThan(0);
    });

    it("should mark direct dependencies", () => {
      presenter.selectService("UserService");
      const vm = presenter.getViewModel();

      // UserService directly depends on UserRepository, AuthService, Logger, Config
      const userRepo = vm.dependencies.find(d => d.portName === "UserRepository");
      expect(userRepo!.isDirect).toBe(true);
      expect(userRepo!.depth).toBe(0);
    });

    it("should include transitive dependencies", () => {
      presenter.selectService("UserService");
      const vm = presenter.getViewModel();

      // UserService -> UserRepository -> Database
      const database = vm.dependencies.find(d => d.portName === "Database");
      expect(database).toBeDefined();
      expect(database!.isDirect).toBe(false);
      expect(database!.depth).toBeGreaterThan(0);
    });

    it("should include dependency lifetime", () => {
      presenter.selectService("UserService");
      const vm = presenter.getViewModel();

      const logger = vm.dependencies.find(d => d.portName === "Logger");
      expect(logger!.lifetime).toBe("singleton");
    });
  });

  // ===========================================================================
  // Dependents
  // ===========================================================================

  describe("dependents", () => {
    it("should return dependents for selected service", () => {
      presenter.selectService("Logger");
      const vm = presenter.getViewModel();

      expect(vm.dependents.length).toBeGreaterThan(0);
    });

    it("should mark direct dependents", () => {
      presenter.selectService("Logger");
      const vm = presenter.getViewModel();

      // AuthService and UserService directly depend on Logger
      const authService = vm.dependents.find(d => d.portName === "AuthService");
      expect(authService!.isDirect).toBe(true);
    });

    it("should include transitive dependents", () => {
      presenter.selectService("Database");
      const vm = presenter.getViewModel();

      // UserService -> UserRepository -> Database
      const userService = vm.dependents.find(d => d.portName === "UserService");
      expect(userService).toBeDefined();
      expect(userService!.isDirect).toBe(false);
    });
  });

  // ===========================================================================
  // Scope Selection
  // ===========================================================================

  describe("selectScope", () => {
    it("should set target to scope when selecting", () => {
      presenter.selectScope("root");
      const vm = presenter.getViewModel();

      expect(vm.target).toBe("scope");
    });

    it("should return scope info when selected", () => {
      presenter.selectScope("root");
      const vm = presenter.getViewModel();

      expect(vm.scope).not.toBeNull();
      expect(vm.scope!.id).toBe("root");
      expect(vm.scope!.isActive).toBe(true);
    });

    it("should include scope hierarchy info", () => {
      presenter.selectScope("scope-1");
      const vm = presenter.getViewModel();

      expect(vm.scope!.parentId).toBe("root");
      expect(vm.scope!.depth).toBe(1);
    });

    it("should return services resolved in scope", () => {
      presenter.selectScope("scope-1");
      const vm = presenter.getViewModel();

      expect(vm.scopeServices.length).toBeGreaterThan(0);
      const userService = vm.scopeServices.find(s => s.portName === "UserService");
      expect(userService).toBeDefined();
    });

    it("should clear service selection when selecting scope", () => {
      presenter.selectService("Logger");
      presenter.selectScope("root");
      const vm = presenter.getViewModel();

      expect(vm.target).toBe("scope");
      expect(vm.service).toBeNull();
    });

    it("should set target to none when deselecting", () => {
      presenter.selectScope("root");
      presenter.selectScope(null);
      const vm = presenter.getViewModel();

      expect(vm.target).toBe("none");
      expect(vm.scope).toBeNull();
    });
  });

  // ===========================================================================
  // Scope Tree
  // ===========================================================================

  describe("scope tree", () => {
    it("should build scope tree from snapshot", () => {
      const vm = presenter.getViewModel();

      expect(vm.scopeTree).toHaveLength(2);
    });

    it("should include scope metadata in tree", () => {
      const vm = presenter.getViewModel();

      const rootScope = vm.scopeTree.find(s => s.id === "root");
      expect(rootScope).toBeDefined();
      expect(rootScope!.childIds).toContain("scope-1");
      expect(rootScope!.resolvedCount).toBe(2);
    });

    it("should calculate scope depth", () => {
      const vm = presenter.getViewModel();

      const rootScope = vm.scopeTree.find(s => s.id === "root");
      const childScope = vm.scopeTree.find(s => s.id === "scope-1");

      expect(rootScope!.depth).toBe(0);
      expect(childScope!.depth).toBe(1);
    });
  });

  // ===========================================================================
  // Scope Expansion
  // ===========================================================================

  describe("toggleScopeExpand", () => {
    it("should expand collapsed scope", () => {
      presenter.toggleScopeExpand("root");
      const vm = presenter.getViewModel();

      const rootScope = vm.scopeTree.find(s => s.id === "root");
      expect(rootScope!.isExpanded).toBe(true);
    });

    it("should collapse expanded scope", () => {
      presenter.toggleScopeExpand("root");
      presenter.toggleScopeExpand("root");
      const vm = presenter.getViewModel();

      const rootScope = vm.scopeTree.find(s => s.id === "root");
      expect(rootScope!.isExpanded).toBe(false);
    });
  });

  // ===========================================================================
  // Filter
  // ===========================================================================

  describe("setFilterText", () => {
    it("should update filter text", () => {
      presenter.setFilterText("Logger");
      const vm = presenter.getViewModel();

      expect(vm.filterText).toBe("Logger");
    });
  });

  // ===========================================================================
  // Visibility Toggles
  // ===========================================================================

  describe("setShowDependencies", () => {
    it("should update dependencies visibility", () => {
      presenter.setShowDependencies(false);
      const vm = presenter.getViewModel();

      expect(vm.showDependencies).toBe(false);
    });
  });

  describe("setShowDependents", () => {
    it("should update dependents visibility", () => {
      presenter.setShowDependents(false);
      const vm = presenter.getViewModel();

      expect(vm.showDependents).toBe(false);
    });
  });

  // ===========================================================================
  // Duration Formatting
  // ===========================================================================

  describe("duration formatting", () => {
    it("should format service duration correctly", () => {
      mockDataSource._setTraces([
        createTraceEntry({
          id: "t1",
          portName: "Logger",
          duration: 50,
        }),
      ]);

      presenter.selectService("Logger");
      const vm = presenter.getViewModel();

      expect(vm.service!.avgDurationFormatted).toContain("ms");
    });
  });

  // ===========================================================================
  // Empty States
  // ===========================================================================

  describe("empty states", () => {
    it("should return empty dependencies when no service selected", () => {
      const vm = presenter.getViewModel();

      expect(vm.dependencies).toHaveLength(0);
    });

    it("should return empty dependents when no service selected", () => {
      const vm = presenter.getViewModel();

      expect(vm.dependents).toHaveLength(0);
    });

    it("should return empty scope services when no scope selected", () => {
      const vm = presenter.getViewModel();

      expect(vm.scopeServices).toHaveLength(0);
    });

    it("should return empty scope tree when no snapshot", () => {
      mockDataSource._setSnapshot(null);
      const vm = presenter.getViewModel();

      expect(vm.scopeTree).toHaveLength(0);
    });
  });

  // ===========================================================================
  // View Model Immutability
  // ===========================================================================

  describe("immutability", () => {
    it("should return frozen objects", () => {
      presenter.selectService("UserService");
      const vm = presenter.getViewModel();

      expect(Object.isFrozen(vm.dependencies)).toBe(true);
      expect(Object.isFrozen(vm.dependents)).toBe(true);
      expect(Object.isFrozen(vm.scopeTree)).toBe(true);
    });
  });

  // ===========================================================================
  // Deep Scope Hierarchy
  // ===========================================================================

  describe("deep scope hierarchy", () => {
    beforeEach(() => {
      const deepScopes: readonly ScopeInfo[] = [
        createScopeInfo({
          id: "root",
          childIds: ["level1"],
        }),
        createScopeInfo({
          id: "level1",
          parentId: "root",
          childIds: ["level2"],
        }),
        createScopeInfo({
          id: "level2",
          parentId: "level1",
          childIds: ["level3"],
        }),
        createScopeInfo({
          id: "level3",
          parentId: "level2",
        }),
      ];
      mockDataSource._setSnapshot(createSnapshot(deepScopes));
    });

    it("should calculate correct depth for nested scopes", () => {
      const vm = presenter.getViewModel();

      const level3 = vm.scopeTree.find(s => s.id === "level3");
      expect(level3!.depth).toBe(3);
    });
  });
});
