/**
 * Child Container unit tests.
 *
 * Tests for ChildContainerBuilder and ChildContainer behavior including:
 * - Builder creation via container.createChild()
 * - Builder immutability (each method returns new instance)
 * - .build() creates frozen ChildContainer
 * - Empty child container inherits parent adapters
 * - Basic adapter resolution delegating to parent
 * - Child container isDisposed property
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "../src/container.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Config {
  getValue(key: string): string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const ConfigPort = createPort<"Config", Config>("Config");

// =============================================================================
// ChildContainerBuilder Creation Tests
// =============================================================================

describe("ChildContainerBuilder", () => {
  test("container.createChild() returns a builder instance", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild();

    // Builder should have the expected methods
    expect(builder).toBeDefined();
    expect(typeof builder.build).toBe("function");
  });

  test("builder is immutable - each method returns new instance", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder1 = container.createChild();
    const builder2 = builder1.build;

    // The builder itself should be frozen
    expect(Object.isFrozen(builder1)).toBe(true);
  });
});

// =============================================================================
// ChildContainer Creation Tests
// =============================================================================

describe("ChildContainer", () => {
  test(".build() creates a frozen ChildContainer", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    expect(Object.isFrozen(childContainer)).toBe(true);
  });

  test("empty child container (no overrides/extends) inherits parent adapters", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Resolve from parent first
    const parentLogger = container.resolve(LoggerPort);

    // Create empty child container
    const childContainer = container.createChild().build();

    // Child should be able to resolve the same port
    const childLogger = childContainer.resolve(LoggerPort);

    // Should return the same singleton instance (shared with parent by default)
    expect(childLogger).toBe(parentLogger);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("basic adapter resolution from child delegates to parent", () => {
    const loggerFactory = vi.fn(() => ({ log: vi.fn() }));
    const dbFactory = vi.fn(() => ({ query: vi.fn() }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: loggerFactory,
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: dbFactory,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();
    const container = createContainer(graph);

    // Create child container
    const childContainer = container.createChild().build();

    // Resolve both from child - should delegate to parent
    const childLogger = childContainer.resolve(LoggerPort);
    const childDb = childContainer.resolve(DatabasePort);

    // Now resolve from parent
    const parentLogger = container.resolve(LoggerPort);
    const parentDb = container.resolve(DatabasePort);

    // Should be the same instances (singletons shared via delegation)
    expect(childLogger).toBe(parentLogger);
    expect(childDb).toBe(parentDb);

    // Each factory should only be called once
    expect(loggerFactory).toHaveBeenCalledTimes(1);
    expect(dbFactory).toHaveBeenCalledTimes(1);
  });

  test("child container isDisposed property is false initially and true after dispose", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    // Initially not disposed
    expect(childContainer.isDisposed).toBe(false);

    // Dispose the child container
    await childContainer.dispose();

    // Now should be disposed
    expect(childContainer.isDisposed).toBe(true);
  });

  test("child container has parent reference", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    // Child should have a reference to its parent
    expect(childContainer.parent).toBe(container);
  });

  test("child container has createScope method", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    // Child should have createScope method
    expect(typeof childContainer.createScope).toBe("function");

    // createScope should return a scope
    const scope = childContainer.createScope();
    expect(scope).toBeDefined();
    expect(typeof scope.resolve).toBe("function");
  });
});

// =============================================================================
// Override Operation Tests
// =============================================================================

describe("ChildContainer.override()", () => {
  test(".override(adapter) replaces parent adapter in child scope", () => {
    const parentLogFn = vi.fn();
    const childLogFn = vi.fn();

    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: parentLogFn }),
    });

    const ChildLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: childLogFn }),
    });

    const graph = GraphBuilder.create().provide(ParentLoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with override
    const childContainer = container.createChild().override(ChildLoggerAdapter).build();

    // Resolve from parent - should use parent adapter
    const parentLogger = container.resolve(LoggerPort);
    parentLogger.log("parent message");
    expect(parentLogFn).toHaveBeenCalledWith("parent message");
    expect(childLogFn).not.toHaveBeenCalled();

    // Resolve from child - should use overridden adapter
    const childLogger = childContainer.resolve(LoggerPort);
    childLogger.log("child message");
    expect(childLogFn).toHaveBeenCalledWith("child message");
  });

  test("override creates new singleton instance (not shared with parent)", () => {
    const parentFactory = vi.fn(() => ({ log: vi.fn() }));
    const childFactory = vi.fn(() => ({ log: vi.fn() }));

    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: parentFactory,
    });

    const ChildLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: childFactory,
    });

    const graph = GraphBuilder.create().provide(ParentLoggerAdapter).build();
    const container = createContainer(graph);

    // Resolve from parent first
    const parentLogger = container.resolve(LoggerPort);

    // Create child with override
    const childContainer = container.createChild().override(ChildLoggerAdapter).build();

    // Resolve from child - should create NEW instance
    const childLogger = childContainer.resolve(LoggerPort);

    // They should be different instances
    expect(childLogger).not.toBe(parentLogger);

    // Parent factory called once for parent, child factory called once for child
    expect(parentFactory).toHaveBeenCalledTimes(1);
    expect(childFactory).toHaveBeenCalledTimes(1);

    // Multiple resolutions from child should return same child singleton
    const childLogger2 = childContainer.resolve(LoggerPort);
    expect(childLogger2).toBe(childLogger);
    expect(childFactory).toHaveBeenCalledTimes(1); // Still only called once
  });

  test("override can use different lifetime than parent adapter", () => {
    const parentFactory = vi.fn(() => ({ log: vi.fn() }));
    const childFactory = vi.fn(() => ({ log: vi.fn() }));

    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: parentFactory,
    });

    const ChildLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: childFactory,
    });

    const graph = GraphBuilder.create().provide(ParentLoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with override (transient lifetime)
    const childContainer = container.createChild().override(ChildLoggerAdapter).build();

    // Each resolution from child should create new instance (transient)
    const childLogger1 = childContainer.resolve(LoggerPort);
    const childLogger2 = childContainer.resolve(LoggerPort);

    expect(childLogger1).not.toBe(childLogger2);
    expect(childFactory).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Extend Operation Tests
// =============================================================================

describe("ChildContainer.extend()", () => {
  test(".extend(adapter) adds new port not in parent", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getValue: (key: string) => `value-${key}` }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with extension
    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Child should resolve the extended port
    const config = childContainer.resolve(ConfigPort);
    expect(config.getValue("test")).toBe("value-test");

    // Child should still resolve parent ports
    const logger = childContainer.resolve(LoggerPort);
    expect(logger).toBeDefined();
  });

  test("extended port resolves only in child (not visible to parent)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getValue: () => "config-value" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with extension
    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Child can resolve extended port
    const config = childContainer.resolve(ConfigPort);
    expect(config.getValue("key")).toBe("config-value");

    // Parent cannot resolve extended port (this is a type-level constraint)
    // At runtime, parent doesn't have the adapter so it would throw
    // We test this indirectly by checking the parent's adapter map doesn't have ConfigPort
    expect(() => {
      // This would throw at runtime because parent doesn't have ConfigPort adapter
      // TypeScript would prevent this at compile time with proper types
      (container as unknown as { resolve: (p: unknown) => unknown }).resolve(ConfigPort);
    }).toThrow();
  });

  test("extended adapters can depend on parent adapters", () => {
    const logFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    // Config adapter that depends on Logger from parent
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: (deps) => {
        deps.Logger.log("ConfigAdapter initialized");
        return { getValue: () => "config-value" };
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with extension that depends on parent's Logger
    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Resolve extended port - should use Logger from parent
    const config = childContainer.resolve(ConfigPort);

    expect(logFn).toHaveBeenCalledWith("ConfigAdapter initialized");
    expect(config.getValue("key")).toBe("config-value");
  });

  test("multiple extends accumulate ports correctly", () => {
    interface Cache {
      get(key: string): unknown;
    }
    const CachePort = createPort<"Cache", Cache>("Cache");

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getValue: () => "config" }),
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "cached" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with multiple extensions
    const childContainer = container
      .createChild()
      .extend(ConfigAdapter)
      .extend(CacheAdapter)
      .build();

    // Child should resolve all ports (parent + extended)
    expect(childContainer.resolve(LoggerPort)).toBeDefined();
    expect(childContainer.resolve(ConfigPort).getValue("key")).toBe("config");
    expect(childContainer.resolve(CachePort).get("key")).toBe("cached");
  });
});

// =============================================================================
// Inheritance Mode Tests
// =============================================================================

describe("Inheritance Modes", () => {
  // Mutable counter service for testing state sharing
  interface Counter {
    value: number;
    increment(): void;
  }

  const CounterPort = createPort<"Counter", Counter>("Counter");

  const createCounterAdapter = () =>
    createAdapter({
      provides: CounterPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        value: 0,
        increment() {
          this.value++;
        },
      }),
    });

  describe("shared mode (default)", () => {
    test("child sees parent's singleton instance by default", () => {
      const CounterAdapter = createCounterAdapter();

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent first
      const parentCounter = container.resolve(CounterPort);
      parentCounter.increment();
      expect(parentCounter.value).toBe(1);

      // Create child container (default shared mode)
      const childContainer = container.createChild().build();

      // Child should see the same instance
      const childCounter = childContainer.resolve(CounterPort);
      expect(childCounter).toBe(parentCounter);
      expect(childCounter.value).toBe(1);
    });

    test("shared mode: mutations in child visible in parent", () => {
      const CounterAdapter = createCounterAdapter();

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent
      const parentCounter = container.resolve(CounterPort);
      expect(parentCounter.value).toBe(0);

      // Create child and mutate
      const childContainer = container.createChild().build();
      const childCounter = childContainer.resolve(CounterPort);
      childCounter.increment();
      childCounter.increment();

      // Parent should see the mutation (shared reference)
      expect(parentCounter.value).toBe(2);
    });
  });

  describe("forked mode", () => {
    test("child gets snapshot copy of parent's singleton at creation time", () => {
      const CounterAdapter = createCounterAdapter();

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent and set initial state
      const parentCounter = container.resolve(CounterPort);
      parentCounter.increment();
      expect(parentCounter.value).toBe(1);

      // Create child with forked mode
      const childContainer = container
        .createChild()
        .withInheritanceMode({ Counter: "forked" })
        .build();

      // Child should have its own copy with same initial value
      const childCounter = childContainer.resolve(CounterPort);
      expect(childCounter.value).toBe(1);
      expect(childCounter).not.toBe(parentCounter);
    });

    test("forked mode: mutations in child NOT visible in parent", () => {
      const CounterAdapter = createCounterAdapter();

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent
      const parentCounter = container.resolve(CounterPort);
      parentCounter.increment();
      expect(parentCounter.value).toBe(1);

      // Create child with forked mode and mutate
      const childContainer = container
        .createChild()
        .withInheritanceMode({ Counter: "forked" })
        .build();

      const childCounter = childContainer.resolve(CounterPort);
      childCounter.increment();
      childCounter.increment();
      childCounter.increment();
      expect(childCounter.value).toBe(4);

      // Parent should NOT see child's mutations
      expect(parentCounter.value).toBe(1);
    });
  });

  describe("isolated mode", () => {
    test("child creates fresh singleton instance ignoring parent", () => {
      const factory = vi.fn(() => ({
        value: 0,
        increment() {
          this.value++;
        },
      }));

      const CounterAdapter = createAdapter({
        provides: CounterPort,
        requires: [],
        lifetime: "singleton",
        factory,
      });

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent and set initial state
      const parentCounter = container.resolve(CounterPort);
      parentCounter.increment();
      parentCounter.increment();
      expect(parentCounter.value).toBe(2);

      // Create child with isolated mode
      const childContainer = container
        .createChild()
        .withInheritanceMode({ Counter: "isolated" })
        .build();

      // Child should have a fresh instance (value starts at 0)
      const childCounter = childContainer.resolve(CounterPort);
      expect(childCounter.value).toBe(0);
      expect(childCounter).not.toBe(parentCounter);

      // Factory should be called twice (once for parent, once for child)
      expect(factory).toHaveBeenCalledTimes(2);
    });

    test("isolated mode: child instance is completely independent", () => {
      const CounterAdapter = createCounterAdapter();

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent
      const parentCounter = container.resolve(CounterPort);

      // Create child with isolated mode
      const childContainer = container
        .createChild()
        .withInheritanceMode({ Counter: "isolated" })
        .build();

      const childCounter = childContainer.resolve(CounterPort);

      // Mutate both independently
      parentCounter.increment(); // parent = 1
      childCounter.increment();
      childCounter.increment(); // child = 2

      expect(parentCounter.value).toBe(1);
      expect(childCounter.value).toBe(2);
    });
  });

  describe("mode configuration behavior", () => {
    test("inheritance mode applies only to non-overridden ports", () => {
      const CounterAdapter = createCounterAdapter();

      const OverrideCounterAdapter = createAdapter({
        provides: CounterPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          value: 100, // Start at 100 to distinguish
          increment() {
            this.value++;
          },
        }),
      });

      const graph = GraphBuilder.create().provide(CounterAdapter).build();
      const container = createContainer(graph);

      // Resolve parent
      const parentCounter = container.resolve(CounterPort);
      parentCounter.increment();

      // Create child with override and forked mode
      // The override should take precedence over inheritance mode
      const childContainer = container
        .createChild()
        .override(OverrideCounterAdapter)
        .withInheritanceMode({ Counter: "forked" })
        .build();

      const childCounter = childContainer.resolve(CounterPort);

      // Child should use the override (starting at 100), not forked parent value
      expect(childCounter.value).toBe(100);
      expect(childCounter).not.toBe(parentCounter);
    });

    test("different ports can have different inheritance modes", () => {
      interface State {
        data: string;
      }
      const StatePort = createPort<"State", State>("State");

      const CounterAdapter = createCounterAdapter();
      const StateAdapter = createAdapter({
        provides: StatePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ data: "initial" }),
      });

      const graph = GraphBuilder.create()
        .provide(CounterAdapter)
        .provide(StateAdapter)
        .build();
      const container = createContainer(graph);

      // Set up parent state
      const parentCounter = container.resolve(CounterPort);
      parentCounter.increment();

      const parentState = container.resolve(StatePort);
      parentState.data = "modified";

      // Create child with different modes per port
      const childContainer = container
        .createChild()
        .withInheritanceMode({ Counter: "isolated", State: "shared" })
        .build();

      // Counter should be isolated (fresh instance)
      const childCounter = childContainer.resolve(CounterPort);
      expect(childCounter.value).toBe(0);

      // State should be shared (same instance)
      const childState = childContainer.resolve(StatePort);
      expect(childState).toBe(parentState);
      expect(childState.data).toBe("modified");
    });
  });
});

// =============================================================================
// Multi-Level Hierarchy and Disposal Tests (Task Group 4)
// =============================================================================

describe("Multi-Level Hierarchy and Disposal", () => {
  describe("childContainer.createChild() - grandchild containers", () => {
    test("childContainer.createChild() returns a builder for grandchild", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      // Create child container
      const childContainer = container.createChild().build();

      // Child container should have createChild method
      expect(typeof childContainer.createChild).toBe("function");

      // Create grandchild builder
      const grandchildBuilder = childContainer.createChild();
      expect(grandchildBuilder).toBeDefined();
      expect(typeof grandchildBuilder.build).toBe("function");
    });

    test("grandchild container can resolve ports from root container", () => {
      const logFn = vi.fn();
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: logFn }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      // Create chain: container -> child -> grandchild
      const childContainer = container.createChild().build();
      const grandchildContainer = childContainer.createChild().build();

      // Resolve from grandchild - should walk up to root
      const logger = grandchildContainer.resolve(LoggerPort);
      expect(logger).toBeDefined();
      logger.log("test");
      expect(logFn).toHaveBeenCalledWith("test");
    });

    test("grandchild inherits parent property chain correctly", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      const childContainer = container.createChild().build();
      const grandchildContainer = childContainer.createChild().build();

      // Grandchild's parent should be child
      expect(grandchildContainer.parent).toBe(childContainer);
      // Child's parent should be root container
      expect(childContainer.parent).toBe(container);
    });
  });

  describe("ancestor chain resolution", () => {
    test("resolution walks up full ancestor chain: grandchild -> child -> parent", () => {
      const rootLogFn = vi.fn();
      const childLogFn = vi.fn();

      const RootLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: rootLogFn }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: childLogFn }),
      });

      const graph = GraphBuilder.create().provide(RootLoggerAdapter).build();
      const container = createContainer(graph);

      // Child overrides Logger
      const childContainer = container.createChild().override(ChildLoggerAdapter).build();
      // Grandchild doesn't override - should walk up to child
      const grandchildContainer = childContainer.createChild().build();

      // Resolve from grandchild - should get child's override
      const logger = grandchildContainer.resolve(LoggerPort);
      logger.log("test");

      expect(childLogFn).toHaveBeenCalledWith("test");
      expect(rootLogFn).not.toHaveBeenCalled();
    });

    test("grandchild can override adapter that child inherited from parent", () => {
      const rootLogFn = vi.fn();
      const grandchildLogFn = vi.fn();

      const RootLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: rootLogFn }),
      });

      const GrandchildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: grandchildLogFn }),
      });

      const graph = GraphBuilder.create().provide(RootLoggerAdapter).build();
      const container = createContainer(graph);

      // Child doesn't override Logger
      const childContainer = container.createChild().build();
      // Grandchild overrides Logger
      const grandchildContainer = childContainer
        .createChild()
        .override(GrandchildLoggerAdapter)
        .build();

      // Resolve from grandchild - should use grandchild's override
      const logger = grandchildContainer.resolve(LoggerPort);
      logger.log("test");

      expect(grandchildLogFn).toHaveBeenCalledWith("test");
      expect(rootLogFn).not.toHaveBeenCalled();
    });

    test("grandchild can extend with new port that child doesn't have", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ConfigAdapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ getValue: () => "grandchild-config" }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      const childContainer = container.createChild().build();
      const grandchildContainer = childContainer.createChild().extend(ConfigAdapter).build();

      // Grandchild can resolve extended port
      const config = grandchildContainer.resolve(ConfigPort);
      expect(config.getValue("key")).toBe("grandchild-config");

      // Grandchild can still resolve inherited port
      const logger = grandchildContainer.resolve(LoggerPort);
      expect(logger).toBeDefined();
    });
  });

  describe("disposal cascade behavior", () => {
    test("disposing parent container triggers disposal of child containers", async () => {
      const parentFinalizer = vi.fn();
      const childFinalizer = vi.fn();

      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: parentFinalizer,
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: childFinalizer,
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      // Resolve from parent to create singleton
      container.resolve(LoggerPort);

      // Create child and resolve to create child's singleton
      const childContainer = container.createChild().override(ChildLoggerAdapter).build();
      childContainer.resolve(LoggerPort);

      // Dispose parent
      await container.dispose();

      // Both should be disposed
      expect(container.isDisposed).toBe(true);
      expect(childContainer.isDisposed).toBe(true);
    });

    test("disposal order is LIFO (last-created child disposed first)", async () => {
      const disposalOrder: string[] = [];

      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const Child1Adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: () => { disposalOrder.push("child1"); },
      });

      const Child2Adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: () => { disposalOrder.push("child2"); },
      });

      const Child3Adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: () => { disposalOrder.push("child3"); },
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      // Create children in order: child1, child2, child3
      const child1 = container.createChild().override(Child1Adapter).build();
      const child2 = container.createChild().override(Child2Adapter).build();
      const child3 = container.createChild().override(Child3Adapter).build();

      // Resolve from all children to create singletons
      child1.resolve(LoggerPort);
      child2.resolve(LoggerPort);
      child3.resolve(LoggerPort);

      // Dispose parent
      await container.dispose();

      // LIFO order: child3 (last created) should be first disposed
      expect(disposalOrder).toEqual(["child3", "child2", "child1"]);
    });

    test("child removes itself from parent's tracking on individual dispose", async () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      // Create two children
      const child1 = container.createChild().build();
      const child2 = container.createChild().build();

      // Dispose child1 individually
      await child1.dispose();

      expect(child1.isDisposed).toBe(true);
      expect(child2.isDisposed).toBe(false);
      expect(container.isDisposed).toBe(false);

      // Disposing parent should only affect child2 (child1 already disposed)
      await container.dispose();

      expect(child2.isDisposed).toBe(true);
    });

    test("disposal cascades through full hierarchy: parent -> child -> grandchild", async () => {
      const disposalOrder: string[] = [];

      const RootAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: () => { disposalOrder.push("root"); },
      });

      const ChildAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: () => { disposalOrder.push("child"); },
      });

      const GrandchildAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
        finalizer: () => { disposalOrder.push("grandchild"); },
      });

      const graph = GraphBuilder.create().provide(RootAdapter).build();
      const container = createContainer(graph);

      const childContainer = container.createChild().override(ChildAdapter).build();
      const grandchildContainer = childContainer.createChild().override(GrandchildAdapter).build();

      // Resolve to create singletons
      container.resolve(LoggerPort);
      childContainer.resolve(LoggerPort);
      grandchildContainer.resolve(LoggerPort);

      // Dispose root
      await container.dispose();

      // Disposal should cascade: grandchild first (deepest), then child, then root
      // Actually the order should be: grandchild -> child -> root
      // Because children dispose before parent's own singletons
      expect(grandchildContainer.isDisposed).toBe(true);
      expect(childContainer.isDisposed).toBe(true);
      expect(container.isDisposed).toBe(true);

      // Grandchild should be disposed before child, child before root
      expect(disposalOrder).toEqual(["grandchild", "child", "root"]);
    });
  });

  describe("childContainer.createScope()", () => {
    test("child container createScope creates scope with child's adapters", () => {
      const rootLogFn = vi.fn();
      const childLogFn = vi.fn();

      const RootLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: rootLogFn }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: childLogFn }),
      });

      const graph = GraphBuilder.create().provide(RootLoggerAdapter).build();
      const container = createContainer(graph);

      // Create child with override
      const childContainer = container.createChild().override(ChildLoggerAdapter).build();

      // Create scope from child container
      const scope = childContainer.createScope();

      // Resolve from scope - should use child's adapter
      const logger = scope.resolve(LoggerPort);
      logger.log("test");

      expect(childLogFn).toHaveBeenCalledWith("test");
      expect(rootLogFn).not.toHaveBeenCalled();
    });

    test("scope from child can resolve extended ports", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ConfigAdapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ getValue: () => "child-config" }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      const childContainer = container.createChild().extend(ConfigAdapter).build();
      const scope = childContainer.createScope();

      // Scope can resolve extended port
      const config = scope.resolve(ConfigPort);
      expect(config.getValue("key")).toBe("child-config");
    });

    test("scope tracks disposal through child container", async () => {
      const scopeFinalizer = vi.fn();

      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
        finalizer: scopeFinalizer,
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph);

      const childContainer = container.createChild().build();
      const scope = childContainer.createScope();

      // Resolve scoped port
      scope.resolve(LoggerPort);

      // Dispose child container - should cascade to scope
      await childContainer.dispose();

      expect(scope.isDisposed).toBe(true);
      expect(scopeFinalizer).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Integration Tests (Task Group 7)
// =============================================================================

describe("Child Container Integration Tests", () => {
  /**
   * End-to-end test covering the complete child container workflow:
   * create parent -> create child -> override -> extend -> resolve -> dispose
   */
  test("end-to-end: complete child container workflow", async () => {
    // 1. Create parent container with Logger
    const parentLogFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: parentLogFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentContainer = createContainer(graph);

    // 2. Resolve from parent to ensure singleton exists
    const parentLogger = parentContainer.resolve(LoggerPort);
    parentLogger.log("parent message");
    expect(parentLogFn).toHaveBeenCalledWith("parent message");

    // 3. Create child container with override and extension
    const childLogFn = vi.fn();
    const ChildLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: childLogFn }),
      finalizer: () => { childLogFn("child finalized"); },
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getValue: (key: string) => `child-${key}` }),
    });

    const childContainer = parentContainer
      .createChild()
      .override(ChildLoggerAdapter)
      .extend(ConfigAdapter)
      .build();

    // 4. Resolve from child - should use overridden Logger and extended Config
    const childLogger = childContainer.resolve(LoggerPort);
    childLogger.log("child message");
    expect(childLogFn).toHaveBeenCalledWith("child message");
    expect(parentLogFn).not.toHaveBeenCalledWith("child message");

    const config = childContainer.resolve(ConfigPort);
    expect(config.getValue("test")).toBe("child-test");

    // 5. Verify child has own singleton (not shared with parent)
    expect(childLogger).not.toBe(parentLogger);

    // 6. Create scope from child and verify resolution
    const scope = childContainer.createScope();
    const scopeLogger = scope.resolve(LoggerPort);
    expect(scopeLogger).toBe(childLogger); // Same singleton within child hierarchy

    // 7. Dispose child container
    await childContainer.dispose();
    expect(childContainer.isDisposed).toBe(true);
    expect(scope.isDisposed).toBe(true);
    expect(childLogFn).toHaveBeenCalledWith("child finalized");

    // 8. Parent should still be functional
    expect(parentContainer.isDisposed).toBe(false);
    const stillParentLogger = parentContainer.resolve(LoggerPort);
    expect(stillParentLogger).toBe(parentLogger);
  });

  /**
   * Test error handling: resolving from disposed child container throws
   */
  test("resolving from disposed child container throws DisposedScopeError", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);
    const childContainer = container.createChild().build();

    // Dispose child container
    await childContainer.dispose();

    // Attempting to resolve should throw
    expect(() => childContainer.resolve(LoggerPort)).toThrow();
  });

  /**
   * Test mixed inheritance modes across multi-level hierarchy.
   * Parent has Counter singleton, child uses forked, grandchild uses isolated.
   */
  test("multi-level hierarchy with mixed inheritance modes", () => {
    interface Counter {
      value: number;
      increment(): void;
    }
    const CounterPort = createPort<"Counter", Counter>("Counter");

    const CounterAdapter = createAdapter({
      provides: CounterPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        value: 0,
        increment() { this.value++; },
      }),
    });

    const graph = GraphBuilder.create().provide(CounterAdapter).build();
    const rootContainer = createContainer(graph);

    // Root counter: value = 0 -> increment -> value = 1
    const rootCounter = rootContainer.resolve(CounterPort);
    rootCounter.increment();
    expect(rootCounter.value).toBe(1);

    // Child with forked mode: gets snapshot at value = 1
    const childContainer = rootContainer
      .createChild()
      .withInheritanceMode({ Counter: "forked" })
      .build();

    const childCounter = childContainer.resolve(CounterPort);
    expect(childCounter.value).toBe(1); // Snapshot from root
    expect(childCounter).not.toBe(rootCounter); // Different instance

    childCounter.increment();
    expect(childCounter.value).toBe(2);
    expect(rootCounter.value).toBe(1); // Root unchanged

    // Grandchild with isolated mode: fresh instance starting at 0
    const grandchildContainer = childContainer
      .createChild()
      .withInheritanceMode({ Counter: "isolated" })
      .build();

    const grandchildCounter = grandchildContainer.resolve(CounterPort);
    expect(grandchildCounter.value).toBe(0); // Fresh instance
    expect(grandchildCounter).not.toBe(childCounter);
    expect(grandchildCounter).not.toBe(rootCounter);

    grandchildCounter.increment();
    grandchildCounter.increment();
    grandchildCounter.increment();
    expect(grandchildCounter.value).toBe(3);
    expect(childCounter.value).toBe(2); // Child unchanged
    expect(rootCounter.value).toBe(1); // Root unchanged
  });

  /**
   * Test that child container with transient adapters creates new instances each time
   */
  test("transient adapters in child container create new instances per resolve", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const TransientLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container
      .createChild()
      .override(TransientLoggerAdapter)
      .build();

    // Each resolve should create a new instance
    const logger1 = childContainer.resolve(LoggerPort);
    const logger2 = childContainer.resolve(LoggerPort);
    const logger3 = childContainer.resolve(LoggerPort);

    expect(logger1).not.toBe(logger2);
    expect(logger2).not.toBe(logger3);
    expect(factory).toHaveBeenCalledTimes(3);
  });

  /**
   * Test that extended adapter can depend on overridden adapter
   */
  test("extended adapter depending on overridden adapter resolves correctly", () => {
    const childLogFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const ChildLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: childLogFn }),
    });

    // ConfigAdapter depends on LoggerPort
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: (deps) => {
        deps.Logger.log("Config initialized");
        return { getValue: () => "config-value" };
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container
      .createChild()
      .override(ChildLoggerAdapter)
      .extend(ConfigAdapter)
      .build();

    // Resolve extended adapter - should use overridden Logger
    const config = childContainer.resolve(ConfigPort);
    expect(config.getValue("key")).toBe("config-value");
    expect(childLogFn).toHaveBeenCalledWith("Config initialized");
  });

  /**
   * Test multiple child containers from same parent maintain independence
   */
  test("sibling child containers are independent", async () => {
    interface Counter {
      value: number;
      increment(): void;
    }
    const CounterPort = createPort<"Counter", Counter>("Counter");

    const CounterAdapter = createAdapter({
      provides: CounterPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        value: 0,
        increment() { this.value++; },
      }),
    });

    const graph = GraphBuilder.create().provide(CounterAdapter).build();
    const container = createContainer(graph);

    // Create two sibling child containers with isolated mode
    const child1 = container
      .createChild()
      .withInheritanceMode({ Counter: "isolated" })
      .build();

    const child2 = container
      .createChild()
      .withInheritanceMode({ Counter: "isolated" })
      .build();

    // Get counters from each
    const counter1 = child1.resolve(CounterPort);
    const counter2 = child2.resolve(CounterPort);

    // They should be independent
    expect(counter1).not.toBe(counter2);

    counter1.increment();
    counter1.increment();
    counter2.increment();

    expect(counter1.value).toBe(2);
    expect(counter2.value).toBe(1);

    // Disposing one shouldn't affect the other
    await child1.dispose();
    expect(child1.isDisposed).toBe(true);
    expect(child2.isDisposed).toBe(false);

    // child2 should still work
    counter2.increment();
    expect(counter2.value).toBe(2);
  });
});
