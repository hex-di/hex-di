/**
 * Tests for BEH-CO-05: Frozen Port References.
 *
 * Verifies that resolved service instances are frozen by default,
 * that opt-out via `freeze: false` works, and edge cases for all lifetimes.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
  level: string;
}

interface Cache {
  data: Map<string, unknown>;
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface Config {
  host: string;
  port: number;
}

const LoggerPort = port<Logger>()({ name: "FreezeLogger" });
const _CachePort = port<Cache>()({ name: "FreezeCache" });
const ConfigPort = port<Config>()({ name: "FreezeConfig" });

// =============================================================================
// Task 2.3: Freeze resolved services in runtime resolution engine
// =============================================================================

describe("Frozen Port References (BEH-CO-05)", () => {
  describe("default behavior (freeze = true)", () => {
    it("resolved service is frozen by default", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn(), level: "info" }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "FreezeTest" });

      const logger = container.resolve(LoggerPort);

      expect(Object.isFrozen(logger)).toBe(true);
    });

    it("resolved service with explicit freeze: true is frozen", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        freeze: true,
        factory: () => ({ log: vi.fn(), level: "info" }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "FreezeTest" });

      const logger = container.resolve(LoggerPort);

      expect(Object.isFrozen(logger)).toBe(true);
    });

    it("attempting to mutate a frozen resolved service throws in strict mode", () => {
      "use strict";
      const adapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ host: "localhost", port: 3000 }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "FreezeTest" });

      const config = container.resolve(ConfigPort);

      expect(() => {
        (config as { host: string }).host = "remotehost";
      }).toThrow();
    });
  });

  describe("opt-out behavior (freeze = false)", () => {
    it("resolved service with freeze: false is NOT frozen", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        freeze: false,
        factory: () => ({ log: vi.fn(), level: "info" }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "MutableTest" });

      const logger = container.resolve(LoggerPort);

      expect(Object.isFrozen(logger)).toBe(false);
    });

    it("mutable service can be modified after resolution", () => {
      const adapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        freeze: false,
        factory: () => ({ host: "localhost", port: 3000 }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "MutableTest" });

      const config = container.resolve(ConfigPort);
      (config as { host: string }).host = "remotehost";

      expect(config.host).toBe("remotehost");
    });
  });

  // ===========================================================================
  // Task 2.4: Handle edge cases
  // ===========================================================================

  describe("singleton lifetime", () => {
    it("singleton is frozen once on first resolution", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "SingletonFreezeTest" });

      const r1 = container.resolve(LoggerPort);
      const r2 = container.resolve(LoggerPort);

      // Same frozen instance
      expect(r1).toBe(r2);
      expect(Object.isFrozen(r1)).toBe(true);
      // Factory only called once
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("singleton with freeze: false caches mutable instance", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        freeze: false,
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "SingletonMutableTest" });

      const r1 = container.resolve(LoggerPort);
      const r2 = container.resolve(LoggerPort);

      expect(r1).toBe(r2);
      expect(Object.isFrozen(r1)).toBe(false);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("transient lifetime", () => {
    it("transient produces new frozen instance each time", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "TransientFreezeTest" });

      const r1 = container.resolve(LoggerPort);
      const r2 = container.resolve(LoggerPort);

      expect(r1).not.toBe(r2);
      expect(Object.isFrozen(r1)).toBe(true);
      expect(Object.isFrozen(r2)).toBe(true);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("transient with freeze: false produces new mutable instance each time", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        freeze: false,
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "TransientMutableTest" });

      const r1 = container.resolve(LoggerPort);
      const r2 = container.resolve(LoggerPort);

      expect(r1).not.toBe(r2);
      expect(Object.isFrozen(r1)).toBe(false);
      expect(Object.isFrozen(r2)).toBe(false);
    });
  });

  describe("scoped lifetime", () => {
    it("scoped service is frozen once per scope", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "ScopedFreezeTest" });

      const scope = container.createScope("TestScope");
      const r1 = scope.resolve(LoggerPort);
      const r2 = scope.resolve(LoggerPort);

      // Same frozen instance within scope
      expect(r1).toBe(r2);
      expect(Object.isFrozen(r1)).toBe(true);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("scoped service with freeze: false produces mutable instance per scope", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        freeze: false,
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "ScopedMutableTest" });

      const scope = container.createScope("TestScope");
      const r1 = scope.resolve(LoggerPort);
      const r2 = scope.resolve(LoggerPort);

      expect(r1).toBe(r2);
      expect(Object.isFrozen(r1)).toBe(false);
    });

    it("different scopes get different frozen instances", () => {
      const factory = vi.fn(() => ({ log: vi.fn(), level: "info" }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "ScopeIsolationTest" });

      const scope1 = container.createScope("Scope1");
      const scope2 = container.createScope("Scope2");
      const r1 = scope1.resolve(LoggerPort);
      const r2 = scope2.resolve(LoggerPort);

      expect(r1).not.toBe(r2);
      expect(Object.isFrozen(r1)).toBe(true);
      expect(Object.isFrozen(r2)).toBe(true);
    });
  });

  describe("freeze is shallow", () => {
    it("nested objects inside a frozen service are NOT frozen (shallow freeze)", () => {
      const CachePortLocal = port<{ data: Record<string, string>; items: string[] }>()({
        name: "ShallowFreezeCache",
      });
      const adapter = createAdapter({
        provides: CachePortLocal,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          data: { key: "value" },
          items: ["a", "b"],
        }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "ShallowFreezeTest" });

      const cache = container.resolve(CachePortLocal);

      // The top-level object is frozen
      expect(Object.isFrozen(cache)).toBe(true);

      // But nested objects are NOT frozen (shallow freeze behavior)
      expect(Object.isFrozen(cache.data)).toBe(false);
      expect(Object.isFrozen(cache.items)).toBe(false);
    });
  });

  describe("primitive factory returns", () => {
    it("handles factory returning a number (no freeze needed)", () => {
      const NumberPort = port<number>()({ name: "NumberService" });
      const adapter = createAdapter({
        provides: NumberPort,
        requires: [],
        lifetime: "singleton",
        factory: () => 42,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "PrimitiveTest" });

      const result = container.resolve(NumberPort);
      expect(result).toBe(42);
    });

    it("handles factory returning a string (no freeze needed)", () => {
      const StringPort = port<string>()({ name: "StringService" });
      const adapter = createAdapter({
        provides: StringPort,
        requires: [],
        lifetime: "singleton",
        factory: () => "hello",
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "PrimitiveTest" });

      const result = container.resolve(StringPort);
      expect(result).toBe("hello");
    });
  });

  describe("dependency chain with mixed freeze configs", () => {
    it("frozen service can depend on mutable service", () => {
      const MutableLoggerPort = port<Logger>()({ name: "MutableLogger" });

      const loggerAdapter = createAdapter({
        provides: MutableLoggerPort,
        requires: [],
        lifetime: "singleton",
        freeze: false,
        factory: () => ({ log: vi.fn(), level: "debug" }),
      });

      const ServicePort = port<{ doWork(): void }>()({ name: "WorkService" });
      const serviceAdapter = createAdapter({
        provides: ServicePort,
        requires: [MutableLoggerPort],
        lifetime: "singleton",
        factory: deps => ({
          doWork: () => deps.MutableLogger.log("working"),
        }),
      });

      const graph = GraphBuilder.create().provide(loggerAdapter).provide(serviceAdapter).build();
      const container = createContainer({ graph, name: "MixedFreezeTest" });

      const logger = container.resolve(MutableLoggerPort);
      const service = container.resolve(ServicePort);

      expect(Object.isFrozen(logger)).toBe(false);
      expect(Object.isFrozen(service)).toBe(true);
    });
  });
});
