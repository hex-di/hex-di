/**
 * Type Tests for Operation Completeness Verification.
 *
 * Tests verify compile-time behavior of:
 * - VerifyOperationCompleteness type
 * - MissingOperationsError for incomplete factories
 * - AdapterWithCompletenessCheck integration in createAdapter
 * - Complete, incomplete, and superset cases
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { port, createAdapter } from "../src/index.js";
import type {
  VerifyOperationCompleteness,
  MissingOperationsError,
  IsMissingOperationsError,
  UnwrapFactoryOk,
  AdapterWithCompletenessCheck,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface UserService {
  getUser(id: string): { id: string; name: string };
  createUser(data: { name: string }): { id: string; name: string };
  deleteUser(id: string): void;
}

interface Logger {
  log(msg: string): void;
}

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

const UserServicePort = port<UserService>()({ name: "UserService" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const CachePort = port<Cache>()({ name: "Cache" });

// =============================================================================
// 5.1: VerifyOperationCompleteness type tests
// =============================================================================

describe("VerifyOperationCompleteness", () => {
  it("returns true when all operations are present", () => {
    type Result = VerifyOperationCompleteness<
      typeof UserServicePort,
      {
        getUser: (id: string) => { id: string; name: string };
        createUser: (data: { name: string }) => { id: string; name: string };
        deleteUser: (id: string) => void;
      }
    >;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns MissingOperationsError when operations are missing", () => {
    type Result = VerifyOperationCompleteness<
      typeof UserServicePort,
      { getUser: (id: string) => { id: string; name: string } }
    >;
    expectTypeOf<Result>().toMatchTypeOf<
      MissingOperationsError<"UserService", "createUser" | "deleteUser">
    >();
  });

  it("returns true for superset (extra operations allowed)", () => {
    type Result = VerifyOperationCompleteness<
      typeof LoggerPort,
      { log: (msg: string) => void; debug: (msg: string) => void }
    >;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns MissingOperationsError when factory returns empty object", () => {
    type Result = VerifyOperationCompleteness<typeof CachePort, { _unused: never }>;
    // Should be a MissingOperationsError since 'get' and 'set' are missing
    type IsError = IsMissingOperationsError<Result>;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns MissingOperationsError for single missing operation", () => {
    type Result = VerifyOperationCompleteness<typeof CachePort, { get: (key: string) => unknown }>;
    expectTypeOf<Result>().toMatchTypeOf<MissingOperationsError<"Cache", "set">>();
  });
});

describe("IsMissingOperationsError", () => {
  it("returns true for MissingOperationsError", () => {
    type Err = MissingOperationsError<"Test", "method">;
    expectTypeOf<IsMissingOperationsError<Err>>().toEqualTypeOf<true>();
  });

  it("returns false for true (pass case)", () => {
    expectTypeOf<IsMissingOperationsError<true>>().toEqualTypeOf<false>();
  });
});

describe("UnwrapFactoryOk", () => {
  it("unwraps plain types", () => {
    expectTypeOf<UnwrapFactoryOk<Logger>>().toMatchTypeOf<Logger>();
  });

  it("unwraps Promise types", () => {
    expectTypeOf<UnwrapFactoryOk<Promise<Logger>>>().toMatchTypeOf<Logger>();
  });

  it("unwraps Result Ok types", () => {
    type ResultLike =
      | { readonly _tag: "Ok"; readonly value: Logger }
      | { readonly _tag: "Err"; readonly error: string };
    expectTypeOf<UnwrapFactoryOk<ResultLike>>().toMatchTypeOf<Logger>();
  });
});

// =============================================================================
// 5.2: createAdapter completeness integration tests
// =============================================================================

describe("createAdapter with completeness check", () => {
  it("accepts complete factory implementation", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): Logger => ({ log: () => {} }),
    });
    // If this compiles, the completeness check passed
    expectTypeOf(adapter).toHaveProperty("provides");
  });

  it("accepts complete UserService implementation", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      factory: (): UserService => ({
        getUser: id => ({ id, name: "test" }),
        createUser: data => ({ id: "1", name: data.name }),
        deleteUser: () => {},
      }),
    });
    expectTypeOf(adapter).toHaveProperty("provides");
  });

  it("accepts factory with superset of operations", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): Logger & { debug: (msg: string) => void } => ({
        log: () => {},
        debug: () => {},
      }),
    });
    expectTypeOf(adapter).toHaveProperty("provides");
  });

  it("accepts class-based adapter (no completeness check needed)", () => {
    class ConsoleLogger implements Logger {
      log(_msg: string): void {
        // noop
      }
    }
    const adapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });
    expectTypeOf(adapter).toHaveProperty("provides");
  });

  it("accepts factory with requires", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort] as const,
      factory: (_deps): UserService => ({
        getUser: id => ({ id, name: "test" }),
        createUser: data => ({ id: "1", name: data.name }),
        deleteUser: () => {},
      }),
    });
    expectTypeOf(adapter).toHaveProperty("provides");
  });

  it("accepts factory with lifetime", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      lifetime: "transient",
      factory: (): Logger => ({ log: () => {} }),
    });
    expectTypeOf(adapter).toHaveProperty("provides");
  });
});
