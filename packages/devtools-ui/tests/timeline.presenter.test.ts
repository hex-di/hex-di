/**
 * Tests for TimelinePresenter.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockDataSource,
  createTestTraces,
  createCacheHitTraces,
  createSlowTraces,
  createTraceEntry,
  createTraceStats,
  createStatsFromTraces,
  type MockDataSourceActions,
} from "@hex-di/devtools-testing";
import type { PresenterDataSourceContract } from "@hex-di/devtools-core";
import { TimelinePresenter } from "../src/presenters/timeline.presenter.js";

describe("TimelinePresenter", () => {
  let mockDataSource: PresenterDataSourceContract & MockDataSourceActions;
  let presenter: TimelinePresenter;
  const baseTime = 1000000;

  beforeEach(() => {
    const traces = createTestTraces(baseTime);
    mockDataSource = createMockDataSource({
      traces,
      stats: createStatsFromTraces(traces),
      hasTracing: true,
    });
    presenter = new TimelinePresenter(mockDataSource);
  });

  // ===========================================================================
  // Basic View Model
  // ===========================================================================

  describe("getViewModel", () => {
    it("should return empty view model when tracing is disabled", () => {
      mockDataSource = createMockDataSource({ hasTracing: false });
      presenter = new TimelinePresenter(mockDataSource);
      const vm = presenter.getViewModel();

      expect(vm.isEmpty).toBe(true);
      expect(vm.entries).toHaveLength(0);
    });

    it("should return empty view model when no traces", () => {
      mockDataSource._setTraces([]);
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(0);
      expect(vm.isEmpty).toBe(true); // isEmpty is true when no entries exist
    });

    it("should transform traces to entries", () => {
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(3);
      expect(vm.totalCount).toBe(3);
      expect(vm.visibleCount).toBe(3);
    });

    it("should include entry details", () => {
      const vm = presenter.getViewModel();

      const loggerEntry = vm.entries.find((e) => e.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      expect(loggerEntry!.lifetime).toBe("singleton");
      expect(loggerEntry!.durationMs).toBe(2);
      expect(loggerEntry!.isCacheHit).toBe(false);
      expect(loggerEntry!.isPinned).toBe(false);
    });

    it("should format duration correctly", () => {
      const vm = presenter.getViewModel();

      const loggerEntry = vm.entries.find((e) => e.portName === "Logger");
      expect(loggerEntry!.durationFormatted).toContain("ms");
    });

    it("should calculate time range", () => {
      const vm = presenter.getViewModel();

      expect(vm.timeRange.startMs).toBe(baseTime);
      expect(vm.timeRange.endMs).toBeGreaterThan(baseTime);
      expect(vm.timeRange.durationMs).toBeGreaterThan(0);
    });

    it("should calculate relative positions", () => {
      const vm = presenter.getViewModel();

      vm.entries.forEach((entry) => {
        expect(entry.relativePosition).toBeGreaterThanOrEqual(0);
        expect(entry.relativePosition).toBeLessThanOrEqual(1);
        expect(entry.relativeWidth).toBeGreaterThan(0);
      });
    });

    it("should track parent-child depth", () => {
      const vm = presenter.getViewModel();

      // UserService is parent, should have depth 0 (root)
      // Logger and Config are children, should have depth 1
      const userServiceEntry = vm.entries.find(
        (e) => e.portName === "UserService"
      );
      const loggerEntry = vm.entries.find((e) => e.portName === "Logger");

      expect(userServiceEntry!.depth).toBe(0);
      expect(loggerEntry!.depth).toBe(1);
    });

    it("should include default settings", () => {
      const vm = presenter.getViewModel();

      expect(vm.grouping).toBe("none");
      expect(vm.sortOrder).toBe("time");
      expect(vm.sortDescending).toBe(false);
      expect(vm.selectedEntryId).toBeNull();
      expect(vm.expandedEntryIds).toHaveLength(0);
      expect(vm.filterText).toBe("");
      expect(vm.showOnlyCacheHits).toBe(false);
      expect(vm.showOnlySlow).toBe(false);
    });

    it("should reflect paused state", () => {
      mockDataSource.pause();
      const vm = presenter.getViewModel();

      expect(vm.isPaused).toBe(true);
    });
  });

  // ===========================================================================
  // Entry Selection
  // ===========================================================================

  describe("selectEntry", () => {
    it("should mark entry as selected", () => {
      const traces = createTestTraces(baseTime);
      presenter.selectEntry(traces[0]!.id);
      const vm = presenter.getViewModel();

      expect(vm.selectedEntryId).toBe(traces[0]!.id);
    });

    it("should deselect when passing null", () => {
      const traces = createTestTraces(baseTime);
      presenter.selectEntry(traces[0]!.id);
      presenter.selectEntry(null);
      const vm = presenter.getViewModel();

      expect(vm.selectedEntryId).toBeNull();
    });
  });

  // ===========================================================================
  // Entry Expansion
  // ===========================================================================

  describe("toggleEntry", () => {
    it("should expand collapsed entry", () => {
      const traces = createTestTraces(baseTime);
      presenter.toggleEntry(traces[2]!.id);
      const vm = presenter.getViewModel();

      expect(vm.expandedEntryIds).toContain(traces[2]!.id);

      const entry = vm.entries.find((e) => e.id === traces[2]!.id);
      expect(entry!.isExpanded).toBe(true);
    });

    it("should collapse expanded entry", () => {
      const traces = createTestTraces(baseTime);
      presenter.toggleEntry(traces[2]!.id);
      presenter.toggleEntry(traces[2]!.id);
      const vm = presenter.getViewModel();

      expect(vm.expandedEntryIds).not.toContain(traces[2]!.id);
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe("setFilterText", () => {
    it("should filter entries by port name", () => {
      presenter.setFilterText("Logger");
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(1);
      expect(vm.entries[0]!.portName).toBe("Logger");
      expect(vm.visibleCount).toBe(1);
      expect(vm.totalCount).toBe(3);
    });

    it("should be case-insensitive", () => {
      presenter.setFilterText("logger");
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(1);
      expect(vm.entries[0]!.portName).toBe("Logger");
    });

    it("should clear filter with empty string", () => {
      presenter.setFilterText("Logger");
      presenter.setFilterText("");
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(3);
    });
  });

  describe("setShowOnlyCacheHits", () => {
    it("should filter to only cache hits", () => {
      const cacheTraces = createCacheHitTraces(baseTime);
      mockDataSource._setTraces(cacheTraces);

      presenter.setShowOnlyCacheHits(true);
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(2); // Logger and Config are cache hits
      vm.entries.forEach((entry) => {
        expect(entry.isCacheHit).toBe(true);
      });
    });
  });

  describe("setShowOnlySlow", () => {
    it("should filter to only slow resolutions", () => {
      const slowTraces = createSlowTraces(baseTime, 100);
      mockDataSource._setTraces(slowTraces);

      presenter.setSlowThreshold(100);
      presenter.setShowOnlySlow(true);
      const vm = presenter.getViewModel();

      expect(vm.entries).toHaveLength(2); // Database and Cache are slow
      vm.entries.forEach((entry) => {
        expect(entry.isSlow).toBe(true);
      });
    });
  });

  describe("setSlowThreshold", () => {
    it("should update slow threshold", () => {
      presenter.setSlowThreshold(5);
      const vm = presenter.getViewModel();

      expect(vm.slowThresholdMs).toBe(5);
    });

    it("should recalculate isSlow based on new threshold", () => {
      presenter.setSlowThreshold(5);
      const vm = presenter.getViewModel();

      const userServiceEntry = vm.entries.find(
        (e) => e.portName === "UserService"
      );
      expect(userServiceEntry!.isSlow).toBe(true); // Duration is 10ms, threshold is 5ms
    });
  });

  // ===========================================================================
  // Sorting
  // ===========================================================================

  describe("setSortOrder", () => {
    it("should sort by time ascending by default", () => {
      const vm = presenter.getViewModel();

      for (let i = 1; i < vm.entries.length; i++) {
        const current = vm.entries[i]!;
        const previous = vm.entries[i - 1]!;
        expect(new Date(current.startTime).getTime()).toBeGreaterThanOrEqual(
          new Date(previous.startTime).getTime()
        );
      }
    });

    it("should sort by duration", () => {
      presenter.setSortOrder("duration", false);
      const vm = presenter.getViewModel();

      for (let i = 1; i < vm.entries.length; i++) {
        expect(vm.entries[i]!.durationMs).toBeGreaterThanOrEqual(
          vm.entries[i - 1]!.durationMs
        );
      }
    });

    it("should sort descending when specified", () => {
      presenter.setSortOrder("duration", true);
      const vm = presenter.getViewModel();

      for (let i = 1; i < vm.entries.length; i++) {
        expect(vm.entries[i]!.durationMs).toBeLessThanOrEqual(
          vm.entries[i - 1]!.durationMs
        );
      }
    });

    it("should sort by name", () => {
      presenter.setSortOrder("name", false);
      const vm = presenter.getViewModel();

      for (let i = 1; i < vm.entries.length; i++) {
        expect(
          vm.entries[i]!.portName.localeCompare(vm.entries[i - 1]!.portName)
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ===========================================================================
  // Grouping
  // ===========================================================================

  describe("setGrouping", () => {
    beforeEach(() => {
      // Create traces with different ports and lifetimes
      mockDataSource._setTraces([
        createTraceEntry({
          id: "t1",
          portName: "Logger",
          lifetime: "singleton",
          startTime: baseTime,
        }),
        createTraceEntry({
          id: "t2",
          portName: "Logger",
          lifetime: "singleton",
          startTime: baseTime + 10,
        }),
        createTraceEntry({
          id: "t3",
          portName: "UserService",
          lifetime: "scoped",
          startTime: baseTime + 20,
        }),
        createTraceEntry({
          id: "t4",
          portName: "AuthService",
          lifetime: "scoped",
          startTime: baseTime + 30,
        }),
      ]);
    });

    it("should return no groups when grouping is none", () => {
      presenter.setGrouping("none");
      const vm = presenter.getViewModel();

      expect(vm.groups).toHaveLength(0);
    });

    it("should group by port name", () => {
      presenter.setGrouping("port");
      const vm = presenter.getViewModel();

      expect(vm.groups.length).toBeGreaterThan(0);

      const loggerGroup = vm.groups.find((g) => g.id === "Logger");
      expect(loggerGroup).toBeDefined();
      expect(loggerGroup!.entries).toHaveLength(2);
    });

    it("should group by lifetime", () => {
      presenter.setGrouping("lifetime");
      const vm = presenter.getViewModel();

      const singletonGroup = vm.groups.find((g) => g.id === "singleton");
      const scopedGroup = vm.groups.find((g) => g.id === "scoped");

      expect(singletonGroup).toBeDefined();
      expect(scopedGroup).toBeDefined();
      expect(singletonGroup!.entries).toHaveLength(2);
      expect(scopedGroup!.entries).toHaveLength(2);
    });

    it("should include group statistics", () => {
      presenter.setGrouping("port");
      const vm = presenter.getViewModel();

      const loggerGroup = vm.groups.find((g) => g.id === "Logger");
      expect(loggerGroup!.totalDurationMs).toBeGreaterThan(0);
      expect(loggerGroup!.cacheHitCount).toBeDefined();
      expect(loggerGroup!.slowCount).toBeDefined();
    });
  });

  // ===========================================================================
  // Cache Hit Traces
  // ===========================================================================

  describe("cache hit handling", () => {
    it("should correctly identify cache hits", () => {
      const cacheTraces = createCacheHitTraces(baseTime);
      mockDataSource._setTraces(cacheTraces);
      const vm = presenter.getViewModel();

      const cachedLogger = vm.entries.find(
        (e) => e.portName === "Logger" && e.isCacheHit
      );
      expect(cachedLogger).toBeDefined();
      expect(cachedLogger!.durationMs).toBeLessThan(1);
    });
  });

  // ===========================================================================
  // Slow Traces
  // ===========================================================================

  describe("slow trace handling", () => {
    it("should correctly identify slow traces", () => {
      const slowTraces = createSlowTraces(baseTime, 100);
      mockDataSource._setTraces(slowTraces);
      presenter.setSlowThreshold(100);
      const vm = presenter.getViewModel();

      const database = vm.entries.find((e) => e.portName === "Database");
      const logger = vm.entries.find((e) => e.portName === "Logger");

      expect(database!.isSlow).toBe(true);
      expect(logger!.isSlow).toBe(false);
    });
  });

  // ===========================================================================
  // Duration Formatting
  // ===========================================================================

  describe("duration formatting", () => {
    it("should format microseconds", () => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", duration: 0.5 }),
      ]);
      const vm = presenter.getViewModel();

      expect(vm.entries[0]!.durationFormatted).toContain("us");
    });

    it("should format milliseconds", () => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", duration: 50 }),
      ]);
      const vm = presenter.getViewModel();

      expect(vm.entries[0]!.durationFormatted).toContain("ms");
    });

    it("should format seconds", () => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", duration: 1500 }),
      ]);
      const vm = presenter.getViewModel();

      expect(vm.entries[0]!.durationFormatted).toContain("s");
    });
  });
});
