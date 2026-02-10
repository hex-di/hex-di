/**
 * Tests for hook composition and ordering in @hex-di/runtime.
 *
 * These tests verify:
 * - FIFO ordering guarantee for multiple hooks
 * - Lifecycle sequencing (beforeResolve -> afterResolve)
 * - Mid-resolution removal edge cases
 * - Cross-event interactions (nested resolutions, parent-child composition)
 * - Hook self-modification scenarios
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/index.js";
import type { ResolutionHookContext, ResolutionResultContext } from "../src/resolution/hooks.js";

// =============================================================================
// Test Ports and Services
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): string;
}

interface Cache {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

interface Service {
  execute(): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const ServicePort = port<Service>()({ name: "Service" });

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a beforeResolve hook that records its execution order.
 */
function createBeforeHook(
  sequence: number[],
  hookNumber: number
): (ctx: ResolutionHookContext) => void {
  return () => {
    sequence.push(hookNumber);
  };
}

/**
 * Creates an afterResolve hook that records its execution order.
 */
function createAfterHook(
  sequence: number[],
  hookNumber: number
): (ctx: ResolutionResultContext) => void {
  return () => {
    sequence.push(hookNumber);
  };
}

/**
 * Tracks detailed hook execution sequence with timestamps and context.
 */
interface HookSequenceEntry {
  hookId: string;
  type: "beforeResolve" | "afterResolve";
  portName: string;
  depth: number;
  timestamp: number;
  duration?: number;
  error?: Error | null;
}

function trackHookSequence(entries: HookSequenceEntry[], hookId: string) {
  return {
    beforeResolve: (ctx: ResolutionHookContext) => {
      entries.push({
        hookId,
        type: "beforeResolve",
        portName: ctx.portName,
        depth: ctx.depth,
        timestamp: Date.now(),
      });
    },
    afterResolve: (ctx: ResolutionResultContext) => {
      entries.push({
        hookId,
        type: "afterResolve",
        portName: ctx.portName,
        depth: ctx.depth,
        timestamp: Date.now(),
        duration: ctx.duration,
        error: ctx.error,
      });
    },
  };
}

/**
 * Creates a scenario with nested resolutions (parent->child dependencies).
 */
function createNestedResolution() {
  // Service depends on Database, which depends on Logger
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({
      log: (msg: string) => console.log(msg),
    }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: () => ({
      query: (sql: string) => `Result: ${sql}`,
    }),
  });

  const ServiceAdapter = createAdapter({
    provides: ServicePort,
    requires: [DatabasePort],
    lifetime: "singleton",
    factory: deps => ({
      execute: () => deps.Database.query("SELECT 1"),
    }),
  });

  const CacheAdapter = createAdapter({
    provides: CachePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({
      get: (key: string) => null,
      set: (key: string, value: string) => {},
    }),
  });

  const graph = GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(ServiceAdapter)
    .provide(CacheAdapter)
    .build();

  return { graph, LoggerAdapter, DatabaseAdapter, ServiceAdapter, CacheAdapter };
}

/**
 * Verifies expected hook interaction patterns.
 */
function verifyComposition(
  entries: HookSequenceEntry[],
  expectations: {
    totalCalls: number;
    beforeCount: number;
    afterCount: number;
    maxDepth: number;
  }
) {
  expect(entries).toHaveLength(expectations.totalCalls);

  const beforeEntries = entries.filter(e => e.type === "beforeResolve");
  const afterEntries = entries.filter(e => e.type === "afterResolve");

  expect(beforeEntries).toHaveLength(expectations.beforeCount);
  expect(afterEntries).toHaveLength(expectations.afterCount);

  const maxDepth = Math.max(...entries.map(e => e.depth));
  expect(maxDepth).toBe(expectations.maxDepth);
}

// =============================================================================
// FIFO Ordering Tests (3 tests)
// =============================================================================

