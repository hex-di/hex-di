/**
 * Tests for src/resolution/engine.ts (ResolutionEngine)
 * Covers resolution with hooks, without hooks, lifetime caching,
 * error handling (ContainerError passthrough, FactoryError wrapping),
 * and dependency resolution.
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { FactoryError, ContainerError, CircularDependencyError } from "../src/errors/index.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

describe("ResolutionEngine (integration via container)", () => {
  describe("sync resolution", () => {
    it("resolves singleton - same instance on multiple calls", () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const r1 = container.resolve(LoggerPort);
      const r2 = container.resolve(LoggerPort);

      expect(r1).toBe(r2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("resolves transient - new instance each time", () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const r1 = container.resolve(LoggerPort);
      const r2 = container.resolve(LoggerPort);

      expect(r1).not.toBe(r2);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("wraps factory errors in FactoryError", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          throw new Error("boom");
        },
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.resolve(LoggerPort)).toThrow(FactoryError);
    });

    it("passes through ContainerError without wrapping", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          throw new CircularDependencyError(["A", "B", "A"]);
        },
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.resolve(LoggerPort)).toThrow(CircularDependencyError);
    });

    it("resolves dependencies and passes them to factory", () => {
      const loggerFactory = vi.fn(() => ({ log: vi.fn() }));
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: loggerFactory,
      });
      const dbFactory = vi.fn((deps: any) => ({
        query: vi.fn(),
        logger: deps.Logger,
      }));
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort] as const,
        lifetime: "singleton",
        factory: dbFactory,
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });

      const db = container.resolve(DatabasePort);
      expect(dbFactory).toHaveBeenCalledTimes(1);
      // deps should contain Logger instance
      const depsArg = dbFactory.mock.calls[0][0];
      expect(depsArg.Logger).toBeDefined();
      expect(depsArg.Logger.log).toBeDefined();
    });
  });

  describe("hooks integration", () => {
    it("calls beforeResolve and afterResolve hooks", () => {
      const beforeResolve = vi.fn();
      const afterResolve = vi.fn();

      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { beforeResolve, afterResolve },
      });

      container.resolve(LoggerPort);

      expect(beforeResolve).toHaveBeenCalledTimes(1);
      expect(afterResolve).toHaveBeenCalledTimes(1);
    });

    it("hook context contains portName and lifetime", () => {
      const beforeResolve = vi.fn();
      const afterResolve = vi.fn();

      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { beforeResolve, afterResolve },
      });

      container.resolve(LoggerPort);

      const beforeCtx = beforeResolve.mock.calls[0][0];
      expect(beforeCtx.portName).toBe("Logger");
      expect(beforeCtx.lifetime).toBe("singleton");

      const afterCtx = afterResolve.mock.calls[0][0];
      expect(afterCtx.portName).toBe("Logger");
      expect(afterCtx.lifetime).toBe("singleton");
    });

    it("reports cache hit on second resolution", () => {
      const afterResolve = vi.fn();

      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { afterResolve },
      });

      container.resolve(LoggerPort);
      container.resolve(LoggerPort);

      // First: not cache hit, Second: cache hit
      expect(afterResolve.mock.calls[0][0].isCacheHit).toBe(false);
      expect(afterResolve.mock.calls[1][0].isCacheHit).toBe(true);
    });
  });

  describe("scoped resolution", () => {
    it("throws ScopeRequiredError for scoped ports outside scope", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.resolve(LoggerPort)).toThrow(/scope/i);
    });

    it("resolves scoped ports within a scope", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const logger = scope.resolve(LoggerPort);
      expect(logger.log).toBeDefined();
    });

    it("different scopes get different instances", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      const scope1 = container.createScope("scope1");
      const scope2 = container.createScope("scope2");

      const l1 = scope1.resolve(LoggerPort);
      const l2 = scope2.resolve(LoggerPort);
      expect(l1).not.toBe(l2);
    });

    it("same scope returns same scoped instance", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      const scope = container.createScope("test-scope");

      const l1 = scope.resolve(LoggerPort);
      const l2 = scope.resolve(LoggerPort);
      expect(l1).toBe(l2);
    });
  });
});
