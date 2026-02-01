/**
 * Unit tests for ServiceBuilder fluent API.
 *
 * These tests verify:
 * 1. ServiceBuilder.create() factory and curried pattern
 * 2. Lifetime methods (singleton, scoped, transient)
 * 3. requires() dependency accumulation
 * 4. factory() terminal method
 * 5. Immutability guarantees
 * 6. defineService() builder overload integration
 */

import { describe, expect, it } from "vitest";
import { ServiceBuilder, defineService, createPort } from "../src/index.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Config {
  value: string;
}

interface Database {
  query(sql: string): unknown[];
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Ports
// =============================================================================

const ConfigPort = createPort<Config, "Config">({ name: "Config" });
const LoggerPort = createPort<Logger, "Logger">({ name: "Logger" });
const DatabasePort = createPort<Database, "Database">({ name: "Database" });

// =============================================================================
// ServiceBuilder.create() Tests
// =============================================================================

describe("ServiceBuilder.create", () => {
  it("creates builder with curried pattern", () => {
    // First call returns a function
    const createLogger = ServiceBuilder.create<Logger>();
    expect(typeof createLogger).toBe("function");

    // Second call returns a ServiceBuilder
    const builder = createLogger("Logger");
    expect(builder).toBeInstanceOf(ServiceBuilder);
  });

  it("creates builder with default singleton lifetime", () => {
    const [, adapter] = ServiceBuilder.create<Logger>()("Logger").factory(() => ({
      log: () => {},
    }));

    expect(adapter.lifetime).toBe("singleton");
  });

  it("preserves port name through chain", () => {
    const [port] = ServiceBuilder.create<Logger>()("MyLogger").factory(() => ({
      log: () => {},
    }));

    expect(port.__portName).toBe("MyLogger");
  });

  it("builder is frozen (immutable)", () => {
    const builder = ServiceBuilder.create<Logger>()("Logger");
    expect(Object.isFrozen(builder)).toBe(true);
  });
});

// =============================================================================
// Lifetime Methods Tests
// =============================================================================

describe("lifetime methods", () => {
  it(".singleton() sets singleton lifetime", () => {
    const [, adapter] = ServiceBuilder.create<Logger>()("Logger")
      .singleton()
      .factory(() => ({ log: () => {} }));

    expect(adapter.lifetime).toBe("singleton");
  });

  it(".scoped() sets scoped lifetime", () => {
    const [, adapter] = ServiceBuilder.create<Logger>()("Logger")
      .scoped()
      .factory(() => ({ log: () => {} }));

    expect(adapter.lifetime).toBe("scoped");
  });

  it(".transient() sets transient lifetime", () => {
    const [, adapter] = ServiceBuilder.create<Logger>()("Logger")
      .transient()
      .factory(() => ({ log: () => {} }));

    expect(adapter.lifetime).toBe("transient");
  });

  it("returns new instance (immutability)", () => {
    const b1 = ServiceBuilder.create<Logger>()("Logger");
    const b2 = b1.scoped();

    expect(b1).not.toBe(b2);
  });

  it("lifetime can be changed multiple times (last wins)", () => {
    const [, adapter] = ServiceBuilder.create<Logger>()("Logger")
      .singleton()
      .scoped()
      .transient()
      .factory(() => ({ log: () => {} }));

    expect(adapter.lifetime).toBe("transient");
  });

  it("each lifetime method returns frozen builder", () => {
    const singletonBuilder = ServiceBuilder.create<Logger>()("Logger").singleton();
    const scopedBuilder = ServiceBuilder.create<Logger>()("Logger").scoped();
    const transientBuilder = ServiceBuilder.create<Logger>()("Logger").transient();

    expect(Object.isFrozen(singletonBuilder)).toBe(true);
    expect(Object.isFrozen(scopedBuilder)).toBe(true);
    expect(Object.isFrozen(transientBuilder)).toBe(true);
  });
});

// =============================================================================
// requires() Method Tests
// =============================================================================

describe(".requires()", () => {
  it("captures single dependency", () => {
    const [, adapter] = ServiceBuilder.create<Database>()("Database")
      .requires(LoggerPort)
      .factory(() => ({ query: () => [] }));

    expect(adapter.requires).toHaveLength(1);
    expect(adapter.requires[0]).toBe(LoggerPort);
  });

  it("captures multiple dependencies", () => {
    const [, adapter] = ServiceBuilder.create<UserService>()("UserService")
      .requires(LoggerPort, DatabasePort)
      .factory(() => ({ getUser: async (id: string) => ({ id, name: "Test" }) }));

    expect(adapter.requires).toHaveLength(2);
    expect(adapter.requires[0]).toBe(LoggerPort);
    expect(adapter.requires[1]).toBe(DatabasePort);
  });

  it("replaces previous requires (not accumulates)", () => {
    const [, adapter] = ServiceBuilder.create<UserService>()("UserService")
      .requires(LoggerPort)
      .requires(DatabasePort)
      .factory(() => ({ getUser: async (id: string) => ({ id, name: "Test" }) }));

    // Second call replaces, not appends
    expect(adapter.requires).toHaveLength(1);
    expect(adapter.requires[0]).toBe(DatabasePort);
  });

  it("returns new instance (immutability)", () => {
    const b1 = ServiceBuilder.create<UserService>()("UserService");
    const b2 = b1.requires(LoggerPort);

    expect(b1).not.toBe(b2);
  });

  it("returned builder is frozen", () => {
    const builder = ServiceBuilder.create<UserService>()("UserService").requires(LoggerPort);
    expect(Object.isFrozen(builder)).toBe(true);
  });

  it("works with zero dependencies", () => {
    const [, adapter] = ServiceBuilder.create<Logger>()("Logger")
      .requires()
      .factory(() => ({ log: () => {} }));

    expect(adapter.requires).toHaveLength(0);
  });
});

// =============================================================================
// factory() Terminal Method Tests
// =============================================================================

describe(".factory()", () => {
  it("creates port and adapter tuple", () => {
    const [port, adapter] = ServiceBuilder.create<Logger>()("Logger").factory(() => ({
      log: () => {},
    }));

    expect(port.__portName).toBe("Logger");
    expect(adapter.provides).toBe(port);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.factoryKind).toBe("sync");
  });

  it("passes resolved deps to factory", () => {
    let receivedDeps: unknown;

    const [, adapter] = ServiceBuilder.create<Database>()("Database")
      .requires(ConfigPort)
      .factory(deps => {
        receivedDeps = deps;
        return { query: () => [] };
      });

    // Invoke factory to verify deps shape
    const mockConfig: Config = { value: "test" };
    adapter.factory({ Config: mockConfig });

    expect(receivedDeps).toEqual({ Config: mockConfig });
  });

  it("returns frozen tuple", () => {
    const result = ServiceBuilder.create<Logger>()("Logger").factory(() => ({
      log: () => {},
    }));

    expect(Object.isFrozen(result)).toBe(true);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("factory function is called during resolution", () => {
    let factoryCalled = false;
    const loggerImpl: Logger = { log: () => {} };

    const [, adapter] = ServiceBuilder.create<Logger>()("Logger").factory(() => {
      factoryCalled = true;
      return loggerImpl;
    });

    expect(factoryCalled).toBe(false);

    const result = adapter.factory({});
    expect(factoryCalled).toBe(true);
    expect(result).toBe(loggerImpl);
  });

  it("adapter has correct requires array", () => {
    const [, adapter] = ServiceBuilder.create<UserService>()("UserService")
      .requires(LoggerPort, DatabasePort)
      .factory(() => ({ getUser: async (id: string) => ({ id, name: "Test" }) }));

    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
  });
});

// =============================================================================
// defineService Builder Entry Point Tests
// =============================================================================

describe("defineService builder entry point", () => {
  it("returns curried function when called without config", () => {
    const createBuilder = defineService<Logger>();
    expect(typeof createBuilder).toBe("function");
  });

  it("returns ServiceBuilder when curried function called with name", () => {
    const builder = defineService<Logger>()("Logger");
    expect(builder).toBeInstanceOf(ServiceBuilder);
  });

  it("produces valid adapter via builder", () => {
    const [port, adapter] = defineService<Logger>()("Logger")
      .singleton()
      .factory(() => ({ log: () => {} }));

    expect(port.__portName).toBe("Logger");
    expect(adapter.provides).toBe(port);
    expect(adapter.lifetime).toBe("singleton");
  });

  it("supports full builder chain", () => {
    const [port, adapter] = defineService<UserService>()("UserService")
      .scoped()
      .requires(LoggerPort, DatabasePort)
      .factory(({ Logger: logger, Database: db }) => ({
        getUser: async (id: string) => {
          // Use dependencies to verify they're accessible
          void logger;
          void db;
          return { id, name: "Test" };
        },
      }));

    expect(port.__portName).toBe("UserService");
    expect(adapter.lifetime).toBe("scoped");
    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
  });
});

// =============================================================================
// Full Integration Tests
// =============================================================================

describe("full builder integration", () => {
  it("creates working adapter with dependencies", () => {
    const [, adapter] = ServiceBuilder.create<UserService>()("UserService")
      .scoped()
      .requires(LoggerPort, DatabasePort)
      .factory(({ Logger: logger, Database: db }) => ({
        getUser: async (id: string) => {
          logger.log(`Getting user ${id}`);
          const result = db.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: (result[0] as { name: string })?.name ?? "Unknown" };
        },
      }));

    const mockLogger: Logger = { log: () => {} };
    const mockDb: Database = { query: () => [{ name: "John" }] };

    const service = adapter.factory({
      Logger: mockLogger,
      Database: mockDb,
    });

    expect(service).toBeDefined();
    expect(typeof service.getUser).toBe("function");
  });

  it("supports method chaining in any order", () => {
    // requires -> lifetime -> factory
    const [, adapter1] = ServiceBuilder.create<Database>()("Database1")
      .requires(LoggerPort)
      .scoped()
      .factory(() => ({ query: () => [] }));

    // lifetime -> requires -> factory
    const [, adapter2] = ServiceBuilder.create<Database>()("Database2")
      .scoped()
      .requires(LoggerPort)
      .factory(() => ({ query: () => [] }));

    expect(adapter1.lifetime).toBe("scoped");
    expect(adapter2.lifetime).toBe("scoped");
    expect(adapter1.requires).toEqual([LoggerPort]);
    expect(adapter2.requires).toEqual([LoggerPort]);
  });

  it("preserves original builder when chaining", () => {
    const base = ServiceBuilder.create<Logger>()("Logger");
    const singleton = base.singleton();
    const scoped = base.scoped();

    // Both derive from base but are independent
    expect(singleton).not.toBe(scoped);
    expect(singleton).not.toBe(base);
    expect(scoped).not.toBe(base);

    // Can build from either
    const [, singletonAdapter] = singleton.factory(() => ({ log: () => {} }));
    const [, scopedAdapter] = scoped.factory(() => ({ log: () => {} }));

    expect(singletonAdapter.lifetime).toBe("singleton");
    expect(scopedAdapter.lifetime).toBe("scoped");
  });
});
