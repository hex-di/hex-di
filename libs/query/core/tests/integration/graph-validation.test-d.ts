/**
 * Type-level tests for query graph validation.
 *
 * Tests compile-time validators for dependencies, mutation effects,
 * and adapter lifetime rules.
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  createQueryPort,
  type ValidateQueryDependencies,
  type FindMissingPorts,
  type ValidateMutationEffects,
  type ValidateQueryAdapterLifetime,
} from "../../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const PostsPort = createQueryPort<string[], void, Error>()({ name: "posts" });
const CommentsPort = createQueryPort<string[], { postId: string }, Error>()({
  name: "comments",
  dependsOn: [PostsPort],
});

// =============================================================================
// ValidateQueryDependencies
// =============================================================================

describe("ValidateQueryDependencies", () => {
  it("should accept valid dependency configurations", () => {
    type Result = ValidateQueryDependencies<"comments", readonly [typeof PostsPort]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should accept empty dependency arrays", () => {
    type Result = ValidateQueryDependencies<"users", readonly []>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should detect self-referential dependencies", () => {
    // A port depending on itself should produce an error
    type Result = ValidateQueryDependencies<"users", readonly [typeof UsersPort]>;
    expectTypeOf<Result>().toEqualTypeOf<"Error: Query port 'users' has a circular dependency on itself.">();
  });

  it("should accept ports depending on different ports", () => {
    type Result = ValidateQueryDependencies<
      "comments",
      readonly [typeof UsersPort, typeof PostsPort]
    >;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// FindMissingPorts
// =============================================================================

describe("FindMissingPorts", () => {
  it("should return never when all dependencies are available", () => {
    type Result = FindMissingPorts<readonly [typeof PostsPort], "posts" | "users">;
    expectTypeOf<Result>().toBeNever();
  });

  it("should return missing port names", () => {
    type Result = FindMissingPorts<readonly [typeof PostsPort, typeof CommentsPort], "users">;
    expectTypeOf<Result>().toEqualTypeOf<"posts" | "comments">();
  });

  it("should return never for empty dependency arrays", () => {
    type Result = FindMissingPorts<readonly [], "users">;
    expectTypeOf<Result>().toBeNever();
  });
});

// =============================================================================
// ValidateMutationEffects
// =============================================================================

describe("ValidateMutationEffects", () => {
  it("should accept valid mutation effects", () => {
    type Effects = { readonly invalidates: readonly [typeof UsersPort] };
    type Result = ValidateMutationEffects<Effects, "users" | "posts">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should detect unknown invalidation targets", () => {
    type Effects = { readonly invalidates: readonly [typeof UsersPort] };
    type Result = ValidateMutationEffects<Effects, "posts">;
    expectTypeOf<Result>().toEqualTypeOf<"Error: Mutation invalidates references unknown ports: users">();
  });

  it("should accept valid removal effects", () => {
    type Effects = { readonly removes: readonly [typeof PostsPort] };
    type Result = ValidateMutationEffects<Effects, "posts">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should detect unknown removal targets", () => {
    type Effects = { readonly removes: readonly [typeof PostsPort] };
    type Result = ValidateMutationEffects<Effects, "users">;
    expectTypeOf<Result>().toEqualTypeOf<"Error: Mutation removes references unknown ports: posts">();
  });

  it("should accept effects with no ports", () => {
    type Effects = { readonly invalidates: readonly [] };
    type Result = ValidateMutationEffects<Effects, "users">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// ValidateQueryAdapterLifetime
// =============================================================================

describe("ValidateQueryAdapterLifetime", () => {
  it("should accept singleton with singleton deps", () => {
    type Result = ValidateQueryAdapterLifetime<"singleton", readonly ["singleton"]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should reject singleton with scoped deps", () => {
    type Result = ValidateQueryAdapterLifetime<"singleton", readonly ["scoped"]>;
    expectTypeOf<Result>().toEqualTypeOf<"Error: Singleton adapter cannot depend on scoped or transient dependencies (captive dependency).">();
  });

  it("should reject singleton with transient deps", () => {
    type Result = ValidateQueryAdapterLifetime<"singleton", readonly ["transient"]>;
    expectTypeOf<Result>().toEqualTypeOf<"Error: Singleton adapter cannot depend on scoped or transient dependencies (captive dependency).">();
  });

  it("should accept scoped with scoped deps", () => {
    type Result = ValidateQueryAdapterLifetime<"scoped", readonly ["scoped"]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should accept transient with any deps", () => {
    type Result = ValidateQueryAdapterLifetime<
      "transient",
      readonly ["singleton", "scoped", "transient"]
    >;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});
