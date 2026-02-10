/**
 * Type Tests for PortDeps Utility Type
 *
 * Verifies that PortDeps correctly maps a tuple of ports to a typed
 * dependencies object, replacing library-specific duplicates
 * (DerivedDeps, ResolvedActivityDeps) with a single canonical type.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { port } from "../src/ports/factory.js";
import type { Port } from "../src/ports/types.js";
import type { PortDeps, ResolvedDeps, EmptyDeps } from "../src/adapters/types.js";
import type { TupleToUnion } from "../src/utils/type-utilities.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

interface Analytics {
  track(event: string, data: Record<string, unknown>): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const AnalyticsPort = port<Analytics>()({ name: "Analytics" });

// =============================================================================
// Tests
// =============================================================================

describe("PortDeps", () => {
  it("maps empty tuple to EmptyDeps", () => {
    type Result = PortDeps<readonly []>;
    expectTypeOf<Result>().toEqualTypeOf<EmptyDeps>();
  });

  it("maps single port to single-key object", () => {
    type Result = PortDeps<readonly [typeof LoggerPort]>;
    expectTypeOf<Result>().toEqualTypeOf<{ Logger: Logger }>();
  });

  it("maps multiple ports to multi-key object", () => {
    type Result = PortDeps<readonly [typeof LoggerPort, typeof DatabasePort]>;
    expectTypeOf<Result>().toEqualTypeOf<{ Logger: Logger; Database: Database }>();
  });

  it("maps 4 cross-library ports with distinct service types", () => {
    type Result = PortDeps<
      readonly [typeof LoggerPort, typeof DatabasePort, typeof CachePort, typeof AnalyticsPort]
    >;
    expectTypeOf<Result>().toEqualTypeOf<{
      Logger: Logger;
      Database: Database;
      Cache: Cache;
      Analytics: Analytics;
    }>();
  });

  it("equals ResolvedDeps<T[number]> for non-empty tuples", () => {
    type Tuple = readonly [typeof LoggerPort, typeof DatabasePort];
    type ViaPortDeps = PortDeps<Tuple>;
    type ViaResolvedDeps = ResolvedDeps<TupleToUnion<Tuple>>;
    expectTypeOf<ViaPortDeps>().toEqualTypeOf<ViaResolvedDeps>();
  });

  it("prevents arbitrary key access on populated PortDeps", () => {
    type Result = PortDeps<readonly [typeof LoggerPort]>;
    const deps = {} as Result;

    // @ts-expect-error - NonExistent is not a key in PortDeps
    deps.NonExistent;
  });

  it("prevents arbitrary key access on empty PortDeps", () => {
    type Result = PortDeps<readonly []>;
    const deps = {} as Result;

    // @ts-expect-error - no keys exist on EmptyDeps
    deps.anything;
  });

  it("works with generic adapter factory pattern", () => {
    type Requires = readonly [
      typeof LoggerPort,
      typeof DatabasePort,
      typeof CachePort,
      typeof AnalyticsPort,
    ];

    function useFactory(deps: PortDeps<Requires>): string {
      expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
      expectTypeOf(deps.Database).toEqualTypeOf<Database>();
      expectTypeOf(deps.Cache).toEqualTypeOf<Cache>();
      expectTypeOf(deps.Analytics).toEqualTypeOf<Analytics>();
      return "ok";
    }

    expectTypeOf(useFactory).parameter(0).toEqualTypeOf<{
      Logger: Logger;
      Database: Database;
      Cache: Cache;
      Analytics: Analytics;
    }>();
  });
});
