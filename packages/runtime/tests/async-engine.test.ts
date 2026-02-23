/**
 * Tests for src/resolution/async-engine.ts
 * Covers async resolution, caching, error handling.
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
}
interface Database {
  query(sql: string): unknown;
  connect(): Promise<void>;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const _DatabasePort = port<Database>()({ name: "Database" });

// =============================================================================
// Tests
// =============================================================================

describe("async resolution engine", () => {
  describe("resolveAsync for sync adapters", () => {
    it("resolves sync singleton via resolveAsync", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const logger = await container.resolveAsync(LoggerPort);
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe("function");
    });

    it("resolves sync transient via resolveAsync", async () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const logger1 = await container.resolveAsync(LoggerPort);
      const logger2 = await container.resolveAsync(LoggerPort);
      expect(logger1).not.toBe(logger2);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("resolveAsync caching", () => {
    it("caches singleton resolved via resolveAsync", async () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const logger1 = await container.resolveAsync(LoggerPort);
      const logger2 = await container.resolveAsync(LoggerPort);
      expect(logger1).toBe(logger2);
      expect(factory).toHaveBeenCalledOnce();
    });

    it("sync resolve after resolveAsync returns same instance", async () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const asyncLogger = await container.resolveAsync(LoggerPort);
      const syncLogger = container.resolve(LoggerPort);
      expect(asyncLogger).toBe(syncLogger);
    });

    it("resolveAsync after sync resolve returns same instance", async () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const syncLogger = container.resolve(LoggerPort);
      const asyncLogger = await container.resolveAsync(LoggerPort);
      expect(syncLogger).toBe(asyncLogger);
    });
  });

  describe("resolveAsync scoped", () => {
    it("resolves scoped port via resolveAsync in scope", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope();
      const logger = await scope.resolveAsync(LoggerPort);
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe("function");
    });
  });

  describe("tryResolveAsync", () => {
    it("returns Ok result on success", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const result = await container.tryResolveAsync(LoggerPort);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value.log).toBe("function");
      }
    });

    it("returns Err result when factory throws", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          throw new Error("factory fail");
        },
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const result = await container.tryResolveAsync(LoggerPort);
      expect(result.isErr()).toBe(true);
    });
  });
});
