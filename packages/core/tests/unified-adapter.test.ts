/**
 * Runtime tests for unified createAdapter API.
 *
 * These tests verify:
 * 1. Factory variant - adapter object structure, defaults, finalizer
 * 2. Class variant - adapter object structure, dependency injection order
 * 3. Error handling - mutual exclusion violations
 * 4. Default value application at runtime
 */

import { describe, expect, it, vi } from "vitest";
import { port, createAdapter, createPort } from "../src/index.js";

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
// Test Ports
// =============================================================================

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });

// =============================================================================
// Test Classes
// =============================================================================

class ConsoleLogger implements Logger {
  log(_msg: string) {
    // Mock implementation
  }
}

class UserServiceImpl implements UserService {
  constructor(
    public logger: Logger,
    public database: Database
  ) {}

  getUser(id: string) {
    this.logger.log(`Getting user ${id}`);
    const result = this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
    return result[0] as { id: string; name: string };
  }
}

// =============================================================================
// Factory Variant Tests
// =============================================================================

describe("createAdapter - factory variant", () => {
  it("creates adapter with factory function", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    expect(adapter.provides).toBe(LoggerPort);
    expect(adapter.requires).toEqual([]);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.factoryKind).toBe("sync");
    expect(adapter.clonable).toBe(false);
  });

  it("applies default values when omitted", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: vi.fn() }),
    });

    expect(adapter.requires).toEqual([]);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.clonable).toBe(false);
  });

  it("preserves finalizer on adapter", () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: vi.fn() }),
      finalizer,
    });

    expect(adapter.finalizer).toBe(finalizer);
  });

  it("factory receives resolved dependencies", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: deps => {
        // Verify deps shape at runtime
        expect(deps).toHaveProperty("Logger");
        expect(deps).toHaveProperty("Database");
        return { getUser: vi.fn() };
      },
    });

    // Call factory with mock deps to verify
    const mockDeps = { Logger: { log: vi.fn() }, Database: { query: vi.fn() } };
    adapter.factory(mockDeps);
  });

  it("creates adapter with explicit lifetime", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "transient",
      factory: deps => ({
        getUser: () => {
          deps.Logger.log("Getting user");
          return { id: "1", name: "Alice" };
        },
      }),
    });

    expect(adapter.lifetime).toBe("transient");
    expect(adapter.requires).toEqual([LoggerPort]);
  });

  it("creates adapter with explicit clonable flag", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      clonable: true,
      factory: () => ({ log: vi.fn() }),
    });

    expect(adapter.clonable).toBe(true);
    expect(adapter.lifetime).toBe("singleton"); // default
    expect(adapter.requires).toEqual([]); // default
  });

  it("creates adapter with all properties explicit", () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      clonable: true,
      factory: deps => ({
        getUser: () => {
          deps.Logger.log("Getting user");
          return { id: "1", name: "Alice" };
        },
      }),
      finalizer,
    });

    expect(adapter.provides).toBe(UserServicePort);
    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
    expect(adapter.lifetime).toBe("scoped");
    expect(adapter.clonable).toBe(true);
    expect(adapter.finalizer).toBe(finalizer);
  });
});

// =============================================================================
// Class Variant Tests
// =============================================================================

describe("createAdapter - class variant", () => {
  it("creates adapter with class constructor", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      class: ConsoleLogger,
    });

    expect(adapter.provides).toBe(LoggerPort);
    expect(adapter.factoryKind).toBe("sync");

    // Factory should instantiate class
    const instance = adapter.factory({});
    expect(instance).toBeInstanceOf(ConsoleLogger);
  });

  it("injects dependencies in requires order", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      class: UserServiceImpl,
    });

    const mockLogger = { log: vi.fn() };
    const mockDatabase = { query: vi.fn(() => [{ id: "1", name: "Alice" }]) };
    const deps = { Logger: mockLogger, Database: mockDatabase };

    const instance = adapter.factory(deps) as UserServiceImpl;
    expect(instance).toBeInstanceOf(UserServiceImpl);
    expect(instance.logger).toBe(mockLogger);
    expect(instance.database).toBe(mockDatabase);
  });

  it("applies default values for class variant", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });

    expect(adapter.requires).toEqual([]);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.clonable).toBe(false);
  });

  it("preserves finalizer on class adapter", () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
      finalizer,
    });

    expect(adapter.finalizer).toBe(finalizer);
  });

  it("creates class adapter with explicit lifetime", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "transient",
      class: UserServiceImpl,
    });

    expect(adapter.lifetime).toBe("transient");
    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
  });

  it("creates class adapter with explicit clonable flag", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      clonable: true,
      class: ConsoleLogger,
    });

    expect(adapter.clonable).toBe(true);
    expect(adapter.lifetime).toBe("singleton"); // default
    expect(adapter.requires).toEqual([]); // default
  });

  it("creates class adapter with all properties explicit", () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      clonable: false,
      class: UserServiceImpl,
      finalizer,
    });

    expect(adapter.provides).toBe(UserServicePort);
    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
    expect(adapter.lifetime).toBe("scoped");
    expect(adapter.clonable).toBe(false);
    expect(adapter.finalizer).toBe(finalizer);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("createAdapter - error handling", () => {
  it("throws when both factory and class provided", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: () => ({ log: vi.fn() }),
        class: ConsoleLogger,
      } as never);
    }).toThrow(/HEX020.*factory.*class/i);
  });

  it("throws when neither factory nor class provided", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
      } as never);
    }).toThrow(/HEX019.*factory.*class/i);
  });

  it("includes helpful hint in mutual exclusion error", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: () => ({ log: vi.fn() }),
        class: ConsoleLogger,
      } as never);
    }).toThrow(/custom instantiation logic|constructor injection/i);
  });

  it("includes helpful hint in missing implementation error", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
      } as never);
    }).toThrow(/factory function|class constructor/i);
  });
});
