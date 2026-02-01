/**
 * Type-level tests for HEX008 error code consistency.
 *
 * These tests verify that build() uses the correct error code (HEX008)
 * for "Missing adapters" errors, matching the canonical definition in
 * error-parsing.ts.
 *
 * Error Code Reference:
 * - HEX004 = Reverse captive dependency
 * - HEX008 = Missing dependency
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  CachePortSimple as CachePort,
} from "./fixtures.js";

// =============================================================================
// Test Adapters
// =============================================================================

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null, set: () => {} }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: id => Promise.resolve({ id, name: "test" }) }),
});

// =============================================================================
// HEX008 Error Code Tests
// =============================================================================

describe("build() uses HEX008 for missing adapters (TDD)", () => {
  it("single missing dependency uses HEX008 error code", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);

    type BuildResult = ReturnType<typeof builder.build>;

    // Must use HEX008 (Missing dependency), NOT HEX004 (Reverse captive)
    type HasCorrectCode = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();

    // Must NOT use HEX004
    type UsesWrongCode = BuildResult extends `ERROR[HEX004]: ${string}` ? true : false;
    expectTypeOf<UsesWrongCode>().toEqualTypeOf<false>();
  });

  it("multiple missing dependencies use HEX008 error code", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    type BuildResult = ReturnType<typeof builder.build>;

    // Must use HEX008
    type HasCorrectCode = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();

    // Must contain the missing port names
    type ContainsLogger = BuildResult extends `${string}Logger${string}` ? true : false;
    type ContainsDatabase = BuildResult extends `${string}Database${string}` ? true : false;
    expectTypeOf<ContainsLogger>().toEqualTypeOf<true>();
    expectTypeOf<ContainsDatabase>().toEqualTypeOf<true>();
  });

  it("error message format matches HEX008 specification", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);

    type BuildResult = ReturnType<typeof builder.build>;

    // Full format: ERROR[HEX008]: Missing adapters for <ports>. Call .provide() first.
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR[HEX008]: Missing adapters for Logger. Call .provide() first.">();
  });
});
