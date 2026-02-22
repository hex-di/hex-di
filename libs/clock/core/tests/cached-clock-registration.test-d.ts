/**
 * CachedClock DI registration type-level tests — DoD 33
 */

import { describe, it, expectTypeOf } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import type { AdapterConstraint, InferAdapterProvides, InferService } from "@hex-di/core";
import { SystemCachedClockAdapter } from "../src/index.js";
import type { CachedClockService } from "../src/ports/cached-clock.js";

// =============================================================================
// DoD 33: Cached Clock Registration — type-level
// =============================================================================

describe("SystemCachedClockAdapter type checks", () => {
  it("SystemCachedClockAdapter satisfies AdapterConstraint", () => {
    expectTypeOf(SystemCachedClockAdapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("SystemCachedClockAdapter provides CachedClockService", () => {
    type Provides = InferService<InferAdapterProvides<typeof SystemCachedClockAdapter>>;
    expectTypeOf<Provides>().toMatchTypeOf<CachedClockService>();
  });

  it("SystemCachedClockAdapter without ClockPort: build() returns dependency-error string not a Graph", () => {
    // When ClockPort is not registered, GraphBuilder.build() returns a string describing
    // the missing dependency rather than a valid Graph — compile-time enforcement of requirements.
    const incompleteGraph = GraphBuilder.create().provide(SystemCachedClockAdapter).build();
    expectTypeOf(incompleteGraph).toBeString();
  });
});