describe("Hook Composition - FIFO Ordering", () => {
  it("should execute multiple beforeResolve hooks in registration order", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const sequence: number[] = [];

    // Register 3 hooks in order: 1, 2, 3
    container.addHook("beforeResolve", createBeforeHook(sequence, 1));
    container.addHook("beforeResolve", createBeforeHook(sequence, 2));
    container.addHook("beforeResolve", createBeforeHook(sequence, 3));

    // Resolve triggers all hooks
    container.resolve(LoggerPort);

    // Verify FIFO: hooks fire in order 1, 2, 3
    expect(sequence).toEqual([1, 2, 3]);
  });

  it("should execute multiple afterResolve hooks in reverse registration order (LIFO)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const sequence: number[] = [];

    // Register 3 hooks in order: 1, 2, 3
    container.addHook("afterResolve", createAfterHook(sequence, 1));
    container.addHook("afterResolve", createAfterHook(sequence, 2));
    container.addHook("afterResolve", createAfterHook(sequence, 3));

    // Resolve triggers all hooks
    container.resolve(LoggerPort);

    // Verify LIFO: afterResolve fires in reverse order 3, 2, 1 (middleware pattern)
    expect(sequence).toEqual([3, 2, 1]);
  });

  it("should maintain FIFO order when mixing options and addHook registration", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const sequence: number[] = [];

    // Hook 1 via options
    const container = createContainer({
      graph,
      name: "Test",
      hooks: {
        beforeResolve: createBeforeHook(sequence, 1),
      },
    });

    // Hook 2 via addHook
    container.addHook("beforeResolve", createBeforeHook(sequence, 2));

    // Hook 3 via addHook
    container.addHook("beforeResolve", createBeforeHook(sequence, 3));

    // Resolve triggers all hooks
    container.resolve(LoggerPort);

    // Verify FIFO: options hook fires first, then addHook in order
    expect(sequence).toEqual([1, 2, 3]);
  });
});

// =============================================================================
// Lifecycle Sequencing Tests (3 tests)
// =============================================================================

describe("Hook Composition - Lifecycle Sequencing", () => {
  it("should fire beforeResolve before afterResolve in same resolution", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: string[] = [];

    container.addHook("beforeResolve", ctx => {
      events.push(`before:${ctx.portName}`);
    });

    container.addHook("afterResolve", ctx => {
      events.push(`after:${ctx.portName}`);
    });

    container.resolve(LoggerPort);

    expect(events).toEqual(["before:Logger", "after:Logger"]);
  });

  it("should provide consistent context across hook phases", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const beforeContexts: ResolutionHookContext[] = [];
    const afterContexts: ResolutionResultContext[] = [];

    container.addHook("beforeResolve", ctx => {
      beforeContexts.push(ctx);
    });

    container.addHook("afterResolve", ctx => {
      afterContexts.push(ctx);
    });

    container.resolve(LoggerPort);

    expect(beforeContexts.length).toBeGreaterThan(0);
    expect(afterContexts.length).toBeGreaterThan(0);

    const beforeCtx = beforeContexts[0];
    const afterCtx = afterContexts[0];

    // Verify shared context properties
    expect(afterCtx.portName).toBe(beforeCtx.portName);
    expect(afterCtx.lifetime).toBe(beforeCtx.lifetime);
    expect(afterCtx.depth).toBe(beforeCtx.depth);
    expect(afterCtx.containerId).toBe(beforeCtx.containerId);

    // Verify afterResolve extensions
    expect(afterCtx.duration).toBeGreaterThanOrEqual(0);
    expect(afterCtx.error).toBeNull();
  });

  it("should fire afterResolve even when factory throws", () => {
    const FailingAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("Factory error");
      },
    });

    const graph = GraphBuilder.create().provide(FailingAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: string[] = [];
    const errors: (Error | null)[] = [];

    container.addHook("beforeResolve", () => {
      events.push("before");
    });

    container.addHook("afterResolve", ctx => {
      events.push("after");
      errors.push(ctx.error);
    });

    // Resolution should throw
    expect(() => container.resolve(LoggerPort)).toThrow("Factory error");

    // But both hooks should have fired
    expect(events).toEqual(["before", "after"]);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(errors[0]?.message).toContain("Factory error");
  });
});

