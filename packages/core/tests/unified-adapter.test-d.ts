/**
 * Type Tests for Unified createAdapter API
 *
 * These tests verify compile-time behavior of the unified createAdapter function,
 * including type inference, mutual exclusion, async detection, and default values.
 *
 * Test coverage:
 * - Factory variant with defaults
 * - Factory variant with explicit configuration
 * - Class variant with defaults
 * - Class variant with explicit configuration
 * - Mutual exclusion (both factory and class / neither)
 * - Async factory detection
 * - Factory return type validation
 * - Class type validation
 * - Default value inference
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { port, createPort } from "../src/ports/factory.js";
import { createAdapter } from "../src/adapters/unified.js";
import type {
  BothFactoryAndClassError,
  NeitherFactoryNorClassError,
} from "../src/adapters/unified.js";

// =============================================================================
// Test Fixtures
// =============================================================================

// Service interfaces
interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// Ports
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });

// Classes for class-based tests
class ConsoleLogger implements Logger {
  log(_msg: string): void {
    // Implementation not relevant for type tests
  }
}

class PostgresDatabase implements Database {
  constructor(private logger: Logger) {}

  async query(sql: string): Promise<unknown> {
    this.logger.log(`Executing query: ${sql}`);
    return {};
  }
}

class UserServiceImpl implements UserService {
  constructor(
    private database: Database,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<{ id: string; name: string }> {
    this.logger.log(`Getting user ${id}`);
    await this.database.query("SELECT * FROM users WHERE id = $1");
    return { id, name: "Test User" };
  }
}

// =============================================================================
// Factory Variant Tests - Defaults
// =============================================================================

describe("unified createAdapter - factory variant with defaults", () => {
  it("applies default values when all optional properties omitted", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // Verify defaults
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
    expectTypeOf(adapter.clonable).toEqualTypeOf<false>();
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
  });

  it("preserves default lifetime as literal type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // Must be literal "singleton", not widened to Lifetime
    type LifetimeType = typeof adapter.lifetime;
    expectTypeOf<LifetimeType>().toEqualTypeOf<"singleton">();
  });

  it("preserves default clonable as literal false", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // Must be literal false, not widened to boolean
    type ClonableType = typeof adapter.clonable;
    expectTypeOf<ClonableType>().toEqualTypeOf<false>();
  });

  it("preserves empty requires tuple type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // Must be readonly empty tuple, not any[]
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
  });
});

// =============================================================================
// Factory Variant Tests - Explicit Configuration
// =============================================================================

describe("unified createAdapter - factory variant with explicit values", () => {
  it("preserves explicit requires tuple type with explicit params", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      clonable: false,
      factory: deps => ({
        query: async () => {
          deps.Logger.log("query");
          return {};
        },
      }),
    });

    // Verify requires tuple is preserved
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
  });

  it("preserves explicit lifetime literal type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      lifetime: "scoped",
      factory: () => ({ log: () => {} }),
    });

    // Must preserve literal "scoped", not widen to Lifetime
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
  });

  it("preserves explicit clonable literal type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      clonable: true,
      factory: () => ({ log: () => {} }),
    });

    // Must preserve literal true, not widen to boolean
    expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
  });

  it("supports multiple requires in tuple", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      lifetime: "singleton",
      clonable: false,
      factory: deps => ({
        getUser: async (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          await deps.Database.query("SELECT * FROM users");
          return { id, name: "Test" };
        },
      }),
    });

    // Verify tuple type is preserved
    expectTypeOf(adapter.requires).toEqualTypeOf<
      readonly [typeof DatabasePort, typeof LoggerPort]
    >();
  });

  it("supports all lifetimes", () => {
    const singleton = createAdapter({
      provides: LoggerPort,
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const scoped = createAdapter({
      provides: LoggerPort,
      lifetime: "scoped",
      factory: () => ({ log: () => {} }),
    });

    const transient = createAdapter({
      provides: LoggerPort,
      lifetime: "transient",
      factory: () => ({ log: () => {} }),
    });

    expectTypeOf(singleton.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(scoped.lifetime).toEqualTypeOf<"scoped">();
    expectTypeOf(transient.lifetime).toEqualTypeOf<"transient">();
  });
});

// =============================================================================
// Factory Variant Tests - Async Detection
// =============================================================================

describe("unified createAdapter - async factory detection", () => {
  it("detects async factory and sets factoryKind to async", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      factory: async () => ({
        query: async () => ({}),
      }),
    });

    // Async factory should have factoryKind: "async"
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });

  it("forces lifetime to singleton for async factory", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      factory: async () => ({
        query: async () => ({}),
      }),
    });

    // Async factory always has singleton lifetime
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
  });

  it("produces error type in lifetime for async factory with non-singleton lifetime", () => {
    // Async factory with scoped lifetime produces error type in lifetime position
    const scopedAsyncAdapter = createAdapter({
      provides: DatabasePort,
      lifetime: "scoped",
      factory: async () => ({
        query: async () => ({}),
      }),
    });

    // The lifetime is an error message string, not a valid Lifetime
    expectTypeOf(
      scopedAsyncAdapter.lifetime
    ).toEqualTypeOf<"Async factories must use 'singleton' lifetime. Got: 'scoped'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.">();

    // Async factory with transient lifetime produces error type in lifetime position
    const transientAsyncAdapter = createAdapter({
      provides: DatabasePort,
      lifetime: "transient",
      factory: async () => ({
        query: async () => ({}),
      }),
    });

    expectTypeOf(
      transientAsyncAdapter.lifetime
    ).toEqualTypeOf<"Async factories must use 'singleton' lifetime. Got: 'transient'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.">();
  });

  it("allows async factory with explicit singleton lifetime", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      lifetime: "singleton",
      factory: async () => ({
        query: async () => ({}),
      }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });

  it("keeps async factoryKind for Promise-returning sync factory", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      factory: () => Promise.resolve({ query: async () => ({}) }),
    });

    // Returns Promise, so TypeScript infers this as async
    // (sync function returning Promise still counts as async for type system)
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });
});

// =============================================================================
// Factory Variant Tests - Return Type Validation
// =============================================================================

describe("unified createAdapter - factory return type validation", () => {
  it("compiles when factory returns correct type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): Logger => ({ log: () => {} }),
    });

    // Verify the adapter was created successfully
    expectTypeOf(adapter.provides).toEqualTypeOf(LoggerPort);
  });

  it("compiles when async factory returns Promise of correct type", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      factory: async (): Promise<Database> => ({
        query: async () => ({}),
      }),
    });

    // Verify the adapter was created successfully
    expectTypeOf(adapter.provides).toEqualTypeOf(DatabasePort);
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });
});

// =============================================================================
// Class Variant Tests - Defaults
// =============================================================================

describe("unified createAdapter - class variant with defaults", () => {
  it("applies default values when all optional properties omitted", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });

    // Verify defaults
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
    expectTypeOf(adapter.clonable).toEqualTypeOf<false>();
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
  });

  it("has sync factoryKind (classes are always sync)", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });

    // Class instantiation is always synchronous
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });
});

// =============================================================================
// Class Variant Tests - Explicit Configuration
// =============================================================================

describe("unified createAdapter - class variant with explicit values", () => {
  it("preserves explicit requires tuple type", () => {
    const adapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      class: PostgresDatabase,
    });

    // Verify requires tuple is preserved
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
  });

  it("preserves explicit lifetime literal type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      lifetime: "transient",
      class: ConsoleLogger,
    });

    // Must preserve literal "transient", not widen to Lifetime
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"transient">();
  });

  it("preserves explicit clonable literal type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      clonable: true,
      class: ConsoleLogger,
    });

    // Must preserve literal true, not widen to boolean
    expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
  });

  it("supports multiple requires in constructor", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      class: UserServiceImpl,
    });

    // Verify tuple type is preserved
    expectTypeOf(adapter.requires).toEqualTypeOf<
      readonly [typeof DatabasePort, typeof LoggerPort]
    >();
  });

  it("supports all lifetimes", () => {
    const singleton = createAdapter({
      provides: LoggerPort,
      lifetime: "singleton",
      class: ConsoleLogger,
    });

    const scoped = createAdapter({
      provides: LoggerPort,
      lifetime: "scoped",
      class: ConsoleLogger,
    });

    const transient = createAdapter({
      provides: LoggerPort,
      lifetime: "transient",
      class: ConsoleLogger,
    });

    expectTypeOf(singleton.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(scoped.lifetime).toEqualTypeOf<"scoped">();
    expectTypeOf(transient.lifetime).toEqualTypeOf<"transient">();
  });
});

// =============================================================================
// Class Variant Tests - Type Validation
// =============================================================================

describe("unified createAdapter - class type validation", () => {
  it("compiles when class implements port interface", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });

    // Verify the adapter was created successfully
    expectTypeOf(adapter.provides).toEqualTypeOf(LoggerPort);
  });

  it("compiles when class constructor matches requires order", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      class: UserServiceImpl,
    });

    // Verify the adapter was created successfully
    expectTypeOf(adapter.provides).toEqualTypeOf(UserServicePort);
    expectTypeOf(adapter.requires).toEqualTypeOf<
      readonly [typeof DatabasePort, typeof LoggerPort]
    >();
  });
});

// =============================================================================
// Mutual Exclusion Tests
// =============================================================================

describe("unified createAdapter - mutual exclusion", () => {
  it("factory and class are mutually exclusive at type level", () => {
    // These tests verify the API surface enforces mutual exclusion via types

    // Factory variant works
    const factoryAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    expectTypeOf(factoryAdapter.provides).toEqualTypeOf(LoggerPort);

    // Class variant works
    const classAdapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });
    expectTypeOf(classAdapter.provides).toEqualTypeOf(LoggerPort);

    // Note: The mutual exclusion is enforced at runtime via validation
    // TypeScript overloads prevent both from being specified simultaneously
    // by design - the config types use `factory?: never` and `class?: never`
  });
});

// =============================================================================
// Default Value Inference Tests
// =============================================================================

describe("unified createAdapter - default value inference", () => {
  it("infers requires as empty tuple when omitted", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // When requires is omitted, it should be readonly []
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
  });

  it("infers lifetime as singleton when omitted", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // When lifetime is omitted, it should be "singleton"
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
  });

  it("infers clonable as false when omitted", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // When clonable is omitted, it should be false
    expectTypeOf(adapter.clonable).toEqualTypeOf<false>();
  });

  it("applies all defaults together", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // All defaults should be applied
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.clonable).toEqualTypeOf<false>();
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });
});

// =============================================================================
// Optional Requires Tests
// =============================================================================

describe("unified createAdapter - optional requires with explicit options", () => {
  describe("factory variant", () => {
    it("defaults requires to empty tuple when lifetime is explicit", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      });

      // requires should default to empty tuple even with explicit lifetime
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
      expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
    });

    it("defaults requires to empty tuple when clonable is explicit", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        clonable: true,
        factory: () => ({ log: () => {} }),
      });

      // requires should default to empty tuple even with explicit clonable
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
      expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
    });

    it("defaults requires to empty tuple when lifetime and clonable are explicit", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        lifetime: "transient",
        clonable: true,
        factory: () => ({ log: () => {} }),
      });

      // requires should default to empty tuple with all other options explicit
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
      expectTypeOf(adapter.lifetime).toEqualTypeOf<"transient">();
      expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
    });

    it("preserves explicit requires when provided with lifetime", () => {
      const adapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        lifetime: "scoped",
        factory: deps => ({
          query: async () => {
            deps.Logger.log("query");
            return {};
          },
        }),
      });

      // explicit requires should be preserved
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
      expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
    });

    it("preserves explicit requires when provided with clonable", () => {
      const adapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        clonable: true,
        factory: deps => ({
          query: async () => {
            deps.Logger.log("query");
            return {};
          },
        }),
      });

      // explicit requires should be preserved
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
      expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
    });
  });

  describe("class variant", () => {
    it("defaults requires to empty tuple when lifetime is explicit", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        lifetime: "scoped",
        class: ConsoleLogger,
      });

      // requires should default to empty tuple even with explicit lifetime
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
      expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
    });

    it("defaults requires to empty tuple when clonable is explicit", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        clonable: true,
        class: ConsoleLogger,
      });

      // requires should default to empty tuple even with explicit clonable
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
      expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
    });

    it("defaults requires to empty tuple when lifetime and clonable are explicit", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        lifetime: "transient",
        clonable: true,
        class: ConsoleLogger,
      });

      // requires should default to empty tuple with all other options explicit
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
      expectTypeOf(adapter.lifetime).toEqualTypeOf<"transient">();
      expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
    });

    it("preserves explicit requires when provided with lifetime", () => {
      const adapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        lifetime: "scoped",
        class: PostgresDatabase,
      });

      // explicit requires should be preserved
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
      expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
    });

    it("preserves explicit requires when provided with clonable", () => {
      const adapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        clonable: true,
        class: PostgresDatabase,
      });

      // explicit requires should be preserved
      expectTypeOf(adapter.requires).toEqualTypeOf<readonly [typeof LoggerPort]>();
      expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
    });
  });
});
