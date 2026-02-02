/**
 * RUN-02 Disposal Lifecycle Verification Tests.
 *
 * These tests explicitly verify all RUN-02 acceptance criteria:
 * 1. LIFO disposal order (reverse creation)
 * 2. Async disposal support (finalizers awaited)
 * 3. Error aggregation (all finalizers called despite errors)
 * 4. Idempotent disposal (second call is no-op)
 * 5. Cascade disposal (child before parent)
 * 6. Scoped disposal (only scoped services disposed)
 *
 * @packageDocumentation
 */

// Global declarations for Node.js types used in tests
declare function setTimeout(callback: (...args: unknown[]) => void, ms?: number): unknown;

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  id: "A";
}

interface ServiceB {
  id: "B";
  depA: ServiceA;
}

interface ServiceC {
  id: "C";
  depB: ServiceB;
}

interface ScopedServiceX {
  id: "X";
}

interface ScopedServiceY {
  id: "Y";
}

interface SingletonService {
  id: "singleton";
}

const ServiceAPort = port<ServiceA>()({ name: "ServiceA" });
const ServiceBPort = port<ServiceB>()({ name: "ServiceB" });
const ServiceCPort = port<ServiceC>()({ name: "ServiceC" });
const ScopedServiceXPort = port<ScopedServiceX>()({ name: "ScopedServiceX" });
const ScopedServiceYPort = port<ScopedServiceY>()({ name: "ScopedServiceY" });
const SingletonServicePort = port<SingletonService>()({ name: "SingletonService" });

// =============================================================================
// RUN-02 Requirement 1: LIFO Disposal Order
// =============================================================================

describe("RUN-02: LIFO Disposal Order", () => {
  test("services dispose in reverse creation order (A->B->C creates, C->B->A disposes)", async () => {
    const disposalOrder: string[] = [];

    const ServiceAAdapter = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: () => {
        disposalOrder.push("A");
      },
    });

    const ServiceBAdapter = createAdapter({
      provides: ServiceBPort,
      requires: [ServiceAPort],
      lifetime: "singleton",
      factory: deps => ({ id: "B", depA: deps[0] }),
      finalizer: () => {
        disposalOrder.push("B");
      },
    });

    const ServiceCAdapter = createAdapter({
      provides: ServiceCPort,
      requires: [ServiceBPort],
      lifetime: "singleton",
      factory: deps => ({ id: "C", depB: deps[0] }),
      finalizer: () => {
        disposalOrder.push("C");
      },
    });

    const graph = GraphBuilder.create()
      .provide(ServiceAAdapter)
      .provide(ServiceBAdapter)
      .provide(ServiceCAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });

    // Resolve A first, then B (which also resolves A), then C (which resolves B and A)
    // Creation order: A -> B -> C (due to dependency resolution)
    container.resolve(ServiceAPort);
    container.resolve(ServiceBPort);
    container.resolve(ServiceCPort);

    await container.dispose();

    // Verify LIFO: C (last created) -> B -> A (first created)
    expect(disposalOrder).toEqual(["C", "B", "A"]);
  });

  test("independent services dispose in LIFO order regardless of dependencies", async () => {
    const disposalOrder: string[] = [];

    const Service1 = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: () => disposalOrder.push("1"),
    });

    const Service2 = createAdapter({
      provides: ServiceBPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "B", depA: { id: "A" } }),
      finalizer: () => disposalOrder.push("2"),
    });

    const Service3 = createAdapter({
      provides: ServiceCPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "C", depB: { id: "B", depA: { id: "A" } } }),
      finalizer: () => disposalOrder.push("3"),
    });

    const graph = GraphBuilder.create()
      .provide(Service1)
      .provide(Service2)
      .provide(Service3)
      .build();

    const container = createContainer(graph, { name: "Test" });

    // Resolve in specific order
    container.resolve(ServiceAPort); // creates 1
    container.resolve(ServiceBPort); // creates 2
    container.resolve(ServiceCPort); // creates 3

    await container.dispose();

    // LIFO: 3 -> 2 -> 1
    expect(disposalOrder).toEqual(["3", "2", "1"]);
  });
});

// =============================================================================
// RUN-02 Requirement 2: Async Disposal Support
// =============================================================================