// =============================================================================
// Mid-Resolution Removal Tests (2 tests)
// =============================================================================

describe("Hook Composition - Mid-Resolution Removal", () => {
  it("should handle removeHook during beforeResolve (affects current resolution)", () => {
    const { graph } = createNestedResolution();
    const container = createContainer({ graph, name: "Test" });

    const sequence: string[] = [];
    let hook2CallCount = 0;

    const hook1 = (ctx: ResolutionHookContext) => {
      sequence.push(`hook1:${ctx.portName}`);
    };

    const hook2 = (ctx: ResolutionHookContext) => {
      sequence.push(`hook2:${ctx.portName}`);
      hook2CallCount++;
      // Remove hook2 during first call
      if (hook2CallCount === 1) {
        container.removeHook("beforeResolve", hook2);
      }
    };

    const hook3 = (ctx: ResolutionHookContext) => {
      sequence.push(`hook3:${ctx.portName}`);
    };

    container.addHook("beforeResolve", hook1);
    container.addHook("beforeResolve", hook2);
    container.addHook("beforeResolve", hook3);

    // First resolution: hook2 fires once for Service, then removes itself
    // When hook2 removes itself, hook3 hasn't fired yet for Service
    // Because hooks are iterated in-place, removing affects current iteration
    container.resolve(ServicePort);

    expect(hook2CallCount).toBe(1);
    // hook1 fires for all 3 ports (Service -> Database -> Logger)
    expect(sequence.filter(s => s.startsWith("hook1:")).length).toBe(3);
    // hook2 fires only for Service (first port), then removes itself
    expect(sequence.filter(s => s.startsWith("hook2:")).length).toBe(1);
    // hook3 is removed from array when hook2 removes hook2's wrapper
    // So hook3 fires only for Database and Logger (2 times), not Service
    expect(sequence.filter(s => s.startsWith("hook3:")).length).toBe(2);

    // Second resolution: hook2 should not fire (it was removed)
    sequence.length = 0;

    container.resolve(CachePort);

    // Only hook1 and hook3 should fire
    expect(sequence).toEqual(["hook1:Cache", "hook3:Cache"]);
  });

  it("should handle removeHook during afterResolve (LIFO firing affects current resolution)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const sequence: string[] = [];

    const hook1 = (ctx: ResolutionResultContext) => {
      sequence.push(`hook1:${ctx.portName}`);
    };

    const hook2 = (ctx: ResolutionResultContext) => {
      sequence.push(`hook2:${ctx.portName}`);
      // Remove hook2 during resolution
      container.removeHook("afterResolve", hook2);
    };

    const hook3 = (ctx: ResolutionResultContext) => {
      sequence.push(`hook3:${ctx.portName}`);
    };

    container.addHook("afterResolve", hook1);
    container.addHook("afterResolve", hook2);
    container.addHook("afterResolve", hook3);

    // First resolution: afterResolve fires in LIFO order (3, 2, 1)
    container.resolve(LoggerPort);

    // LIFO: hook3 fires first, then hook2 (which removes itself), then hook1
    expect(sequence).toEqual(["hook3:Logger", "hook2:Logger", "hook1:Logger"]);

    // Second resolution: hook2 should not fire (it was removed)
    sequence.length = 0;

    // Resolve again (will be cache hit, but hooks still fire)
    const scope = container.createScope("test");
    scope.resolve(LoggerPort); // Singleton, so same instance

    // Only hook3 and hook1 should fire (LIFO order)
    expect(sequence).toEqual(["hook3:Logger", "hook1:Logger"]);
  });
});

// =============================================================================
// Cross-Event Interactions Tests (3 tests)
// =============================================================================

