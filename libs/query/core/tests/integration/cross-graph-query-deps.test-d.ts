/**
 * Type-level tests for cross-graph query dependency validation.
 *
 * Tests that compile-time validators correctly handle dependencies
 * that span different query domains/modules.
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  createQueryPort,
  createMutationPort,
  type ValidateQueryDependencies,
  type FindMissingPorts,
  type ValidateMutationEffects,
} from "../../src/index.js";

// =============================================================================
// Test Fixtures - Domain A: Users
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const UserByIdPort = createQueryPort<string, { id: string }, Error>()({
  name: "userById",
  dependsOn: [UsersPort],
});

// =============================================================================
// Test Fixtures - Domain B: Orders
// =============================================================================

const OrdersPort = createQueryPort<string[], void, Error>()({ name: "orders" });
const OrdersByUserPort = createQueryPort<string[], { userId: string }, Error>()({
  name: "ordersByUser",
  dependsOn: [UsersPort, OrdersPort],
});

// =============================================================================
// Test Fixtures - Domain C: Analytics (depends on A + B)
// =============================================================================

const UserStatsPort = createQueryPort<{ total: number }, void, Error>()({
  name: "userStats",
  dependsOn: [UsersPort, OrdersPort],
});

// =============================================================================
// Cross-Graph Dependency Validation
// =============================================================================

describe("Cross-graph dependency validation", () => {
  it("should detect missing ports from another domain", () => {
    // OrdersByUser depends on UsersPort and OrdersPort, but only "orders" is available
    type Result = FindMissingPorts<readonly [typeof UsersPort, typeof OrdersPort], "orders">;
    expectTypeOf<Result>().toEqualTypeOf<"users">();
  });

  it("should accept when all cross-domain ports are available", () => {
    type Result = FindMissingPorts<
      readonly [typeof UsersPort, typeof OrdersPort],
      "users" | "orders" | "ordersByUser"
    >;
    expectTypeOf<Result>().toBeNever();
  });

  it("should detect multiple missing cross-domain ports", () => {
    // UserStats depends on UsersPort and OrdersPort, neither is available
    type Result = FindMissingPorts<readonly [typeof UsersPort, typeof OrdersPort], "userStats">;
    expectTypeOf<Result>().toEqualTypeOf<"users" | "orders">();
  });

  it("should validate cross-domain mutation effects", () => {
    // A mutation in the orders domain invalidating users domain
    type Effects = { readonly invalidates: readonly [typeof UsersPort, typeof OrdersPort] };
    type Result = ValidateMutationEffects<Effects, "users" | "orders">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should detect cross-domain mutation effect referencing missing ports", () => {
    // A mutation invalidating a port from another domain that isn't registered
    type Effects = { readonly invalidates: readonly [typeof UserStatsPort] };
    type Result = ValidateMutationEffects<Effects, "users" | "orders">;
    expectTypeOf<Result>().toEqualTypeOf<"Error: Mutation invalidates references unknown ports: userStats">();
  });
});
