/**
 * Unit tests for fromClass fluent API.
 *
 * These tests verify:
 * 1. fromClass() entry point
 * 2. .as('Name') naming
 * 3. Lifetime methods (singleton, scoped, transient)
 * 4. .requires() dependency capture
 * 5. .build() terminal method
 * 6. Constructor injection ordering
 * 7. Instance type inference
 *
 * Note: The fromClass API requires classes with constructors accepting `unknown` args.
 * Classes with typed constructor parameters use runtime-only behavior.
 */

import { describe, expect, it } from "vitest";
import { fromClass, ClassAdapterBuilder, ClassServiceBuilder, createPort } from "../src/index.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): unknown[];
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

// =============================================================================
// Test Classes - No Dependencies (type-safe with fromClass)
// =============================================================================

/**
 * Simple logger class with no constructor dependencies.
 * Works cleanly with fromClass API.
 */
class ConsoleLogger implements Logger {
  log(_msg: string) {
    // Mock implementation - no console to avoid DOM dependency
  }
}

/**
 * Simple service with no dependencies.
 */
class NoDepService {
  doSomething() {
    return "done";
  }
}

// =============================================================================
// Test Classes - With Dependencies (use loose typing for fromClass compatibility)
// =============================================================================

/**
 * User service with constructor dependencies.
 * Uses loose typing to work with fromClass API.
 *
 * Note: fromClass requires `new (...args: readonly unknown[]) => unknown`
 * so typed constructor parameters cause type errors. The class works at runtime
 * but must use loose types for full type safety with fromClass.
 */
class UserServiceImpl implements UserService {
  private db: Database;
  private logger: Logger;

  constructor(...args: readonly unknown[]) {
    this.db = args[0] as Database;
    this.logger = args[1] as Logger;
  }

  getUser(id: string) {
    this.logger.log(`Getting user ${id}`);
    const result = this.db.query(`SELECT * FROM users WHERE id = '${id}'`);
    return result[0] as { id: string; name: string };
  }
}

// =============================================================================
// Test Ports
// =============================================================================

const LoggerPort = createPort<Logger, "Logger">({ name: "Logger" });
const DatabasePort = createPort<Database, "Database">({ name: "Database" });

// =============================================================================
// fromClass() Entry Point Tests
// =============================================================================

describe("fromClass", () => {
  it("captures class constructor", () => {
    const builder = fromClass(ConsoleLogger);
    expect(builder).toBeDefined();
    expect(builder).toBeInstanceOf(ClassAdapterBuilder);
  });

  it("works with no-dependency class", () => {
    const builder = fromClass(NoDepService);
    expect(builder).toBeDefined();
  });

  it("builder is frozen (immutable)", () => {
    const builder = fromClass(ConsoleLogger);
    expect(Object.isFrozen(builder)).toBe(true);
  });
});

// =============================================================================
// .as() Method Tests
// =============================================================================

describe(".as()", () => {
  it("sets port name", () => {
    const [port] = fromClass(ConsoleLogger).as("Logger").build();

    expect(port.__portName).toBe("Logger");
  });

  it("returns ClassServiceBuilder", () => {
    const builder = fromClass(ConsoleLogger).as("Logger");
    expect(builder).toBeInstanceOf(ClassServiceBuilder);
  });

  it("builder is frozen", () => {
    const builder = fromClass(ConsoleLogger).as("Logger");
    expect(Object.isFrozen(builder)).toBe(true);
  });

  it("supports different names", () => {
    const [port1] = fromClass(ConsoleLogger).as("ConsoleLogger").build();
    const [port2] = fromClass(ConsoleLogger).as("FileLogger").build();

    expect(port1.__portName).toBe("ConsoleLogger");
    expect(port2.__portName).toBe("FileLogger");
  });

  it("can use class directly without interface narrowing", () => {
    const [port] = fromClass(ConsoleLogger).as("ConsoleLogger").build();

    // Without type narrowing, the port type includes the class type
    expect(port.__portName).toBe("ConsoleLogger");
  });
});

// =============================================================================
// Lifetime Methods Tests
// =============================================================================