describe("Hook Composition - Cross-Event Interactions", () => {
  it("should provide consistent view across nested resolutions", () => {
    const { graph } = createNestedResolution();
    const container = createContainer({ graph, name: "Test" });

    const entries: HookSequenceEntry[] = [];
    const hooks = trackHookSequence(entries, "tracker");

    container.addHook("beforeResolve", hooks.beforeResolve);
    container.addHook("afterResolve", hooks.afterResolve);

    // Resolve ServicePort which depends on DatabasePort which depends on LoggerPort
    container.resolve(ServicePort);

    // Verify nested resolution sequence
    verifyComposition(entries, {
      totalCalls: 6, // 3 ports × 2 hooks (before + after)
      beforeCount: 3,
      afterCount: 3,
      maxDepth: 2, // Service (0) -> Database (1) -> Logger (2)
    });

    // Verify resolution order: Service -> Database -> Logger
    const portSequence = entries.filter(e => e.type === "beforeResolve").map(e => e.portName);
    expect(portSequence).toEqual(["Service", "Database", "Logger"]);

    // Verify depths increase for nested deps
    expect(entries.find(e => e.portName === "Service")?.depth).toBe(0);
    expect(entries.find(e => e.portName === "Database")?.depth).toBe(1);
    expect(entries.find(e => e.portName === "Logger")?.depth).toBe(2);

    // Verify each port's beforeResolve fires before its afterResolve
    const serviceEvents = entries.filter(e => e.portName === "Service");
    expect(serviceEvents[0].type).toBe("beforeResolve");
    expect(serviceEvents[1].type).toBe("afterResolve");
  });

  it("should maintain independent hooks for parent and child containers", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const parentEvents: string[] = [];
    const childEvents: string[] = [];

    // Parent hooks
    parent.addHook("beforeResolve", ctx => {
      parentEvents.push(`parent:before:${ctx.portName}`);
    });
    parent.addHook("afterResolve", ctx => {
      parentEvents.push(`parent:after:${ctx.portName}`);
    });

    // Create child with overrides
    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => console.log("MOCK:", msg) }),
    });

    const childGraph = GraphBuilder.create().provide(MockLoggerAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Child hooks
    child.addHook("beforeResolve", ctx => {
      childEvents.push(`child:before:${ctx.portName}`);
    });
    child.addHook("afterResolve", ctx => {
      childEvents.push(`child:after:${ctx.portName}`);
    });

    // Resolve from child - only child hooks fire
    child.resolve(LoggerPort);

    // Child containers have independent hook management
    expect(parentEvents).toEqual([]); // Parent hooks don't fire for child resolutions
    expect(childEvents).toEqual(["child:before:Logger", "child:after:Logger"]);

    // Resolve from parent - only parent hooks fire
    parent.resolve(LoggerPort);

    // LIFO for afterResolve
    expect(parentEvents).toEqual(["parent:before:Logger", "parent:after:Logger"]);
    expect(childEvents).toEqual(["child:before:Logger", "child:after:Logger"]); // Unchanged
  });

  it("should fire container hooks for scope resolutions", () => {
    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "scoped",
      factory: () => {
        const store = new Map<string, string>();
        return {
          get: (key: string) => store.get(key) ?? null,
          set: (key: string, value: string) => store.set(key, value),
        };
      },
    });

    const graph = GraphBuilder.create().provide(CacheAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const containerEvents: string[] = [];

    container.addHook("beforeResolve", ctx => {
      containerEvents.push(`before:${ctx.containerKind}:${ctx.portName}`);
    });

    container.addHook("afterResolve", ctx => {
      containerEvents.push(`after:${ctx.containerKind}:${ctx.portName}`);
    });

    // Create scope
    const scope = container.createScope("request-1");

    // Resolve from scope
    scope.resolve(CachePort);

    // Container hooks fire for scope resolutions
    // Note: scopes inherit the root container's kind, so containerKind is "root"
    expect(containerEvents).toEqual([
      "before:root:Cache",
      "after:root:Cache", // LIFO doesn't matter with single hook
    ]);

    // Verify the context captured the scope container kind
    containerEvents.length = 0;

    // Resolve from container (singleton, not scoped)
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph2 = GraphBuilder.create().provide(LoggerAdapter).build();
    const container2 = createContainer({ graph: graph2, name: "Test2" });

    const events2: string[] = [];
    container2.addHook("beforeResolve", ctx => {
      events2.push(`${ctx.containerKind}:${ctx.portName}`);
    });

    container2.resolve(LoggerPort);

    // Root container resolution
    expect(events2).toEqual(["root:Logger"]);
  });
});

