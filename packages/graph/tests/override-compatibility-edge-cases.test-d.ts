/**
 * Test: OverrideResult Type Compatibility Edge Cases
 *
 * This test explores edge cases in the OverrideResult type compatibility check
 * to ensure it handles all scenarios correctly.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures - Various Port/Service Types
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface ExtendedLogger extends Logger {
  debug(message: string): void;
}

interface NarrowedLogger {
  log(message: "error" | "warn"): void; // Narrower parameter type
}

interface WidenedLogger {
  log(message: string | number): void; // Wider parameter type
}

interface Database {
  query(): void;
}

interface Cache {
  get(key: string): void;
}

// Different port instances
const LoggerPort = createPort<Logger>({ name: "Logger" });
const ExtendedLoggerPort = createPort<ExtendedLogger>({ name: "Logger" });
const NarrowedLoggerPort = createPort<NarrowedLogger>({ name: "Logger" });
const WidenedLoggerPort = createPort<WidenedLogger>({ name: "Logger" });
const DatabasePort = createPort<Database>({ name: "Database" });
const CachePort = createPort<Cache>({ name: "Cache" });

// Adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ExtendedLoggerAdapter = createAdapter({
  provides: ExtendedLoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {}, debug: () => {} }),
});

const NarrowedLoggerAdapter = createAdapter({
  provides: NarrowedLoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const WidenedLoggerAdapter = createAdapter({
  provides: WidenedLoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => {} }),
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe("OverrideResult type compatibility edge cases", () => {
  describe("parent with multiple ports", () => {
    it("allows override of one port when multiple exist", () => {
      const parentGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .build();

      // Override Logger only - should work
      const result = GraphBuilder.forParent(parentGraph).override(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      );

      expectTypeOf<typeof result>().not.toBeString();
    });

    it("rejects override with incompatible type when multiple ports exist", () => {
      const parentGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .build();

      // Try to override Logger with incompatible type
      const result = GraphBuilder.forParent(parentGraph).override(
        createAdapter({
          provides: createPort<Database>({ name: "Logger" }), // Same name, wrong service
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: () => {} }),
        })
      );

      // Should be rejected with HEX021
      expectTypeOf<typeof result>().toBeString();
      expectTypeOf<typeof result>().toMatchTypeOf<`ERROR[HEX021]:${string}`>();
    });
  });

  describe("extended/subtype interfaces", () => {
    it("allows override with extended interface (subtype)", () => {
      const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

      // ExtendedLogger has MORE methods - should be allowed
      const result = GraphBuilder.forParent(parentGraph).override(ExtendedLoggerAdapter);

      expectTypeOf<typeof result>().not.toBeString();
    });

    it("allows narrowed interface due to TypeScript bivariance", () => {
      const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

      // TypeScript ALLOWS this due to bivariant method parameter checking:
      // NarrowedLogger { log(message: "error" | "warn"): void }
      // EXTENDS
      // Logger { log(message: string): void }
      //
      // This is technically unsound - callers expect to pass any string, but
      // NarrowedLogger only accepts "error" | "warn". However, TypeScript uses
      // bivariance for method parameters for practical reasons.
      //
      // WORKAROUND: Use the same Port instance, or rely on runtime validation.
      const result = GraphBuilder.forParent(parentGraph).override(NarrowedLoggerAdapter);

      // CURRENT BEHAVIOR: Allowed due to TypeScript's bivariance
      // This is a known limitation - for strict checking, use the same Port instance.
      expectTypeOf<typeof result>().not.toBeString();
    });
  });

  describe("contravariance in function parameters", () => {
    it("widened interface is allowed (wider parameter type is safe)", () => {
      const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

      // WidenedLogger accepts string | number instead of just string
      // This SHOULD be allowed because a function that accepts MORE types
      // can substitute for a function that accepts fewer types.
      //
      // Actually, for function parameters, contravariance means:
      // - A function with NARROWER param type can substitute for one with WIDER param
      // - A function with WIDER param type CANNOT substitute
      //
      // But TypeScript's structural typing with Port objects makes this complex.
      // The current implementation allows it.
      const result = GraphBuilder.forParent(parentGraph).override(WidenedLoggerAdapter);

      // Current behavior: widened is allowed
      expectTypeOf<typeof result>().not.toBeString();
    });
  });

  describe("same port instance vs same port type", () => {
    it("allows override with exact same port instance", () => {
      const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

      // Use the EXACT same port instance
      const MockAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(MockAdapter);
      expectTypeOf<typeof result>().not.toBeString();
    });

    it("allows override with structurally equivalent port", () => {
      // Create a "new" LoggerPort that is structurally the same
      const LoggerPort2 = createPort<Logger>({ name: "Logger" });

      const LoggerAdapter2 = createAdapter({
        provides: LoggerPort2,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

      // Should work because the ports are structurally equivalent
      const result = GraphBuilder.forParent(parentGraph).override(LoggerAdapter2);
      expectTypeOf<typeof result>().not.toBeString();
    });
  });

  describe("port not in parent", () => {
    it("rejects override of port not in parent with HEX008", () => {
      const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

      // Cache is not in parent
      const result = GraphBuilder.forParent(parentGraph).override(CacheAdapter);

      expectTypeOf<typeof result>().toBeString();
      expectTypeOf<typeof result>().toMatchTypeOf<`ERROR[HEX008]:${string}`>();
    });
  });

  describe("override without forParent", () => {
    it("rejects override without forParent with HEX009", () => {
      const result = GraphBuilder.create().override(LoggerAdapter);

      expectTypeOf<typeof result>().toBeString();
      expectTypeOf<typeof result>().toMatchTypeOf<`ERROR[HEX009]:${string}`>();
    });
  });
});
