/**
 * Type-level tests for ResolvedDeps soundness.
 *
 * This test file specifically validates that ResolvedDeps<never> (the empty
 * dependencies case) does NOT allow arbitrary key access. The previous
 * implementation used Record<string, unknown> which allowed:
 *
 * ```typescript
 * const deps: ResolvedDeps<never> = {};
 * deps.nonExistent; // No error! This is unsound.
 * ```
 *
 * The fix uses a branded empty type that prevents arbitrary key access while
 * still being assignable from empty objects.
 */

import { describe, expectTypeOf, it } from "vitest";
import { createAdapter, ResolvedDeps } from "@hex-di/core";
import { Logger, LoggerPort, LoggerPortType } from "./fixtures.js";

// =============================================================================
// ResolvedDeps<never> Soundness Tests
// =============================================================================

describe("ResolvedDeps<never> soundness", () => {
  it("should NOT allow accessing arbitrary keys on empty deps", () => {
    type EmptyDeps = ResolvedDeps<never>;

    // This is the core soundness test:
    // With Record<string, unknown>, this would succeed (returning unknown)
    // With a proper branded empty type, this should be a type error

    // @ts-expect-error - Property 'nonExistent' should not exist on EmptyDeps
    type AccessNonExistent = EmptyDeps["nonExistent"];

    // Suppress unused variable warning
    type _Unused = AccessNonExistent;
  });

  it("should still be assignable from empty object literal", () => {
    type EmptyDeps = ResolvedDeps<never>;

    // Empty object should be assignable to EmptyDeps
    const deps: EmptyDeps = {};
    expectTypeOf(deps).toMatchTypeOf<EmptyDeps>();
  });

  it("should be usable in factory functions with no dependencies", () => {
    // This test verifies that the fix doesn't break actual usage
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: deps => {
        // deps should have no accessible keys
        // @ts-expect-error - Property 'anything' should not exist
        const _shouldFail = deps.anything;

        return { log: (_msg: string) => {} };
      },
    });

    expectTypeOf(adapter.factory).toBeFunction();
  });

  it("should maintain type safety in real adapter scenarios", () => {
    // Verify that accessing a non-existent dependency in a factory is caught
    const _adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: deps => {
        // The deps parameter should be a branded empty type
        // Attempting to access any property should be a type error
        type DepsType = typeof deps;

        // @ts-expect-error - NonExistent is not a property of deps
        type NonExistentAccess = DepsType["NonExistent"];

        // Suppress unused type warning
        type _Unused = NonExistentAccess;

        return { log: () => {} };
      },
    });
  });
});

// =============================================================================
// ResolvedDeps<Port> Soundness Tests (non-empty case - should still work)
// =============================================================================

describe("ResolvedDeps<Port> (non-empty case)", () => {
  it("should allow accessing declared dependency keys", () => {
    type LoggerDeps = ResolvedDeps<LoggerPortType>;

    // This should work - Logger is a declared dependency
    expectTypeOf<LoggerDeps["Logger"]>().toEqualTypeOf<Logger>();
  });

  it("should NOT allow accessing undeclared keys on non-empty deps", () => {
    type LoggerDeps = ResolvedDeps<LoggerPortType>;

    // @ts-expect-error - Property 'UndeclaredService' should not exist
    type _AccessUndeclared = LoggerDeps["UndeclaredService"];
  });
});