// =============================================================================
// Edge Case Tests (4 tests)
// =============================================================================

describe("Hook Composition - Edge Cases", () => {
  it("should handle hook that adds another hook during resolution", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const sequence: string[] = [];
    let hook2Added = false;

    const hook1 = (ctx: ResolutionHookContext) => {
      sequence.push("hook1");
      if (!hook2Added) {
        // Add hook2 during resolution
        container.addHook("beforeResolve", hook2);
        hook2Added = true;
      }
    };

    const hook2 = (ctx: ResolutionHookContext) => {
      sequence.push("hook2");
    };

    container.addHook("beforeResolve", hook1);

    // First resolution: hook1 fires and adds hook2 to the array
    // Since hooks iterate the array in-place, hook2 fires immediately
    container.resolve(LoggerPort);
    expect(sequence).toEqual(["hook1", "hook2"]);

    // Second resolution: both hooks fire again
    sequence.length = 0;
    const scope = container.createScope();
    scope.resolve(LoggerPort);

    expect(sequence).toEqual(["hook1", "hook2"]);
  });

  it("should handle hook that removes itself during execution", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    let callCount = 0;

    const selfRemovingHook = (ctx: ResolutionHookContext) => {
      callCount++;
      // Remove self after first call
      container.removeHook("beforeResolve", selfRemovingHook);
    };

    container.addHook("beforeResolve", selfRemovingHook);

    // First resolution: hook fires and removes itself
    container.resolve(LoggerPort);
    expect(callCount).toBe(1);

    // Second resolution: hook should not fire
    const scope = container.createScope();
    scope.resolve(LoggerPort);
    expect(callCount).toBe(1); // Still 1, not 2
  });

  it("should handle hook that triggers another resolution", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (key: string) => null,
        set: (key: string, value: string) => {},
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(CacheAdapter).build();

    const container = createContainer({ graph, name: "Test" });

    const sequence: string[] = [];
    let nestedResolutionTriggered = false;

    container.addHook("beforeResolve", ctx => {
      sequence.push(`before:${ctx.portName}:depth${ctx.depth}`);
      // Trigger nested resolution only once
      if (ctx.portName === "Logger" && !nestedResolutionTriggered) {
        nestedResolutionTriggered = true;
        container.resolve(CachePort);
      }
    });

    container.addHook("afterResolve", ctx => {
      sequence.push(`after:${ctx.portName}:depth${ctx.depth}`);
    });

    // Resolve Logger, which triggers Cache resolution in hook
    container.resolve(LoggerPort);

    // Verify nested resolution happened
    expect(sequence).toContain("before:Cache:depth0");
    expect(sequence).toContain("after:Cache:depth0");
    expect(sequence).toContain("before:Logger:depth0");
    expect(sequence).toContain("after:Logger:depth0");

    // Verify Cache resolution happened during Logger's beforeResolve
    const loggerBeforeIdx = sequence.indexOf("before:Logger:depth0");
    const cacheBeforeIdx = sequence.indexOf("before:Cache:depth0");
    const loggerAfterIdx = sequence.indexOf("after:Logger:depth0");

    expect(cacheBeforeIdx).toBeGreaterThan(loggerBeforeIdx);
    expect(cacheBeforeIdx).toBeLessThan(loggerAfterIdx);
  });

  it("should compose hooks correctly with disposal lifecycle", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => {} }),
      finalizer: async (logger: Logger) => {
        // Cleanup
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: string[] = [];

    container.addHook("beforeResolve", ctx => {
      events.push(`before:${ctx.portName}`);
    });

    container.addHook("afterResolve", ctx => {
      events.push(`after:${ctx.portName}`);
    });

    // Resolve to trigger hooks
    container.resolve(LoggerPort);

    expect(events).toEqual(["before:Logger", "after:Logger"]);

    // Dispose should not trigger hooks
    events.length = 0;
    await container.dispose();

    expect(events).toEqual([]); // No hooks fire during disposal
  });
});
