/**
 * Tests for test support utilities.
 *
 * Verifies the test infrastructure works correctly.
 */
// @ts-nocheck

import { describe, test, expect, beforeEach } from "vitest";
import {
  TestBuilder,
  LoggerPort,
  DatabasePort,
  RequestContextPort,
  createMockLogger,
  createMinimalContainer,
  createStandardContainer,
  resetIdCounter,
  createCountingFactory,
} from "./index.js";

describe("Test Support Utilities", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe("TestBuilder", () => {
    test("builds container with singleton", () => {
      const { resolve } = TestBuilder.create().withSingleton(LoggerPort, createMockLogger).build();

      const logger = resolve(LoggerPort);
      expect(logger.log).toBeDefined();

      // Should be singleton
      const logger2 = resolve(LoggerPort);
      expect(logger).toBe(logger2);
    });

    test("builds container with scoped service", () => {
      const { createScope } = TestBuilder.create().withLogger().withScopedRequestContext().build();

      const scope1 = createScope();
      const scope2 = createScope();

      const ctx1 = scope1.resolve(RequestContextPort);
      const ctx2 = scope2.resolve(RequestContextPort);

      // Different instances in different scopes
      expect(ctx1).not.toBe(ctx2);
      expect(ctx1.requestId).not.toBe(ctx2.requestId);

      // Same instance within same scope
      const ctx1Again = scope1.resolve(RequestContextPort);
      expect(ctx1).toBe(ctx1Again);
    });

    test("tracks factory call counts", () => {
      const { resolve, getCallCount } = TestBuilder.create().withLogger().withDatabase().build();

      expect(getCallCount(LoggerPort)).toBe(0);
      expect(getCallCount(DatabasePort)).toBe(0);

      resolve(LoggerPort);
      expect(getCallCount(LoggerPort)).toBe(1);

      // Singleton - should not call again
      resolve(LoggerPort);
      expect(getCallCount(LoggerPort)).toBe(1);
    });

    test("withDependentSingleton1 resolves dependencies", () => {
      const { resolve } = TestBuilder.create().withLogger().withUserService().build();

      const logger = resolve(LoggerPort);
      expect(logger.log).toBeDefined();
    });
  });

  describe("Container presets", () => {
    test("createMinimalContainer provides logger", () => {
      const container = createMinimalContainer();
      const logger = container.resolve(LoggerPort);
      expect(logger.log).toBeDefined();
    });

    test("createStandardContainer provides logger, database, and cache", () => {
      const container = createStandardContainer();
      const logger = container.resolve(LoggerPort);
      const database = container.resolve(DatabasePort);
      expect(logger.log).toBeDefined();
      expect(database.query).toBeDefined();
    });
  });

  describe("Utility functions", () => {
    test("createCountingFactory tracks calls", () => {
      const { factory, callCount, reset } = createCountingFactory(() => ({
        value: "test",
      }));

      expect(callCount()).toBe(0);

      factory();
      expect(callCount()).toBe(1);

      factory();
      factory();
      expect(callCount()).toBe(3);

      reset();
      expect(callCount()).toBe(0);
    });
  });
});