describe("lifetime methods", () => {
  it(".singleton() sets singleton lifetime", () => {
    const [, adapter] = fromClass(ConsoleLogger).as("Logger").singleton().build();

    expect(adapter.lifetime).toBe("singleton");
  });

  it(".scoped() sets scoped lifetime", () => {
    const [, adapter] = fromClass(ConsoleLogger).as("Logger").scoped().build();

    expect(adapter.lifetime).toBe("scoped");
  });

  it(".transient() sets transient lifetime", () => {
    const [, adapter] = fromClass(ConsoleLogger).as("Logger").transient().build();

    expect(adapter.lifetime).toBe("transient");
  });

  it("default lifetime is singleton", () => {
    const [, adapter] = fromClass(ConsoleLogger).as("Logger").build();

    expect(adapter.lifetime).toBe("singleton");
  });

  it("returns new instance (immutability)", () => {
    const b1 = fromClass(ConsoleLogger).as("Logger");
    const b2 = b1.scoped();

    expect(b1).not.toBe(b2);
  });

  it("lifetime can be changed multiple times (last wins)", () => {
    const [, adapter] = fromClass(ConsoleLogger)
      .as("Logger")
      .singleton()
      .scoped()
      .transient()
      .build();

    expect(adapter.lifetime).toBe("transient");
  });
});

// =============================================================================
// .requires() Method Tests
// =============================================================================

describe(".requires()", () => {
  it("captures dependencies for constructor injection", () => {
    const [, adapter] = fromClass(UserServiceImpl)
      .as("UserService")
      .requires(DatabasePort, LoggerPort)
      .build();

    expect(adapter.requires).toHaveLength(2);
    expect(adapter.requires[0]).toBe(DatabasePort);
    expect(adapter.requires[1]).toBe(LoggerPort);
  });

  it("returns new instance (immutability)", () => {
    const b1 = fromClass(UserServiceImpl).as("UserService");
    const b2 = b1.requires(DatabasePort, LoggerPort);

    expect(b1).not.toBe(b2);
  });

  it("replaces previous requires (not accumulates)", () => {
    const [, adapter] = fromClass(UserServiceImpl)
      .as("UserService")
      .requires(DatabasePort)
      .requires(LoggerPort)
      .build();

    // Second call replaces, not appends
    expect(adapter.requires).toHaveLength(1);
    expect(adapter.requires[0]).toBe(LoggerPort);
  });

  it("works with zero dependencies", () => {
    const [, adapter] = fromClass(NoDepService).as("NoDepService").requires().build();

    expect(adapter.requires).toHaveLength(0);
  });
});

// =============================================================================
// .build() Terminal Method Tests
// =============================================================================

