/**
 * Tests for TestGraphBuilder immutability.
 *
 * These tests verify that TestGraphBuilder follows the immutable pattern
 * where each with*() method returns a new instance without modifying the original.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { TestGraphBuilder } from "./test-builder.js";
import { createAdapter } from "@hex-di/core";
import { LoggerPort, DatabasePort, type Logger, type Database } from "./fixtures.js";

describe("TestGraphBuilder Immutability", () => {
  describe("withLogger", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create();
      const withLogger = original.withLogger();

      // Original should not have a logger mock
      const originalResult = original.build();
      expect(originalResult.mocks.logger).toBeUndefined();

      // New instance should have a logger mock
      const newResult = withLogger.build();
      expect(newResult.mocks.logger).toBeDefined();
    });
  });

  describe("withDatabase", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create().withLogger();
      const withDatabase = original.withDatabase();

      // Original should not have a database mock
      const originalResult = original.build();
      expect(originalResult.mocks.database).toBeUndefined();

      // New instance should have a database mock
      const newResult = withDatabase.build();
      expect(newResult.mocks.database).toBeDefined();
    });
  });

  describe("withStandaloneDatabase", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create();
      const withDatabase = original.withStandaloneDatabase();

      // Original should not have a database mock
      const originalResult = original.build();
      expect(originalResult.mocks.database).toBeUndefined();

      // New instance should have a database mock
      const newResult = withDatabase.build();
      expect(newResult.mocks.database).toBeDefined();
    });
  });

  describe("withCache", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create();
      const withCache = original.withCache();

      // Original should not have a cache mock
      const originalResult = original.build();
      expect(originalResult.mocks.cache).toBeUndefined();

      // New instance should have a cache mock
      const newResult = withCache.build();
      expect(newResult.mocks.cache).toBeDefined();
    });
  });

  describe("withConfig", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create();
      const withConfig = original.withConfig({ PORT: 3000 });

      // Original should not have a config mock
      const originalResult = original.build();
      expect(originalResult.mocks.config).toBeUndefined();

      // New instance should have a config mock
      const newResult = withConfig.build();
      expect(newResult.mocks.config).toBeDefined();
    });
  });

  describe("withUserService", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create().withLogger().withDatabase();
      const withUserService = original.withUserService();

      // Original should have 2 adapters
      const originalResult = original.build();
      expect(originalResult.builder.adapters.length).toBe(2);

      // New instance should have 3 adapters
      const newResult = withUserService.build();
      expect(newResult.builder.adapters.length).toBe(3);
    });
  });

  describe("withAdapter", () => {
    it("returns a new instance without modifying the original", () => {
      const customAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: (): Logger => ({ log: () => {} }),
      });

      const original = TestGraphBuilder.create();
      const withAdapter = original.withAdapter(customAdapter);

      // Original should have 0 adapters
      const originalResult = original.build();
      expect(originalResult.builder.adapters.length).toBe(0);

      // New instance should have 1 adapter
      const newResult = withAdapter.build();
      expect(newResult.builder.adapters.length).toBe(1);
    });
  });

  describe("withAdapters", () => {
    it("returns a new instance without modifying the original", () => {
      const adapter1 = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: (): Logger => ({ log: () => {} }),
      });

      const adapter2 = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        lifetime: "singleton",
        factory: (): Database => ({ query: async () => ({}) }),
      });

      const original = TestGraphBuilder.create();
      const withAdapters = original.withAdapters([adapter1, adapter2]);

      // Original should have 0 adapters
      const originalResult = original.build();
      expect(originalResult.builder.adapters.length).toBe(0);

      // New instance should have 2 adapters
      const newResult = withAdapters.build();
      expect(newResult.builder.adapters.length).toBe(2);
    });
  });

  describe("withSequenceTracking", () => {
    it("returns a new instance without modifying the original", () => {
      const original = TestGraphBuilder.create();
      const withTracking = original.withSequenceTracking();

      // Original should not have a sequence tracker
      const originalResult = original.build();
      expect(originalResult.mocks.sequenceTracker).toBeUndefined();

      // New instance should have a sequence tracker
      const newResult = withTracking.build();
      expect(newResult.mocks.sequenceTracker).toBeDefined();
    });
  });

  describe("chaining multiple methods", () => {
    it("preserves immutability across multiple calls", () => {
      const step1 = TestGraphBuilder.create();
      const step2 = step1.withLogger();
      const step3 = step2.withDatabase();
      const step4 = step3.withUserService();

      // Each step should have the correct number of adapters
      expect(step1.build().builder.adapters.length).toBe(0);
      expect(step2.build().builder.adapters.length).toBe(1);
      expect(step3.build().builder.adapters.length).toBe(2);
      expect(step4.build().builder.adapters.length).toBe(3);

      // Each step should have the correct mocks
      expect(step1.build().mocks.logger).toBeUndefined();
      expect(step2.build().mocks.logger).toBeDefined();
      expect(step3.build().mocks.database).toBeDefined();
      expect(step4.build().mocks.logger).toBeDefined(); // Still has logger from step2
    });
  });

  describe("branching scenarios", () => {
    it("enables branching from a common base", () => {
      const base = TestGraphBuilder.create().withLogger();

      // Create two different branches from the same base
      const branchA = base.withDatabase();
      const branchB = base.withCache();

      // Base should only have logger
      const baseResult = base.build();
      expect(baseResult.mocks.logger).toBeDefined();
      expect(baseResult.mocks.database).toBeUndefined();
      expect(baseResult.mocks.cache).toBeUndefined();

      // Branch A should have logger + database
      const branchAResult = branchA.build();
      expect(branchAResult.mocks.logger).toBeDefined();
      expect(branchAResult.mocks.database).toBeDefined();
      expect(branchAResult.mocks.cache).toBeUndefined();

      // Branch B should have logger + cache
      const branchBResult = branchB.build();
      expect(branchBResult.mocks.logger).toBeDefined();
      expect(branchBResult.mocks.database).toBeUndefined();
      expect(branchBResult.mocks.cache).toBeDefined();
    });
  });
});