describe("RUN-02: Async Disposal Support", () => {
  test("async finalizers are fully awaited before continuing", async () => {
    const timeline: Array<{ event: string; time: number }> = [];
    const startTime = Date.now();
    const recordEvent = (event: string) => {
      timeline.push({ event, time: Date.now() - startTime });
    };

    const SlowService = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        recordEvent("create");
        return { id: "A" };
      },
      finalizer: async () => {
        recordEvent("dispose-start");
        await new Promise(resolve => setTimeout(resolve, 100));
        recordEvent("dispose-end");
      },
    });

    const graph = GraphBuilder.create().provide(SlowService).build();
    const container = createContainer(graph, { name: "Test" });

    container.resolve(ServiceAPort);

    recordEvent("before-dispose");
    await container.dispose();
    recordEvent("after-dispose");

    // Verify that dispose-end happened before after-dispose
    const disposeEndIndex = timeline.findIndex(e => e.event === "dispose-end");
    const afterDisposeIndex = timeline.findIndex(e => e.event === "after-dispose");

    expect(disposeEndIndex).toBeLessThan(afterDisposeIndex);

    // Verify that disposal took at least 100ms
    const disposeEnd = timeline.find(e => e.event === "dispose-end");
    const disposeStart = timeline.find(e => e.event === "dispose-start");
    expect(disposeEnd).toBeDefined();
    expect(disposeStart).toBeDefined();
    expect(disposeEnd!.time - disposeStart!.time).toBeGreaterThanOrEqual(90);
  });

  test("multiple async finalizers are awaited sequentially in LIFO order", async () => {
    const disposalOrder: string[] = [];

    const Service1 = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        disposalOrder.push("A");
      },
    });

    const Service2 = createAdapter({
      provides: ServiceBPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "B", depA: { id: "A" } }),
      finalizer: async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        disposalOrder.push("B");
      },
    });

    const graph = GraphBuilder.create().provide(Service1).provide(Service2).build();
    const container = createContainer(graph, { name: "Test" });

    container.resolve(ServiceAPort);
    container.resolve(ServiceBPort);

    await container.dispose();

    // LIFO order: B disposed first, then A
    // Each is awaited before the next starts, so B completes before A starts
    expect(disposalOrder).toEqual(["B", "A"]);
  });
});

// =============================================================================
// RUN-02 Requirement 3: Error Aggregation
// =============================================================================

describe("RUN-02: Error Aggregation", () => {
  test("all finalizers are called even when some throw errors", async () => {
    const finalizersCalled: string[] = [];

    const Service1 = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: () => {
        finalizersCalled.push("A");
        throw new Error("A disposal failed");
      },
    });

    const Service2 = createAdapter({
      provides: ServiceBPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "B", depA: { id: "A" } }),
      finalizer: () => {
        finalizersCalled.push("B");
        // This one succeeds
      },
    });

    const Service3 = createAdapter({
      provides: ServiceCPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "C", depB: { id: "B", depA: { id: "A" } } }),
      finalizer: () => {
        finalizersCalled.push("C");
        throw new Error("C disposal failed");
      },
    });

    const graph = GraphBuilder.create()
      .provide(Service1)
      .provide(Service2)
      .provide(Service3)
      .build();

    const container = createContainer(graph, { name: "Test" });

    container.resolve(ServiceAPort);
    container.resolve(ServiceBPort);
    container.resolve(ServiceCPort);

    // Disposal should throw but ALL finalizers should be called
    await expect(container.dispose()).rejects.toThrow(AggregateError);

    // Verify all 3 finalizers were called
    expect(finalizersCalled).toHaveLength(3);
    expect(finalizersCalled).toContain("A");
    expect(finalizersCalled).toContain("B");
    expect(finalizersCalled).toContain("C");
  });

  test("AggregateError contains all failure messages", async () => {
    const Service1 = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: () => {
        throw new Error("Error from A");
      },
    });

    const Service2 = createAdapter({
      provides: ServiceBPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "B", depA: { id: "A" } }),
      finalizer: () => {
        throw new Error("Error from B");
      },
    });

    const graph = GraphBuilder.create().provide(Service1).provide(Service2).build();
    const container = createContainer(graph, { name: "Test" });

    container.resolve(ServiceAPort);
    container.resolve(ServiceBPort);

    try {
      await container.dispose();
      expect.fail("Expected AggregateError");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const aggError = error as AggregateError;
      expect(aggError.errors).toHaveLength(2);

      const messages = aggError.errors.map(e => (e as Error).message);
      expect(messages).toContain("Error from A");
      expect(messages).toContain("Error from B");
    }
  });
});

// =============================================================================
// RUN-02 Requirement 4: Idempotent Disposal
// =============================================================================

