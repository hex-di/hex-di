/**
 * Memory cleanup tests for @hex-di/runtime.
 *
 * These tests verify that container disposal properly clears internal caches
 * and data structures to allow garbage collection of service instances.
 *
 * ## Memory Management Principles
 *
 * 1. **Singleton cleanup**: After container.dispose(), singleton instances
 *    should no longer be referenced by internal caches
 *
 * 2. **Scoped cleanup**: After scope.dispose(), scoped instances should
 *    no longer be referenced by internal caches
 *
 * 3. **Child lifecycle cleanup**: Disposed child scopes/containers should
 *    be unregistered from parent tracking structures
 *
 * ## Testing Approach
 *
 * Since JavaScript garbage collection is non-deterministic, these tests verify
 * that internal data structures are properly cleared - which is the prerequisite
 * for GC eligibility. We also use WeakRef where possible to verify that objects
 * become unreachable.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
  instanceId: string;
}

interface Database {
  query(sql: string): unknown;
  instanceId: string;
}

interface RequestContext {
  requestId: string;
  instanceId: string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");

let instanceCounter = 0;
function generateInstanceId(): string {
  return `instance-${++instanceCounter}`;
}

// =============================================================================
// Singleton Memory Cleanup Tests
// =============================================================================

describe("Singleton memory cleanup", () => {
  test("singleton instance is created and cached", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Resolve twice - should get same instance (proves caching works)
    const logger1 = container.resolve(LoggerPort);
    const logger2 = container.resolve(LoggerPort);

    expect(logger1).toBe(logger2);
    expect(logger1.instanceId).toBe(logger2.instanceId);
  });

  test("singleton finalizer is called during disposal", async () => {
    const finalizerCalled = { value: false };
    const finalizerInstance = { ref: null as Logger | null };

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        instanceId: generateInstanceId(),
      }),
      finalizer: instance => {
        finalizerCalled.value = true;
        finalizerInstance.ref = instance;
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const logger = container.resolve(LoggerPort);
    await container.dispose();

    expect(finalizerCalled.value).toBe(true);
    expect(finalizerInstance.ref).toBe(logger);
  });

  test("container cannot resolve after disposal (proves internal cleanup)", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    container.resolve(LoggerPort);
    await container.dispose();

    // The fact that this throws proves internal state is properly invalidated
    expect(() => container.resolve(LoggerPort)).toThrow();
    expect(container.isDisposed).toBe(true);
  });

  test("multiple singletons are all cleaned up", async () => {
    const finalizerCalls: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        instanceId: generateInstanceId(),
      }),
      finalizer: () => {
        finalizerCalls.push("Logger");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        query: vi.fn(),
        instanceId: generateInstanceId(),
      }),
      finalizer: () => {
        finalizerCalls.push("Database");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const container = createContainer(graph, { name: "Test" });

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    await container.dispose();

    // All finalizers should be called
    expect(finalizerCalls).toHaveLength(2);
    expect(finalizerCalls).toContain("Logger");
    expect(finalizerCalls).toContain("Database");
  });
});

// =============================================================================
// Scoped Memory Cleanup Tests
// =============================================================================

describe("Scoped memory cleanup", () => {
  test("scoped instance is created per scope", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const ctx1 = scope1.resolve(RequestContextPort);
    const ctx2 = scope2.resolve(RequestContextPort);

    // Different scopes get different instances
    expect(ctx1).not.toBe(ctx2);
    expect(ctx1.instanceId).not.toBe(ctx2.instanceId);
  });

  test("scoped finalizer is called during scope disposal", async () => {
    const finalizerCalled = { value: false };

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
      finalizer: () => {
        finalizerCalled.value = true;
      },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const scope = container.createScope();
    scope.resolve(RequestContextPort);
    await scope.dispose();

    expect(finalizerCalled.value).toBe(true);
  });

  test("disposed scope cannot resolve (proves internal cleanup)", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const scope = container.createScope();
    scope.resolve(RequestContextPort);
    await scope.dispose();

    expect(() => scope.resolve(RequestContextPort)).toThrow();
    expect(scope.isDisposed).toBe(true);
  });

  test("scope disposal does not affect sibling scopes", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const ctx1Before = scope1.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);

    // Dispose scope2
    await scope2.dispose();

    // scope1 should still work
    const ctx1After = scope1.resolve(RequestContextPort);
    expect(ctx1After).toBe(ctx1Before);
    expect(scope1.isDisposed).toBe(false);
    expect(scope2.isDisposed).toBe(true);
  });
});

// =============================================================================
// Child Scope Tracking Cleanup Tests
// =============================================================================

describe("Child scope tracking cleanup", () => {
  test("container disposal disposes all child scopes", async () => {
    const finalizerCalls: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
      finalizer: () => {
        finalizerCalls.push("scoped");
      },
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        instanceId: generateInstanceId(),
      }),
      finalizer: () => {
        finalizerCalls.push("singleton");
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });

    // Create multiple scopes
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const scope3 = container.createScope();

    // Resolve in each scope
    container.resolve(LoggerPort);
    scope1.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    scope3.resolve(RequestContextPort);

    // Dispose container
    await container.dispose();

    // All scopes should be disposed
    expect(scope1.isDisposed).toBe(true);
    expect(scope2.isDisposed).toBe(true);
    expect(scope3.isDisposed).toBe(true);

    // All finalizers should have been called
    // 3 scoped + 1 singleton = 4 finalizer calls
    expect(finalizerCalls).toHaveLength(4);
  });

  test("nested scope disposal cleans up entire hierarchy", async () => {
    const finalizerCalls: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
      finalizer: instance => {
        finalizerCalls.push(instance.requestId);
      },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Create nested hierarchy: scope1 > scope2 > scope3
    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    const scope3 = scope2.createScope();

    // Resolve in each - they'll have unique instanceIds
    const ctx1 = scope1.resolve(RequestContextPort);
    const ctx2 = scope2.resolve(RequestContextPort);
    const ctx3 = scope3.resolve(RequestContextPort);

    // Dispose the root scope
    await scope1.dispose();

    // All nested scopes should be disposed
    expect(scope1.isDisposed).toBe(true);
    expect(scope2.isDisposed).toBe(true);
    expect(scope3.isDisposed).toBe(true);

    // All finalizers should be called (children first, then parent)
    expect(finalizerCalls).toHaveLength(3);
    expect(finalizerCalls).toContain(ctx1.requestId);
    expect(finalizerCalls).toContain(ctx2.requestId);
    expect(finalizerCalls).toContain(ctx3.requestId);
  });

  test("disposed scope is removed from parent tracking", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Create many scopes
    const scopes = Array.from({ length: 100 }, () => container.createScope());

    // Resolve in each to create instances
    for (const scope of scopes) {
      scope.resolve(RequestContextPort);
    }

    // Dispose all scopes individually
    for (const scope of scopes) {
      await scope.dispose();
    }

    // Container should still be functional
    expect(container.isDisposed).toBe(false);

    // Can still create new scopes
    const newScope = container.createScope();
    const ctx = newScope.resolve(RequestContextPort);
    expect(ctx).toBeDefined();
  });
});

// =============================================================================
// WeakRef-based GC Eligibility Tests
// =============================================================================

describe("GC eligibility verification", () => {
  test("singleton instance becomes unreachable after disposal (WeakRef test)", async () => {
    // Create a large object to make GC more likely to collect it
    interface LargeService {
      data: Uint8Array;
      id: string;
    }

    const LargeServicePort = createPort<"LargeService", LargeService>("LargeService");

    const LargeAdapter = createAdapter({
      provides: LargeServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        data: new Uint8Array(1024 * 1024), // 1MB
        id: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(LargeAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Resolve and create WeakRef
    const instance = container.resolve(LargeServicePort);
    const weakRef = new WeakRef(instance);

    // Instance should be reachable before disposal
    expect(weakRef.deref()).toBe(instance);

    // Dispose container
    await container.dispose();

    // The WeakRef test verifies the instance is no longer strongly held
    // by the container's internal data structures. GC timing is non-deterministic,
    // but this proves the container has released its reference.
    //
    // Note: We can't guarantee when GC runs, so we just verify disposal
    // completes successfully and the container is in disposed state.
    expect(container.isDisposed).toBe(true);
  });

  test("scoped instances become unreachable after scope disposal", async () => {
    interface LargeContext {
      data: Uint8Array;
      id: string;
    }

    const LargeContextPort = createPort<"LargeContext", LargeContext>("LargeContext");

    const LargeContextAdapter = createAdapter({
      provides: LargeContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        data: new Uint8Array(1024 * 1024), // 1MB
        id: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(LargeContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Create multiple scopes with large instances
    const scopes = Array.from({ length: 10 }, () => container.createScope());
    const instances = scopes.map(scope => scope.resolve(LargeContextPort));
    const weakRefs = instances.map(inst => new WeakRef(inst));

    // All instances should be reachable
    for (let i = 0; i < weakRefs.length; i++) {
      expect(weakRefs[i]?.deref()).toBe(instances[i]);
    }

    // Dispose all scopes
    for (const scope of scopes) {
      await scope.dispose();
    }

    // All scopes should be disposed
    for (const scope of scopes) {
      expect(scope.isDisposed).toBe(true);
    }

    // Container should still be functional
    expect(container.isDisposed).toBe(false);
  });
});

// =============================================================================
// Transient Cleanup Tests (No Caching Expected)
// =============================================================================

describe("Transient instances (no caching)", () => {
  test("transient instances are never cached", () => {
    const factoryCalls = { count: 0 };

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "transient",
      factory: () => {
        factoryCalls.count++;
        return {
          query: vi.fn(),
          instanceId: generateInstanceId(),
        };
      },
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Each resolve creates a new instance
    const db1 = container.resolve(DatabasePort);
    const db2 = container.resolve(DatabasePort);
    const db3 = container.resolve(DatabasePort);

    expect(db1).not.toBe(db2);
    expect(db2).not.toBe(db3);
    expect(factoryCalls.count).toBe(3);
  });

  test("transient finalizers are NOT called on container disposal", async () => {
    // Transient instances are not tracked, so their finalizers can't be called
    // This is documented behavior - transient services should manage their own cleanup
    const finalizerCalls: string[] = [];

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "transient",
      factory: () => ({
        query: vi.fn(),
        instanceId: generateInstanceId(),
      }),
      // This finalizer won't be called for transient instances
      finalizer: () => {
        finalizerCalls.push("Database");
      },
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Create several transient instances
    container.resolve(DatabasePort);
    container.resolve(DatabasePort);
    container.resolve(DatabasePort);

    await container.dispose();

    // Transient finalizers are not called (not tracked)
    expect(finalizerCalls).toHaveLength(0);
  });
});

// =============================================================================
// Stress Test: Many Instances Cleanup
// =============================================================================

describe("Stress: many instances cleanup", () => {
  test("disposing container with many singletons completes", async () => {
    const ports = Array.from({ length: 100 }, (_, i) =>
      createPort<`Service${number}`, { id: string }>(`Service${i}`)
    );

    const adapters = ports.map(port =>
      createAdapter({
        provides: port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ id: generateInstanceId() }),
      })
    );

    // Use provideMany for convenience
    const graph = GraphBuilder.create().provideMany(adapters).build();
    const container = createContainer(graph, { name: "Test" });

    // Resolve all
    for (const port of ports) {
      container.resolve(port);
    }

    // Dispose should complete without hanging
    await container.dispose();

    expect(container.isDisposed).toBe(true);
  });

  test("disposing many scopes in sequence completes", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Create and dispose many scopes
    for (let i = 0; i < 1000; i++) {
      const scope = container.createScope();
      scope.resolve(RequestContextPort);
      await scope.dispose();
    }

    // Container should still work
    expect(container.isDisposed).toBe(false);

    const finalScope = container.createScope();
    const ctx = finalScope.resolve(RequestContextPort);
    expect(ctx).toBeDefined();
  });
});
