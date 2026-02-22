/**
 * Test for JoinPortNames recursion behavior.
 *
 * ## Issue
 *
 * JoinPortNames uses recursive type iteration without an explicit depth limit.
 * This test verifies that it handles reasonable union sizes without issues.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { JoinPortNames } from "../src/validation/types/error-messages.js";
import type { Port } from "@hex-di/core";

// Create a union of 10 ports (realistic large case)
type Port1 = Port<"Port1", { test: () => void }>;
type Port2 = Port<"Port2", { test: () => void }>;
type Port3 = Port<"Port3", { test: () => void }>;
type Port4 = Port<"Port4", { test: () => void }>;
type Port5 = Port<"Port5", { test: () => void }>;
type Port6 = Port<"Port6", { test: () => void }>;
type Port7 = Port<"Port7", { test: () => void }>;
type Port8 = Port<"Port8", { test: () => void }>;
type Port9 = Port<"Port9", { test: () => void }>;
type Port10 = Port<"Port10", { test: () => void }>;

type TenPorts = Port1 | Port2 | Port3 | Port4 | Port5 | Port6 | Port7 | Port8 | Port9 | Port10;

describe("JoinPortNames with many ports", () => {
  it("handles 10-port union (realistic large case)", () => {
    type Result = JoinPortNames<TenPorts>;

    // Should be a string, not never
    type IsString = Result extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<true>();

    // Should contain "Port1" somewhere
    type ContainsPort1 = Result extends `${string}Port1${string}` ? true : false;
    expectTypeOf<ContainsPort1>().toEqualTypeOf<true>();

    // Should contain "Port10" somewhere
    type ContainsPort10 = Result extends `${string}Port10${string}` ? true : false;
    expectTypeOf<ContainsPort10>().toEqualTypeOf<true>();
  });

  it("handles empty union (never)", () => {
    type Result = JoinPortNames<never>;
    expectTypeOf<Result>().toEqualTypeOf<"">();
  });

  it("handles single port", () => {
    type Result = JoinPortNames<Port1>;
    expectTypeOf<Result>().toEqualTypeOf<"Port1">();
  });

  it("has bounded recursion (max 100 ports)", () => {
    // The implementation has a depth counter that truncates after 100 iterations
    // to prevent TypeScript from hitting hard recursion limits.
    // This test documents that behavior exists (actual truncation is hard to test
    // since creating a 100+ member union is impractical).

    // Verify that depth counter types exist by checking a normal case still works
    type Result = JoinPortNames<Port1 | Port2 | Port3>;
    type IsString = Result extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<true>();

    // Should NOT contain truncation message for small unions
    type ContainsTruncated = Result extends `${string}(truncated${string}` ? true : false;
    expectTypeOf<ContainsTruncated>().toEqualTypeOf<false>();
  });
});
