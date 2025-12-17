/**
 * Tests for StatsPresenter.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockDataSource,
  createTestTraces,
  createSlowTraces,
  createTraceEntry,
  createTraceStats,
  createStatsFromTraces,
  type MockDataSourceActions,
} from "@hex-di/devtools-testing";
import type { PresenterDataSourceContract } from "@hex-di/devtools-core";
import { StatsPresenter } from "../src/presenters/stats.presenter.js";

describe("StatsPresenter", () => {
  let mockDataSource: PresenterDataSourceContract & MockDataSourceActions;
  let presenter: StatsPresenter;
  const baseTime = 1000000;

  beforeEach(() => {
    const traces = createTestTraces(baseTime);
    mockDataSource = createMockDataSource({
      traces,
      stats: createStatsFromTraces(traces),
      hasTracing: true,
    });
    presenter = new StatsPresenter(mockDataSource);
  });

  // ===========================================================================
  // Basic View Model
  // ===========================================================================

  describe("getViewModel", () => {
    it("should return empty view model when tracing is disabled", () => {
      mockDataSource = createMockDataSource({ hasTracing: false });
      presenter = new StatsPresenter(mockDataSource);
      const vm = presenter.getViewModel();

      expect(vm.isEmpty).toBe(true);
    });

    it("should return empty view model when no traces", () => {
      mockDataSource._setTraces([]);
      const vm = presenter.getViewModel();

      expect(vm.isEmpty).toBe(true);
    });

    it("should return stats view model with data", () => {
      const vm = presenter.getViewModel();

      expect(vm.isEmpty).toBe(false);
      expect(vm.metrics).toBeDefined();
      expect(vm.lifetimeBreakdown).toBeDefined();
    });
  });

  // ===========================================================================
  // Metrics
  // ===========================================================================

  describe("metrics", () => {
    it("should calculate total resolutions", () => {
      const vm = presenter.getViewModel();

      expect(vm.metrics.totalResolutions.value).toBe(3);
      expect(vm.metrics.totalResolutions.formattedValue).toBe("3");
    });

    it("should calculate average duration", () => {
      const vm = presenter.getViewModel();

      // Test traces have durations: 2, 1, 10 -> avg = 4.33...
      expect(vm.metrics.averageDuration.value).toBeGreaterThan(0);
      expect(vm.metrics.averageDuration.formattedValue).toContain("ms");
    });

    it("should calculate cache hit rate", () => {
      const vm = presenter.getViewModel();

      expect(vm.metrics.cacheHitRate.value).toBeDefined();
      expect(vm.metrics.cacheHitRate.formattedValue).toContain("%");
    });

    it("should count slow resolutions", () => {
      const slowTraces = createSlowTraces(baseTime, 100);
      mockDataSource._setTraces(slowTraces);
      mockDataSource._setStats(createStatsFromTraces(slowTraces));

      const vm = presenter.getViewModel();

      expect(vm.metrics.slowResolutions.value).toBe(2);
    });

    it("should calculate session duration", () => {
      const vm = presenter.getViewModel();

      expect(vm.metrics.sessionDuration.value).toBeDefined();
    });

    it("should calculate resolutions per second", () => {
      const traces = createTestTraces(baseTime);
      const stats = createStatsFromTraces(traces);
      mockDataSource._setStats({
        ...stats,
        totalDuration: 1000, // 1 second
      });

      const vm = presenter.getViewModel();

      expect(vm.metrics.resolutionsPerSecond.value).toBe(3);
    });

    it("should include metric metadata", () => {
      const vm = presenter.getViewModel();

      expect(vm.metrics.totalResolutions.id).toBe("totalResolutions");
      expect(vm.metrics.totalResolutions.label).toBe("Total Resolutions");
      expect(vm.metrics.totalResolutions.unit).toBe("");
    });
  });

  // ===========================================================================
  // Lifetime Breakdown
  // ===========================================================================

  describe("lifetimeBreakdown", () => {
    beforeEach(() => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", lifetime: "singleton" }),
        createTraceEntry({ id: "t2", lifetime: "singleton" }),
        createTraceEntry({ id: "t3", lifetime: "scoped" }),
        createTraceEntry({ id: "t4", lifetime: "transient" }),
      ]);
    });

    it("should count singletons", () => {
      const vm = presenter.getViewModel();

      expect(vm.lifetimeBreakdown.singleton).toBe(2);
    });

    it("should count scoped", () => {
      const vm = presenter.getViewModel();

      expect(vm.lifetimeBreakdown.scoped).toBe(1);
    });

    it("should count transient (as request)", () => {
      const vm = presenter.getViewModel();

      expect(vm.lifetimeBreakdown.request).toBe(1);
    });

    it("should calculate total", () => {
      const vm = presenter.getViewModel();

      expect(vm.lifetimeBreakdown.total).toBe(4);
    });

    it("should format percentages", () => {
      const vm = presenter.getViewModel();

      expect(vm.lifetimeBreakdownFormatted.singleton).toBe("50.0%");
      expect(vm.lifetimeBreakdownFormatted.scoped).toBe("25.0%");
      expect(vm.lifetimeBreakdownFormatted.request).toBe("25.0%");
    });
  });

  // ===========================================================================
  // Top Services
  // ===========================================================================

  describe("topServicesByCount", () => {
    beforeEach(() => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", portName: "Logger" }),
        createTraceEntry({ id: "t2", portName: "Logger" }),
        createTraceEntry({ id: "t3", portName: "Logger" }),
        createTraceEntry({ id: "t4", portName: "UserService" }),
        createTraceEntry({ id: "t5", portName: "UserService" }),
        createTraceEntry({ id: "t6", portName: "Config" }),
      ]);
    });

    it("should rank services by resolution count", () => {
      const vm = presenter.getViewModel();

      expect(vm.topServicesByCount[0]!.portName).toBe("Logger");
      expect(vm.topServicesByCount[0]!.count).toBe(3);
      expect(vm.topServicesByCount[1]!.portName).toBe("UserService");
      expect(vm.topServicesByCount[1]!.count).toBe(2);
    });

    it("should include service statistics", () => {
      const vm = presenter.getViewModel();

      const logger = vm.topServicesByCount[0]!;
      expect(logger.totalDurationMs).toBeDefined();
      expect(logger.avgDurationMs).toBeDefined();
      expect(logger.avgDurationFormatted).toContain("ms");
      expect(logger.cacheHitRate).toBeDefined();
      expect(logger.cacheHitRateFormatted).toContain("%");
      expect(logger.percentOfTotal).toBe(50);
    });
  });

  describe("topServicesByDuration", () => {
    beforeEach(() => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", portName: "Database", duration: 100 }),
        createTraceEntry({ id: "t2", portName: "Logger", duration: 10 }),
        createTraceEntry({ id: "t3", portName: "Cache", duration: 50 }),
      ]);
    });

    it("should rank services by total duration", () => {
      const vm = presenter.getViewModel();

      expect(vm.topServicesByDuration[0]!.portName).toBe("Database");
      expect(vm.topServicesByDuration[0]!.totalDurationMs).toBe(100);
    });
  });

  describe("slowestServices", () => {
    beforeEach(() => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", portName: "Database", duration: 100 }),
        createTraceEntry({ id: "t2", portName: "Database", duration: 150 }),
        createTraceEntry({ id: "t3", portName: "Logger", duration: 10 }),
        createTraceEntry({ id: "t4", portName: "Cache", duration: 50 }),
      ]);
    });

    it("should rank services by average duration", () => {
      const vm = presenter.getViewModel();

      expect(vm.slowestServices[0]!.portName).toBe("Database");
      expect(vm.slowestServices[0]!.avgDurationMs).toBe(125);
    });
  });

  // ===========================================================================
  // Top Services Limit
  // ===========================================================================

  describe("setTopServicesLimit", () => {
    beforeEach(() => {
      const traces = [];
      for (let i = 0; i < 20; i++) {
        traces.push(createTraceEntry({ id: `t${i}`, portName: `Service${i}` }));
      }
      mockDataSource._setTraces(traces);
    });

    it("should limit the number of top services", () => {
      presenter.setTopServicesLimit(5);
      const vm = presenter.getViewModel();

      expect(vm.topServicesByCount.length).toBeLessThanOrEqual(5);
    });

    it("should clamp to minimum of 1", () => {
      presenter.setTopServicesLimit(0);
      const vm = presenter.getViewModel();

      expect(vm.topServicesByCount.length).toBe(1);
    });

    it("should clamp to maximum of 50", () => {
      presenter.setTopServicesLimit(100);
      const vm = presenter.getViewModel();

      expect(vm.topServicesByCount.length).toBe(20); // Only 20 unique services
    });
  });

  // ===========================================================================
  // Session Info
  // ===========================================================================

  describe("session info", () => {
    it("should include session start time", () => {
      const vm = presenter.getViewModel();

      expect(vm.sessionStart).toBeDefined();
      expect(typeof vm.sessionStart).toBe("string");
    });

    it("should include session duration", () => {
      const vm = presenter.getViewModel();

      expect(vm.sessionDuration).toBeDefined();
    });

    it("should include last updated timestamp", () => {
      const vm = presenter.getViewModel();

      expect(vm.lastUpdated).toBeDefined();
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
      mockDataSource._setStats({
        ...createTraceStats(),
        averageDuration: 0.5,
      });
      const vm = presenter.getViewModel();

      expect(vm.metrics.averageDuration.formattedValue).toContain("us");
    });

    it("should format milliseconds", () => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", duration: 50 }),
      ]);
      mockDataSource._setStats({
        ...createTraceStats(),
        averageDuration: 50,
      });
      const vm = presenter.getViewModel();

      expect(vm.metrics.averageDuration.formattedValue).toContain("ms");
    });

    it("should format seconds", () => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", duration: 1500 }),
      ]);
      mockDataSource._setStats({
        ...createTraceStats(),
        averageDuration: 1500,
      });
      const vm = presenter.getViewModel();

      expect(vm.metrics.averageDuration.formattedValue).toContain("s");
    });
  });

  // ===========================================================================
  // Cache Hit Rate
  // ===========================================================================

  describe("cache hit calculations", () => {
    it("should calculate per-service cache hit rate", () => {
      mockDataSource._setTraces([
        createTraceEntry({ id: "t1", portName: "Logger", isCacheHit: false }),
        createTraceEntry({ id: "t2", portName: "Logger", isCacheHit: true }),
        createTraceEntry({ id: "t3", portName: "Logger", isCacheHit: true }),
      ]);
      const vm = presenter.getViewModel();

      const logger = vm.topServicesByCount[0]!;
      expect(logger.cacheHitRate).toBeCloseTo(2 / 3);
      expect(logger.cacheHitRateFormatted).toBe("67%");
    });
  });

  // ===========================================================================
  // Time Series (placeholder)
  // ===========================================================================

  describe("time series", () => {
    it("should include resolution time series", () => {
      const vm = presenter.getViewModel();

      expect(vm.resolutionTimeSeries).toBeDefined();
      expect(vm.resolutionTimeSeries.id).toBe("resolutions");
    });

    it("should include cache hit time series", () => {
      const vm = presenter.getViewModel();

      expect(vm.cacheHitTimeSeries).toBeDefined();
      expect(vm.cacheHitTimeSeries.id).toBe("cacheHit");
    });
  });

  // ===========================================================================
  // View Model Immutability
  // ===========================================================================

  describe("immutability", () => {
    it("should return frozen objects", () => {
      const vm = presenter.getViewModel();

      expect(Object.isFrozen(vm.metrics)).toBe(true);
      expect(Object.isFrozen(vm.lifetimeBreakdown)).toBe(true);
      expect(Object.isFrozen(vm.topServicesByCount)).toBe(true);
      expect(Object.isFrozen(vm.topServicesByDuration)).toBe(true);
      expect(Object.isFrozen(vm.slowestServices)).toBe(true);
    });
  });
});
