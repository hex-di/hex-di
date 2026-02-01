/**
 * Type-level tests for error message format consistency.
 *
 * These tests ensure all error message types follow a consistent format:
 * - Start with "ERROR[HEXxxx]:" where xxx is a 3-digit code
 * - Include contextual information (port names, paths, lifetimes)
 * - End with "Fix:" suggestion
 *
 * This consistency makes error messages immediately actionable for developers.
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type {
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
} from "../src/validation/types/errors.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}
interface Database {
  query(sql: string): Promise<unknown>;
}

const LoggerPort = createPort<Logger>({ name: "Logger" });
const DatabasePort = createPort<Database>({ name: "Database" });

// =============================================================================
// Error Message Format Tests
// =============================================================================

describe("Error message format consistency", () => {
  describe("DuplicateErrorMessage", () => {
    it("starts with ERROR[HEX...]:", () => {
      type Msg = DuplicateErrorMessage<typeof LoggerPort>;
      expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX${string}`>();
    });

    it("includes port name in quotes", () => {
      type Msg = DuplicateErrorMessage<typeof LoggerPort>;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}'Logger'${string}`>();
    });

    it("includes Fix: suggestion", () => {
      type Msg = DuplicateErrorMessage<typeof LoggerPort>;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Fix:${string}`>();
    });

    it("mentions .provide() and .override() as solutions", () => {
      type Msg = DuplicateErrorMessage<typeof LoggerPort>;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}.provide()${string}.override()${string}`>();
    });
  });

  describe("CircularErrorMessage", () => {
    it("starts with ERROR[HEX...]:", () => {
      type Msg = CircularErrorMessage<"A -> B -> A">;
      expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX${string}`>();
    });

    it("includes cycle path", () => {
      type Msg = CircularErrorMessage<"A -> B -> A">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}A -> B -> A${string}`>();
    });

    it("includes Fix: suggestion", () => {
      type Msg = CircularErrorMessage<"A -> B -> A">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Fix:${string}`>();
    });

    it("mentions lazy resolution as a solution", () => {
      type Msg = CircularErrorMessage<"A -> B -> A">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}lazy resolution${string}`>();
    });
  });

  describe("CaptiveErrorMessage", () => {
    it("starts with ERROR[HEX...]:", () => {
      type Msg = CaptiveErrorMessage<"UserCache", "Singleton", "RequestContext", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX${string}`>();
    });

    it("includes dependent name in quotes", () => {
      type Msg = CaptiveErrorMessage<"UserCache", "Singleton", "RequestContext", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}'UserCache'${string}`>();
    });

    it("includes captive port name in quotes", () => {
      type Msg = CaptiveErrorMessage<"UserCache", "Singleton", "RequestContext", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}'RequestContext'${string}`>();
    });

    it("includes both lifetimes", () => {
      type Msg = CaptiveErrorMessage<"UserCache", "Singleton", "RequestContext", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Singleton${string}Scoped${string}`>();
    });

    it("includes Fix: suggestion", () => {
      type Msg = CaptiveErrorMessage<"UserCache", "Singleton", "RequestContext", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Fix:${string}`>();
    });
  });

  describe("LifetimeInconsistencyErrorMessage", () => {
    it("starts with ERROR[HEX...]:", () => {
      type Msg = LifetimeInconsistencyErrorMessage<"Logger", "Singleton", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX${string}`>();
    });

    it("includes port name in quotes", () => {
      type Msg = LifetimeInconsistencyErrorMessage<"Logger", "Singleton", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}'Logger'${string}`>();
    });

    it("includes both lifetimes", () => {
      type Msg = LifetimeInconsistencyErrorMessage<"Logger", "Singleton", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Singleton${string}Scoped${string}`>();
    });

    it("references Graph A and Graph B", () => {
      type Msg = LifetimeInconsistencyErrorMessage<"Logger", "Singleton", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Graph A${string}Graph B${string}`>();
    });

    it("includes Fix: suggestion", () => {
      type Msg = LifetimeInconsistencyErrorMessage<"Logger", "Singleton", "Scoped">;
      expectTypeOf<Msg>().toMatchTypeOf<`${string}Fix:${string}`>();
    });
  });
});

// =============================================================================
// Integration Tests - Actual Errors from GraphBuilder
// =============================================================================

describe("GraphBuilder produces consistent errors", () => {
  it("duplicate error follows format", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const builder = GraphBuilder.create().provide(LoggerAdapter);
    type Result = ReturnType<typeof builder.provide<typeof LoggerAdapter>>;

    // Must start with ERROR:
    expectTypeOf<Result>().toMatchTypeOf<`ERROR[HEX${string}`>();
    // Must include Fix:
    expectTypeOf<Result>().toMatchTypeOf<`${string}Fix:${string}`>();
  });

  it("circular error follows format", () => {
    const PortA = createPort<{ doA(): void }>({ name: "A" });
    const PortB = createPort<{ doB(): void }>({ name: "B" });

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const builder = GraphBuilder.create().provide(AdapterA);
    type Result = ReturnType<typeof builder.provide<typeof AdapterB>>;

    // Must start with ERROR:
    expectTypeOf<Result>().toMatchTypeOf<`ERROR[HEX${string}`>();
    // Must include Fix:
    expectTypeOf<Result>().toMatchTypeOf<`${string}Fix:${string}`>();
  });

  it("captive error follows format", () => {
    const ScopedPort = createPort<{ doScoped(): void }>({ name: "Scoped" });
    const SingletonPort = createPort<{ doSingleton(): void }>({ name: "Singleton" });

    const ScopedAdapter = createAdapter({
      provides: ScopedPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ doScoped: () => {} }),
    });

    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [ScopedPort],
      lifetime: "singleton",
      factory: () => ({ doSingleton: () => {} }),
    });

    const builder = GraphBuilder.create().provide(ScopedAdapter);
    type Result = ReturnType<typeof builder.provide<typeof SingletonAdapter>>;

    // Must start with ERROR:
    expectTypeOf<Result>().toMatchTypeOf<`ERROR[HEX${string}`>();
    // Must include Fix:
    expectTypeOf<Result>().toMatchTypeOf<`${string}Fix:${string}`>();
  });
});

// =============================================================================
// Multi-Error Format Tests
// =============================================================================

describe("Multi-error messages follow format", () => {
  it("multi-error starts with 'Multiple validation errors:'", () => {
    const PortA = createPort<{ doA(): void }>({ name: "A" });
    const PortB = createPort<{ doB(): void }>({ name: "B" });

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // Create a duplicate that also creates a cycle
    const AdapterADuplicate = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const builder = GraphBuilder.create().provide(AdapterA).provide(AdapterB);
    type Result = ReturnType<typeof builder.provide<typeof AdapterADuplicate>>;

    // Multi-error format
    expectTypeOf<Result>().toMatchTypeOf<`Multiple validation errors:\n${string}`>();
    // Each error line is numbered
    expectTypeOf<Result>().toMatchTypeOf<`${string}1.${string}ERROR[HEX${string}`>();
  });
});
