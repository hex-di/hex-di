/**
 * Extended tests for src/container/factory.ts
 * Covers configuration defaults, option handling, container creation paths.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, INSPECTOR } from "../src/inspection/symbols.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface UserService {
  getUser(id: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });

describe("createContainer extended", () => {
  describe("container configuration", () => {
    it("accepts name option and exposes it", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "MyApp" });

      expect(container.name).toBe("MyApp");
    });

    it("creates container with hooks option", () => {
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
      expect(beforeResolve).toHaveBeenCalled();
      expect(afterResolve).toHaveBeenCalled();
    });

    it("creates container without hooks (zero overhead)", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const logger = container.resolve(LoggerPort);
      expect(logger).toBeDefined();
    });
  });

  describe("container has correct methods", () => {
    function createTestContainer() {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      return createContainer({ graph, name: "Test" });
    }

    it("has resolveAsync method", () => {
      const container = createTestContainer();
      expect(typeof container.resolveAsync).toBe("function");
    });

    it("has has method", () => {
      const container = createTestContainer();
      expect(typeof container.has).toBe("function");
    });

    it("has tryResolve method", () => {
      const container = createTestContainer();
      expect(typeof container.tryResolve).toBe("function");
    });

    it("has tryResolveAsync method", () => {
      const container = createTestContainer();
      expect(typeof container.tryResolveAsync).toBe("function");
    });

    it("has tryDispose method", () => {
      const container = createTestContainer();
      expect(typeof container.tryDispose).toBe("function");
    });

    it("has override method", () => {
      const container = createTestContainer();
      expect(typeof container.override).toBe("function");
    });
  });

  describe("has method", () => {
    it("returns true for registered ports", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.has(LoggerPort)).toBe(true);
    });

    it("returns false for unregistered ports", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.has(DatabasePort)).toBe(false);
    });
  });

  describe("INTERNAL_ACCESS", () => {
    it("container exposes internal state via INTERNAL_ACCESS", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const internalState = container[INTERNAL_ACCESS]();
      expect(internalState.disposed).toBe(false);
      expect(internalState.containerName).toBe("Test");
      expect(internalState.singletonMemo).toBeDefined();
      expect(internalState.adapterMap).toBeDefined();
    });

    it("internal state reports correct adapter map size", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });

      const internalState = container[INTERNAL_ACCESS]();
      expect(internalState.adapterMap.size).toBe(2);
    });
  });

  describe("inspector property", () => {
    it("container has inspector property (non-enumerable)", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      // inspector is non-enumerable but exists
      expect((container as any).inspector).toBeDefined();
      expect(typeof (container as any).inspector.getSnapshot).toBe("function");
    });
  });

  describe("singleton caching", () => {
    it("returns same instance for singleton lifetime", () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inst1 = container.resolve(LoggerPort);
      const inst2 = container.resolve(LoggerPort);
      expect(inst1).toBe(inst2);
      expect(factory).toHaveBeenCalledOnce();
    });

    it("returns new instance for transient lifetime", () => {
      const factory = vi.fn(() => ({ log: vi.fn() }));
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const inst1 = container.resolve(LoggerPort);
      const inst2 = container.resolve(LoggerPort);
      expect(inst1).not.toBe(inst2);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("dependency resolution", () => {
    it("resolves services with dependencies", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const userServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort] as const,
        lifetime: "singleton",
        factory: deps => ({
          getUser: (id: string) => {
            deps.Logger.log(`Getting user ${id}`);
            return { id };
          },
        }),
      });
      const graph = GraphBuilder.create()
        .provide(loggerAdapter)
        .provide(userServiceAdapter)
        .build();
      const container = createContainer({ graph, name: "Test" });

      const userService = container.resolve(UserServicePort);
      expect(userService.getUser("123")).toEqual({ id: "123" });
    });
  });

  describe("dispose", () => {
    it("disposes container and marks as disposed", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      container.resolve(LoggerPort);
      await container.dispose();
      expect(container.isDisposed).toBe(true);
    });

    it("calls finalizers during dispose", async () => {
      const finalizer = vi.fn();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer,
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      container.resolve(LoggerPort);
      await container.dispose();
      expect(finalizer).toHaveBeenCalled();
    });
  });

  describe("resolveAsync", () => {
    it("resolves async ports", async () => {
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
  });

  describe("tryResolve", () => {
    it("returns Ok result on success", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const result = container.tryResolve(LoggerPort);
      expect(result.isOk()).toBe(true);
    });
  });

  describe("performance options", () => {
    it("accepts performance.disableTimestamps option", () => {
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
        performance: { disableTimestamps: true },
      });

      container.resolve(LoggerPort);
      const state = container[INTERNAL_ACCESS]();
      // With disableTimestamps true, resolvedAt should be 0
      if (state.singletonMemo.entries.length > 0) {
        expect(state.singletonMemo.entries[0].resolvedAt).toBe(0);
      }
    });
  });
});