describe(".build()", () => {
  it("creates [Port, Adapter] tuple", () => {
    const [port, adapter] = fromClass(ConsoleLogger).as("Logger").build();

    expect(port.__portName).toBe("Logger");
    expect(adapter.provides).toBe(port);
    expect(adapter.factoryKind).toBe("sync");
  });

  it("adapter factory instantiates class with deps", () => {
    const [, adapter] = fromClass(UserServiceImpl)
      .as("UserService")
      .requires(DatabasePort, LoggerPort)
      .build();

    const mockDb: Database = { query: () => [{ id: "1", name: "John" }] };
    const mockLogger: Logger = { log: () => {} };

    const instance = adapter.factory({
      Database: mockDb,
      Logger: mockLogger,
    });

    expect(instance).toBeInstanceOf(UserServiceImpl);
  });

  it("returns frozen tuple", () => {
    const result = fromClass(ConsoleLogger).as("Logger").build();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("class without dependencies works", () => {
    const [, adapter] = fromClass(NoDepService).as("NoDepService").build();

    const instance = adapter.factory({});
    expect(instance).toBeInstanceOf(NoDepService);
    expect(instance.doSomething()).toBe("done");
  });
});

// =============================================================================
// Constructor Injection Order Tests
// =============================================================================

describe("constructor injection order", () => {
  it("passes deps to constructor in requires order", () => {
    const constructorArgs: unknown[] = [];

    class OrderTestService {
      constructor(...args: readonly unknown[]) {
        constructorArgs.push(...args);
      }
    }

    const [, adapter] = fromClass(OrderTestService)
      .as("OrderTest")
      .requires(LoggerPort, DatabasePort)
      .build();

    const mockLogger: Logger = { log: () => {} };
    const mockDb: Database = { query: () => [] };

    adapter.factory({
      Logger: mockLogger,
      Database: mockDb,
    });

    // Verify order matched requires() order
    expect(constructorArgs[0]).toBe(mockLogger);
    expect(constructorArgs[1]).toBe(mockDb);
  });

  it("swapped requires order swaps constructor args", () => {
    const constructorArgs: unknown[] = [];

    class SwappedOrderService {
      constructor(...args: readonly unknown[]) {
        constructorArgs.push(...args);
      }
    }

    // Note: requires order is Database, Logger (matching constructor)
    const [, adapter] = fromClass(SwappedOrderService)
      .as("SwappedOrder")
      .requires(DatabasePort, LoggerPort)
      .build();

    const mockLogger: Logger = { log: () => {} };
    const mockDb: Database = { query: () => [] };

    adapter.factory({
      Logger: mockLogger,
      Database: mockDb,
    });

    // First arg should be Database (first in requires)
    expect(constructorArgs[0]).toBe(mockDb);
    // Second arg should be Logger (second in requires)
    expect(constructorArgs[1]).toBe(mockLogger);
  });

  it("single dependency injection works", () => {
    let injectedLogger: unknown;

    class SingleDepService {
      constructor(...args: readonly unknown[]) {
        injectedLogger = args[0];
      }
    }

    const [, adapter] = fromClass(SingleDepService).as("SingleDep").requires(LoggerPort).build();

    const mockLogger: Logger = { log: () => {} };
    adapter.factory({ Logger: mockLogger });

    expect(injectedLogger).toBe(mockLogger);
  });
});

// =============================================================================
// Full Integration Tests
// =============================================================================

describe("full fromClass integration", () => {
  it("creates working service with all options", () => {
    const [port, adapter] = fromClass(UserServiceImpl)
      .as("UserService")
      .scoped()
      .requires(DatabasePort, LoggerPort)
      .build();

    expect(port.__portName).toBe("UserService");
    expect(adapter.lifetime).toBe("scoped");
    expect(adapter.requires).toEqual([DatabasePort, LoggerPort]);

    const mockDb: Database = { query: () => [{ id: "1", name: "John" }] };
    const mockLogger: Logger = { log: () => {} };

    const service = adapter.factory({
      Database: mockDb,
      Logger: mockLogger,
    });

    const user = service.getUser("1");
    expect(user).toEqual({ id: "1", name: "John" });
  });

  it("supports method chaining in any order", () => {
    // requires -> lifetime
    const [, adapter1] = fromClass(UserServiceImpl)
      .as("UserService1")
      .requires(DatabasePort, LoggerPort)
      .scoped()
      .build();

    // lifetime -> requires
    const [, adapter2] = fromClass(UserServiceImpl)
      .as("UserService2")
      .scoped()
      .requires(DatabasePort, LoggerPort)
      .build();

    expect(adapter1.lifetime).toBe("scoped");
    expect(adapter2.lifetime).toBe("scoped");
    expect(adapter1.requires).toEqual([DatabasePort, LoggerPort]);
    expect(adapter2.requires).toEqual([DatabasePort, LoggerPort]);
  });

  it("preserves original builder when chaining", () => {
    const base = fromClass(ConsoleLogger).as("Logger");
    const singleton = base.singleton();
    const scoped = base.scoped();

    // Both derive from base but are independent
    expect(singleton).not.toBe(scoped);
    expect(singleton).not.toBe(base);
    expect(scoped).not.toBe(base);

    const [, singletonAdapter] = singleton.build();
    const [, scopedAdapter] = scoped.build();

    expect(singletonAdapter.lifetime).toBe("singleton");
    expect(scopedAdapter.lifetime).toBe("scoped");
  });
});
