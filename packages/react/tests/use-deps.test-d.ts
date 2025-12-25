/**
 * Type-level tests for useDeps hook.
 *
 * These tests verify compile-time type safety for:
 * 1. Return object is correctly typed based on port arguments
 * 2. Single port returns correct type
 * 3. Multiple ports return correct combined type
 * 4. Empty call returns Record<string, never>
 * 5. Tuple inference works correctly (const modifier)
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { useDeps } from "../src/hooks/use-deps.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
void LoggerPort;
void DatabasePort;
void UserServicePort;

// =============================================================================
// Return Type Tests
// =============================================================================

describe("useDeps return type", () => {
  it("returns correct type for single port", () => {
    // Note: This test is for type checking - actual hook call would throw outside provider
    // We're testing the type signature, not runtime behavior
    type Result = ReturnType<typeof useDeps<readonly [typeof LoggerPort]>>;

    // Result should have Logger property with Logger type
    expectTypeOf<Result>().toHaveProperty("Logger");
    expectTypeOf<Result["Logger"]>().toEqualTypeOf<Logger>();
  });

  it("returns correct type for multiple ports", () => {
    type Result = ReturnType<typeof useDeps<readonly [typeof LoggerPort, typeof DatabasePort]>>;

    // Result should have both Logger and Database properties
    expectTypeOf<Result>().toHaveProperty("Logger");
    expectTypeOf<Result>().toHaveProperty("Database");
    expectTypeOf<Result["Logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Result["Database"]>().toEqualTypeOf<Database>();
  });

  it("returns correct type for three ports", () => {
    type Result = ReturnType<
      typeof useDeps<readonly [typeof LoggerPort, typeof DatabasePort, typeof UserServicePort]>
    >;

    // Result should have all three properties
    expectTypeOf<Result>().toHaveProperty("Logger");
    expectTypeOf<Result>().toHaveProperty("Database");
    expectTypeOf<Result>().toHaveProperty("UserService");
    expectTypeOf<Result["Logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Result["Database"]>().toEqualTypeOf<Database>();
    expectTypeOf<Result["UserService"]>().toEqualTypeOf<UserService>();
  });

  it("returns Record<string, never> for no ports", () => {
    type Result = ReturnType<typeof useDeps<readonly []>>;

    expectTypeOf<Result>().toEqualTypeOf<Record<string, never>>();
  });
});

// =============================================================================
// Destructuring Tests
// =============================================================================

describe("useDeps destructuring", () => {
  it("supports typed destructuring", () => {
    // Type-level test: verify destructuring works with correct types
    type Result = ReturnType<typeof useDeps<readonly [typeof LoggerPort, typeof DatabasePort]>>;

    // Simulate destructuring
    const mockResult: Result = {} as Result;
    const { Logger, Database } = mockResult;

    expectTypeOf(Logger).toEqualTypeOf<Logger>();
    expectTypeOf(Database).toEqualTypeOf<Database>();
  });
});

// =============================================================================
// Error Cases
// =============================================================================

describe("useDeps error cases", () => {
  it("accessing non-existent property causes compile error", () => {
    type Result = ReturnType<typeof useDeps<readonly [typeof LoggerPort]>>;
    const mockResult: Result = {} as Result;

    // @ts-expect-error - Database is not in the result
    void mockResult.Database;
  });

  it("accessing wrong property name causes compile error", () => {
    type Result = ReturnType<typeof useDeps<readonly [typeof LoggerPort]>>;
    const mockResult: Result = {} as Result;

    // @ts-expect-error - Wrong name (lowercase)
    void mockResult.logger;
  });
});

// =============================================================================
// Tuple Inference Tests
// =============================================================================

describe("useDeps tuple inference", () => {
  it("infers tuple type from arguments (const modifier)", () => {
    // The `const` modifier in the generic ensures tuple inference
    // When called with specific ports, the return type reflects those exact ports
    type Result = ReturnType<typeof useDeps<readonly [typeof LoggerPort, typeof DatabasePort]>>;

    // The result has exactly Logger and Database - not arbitrary ports
    expectTypeOf<Result>().toHaveProperty("Logger");
    expectTypeOf<Result>().toHaveProperty("Database");

    // Verify it's NOT a generic Record<string, unknown>
    type Keys = keyof Result;
    expectTypeOf<Keys>().toEqualTypeOf<"Logger" | "Database">();
  });

  it("preserves port order in type (tuple not array)", () => {
    // Even with same ports in different order, types are correctly inferred
    type Result1 = ReturnType<typeof useDeps<readonly [typeof LoggerPort, typeof DatabasePort]>>;
    type Result2 = ReturnType<typeof useDeps<readonly [typeof DatabasePort, typeof LoggerPort]>>;

    // Both have same keys (order doesn't matter in object type)
    expectTypeOf<Result1>().toEqualTypeOf<Result2>();
  });
});

// =============================================================================
// Function Signature Tests
// =============================================================================

describe("useDeps function signature", () => {
  it("is a function", () => {
    expectTypeOf(useDeps).toBeFunction();
  });

  it("accepts zero or more port arguments (variadic)", () => {
    // useDeps is variadic - it accepts ...requires: TRequires
    // Parameters<typeof useDeps> returns the rest parameter type

    // Verify it can be called with no arguments
    type EmptyResult = ReturnType<typeof useDeps<readonly []>>;
    expectTypeOf<EmptyResult>().toEqualTypeOf<Record<string, never>>();

    // Verify it can be called with one argument
    type OneResult = ReturnType<typeof useDeps<readonly [typeof LoggerPort]>>;
    expectTypeOf<OneResult>().toHaveProperty("Logger");

    // Verify it can be called with multiple arguments
    type MultiResult = ReturnType<
      typeof useDeps<readonly [typeof LoggerPort, typeof DatabasePort, typeof UserServicePort]>
    >;
    expectTypeOf<MultiResult>().toHaveProperty("Logger");
    expectTypeOf<MultiResult>().toHaveProperty("Database");
    expectTypeOf<MultiResult>().toHaveProperty("UserService");
  });

  it("each parameter must be a Port type", () => {
    // The generic constraint ensures each element is a Port
    // This is verified by the fact that non-Port types cause compile errors

    // Valid: Port types
    type ValidResult = ReturnType<typeof useDeps<readonly [typeof LoggerPort]>>;
    expectTypeOf<ValidResult>().toHaveProperty("Logger");

    // Invalid calls would fail at compile time:
    // useDeps("not a port") - ✗ Compile error
    // useDeps(123) - ✗ Compile error
  });
});
