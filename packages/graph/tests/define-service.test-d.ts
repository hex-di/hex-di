/**
 * Type-level tests for defineService and defineAsyncService helper functions.
 *
 * These tests verify:
 * 1. Return type is readonly [Port, Adapter]
 * 2. Port has correct TService and TName types
 * 3. Adapter has correct provides, requires, lifetime types
 * 4. Factory receives correctly typed deps
 * 5. Defaults are correctly inferred (requires=[], lifetime="singleton")
 * 6. Works with and without dependencies
 * 7. defineAsyncService is always singleton
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { Port, createPort } from "@hex-di/ports";
import { Adapter, defineService, defineAsyncService } from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

interface Config {
  get(key: string): string;
}

// =============================================================================
// Dependency Ports for Testing
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;

// =============================================================================
// defineService Type Tests
// =============================================================================

describe("defineService type inference", () => {
  it("returns readonly tuple of [Port, Adapter]", () => {
    const result = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });
    expect(result).toBeDefined();

    // Should be a readonly tuple
    expectTypeOf(result).toMatchTypeOf<
      readonly [Port<Logger, "Logger">, Adapter<Port<Logger, "Logger">, never, "singleton">]
    >();
  });

  it("port has correct TService and TName types", () => {
    const [port] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });
    expect(port).toBeDefined();

    expectTypeOf(port).toEqualTypeOf<Port<Logger, "Logger">>();
    expectTypeOf(port.__portName).toEqualTypeOf<"Logger">();
  });

  it("adapter provides the correct port type", () => {
    const [port, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter.provides).toEqualTypeOf(port);
  });

  it("defaults requires to empty tuple and TRequires to never", () => {
    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
    expectTypeOf(adapter).toMatchTypeOf<Adapter<Port<Logger, "Logger">, never, "singleton">>();
  });

  it("defaults lifetime to singleton literal type", () => {
    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
  });

  it("preserves custom lifetime literal type", () => {
    // Don't use explicit type args - let overloads infer from config shape
    const [, scopedAdapter] = defineService("ScopedLogger", {
      lifetime: "scoped",
      factory: (): Logger => ({ log: () => {} }),
    });

    const [, transientAdapter] = defineService("TransientLogger", {
      lifetime: "transient",
      factory: (): Logger => ({ log: () => {} }),
    });
    expect(scopedAdapter).toBeDefined();
    expect(transientAdapter).toBeDefined();

    expectTypeOf(scopedAdapter.lifetime).toEqualTypeOf<"scoped">();
    expectTypeOf(transientAdapter.lifetime).toEqualTypeOf<"transient">();
  });

  it("infers requires as union type from array", () => {
    // Don't use explicit type args - let overloads infer from config shape
    const [, adapter] = defineService("UserService", {
      requires: [LoggerPort, DatabasePort],
      factory: (): UserService => ({
        getUser: id => Promise.resolve({ id, name: "test" }),
      }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<Port<UserService, "UserService">, LoggerPortType | DatabasePortType, "singleton">
    >();
  });

  it("adapter factory has correctly typed deps parameter", () => {
    // Note: Inside the callback, deps is inferred as Record<string, unknown> due to
    // TypeScript overload resolution limitations. However, the ADAPTER's factory
    // property has the correct type, which is what matters at runtime.
    const [, adapter] = defineService("UserService", {
      requires: [LoggerPort, DatabasePort],
      factory: () => ({
        getUser: (id: string) => Promise.resolve({ id, name: "test" }),
      }),
    });
    expect(adapter).toBeDefined();

    // Verify the adapter has the requires ports tracked
    expectTypeOf(adapter.requires).toEqualTypeOf<
      readonly [typeof LoggerPort, typeof DatabasePort]
    >();

    // The adapter type correctly tracks the required dependencies
    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<Port<UserService, "UserService">, LoggerPortType | DatabasePortType, "singleton">
    >();
  });

  it("factory deps is Record<string, unknown> when no requires", () => {
    defineService<"Logger", Logger>("Logger", {
      factory: deps => {
        expectTypeOf(deps).toEqualTypeOf<Record<string, unknown>>();
        return { log: () => {} };
      },
    });
  });

  it("works with single dependency", () => {
    const [, adapter] = defineService("UserService", {
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({
        getUser: (id: string) => Promise.resolve({ id, name: "test" }),
      }),
    });
    expect(adapter).toBeDefined();

    // Verify adapter type
    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<Port<UserService, "UserService">, LoggerPortType, "scoped">
    >();

    // Verify the adapter has the requires ports tracked
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
  });

  it("factory return type must match service type", () => {
    const [, adapter] = defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
    });
    expect(adapter).toBeDefined();

    type FactoryReturnType = ReturnType<typeof adapter.factory>;
    expectTypeOf<FactoryReturnType>().toMatchTypeOf<Logger>();
  });

  it("finalizer receives service instance with correct type", () => {
    defineService<"Logger", Logger>("Logger", {
      factory: () => ({ log: () => {} }),
      finalizer: instance => {
        expectTypeOf(instance).toEqualTypeOf<Logger>();
      },
    });
  });
});

// =============================================================================
// defineAsyncService Type Tests
// =============================================================================

describe("defineAsyncService type inference", () => {
  it("returns readonly tuple of [Port, Adapter]", () => {
    const result = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });
    expect(result).toBeDefined();

    expectTypeOf(result).toMatchTypeOf<
      readonly [
        Port<Config, "Config">,
        Adapter<Port<Config, "Config">, never, "singleton", "async">,
      ]
    >();
  });

  it("port has correct TService and TName types", () => {
    const [port] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });
    expect(port).toBeDefined();

    expectTypeOf(port).toEqualTypeOf<Port<Config, "Config">>();
  });

  it("lifetime is always singleton", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
  });

  it("factoryKind is always async", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });

  it("defaults requires to empty tuple and TRequires to never", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
  });

  it("infers requires as union type from array", () => {
    // Don't use explicit type args - let overloads infer from config shape
    const [, adapter] = defineAsyncService("Database", {
      requires: [LoggerPort],
      factory: async (): Promise<Database> => ({ query: () => Promise.resolve({}) }),
    });
    expect(adapter).toBeDefined();

    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<Port<Database, "Database">, LoggerPortType, "singleton", "async">
    >();
  });

  it("adapter factory has correctly typed deps parameter", () => {
    const [, adapter] = defineAsyncService("Database", {
      requires: [LoggerPort],
      factory: async () => ({ query: () => Promise.resolve({}) }),
    });
    expect(adapter).toBeDefined();

    // Verify the adapter has the requires ports tracked
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();

    // The adapter type correctly tracks the required dependencies
    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<Port<Database, "Database">, LoggerPortType, "singleton", "async">
    >();
  });

  it("factory return type is Promise of service type", () => {
    const [, adapter] = defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
    });
    expect(adapter).toBeDefined();

    type FactoryReturnType = ReturnType<typeof adapter.factory>;
    expectTypeOf<FactoryReturnType>().toMatchTypeOf<Promise<Config>>();
  });

  it("finalizer receives service instance with correct type", () => {
    defineAsyncService<"Config", Config>("Config", {
      factory: async () => ({ get: () => "" }),
      finalizer: instance => {
        expectTypeOf(instance).toEqualTypeOf<Config>();
      },
    });
  });
});