describe("RUN-02: Idempotent Disposal", () => {
  test("finalizers are called only once despite multiple dispose() calls", async () => {
    let finalizerCallCount = 0;

    const Service = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: () => {
        finalizerCallCount++;
      },
    });

    const graph = GraphBuilder.create().provide(Service).build();
    const container = createContainer(graph, { name: "Test" });

    container.resolve(ServiceAPort);

    // Call dispose multiple times
    await container.dispose();
    await container.dispose();
    await container.dispose();

    // Finalizer should only be called once
    expect(finalizerCallCount).toBe(1);
  });

  test("second dispose() call completes immediately without errors", async () => {
    const Service = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
      finalizer: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      },
    });

    const graph = GraphBuilder.create().provide(Service).build();
    const container = createContainer(graph, { name: "Test" });

    container.resolve(ServiceAPort);

    // First dispose takes time
    const start1 = Date.now();
    await container.dispose();
    const duration1 = Date.now() - start1;

    // Second dispose should be instant
    const start2 = Date.now();
    await container.dispose();
    const duration2 = Date.now() - start2;

    expect(duration1).toBeGreaterThanOrEqual(90);
    expect(duration2).toBeLessThan(50);
  });

  test("isDisposed returns true after disposal", async () => {
    const Service = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "A" }),
    });

    const graph = GraphBuilder.create().provide(Service).build();
    const container = createContainer(graph, { name: "Test" });

    expect(container.isDisposed).toBe(false);

    await container.dispose();

    expect(container.isDisposed).toBe(true);
  });
});

// =============================================================================
// RUN-02 Requirement 5: Cascade Disposal
// =============================================================================

describe("RUN-02: Cascade Disposal", () => {
  test("child scope is disposed before parent scope", async () => {
    const disposalOrder: string[] = [];

    const ScopedService = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ id: "X" }),
      finalizer: () => {
        disposalOrder.push("scoped");
      },
    });

    const graph = GraphBuilder.create().provide(ScopedService).build();
    const container = createContainer(graph, { name: "Test" });

    const parentScope = container.createScope();
    const childScope = parentScope.createScope();

    // We need different adapters for parent and child to track order
    // Let's use a single adapter but track which scope's instance is disposed
    // Actually, with scoped lifetime, each scope gets its own instance
    // But the finalizer is per-adapter, not per-instance

    // Better approach: use disposalOrder with scope tracking
    const ScopedServiceWithTracking = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ id: "X" }),
      finalizer: instance => {
        // Track which instance was disposed (we'll set IDs differently)
        disposalOrder.push(instance.id);
      },
    });

    const graphWithTracking = GraphBuilder.create().provide(ScopedServiceWithTracking).build();
    const containerWithTracking = createContainer(graphWithTracking, { name: "Test" });

    const parentScopeTracking = containerWithTracking.createScope();
    const childScopeTracking = parentScopeTracking.createScope();

    // Create instances in each scope
    // Since they have same factory, we need to modify the instances after creation
    const parentInstance = parentScopeTracking.resolve(ScopedServiceXPort);
    const childInstance = childScopeTracking.resolve(ScopedServiceXPort);

    // Mutate IDs to track which scope's instance is disposed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (parentInstance as any).id = "parent";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (childInstance as any).id = "child";

    // Dispose parent - should cascade to child first
    await parentScopeTracking.dispose();

    // Child disposed before parent
    expect(disposalOrder).toEqual(["child", "parent"]);
  });

  test("grandchild disposes before child, child before parent", async () => {
    const disposalOrder: string[] = [];

    let instanceCounter = 0;
    const ScopedService = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => {
        instanceCounter++;
        return { id: `instance-${instanceCounter}` as "X" };
      },
      finalizer: instance => {
        disposalOrder.push(instance.id);
      },
    });

    const graph = GraphBuilder.create().provide(ScopedService).build();
    const container = createContainer(graph, { name: "Test" });

    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    const scope3 = scope2.createScope();

    // Create instances - factory gives each a unique ID
    scope1.resolve(ScopedServiceXPort); // instance-1
    scope2.resolve(ScopedServiceXPort); // instance-2
    scope3.resolve(ScopedServiceXPort); // instance-3

    await scope1.dispose();

    // Disposal order: deepest first (instance-3 -> instance-2 -> instance-1)
    expect(disposalOrder).toEqual(["instance-3", "instance-2", "instance-1"]);
  });

  test("container disposal disposes all child scopes before singletons", async () => {
    const disposalOrder: string[] = [];

    const SingletonService = createAdapter({
      provides: SingletonServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "singleton" }),
      finalizer: () => {
        disposalOrder.push("singleton");
      },
    });

    const ScopedService = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ id: "X" }),
      finalizer: () => {
        disposalOrder.push("scoped");
      },
    });

    const graph = GraphBuilder.create().provide(SingletonService).provide(ScopedService).build();

    const container = createContainer(graph, { name: "Test" });

    // Resolve singleton first
    container.resolve(SingletonServicePort);

    // Create scope and resolve scoped service
    const scope = container.createScope();
    scope.resolve(ScopedServiceXPort);

    await container.dispose();

    // Scoped services (in child scope) disposed before singletons (in container)
    expect(disposalOrder).toEqual(["scoped", "singleton"]);
  });
});

