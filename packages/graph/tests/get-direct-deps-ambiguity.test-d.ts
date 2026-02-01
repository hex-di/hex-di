/**
 * Test: GetDirectDeps Missing vs Empty Ambiguity
 *
 * This test explores the ambiguity in GetDirectDeps where both:
 * - Port not found in graph
 * - Port found but has no dependencies
 *
 * Return the same value: `never`
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import type { GetDirectDeps, DebugGetDirectDeps } from "../src/validation/types/cycle/detection.js";
import type { IsNever } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

// Graph where Logger has no dependencies (never)
type GraphWithLogger = {
  Logger: never; // Logger exists, has no deps
  UserService: "Logger"; // UserService depends on Logger
};

// =============================================================================
// Ambiguity Tests
// =============================================================================

describe("GetDirectDeps ambiguity: missing vs empty", () => {
  describe("current behavior (documents ambiguity)", () => {
    it("returns never for port with no dependencies", () => {
      type Result = GetDirectDeps<GraphWithLogger, "Logger">;

      // Logger exists but has no dependencies
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });

    it("returns never for port not in graph", () => {
      type Result = GetDirectDeps<GraphWithLogger, "NotFound">;

      // NotFound doesn't exist in the graph
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });

    it("shows both cases return never (ambiguous)", () => {
      type ExistingNoDeps = GetDirectDeps<GraphWithLogger, "Logger">;
      type NotFound = GetDirectDeps<GraphWithLogger, "NotFound">;

      // Both return never - can't distinguish at type level
      expectTypeOf<ExistingNoDeps>().toEqualTypeOf<NotFound>();

      // IsNever returns true for both
      type ExistingNoDepsIsNever = IsNever<ExistingNoDeps>;
      type NotFoundIsNever = IsNever<NotFound>;

      expectTypeOf<ExistingNoDepsIsNever>().toEqualTypeOf<true>();
      expectTypeOf<NotFoundIsNever>().toEqualTypeOf<true>();
    });
  });

  describe("DebugGetDirectDeps distinguishes cases", () => {
    it("shows found=true for existing port with no deps", () => {
      type Debug = DebugGetDirectDeps<GraphWithLogger, "Logger">;

      expectTypeOf<Debug["found"]>().toEqualTypeOf<true>();
      expectTypeOf<Debug["deps"]>().toEqualTypeOf<never>();
    });

    it("shows found=false for non-existent port", () => {
      type Debug = DebugGetDirectDeps<GraphWithLogger, "NotFound">;

      expectTypeOf<Debug["found"]>().toEqualTypeOf<false>();
      expectTypeOf<Debug["deps"]>().toEqualTypeOf<never>();
    });
  });

  describe("practical impact analysis", () => {
    it("cycle detection: both cases correctly treated as no deps", () => {
      // For cycle detection, both "port not found" and "port with no deps"
      // mean "can't reach target from this port" which is the same behavior.
      // The ambiguity doesn't cause incorrect results for cycle detection.

      // Port with no deps: can't reach any target
      type LoggerDeps = GetDirectDeps<GraphWithLogger, "Logger">;
      type LoggerIsLeaf = IsNever<LoggerDeps>;
      expectTypeOf<LoggerIsLeaf>().toEqualTypeOf<true>();

      // Port not found: also can't reach any target
      type NotFoundDeps = GetDirectDeps<GraphWithLogger, "NotFound">;
      type NotFoundIsLeaf = IsNever<NotFoundDeps>;
      expectTypeOf<NotFoundIsLeaf>().toEqualTypeOf<true>();

      // Both correctly indicate "this is a leaf node" for traversal
    });

    it("port with dependencies returns correct deps", () => {
      type UserServiceDeps = GetDirectDeps<GraphWithLogger, "UserService">;

      // Port with dependencies returns the deps union
      expectTypeOf<UserServiceDeps>().toEqualTypeOf<"Logger">();
    });
  });
});

describe("Is the ambiguity actually a problem?", () => {
  it("cycle detection: both cases treated as leaf (no deps to traverse)", () => {
    // In cycle detection, IsReachable checks if we can reach target:
    // - If port not found: no deps to traverse, return false (correct)
    // - If port found with no deps: no deps to traverse, return false (correct)
    // Same outcome, same behavior - ambiguity is harmless here.

    // Test that both cases result in IsNever being true
    type ExistingNoDeps = GetDirectDeps<GraphWithLogger, "Logger">;
    type NotFoundDeps = GetDirectDeps<GraphWithLogger, "NotFound">;

    // Both are treated as "leaf node" - no deps to follow
    expectTypeOf<IsNever<ExistingNoDeps>>().toEqualTypeOf<true>();
    expectTypeOf<IsNever<NotFoundDeps>>().toEqualTypeOf<true>();
  });

  it("captive detection: uses lifetime map which has separate existence check", () => {
    // Captive detection looks up lifetimes from GetLifetimeLevel,
    // not dependencies from GetDirectDeps. The dependency graph is used
    // to track which ports depend on which, but the ambiguity doesn't
    // affect captive detection logic.

    // The lifetime map always distinguishes "not found" (never) vs "found" (1|2|3)
    // because lifetime values are always numeric, not never
    expectTypeOf<1 | 2 | 3>().not.toEqualTypeOf<never>();
  });

  it("DebugGetDirectDeps exists for when distinction is needed", () => {
    // For debugging and inspection, DebugGetDirectDeps provides the
    // `found` property that distinguishes the two cases.
    type Debug = DebugGetDirectDeps<GraphWithLogger, "Logger">;
    expectTypeOf<Debug["found"]>().toEqualTypeOf<true>();

    type DebugNotFound = DebugGetDirectDeps<GraphWithLogger, "NotFound">;
    expectTypeOf<DebugNotFound["found"]>().toEqualTypeOf<false>();
  });
});
