/**
 * Type-level tests for override type safety escape hatch.
 *
 * This tests the issue where override() only validates port names match,
 * not that the full port types (including service interfaces) match.
 *
 * ## The Issue
 *
 * When overriding a parent port, the current validation:
 * - ✓ Checks that port NAME exists in parent
 * - ✗ Does NOT check that service interface matches
 *
 * This allows overriding a Logger port (with `log()` method) with a
 * completely different service interface (e.g., `query()` method) as
 * long as both use the same port name string.
 *
 * @packageDocumentation
 */
import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures - Different interfaces, same port name
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface ExtendedLogger {
  log(message: string): void;
  debug(message: string): void;
}

interface CompletelyDifferentService {
  query(): void;
}

// All these ports have the same NAME but different SERVICE TYPES
const LoggerPort = createPort<"Logger", Logger>("Logger");
const ExtendedLoggerPort = createPort<"Logger", ExtendedLogger>("Logger");
const DifferentServicePort = createPort<"Logger", CompletelyDifferentService>("Logger");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ExtendedLoggerAdapter = createAdapter({
  provides: ExtendedLoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {}, debug: () => {} }),
});

const DifferentServiceAdapter = createAdapter({
  provides: DifferentServicePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

// =============================================================================
// Type Escape Hatch Tests
// =============================================================================

describe("Override type safety escape hatch", () => {
  it("REJECTS override with different service type (FIXED)", () => {
    // Create parent with Logger port
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Try to override with a COMPLETELY DIFFERENT service interface
    // This now correctly returns a type error (HEX021)
    const childBuilder = GraphBuilder.forParent(parentGraph).override(DifferentServiceAdapter);

    // FIXED: Override with incompatible service type is rejected with HEX021
    expectTypeOf<typeof childBuilder>().toBeString();
    expectTypeOf<
      typeof childBuilder
    >().toMatchTypeOf<`ERROR[HEX021]: Cannot override 'Logger'${string}`>();
  });

  it("should REJECT override with incompatible service type", () => {
    // Create parent with Logger port
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Override with a different service interface now fails with HEX021
    const result = GraphBuilder.forParent(parentGraph).override(DifferentServiceAdapter);

    // FIXED: Returns error string about type mismatch
    expectTypeOf<typeof result>().toBeString();
  });

  it("should ALLOW override with exact same port type", () => {
    // Create a mock adapter that provides the EXACT same port type
    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [] as const,
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Override with exact same port type should work
    const childBuilder = GraphBuilder.forParent(parentGraph).override(MockLoggerAdapter);

    // This should compile - exact same port type
    expectTypeOf<typeof childBuilder>().not.toBeString();
  });

  it("extended interface override should be allowed (contravariant)", () => {
    // ExtendedLogger has MORE methods than Logger - this is safe
    // because it can fulfill all Logger contracts
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Override with extended interface
    // This is actually type-safe - ExtendedLogger is assignable to Logger
    const result = GraphBuilder.forParent(parentGraph).override(ExtendedLoggerAdapter);

    // IDEALLY: This should be allowed (subtype is safe)
    // For now, we just document the behavior
    expectTypeOf<typeof result>().not.toBeString();
  });
});

describe("Port type vs port name", () => {
  it("ports with same name but different types are NOT the same", () => {
    // These are technically different Port types
    type PortA = typeof LoggerPort;
    type PortB = typeof DifferentServicePort;

    // They should NOT be assignable to each other
    // because they have different __brand types
    expectTypeOf<PortA>().not.toEqualTypeOf<PortB>();
  });
});