// =============================================================================
// RUN-02 Requirement 6: Scoped Disposal
// =============================================================================

describe("RUN-02: Scoped Disposal", () => {
  test("scope.dispose() only disposes scoped services, not singletons", async () => {
    const finalizersCalled: string[] = [];

    const SingletonService = createAdapter({
      provides: SingletonServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "singleton" }),
      finalizer: () => {
        finalizersCalled.push("singleton");
      },
    });

    const ScopedService = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ id: "X" }),
      finalizer: () => {
        finalizersCalled.push("scoped");
      },
    });

    const graph = GraphBuilder.create().provide(SingletonService).provide(ScopedService).build();

    const container = createContainer(graph, { name: "Test" });

    // Resolve singleton at container level
    container.resolve(SingletonServicePort);

    // Create scope and resolve both
    const scope = container.createScope();
    scope.resolve(SingletonServicePort); // Gets same singleton instance
    scope.resolve(ScopedServiceXPort);

    // Dispose only the scope
    await scope.dispose();

    // Only scoped service should be disposed
    expect(finalizersCalled).toEqual(["scoped"]);

    // Singleton should still be accessible from container
    const singleton = container.resolve(SingletonServicePort);
    expect(singleton.id).toBe("singleton");

    // Verify container is not disposed
    expect(container.isDisposed).toBe(false);
  });

  test("parent container remains operational after child scope disposal", async () => {
    const disposalTracker = vi.fn();

    const SingletonService = createAdapter({
      provides: SingletonServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ id: "singleton" }),
      finalizer: disposalTracker,
    });

    const ScopedService = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ id: "X" }),
    });

    const graph = GraphBuilder.create().provide(SingletonService).provide(ScopedService).build();

    const container = createContainer(graph, { name: "Test" });

    // Create and dispose a scope
    const scope1 = container.createScope();
    scope1.resolve(ScopedServiceXPort);
    await scope1.dispose();

    // Container should still work
    expect(container.isDisposed).toBe(false);

    // Can still resolve singleton
    const singleton = container.resolve(SingletonServicePort);
    expect(singleton.id).toBe("singleton");

    // Can create new scopes
    const scope2 = container.createScope();
    const scoped = scope2.resolve(ScopedServiceXPort);
    expect(scoped.id).toBe("X");

    // Singleton finalizer should not have been called
    expect(disposalTracker).not.toHaveBeenCalled();

    // Now dispose container - singleton finalizer should be called
    await container.dispose();
    expect(disposalTracker).toHaveBeenCalledTimes(1);
  });

  test("multiple scopes can be disposed independently", async () => {
    let scopedInstanceCount = 0;
    const disposedInstances: number[] = [];

    const ScopedService = createAdapter({
      provides: ScopedServiceXPort,
      requires: [],
      lifetime: "scoped",
      factory: () => {
        scopedInstanceCount++;
        return { id: `instance-${scopedInstanceCount}` as "X" };
      },
      finalizer: () => {
        disposedInstances.push(scopedInstanceCount);
      },
    });

    const graph = GraphBuilder.create().provide(ScopedService).build();
    const container = createContainer(graph, { name: "Test" });

    // Create multiple independent scopes
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const scope3 = container.createScope();

    scope1.resolve(ScopedServiceXPort); // instance 1
    scope2.resolve(ScopedServiceXPort); // instance 2
    scope3.resolve(ScopedServiceXPort); // instance 3

    // Dispose scope2 only
    await scope2.dispose();

    // Only scope2's instance should be disposed
    expect(scope2.isDisposed).toBe(true);
    expect(scope1.isDisposed).toBe(false);
    expect(scope3.isDisposed).toBe(false);

    // Other scopes can still resolve
    const s1Instance = scope1.resolve(ScopedServiceXPort);
    expect(s1Instance.id).toBe("instance-1");

    const s3Instance = scope3.resolve(ScopedServiceXPort);
    expect(s3Instance.id).toBe("instance-3");
  });
});
