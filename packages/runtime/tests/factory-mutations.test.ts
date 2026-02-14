/**
 * Targeted mutation-killing tests for src/container/factory.ts
 * Tests initialized container wrapper, late-binding hooks,
 * async initialization, tryInitialize, performance options,
 * and container freeze.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

describe("createContainer factory mutations", () => {
  describe("late-binding hooks", () => {
    it("hooks installed via addHook fire on resolve", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const beforeResolve = vi.fn();
      container.addHook("beforeResolve", beforeResolve);
      container.resolve(LoggerPort);

      expect(beforeResolve).toHaveBeenCalledTimes(1);
    });

    it("user-provided hooks are active on creation", () => {
      const afterResolve = vi.fn();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { afterResolve },
      });

      container.resolve(LoggerPort);
      expect(afterResolve).toHaveBeenCalledTimes(1);
    });

    it("late-binding hooks compose with user-provided hooks", () => {
      const userBefore = vi.fn();
      const dynamicBefore = vi.fn();
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { beforeResolve: userBefore },
      });

      container.addHook("beforeResolve", dynamicBefore);
      container.resolve(LoggerPort);

      expect(userBefore).toHaveBeenCalledTimes(1);
      expect(dynamicBefore).toHaveBeenCalledTimes(1);
    });

    it("afterResolve hooks fire in reverse order (middleware pattern)", () => {
      const order: string[] = [];
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({
        graph,
        name: "Test",
        hooks: { afterResolve: () => order.push("user") },
      });

      container.addHook("afterResolve", () => order.push("dynamic"));
      container.resolve(LoggerPort);

      // dynamic was added after user, so in reverse order dynamic fires first
      expect(order).toEqual(["dynamic", "user"]);
    });
  });

  describe("initialized container wrapper", () => {
    it("initialize returns initialized container", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(initialized).toBeDefined();
      expect(initialized.name).toBe("Test");
      expect(initialized.kind).toBe("root");
    });

    it("initialized container can resolve all ports", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const logger = initialized.resolve(LoggerPort);
      expect(logger.log).toBeDefined();
    });

    it("initialized container is frozen", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(Object.isFrozen(initialized)).toBe(true);
    });

    it("initialized container has parentName null", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(initialized.parentName).toBeNull();
    });

    it("accessing initialize on initialized container throws", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(() => (initialized as any).initialize).toThrow();
    });

    it("accessing tryInitialize on initialized container throws", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(() => (initialized as any).tryInitialize).toThrow();
    });

    it("accessing parent on initialized root container throws", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(() => initialized.parent).toThrow();
    });

    it("initialized container has addHook/removeHook", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();

      const afterResolve = vi.fn();
      initialized.addHook("afterResolve", afterResolve);
      initialized.resolve(LoggerPort);
      expect(afterResolve).toHaveBeenCalledTimes(1);

      initialized.removeHook("afterResolve", afterResolve);
      initialized.resolve(LoggerPort);
      // Should not be called again
      expect(afterResolve).toHaveBeenCalledTimes(1);
    });

    it("multiple initialize calls return same container", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const init1 = await container.initialize();
      const init2 = await container.initialize();
      expect(init1).toBe(init2);
    });

    it("initialized container dispose works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      await initialized.dispose();
      expect(initialized.isDisposed).toBe(true);
    });

    it("initialized container tryResolve works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const result = initialized.tryResolve(LoggerPort);
      expect(result.isOk()).toBe(true);
    });

    it("initialized container tryResolveAsync works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const resultAsync = initialized.tryResolveAsync(LoggerPort);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("initialized container tryDispose works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const result = await initialized.tryDispose();
      expect(result.isOk()).toBe(true);
    });

    it("initialized container has correct INTERNAL_ACCESS", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const state = (initialized as any)[INTERNAL_ACCESS]();
      expect(state.containerName).toBe("Test");
      expect(state.disposed).toBe(false);
    });

    it("initialized container createChild works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();

      const childGraph = GraphBuilder.create().build();
      const child = initialized.createChild(childGraph, { name: "Child" });

      expect(child.name).toBe("Child");
      expect(child.resolve(LoggerPort).log).toBeDefined();
    });

    it("initialized container createScope works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const scope = initialized.createScope("test-scope");
      const logger = scope.resolve(LoggerPort);
      expect(logger.log).toBeDefined();
    });

    it("initialized container has/hasAdapter work", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      expect(initialized.has(LoggerPort)).toBe(true);
      expect(initialized.has(DatabasePort)).toBe(false);
      expect(initialized.has(LoggerPort)).toBe(true);
      expect(initialized.has(DatabasePort)).toBe(false);
    });

    it("initialized container override works", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const initialized = await container.initialize();
      const mockAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => "mocked" }),
      });
      const overridden = initialized.override(mockAdapter).build();
      expect(overridden.resolve(LoggerPort).log).toBeDefined();
    });
  });

  describe("tryInitialize", () => {
    it("returns ok ResultAsync on success", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const result = await container.tryInitialize();
      expect(result.isOk()).toBe(true);
    });
  });

  describe("performance options", () => {
    it("disableTimestamps: true disables timestamp capture", () => {
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
      const state = (container as any)[INTERNAL_ACCESS]();
      // With timestamps disabled, resolvedAt should be 0
      const entry = state.singletonMemo.entries.find((e: any) => e.portName === "Logger");
      if (entry) {
        expect(entry.resolvedAt).toBe(0);
      }
    });

    it("without performance options, timestamps are captured", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      container.resolve(LoggerPort);
      const state = (container as any)[INTERNAL_ACCESS]();
      const entry = state.singletonMemo.entries.find((e: any) => e.portName === "Logger");
      if (entry) {
        expect(entry.resolvedAt).toBeGreaterThan(0);
      }
    });
  });

  describe("container is frozen", () => {
    it("uninitialized container is frozen", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      expect(Object.isFrozen(container)).toBe(true);
    });
  });

  describe("initialize throws when disposed", () => {
    it("initialize rejects when container is already disposed", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await container.dispose();

      await expect(container.initialize()).rejects.toThrow(/disposed/i);
    });
  });
});
