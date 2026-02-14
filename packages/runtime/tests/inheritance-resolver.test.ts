/**
 * Tests for src/container/internal/inheritance-resolver.ts
 * Covers shared, forked, and isolated inheritance modes,
 * caching, clonable checks, and fallbacks.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { NonClonableForkedError } from "../src/errors/index.js";

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

describe("InheritanceResolver (via child container)", () => {
  describe("shared mode (default)", () => {
    it("child shares parent singleton instance", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const parentLogger = parent.resolve(LoggerPort);

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      const childLogger = child.resolve(LoggerPort);
      expect(childLogger).toBe(parentLogger);
    });

    it("explicitly specifying shared mode yields same behavior", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const parentLogger = parent.resolve(LoggerPort);

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "shared" } as any,
      });

      const childLogger = child.resolve(LoggerPort);
      expect(childLogger).toBe(parentLogger);
    });
  });

  describe("forked mode", () => {
    it("child gets shallow clone of parent instance when adapter is clonable", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        clonable: true,
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const parentLogger = parent.resolve(LoggerPort);

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "forked" } as any,
      });

      const childLogger = child.resolve(LoggerPort);
      expect(childLogger).not.toBe(parentLogger);
      // Shallow clone should have same structure
      expect(typeof childLogger.log).toBe("function");
    });

    it("caches forked instance - same instance on multiple calls", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        clonable: true,
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "forked" } as any,
      });

      const l1 = child.resolve(LoggerPort);
      const l2 = child.resolve(LoggerPort);
      expect(l1).toBe(l2);
    });

    it("throws NonClonableForkedError when adapter is not clonable", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        // clonable defaults to false
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "forked" } as any,
      });

      expect(() => child.resolve(LoggerPort)).toThrow(NonClonableForkedError);
    });
  });

  describe("isolated mode", () => {
    it("child creates new instance with its own dependency resolution", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const parentLogger = parent.resolve(LoggerPort);

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "isolated" } as any,
      });

      const childLogger = child.resolve(LoggerPort);
      expect(childLogger).not.toBe(parentLogger);
    });

    it("caches isolated instance in child singleton memo", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "isolated" } as any,
      });

      const l1 = child.resolve(LoggerPort);
      const l2 = child.resolve(LoggerPort);
      expect(l1).toBe(l2);
    });
  });

  describe("mixed modes", () => {
    it("supports different modes per port", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        clonable: true,
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const parentLogger = parent.resolve(LoggerPort);
      const parentDb = parent.resolve(DatabasePort);

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: {
          Logger: "forked",
          Database: "shared",
        } as any,
      });

      const childLogger = child.resolve(LoggerPort);
      const childDb = child.resolve(DatabasePort);

      // Forked: different instance
      expect(childLogger).not.toBe(parentLogger);
      // Shared: same instance
      expect(childDb).toBe(parentDb);
    });
  });

  describe("child container overrides", () => {
    it("override adapter replaces parent adapter", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const mockLogger: Logger = { log: vi.fn() };
      const mockLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => mockLogger,
      });
      const childGraph = GraphBuilder.forParent(graph).override(mockLoggerAdapter).build();
      const child = parent.createChild(childGraph, { name: "Child" });

      const childLogger = child.resolve(LoggerPort);
      expect(childLogger).toBe(mockLogger);
    });
  });
});
