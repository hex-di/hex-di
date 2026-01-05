/**
 * Tests for tracing module exports from @hex-di/runtime.
 *
 * This test file verifies that all tracing functionality is correctly
 * exported from the runtime package after migration from @hex-di/tracing.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";

// Import from source files to test exports
import {
  TRACING,
  TracingPlugin,
  createTracingPlugin,
  withTracing,
  MemoryCollector,
  NoOpCollector,
  CompositeCollector,
  hasTracing,
  getTracingAPI,
} from "../../../src/plugins/tracing/index.js";

import type {
  TracingPluginOptions,
  TraceCollector,
  TraceSubscriber,
  Unsubscribe,
  ContainerWithTracing,
  WithTracing,
} from "../../../src/plugins/tracing/index.js";

// Import types from @hex-di/plugin (these are re-exported from runtime index)
import type {
  TracingAPI,
  TraceEntry,
  TraceStats,
  TraceFilter,
  TraceRetentionPolicy,
} from "@hex-di/plugin";

import { DEFAULT_RETENTION_POLICY } from "@hex-di/plugin";

describe("tracing module exports from @hex-di/runtime", () => {
  describe("symbol exports", () => {
    it("should export TRACING symbol", () => {
      expect(TRACING).toBeDefined();
      expect(typeof TRACING).toBe("symbol");
      expect(TRACING.toString()).toBe("Symbol(hex-di/tracing)");
    });
  });

  describe("plugin exports", () => {
    it("should export TracingPlugin", () => {
      expect(TracingPlugin).toBeDefined();
      expect(TracingPlugin.name).toBe("tracing");
      expect(TracingPlugin.symbol).toBe(TRACING);
    });

    it("should export createTracingPlugin factory", () => {
      expect(createTracingPlugin).toBeDefined();
      expect(typeof createTracingPlugin).toBe("function");

      const customPlugin = createTracingPlugin({
        retentionPolicy: { maxTraces: 500 },
      });
      expect(customPlugin.name).toBe("tracing");
      expect(customPlugin.symbol).toBe(TRACING);
    });

    it("should export withTracing wrapper", () => {
      expect(withTracing).toBeDefined();
      expect(typeof withTracing).toBe("function");
    });
  });

  describe("collector exports", () => {
    it("should export MemoryCollector", () => {
      expect(MemoryCollector).toBeDefined();

      const collector = new MemoryCollector();
      expect(collector.getTraces()).toEqual([]);
      expect(collector.getStats().totalResolutions).toBe(0);
    });

    it("should export NoOpCollector", () => {
      expect(NoOpCollector).toBeDefined();

      const collector = new NoOpCollector();
      expect(collector.getTraces()).toEqual([]);
      expect(collector.getStats().totalResolutions).toBe(0);
    });

    it("should export CompositeCollector", () => {
      expect(CompositeCollector).toBeDefined();

      const memoryCollector = new MemoryCollector();
      const composite = new CompositeCollector([memoryCollector]);
      expect(composite.getTraces()).toEqual([]);
    });
  });

  describe("type guard and helper exports", () => {
    it("should export hasTracing type guard", () => {
      expect(hasTracing).toBeDefined();
      expect(typeof hasTracing).toBe("function");
    });

    it("should export getTracingAPI helper", () => {
      expect(getTracingAPI).toBeDefined();
      expect(typeof getTracingAPI).toBe("function");
    });
  });

  describe("constant exports", () => {
    it("should export DEFAULT_RETENTION_POLICY from @hex-di/plugin", () => {
      expect(DEFAULT_RETENTION_POLICY).toBeDefined();
      expect(DEFAULT_RETENTION_POLICY.maxTraces).toBe(1000);
      expect(DEFAULT_RETENTION_POLICY.maxPinnedTraces).toBe(100);
      expect(DEFAULT_RETENTION_POLICY.slowThresholdMs).toBe(100);
      expect(DEFAULT_RETENTION_POLICY.expiryMs).toBe(300000);
    });
  });

  describe("type exports", () => {
    it("should export TracingAPI type", () => {
      // Type-level assertion - if this compiles, the type is exported
      const _api: TracingAPI = {
        getTraces: () => [],
        getStats: () => ({
          totalResolutions: 0,
          averageDuration: 0,
          cacheHitRate: 0,
          slowCount: 0,
          sessionStart: Date.now(),
          totalDuration: 0,
        }),
        pause: () => {},
        resume: () => {},
        clear: () => {},
        subscribe: () => () => {},
        isPaused: () => false,
        pin: () => {},
        unpin: () => {},
      };
      expect(_api).toBeDefined();
    });

    it("should export TraceEntry type", () => {
      // Type-level assertion - if this compiles, the type is exported
      const _entry: TraceEntry = {
        id: "trace-1",
        portName: "TestPort",
        lifetime: "singleton",
        startTime: Date.now(),
        duration: 10,
        isCacheHit: false,
        parentId: null,
        childIds: [],
        scopeId: null,
        order: 1,
        isPinned: false,
      };
      expect(_entry).toBeDefined();
    });

    it("should export TraceStats type", () => {
      // Type-level assertion
      const _stats: TraceStats = {
        totalResolutions: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowCount: 0,
        sessionStart: Date.now(),
        totalDuration: 0,
      };
      expect(_stats).toBeDefined();
    });

    it("should export TraceFilter type", () => {
      // Type-level assertion
      const _filter: TraceFilter = {
        portName: "Test",
        lifetime: "singleton",
        isCacheHit: false,
        minDuration: 0,
        maxDuration: 100,
      };
      expect(_filter).toBeDefined();
    });

    it("should export TraceRetentionPolicy type", () => {
      // Type-level assertion
      const _policy: TraceRetentionPolicy = {
        maxTraces: 1000,
        maxPinnedTraces: 100,
        slowThresholdMs: 100,
        expiryMs: 300000,
      };
      expect(_policy).toBeDefined();
    });

    it("should export TraceCollector type", () => {
      // Type-level assertion
      const _collector: TraceCollector = new MemoryCollector();
      expect(_collector.collect).toBeDefined();
      expect(_collector.getTraces).toBeDefined();
      expect(_collector.getStats).toBeDefined();
      expect(_collector.clear).toBeDefined();
      expect(_collector.subscribe).toBeDefined();
    });

    it("should export TraceSubscriber type", () => {
      // Type-level assertion
      const _subscriber: TraceSubscriber = (_entry: TraceEntry) => {};
      expect(_subscriber).toBeDefined();
    });

    it("should export Unsubscribe type", () => {
      // Type-level assertion
      const _unsubscribe: Unsubscribe = () => {};
      expect(_unsubscribe).toBeDefined();
    });

    it("should export ContainerWithTracing type", () => {
      // Type-level assertion - just verify the type exists
      // ContainerWithTracing is a generic type that extends Container
      type TestType = ContainerWithTracing;
      const _typeCheck: boolean = true;
      expect(_typeCheck).toBe(true);
    });

    it("should export TracingPluginOptions type", () => {
      // Type-level assertion
      const _options: TracingPluginOptions = {
        retentionPolicy: { maxTraces: 500 },
      };
      expect(_options).toBeDefined();
    });

    it("should export WithTracing type helper", () => {
      // Type-level assertion
      type TestContainer = { test: string };
      type Enhanced = WithTracing<TestContainer>;
      // If this compiles, the type is exported correctly
      const _check: Enhanced extends { readonly [key: symbol]: TracingAPI } ? true : false = true;
      expect(_check).toBe(true);
    });
  });
});
