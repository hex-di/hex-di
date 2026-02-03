/**
 * Type-level tests for compile-time error messages.
 *
 * These tests verify:
 * 1. Error message contains "Missing dependencies:" prefix
 * 2. Error message lists missing port names
 * 3. Multiple missing ports shown in message
 * 4. Error type is unusable (forces compile error at call site)
 * 5. Error appears at `.build()` call, not deep in types
 * 6. DuplicateProviderError includes port name
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder, type Graph } from "../src/index.js";
import {
  MissingDependencyError,
  DuplicateProviderError,
  type JoinPortNames,
} from "./test-types.js";
import type { ExtractPortNames } from "./test-types.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  ConfigPortStrict as ConfigPort,
  LoggerPortType,
  DatabasePortType,
  UserServicePortType,
  ConfigPortStrictType as ConfigPortType,
} from "./fixtures.js";

// =============================================================================
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: () => Promise.resolve({}) }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: id => Promise.resolve({ id, name: "test" }) }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => "" }),
});

// Use the ConfigAdapter variable to satisfy ESLint
expect(ConfigAdapter).toBeDefined();

// =============================================================================
// ExtractPortNames Tests
// =============================================================================

describe("ExtractPortNames utility type", () => {
  it("extracts single port name from single port", () => {
    type Names = ExtractPortNames<LoggerPortType>;
    expectTypeOf<Names>().toEqualTypeOf<"Logger">();
  });

  it("extracts port names from port union", () => {
    type Names = ExtractPortNames<LoggerPortType | DatabasePortType>;
    expectTypeOf<Names>().toEqualTypeOf<"Logger" | "Database">();
  });

  it("extracts multiple port names from larger union", () => {
    type Names = ExtractPortNames<LoggerPortType | DatabasePortType | ConfigPortType>;
    expectTypeOf<Names>().toEqualTypeOf<"Logger" | "Database" | "Config">();
  });

  it("returns never for never input", () => {
    type Names = ExtractPortNames<never>;
    expectTypeOf<Names>().toBeNever();
  });
});

// =============================================================================
// JoinPortNames Tests
// =============================================================================

describe("JoinPortNames utility type", () => {
  it("joins single port name from single port", () => {
    type Names = JoinPortNames<LoggerPortType>;
    expectTypeOf<Names>().toEqualTypeOf<"Logger">();
  });

  it("joins two port names with comma separator", () => {
    type Names = JoinPortNames<LoggerPortType | DatabasePortType>;
    // Order is determined by TypeScript's internal union ordering, so verify pattern
    type ContainsLogger = Names extends `${string}Logger${string}` ? true : false;
    type ContainsDatabase = Names extends `${string}Database${string}` ? true : false;
    type HasComma = Names extends `${string}, ${string}` ? true : false;
    expectTypeOf<ContainsLogger>().toEqualTypeOf<true>();
    expectTypeOf<ContainsDatabase>().toEqualTypeOf<true>();
    expectTypeOf<HasComma>().toEqualTypeOf<true>();
  });

  it("joins three port names with comma separators", () => {
    type Names = JoinPortNames<LoggerPortType | DatabasePortType | ConfigPortType>;
    // Order is determined by TypeScript's internal union ordering
    // Verify the result contains all three port names separated by commas
    type ContainsLogger = Names extends `${string}Logger${string}` ? true : false;
    type ContainsDatabase = Names extends `${string}Database${string}` ? true : false;
    type ContainsConfig = Names extends `${string}Config${string}` ? true : false;
    type HasTwoCommas = Names extends `${string}, ${string}, ${string}` ? true : false;
    expectTypeOf<ContainsLogger>().toEqualTypeOf<true>();
    expectTypeOf<ContainsDatabase>().toEqualTypeOf<true>();
    expectTypeOf<ContainsConfig>().toEqualTypeOf<true>();
    expectTypeOf<HasTwoCommas>().toEqualTypeOf<true>();
  });

  it("returns empty string for never input", () => {
    type Names = JoinPortNames<never>;
    expectTypeOf<Names>().toEqualTypeOf<"">();
  });

  it("produces single string, not a union", () => {
    type Names = JoinPortNames<LoggerPortType | DatabasePortType>;
    // If this were a union, the extends check would fail
    type IsSingleString = Names extends string
      ? string extends Names
        ? false // It's just `string`, not a literal
        : true // It's a literal string
      : false;
    expectTypeOf<IsSingleString>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// MissingDependencyError Tests
// =============================================================================

describe("MissingDependencyError template literal type", () => {
  it("error type has __message property with 'Missing dependencies:' prefix", () => {
    type ErrorType = MissingDependencyError<LoggerPortType>;

    // The error should have the __message property
    type Message = ErrorType["__message"];

    // Verify message is a template literal with the prefix
    type HasPrefix = Message extends `Missing dependencies: ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error message __message property lists single missing port name", () => {
    type ErrorType = MissingDependencyError<LoggerPortType>;
    type Message = ErrorType["__message"];

    // Should be exactly "Missing dependencies: Logger"
    expectTypeOf<Message>().toEqualTypeOf<"Missing dependencies: Logger">();
  });

  it("error message __message property lists multiple missing port names as single string", () => {
    type ErrorType = MissingDependencyError<LoggerPortType | DatabasePortType>;
    type Message = ErrorType["__message"];

    // Should be a SINGLE string with all ports joined, not a union of messages
    // This allows users to see all missing ports at once instead of one random message
    type IsSingleString = Message extends string
      ? string extends Message
        ? false // It's just `string`, not a literal
        : true // It's a literal string
      : false;
    expectTypeOf<IsSingleString>().toEqualTypeOf<true>();

    // Should contain both port names
    type ContainsLogger = Message extends `${string}Logger${string}` ? true : false;
    type ContainsDatabase = Message extends `${string}Database${string}` ? true : false;
    expectTypeOf<ContainsLogger>().toEqualTypeOf<true>();
    expectTypeOf<ContainsDatabase>().toEqualTypeOf<true>();

    // Should have the correct prefix
    type HasPrefix = Message extends `Missing dependencies: ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error type has __errorBrand property for type discrimination", () => {
    type ErrorType = MissingDependencyError<LoggerPortType>;

    // The error type should have the error brand
    expectTypeOf<ErrorType["__errorBrand"]>().toEqualTypeOf<"MissingDependencyError">();
  });

  it("error type has __missing property with missing ports", () => {
    type ErrorType = MissingDependencyError<LoggerPortType | DatabasePortType>;

    // The error type should carry the missing ports
    expectTypeOf<ErrorType["__missing"]>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("error for never produces never", () => {
    type ErrorMsg = MissingDependencyError<never>;
    expectTypeOf<ErrorMsg>().toBeNever();
  });
});

// =============================================================================
// DuplicateProviderError Tests
// =============================================================================

describe("DuplicateProviderError template literal type", () => {
  it("error type has __message property with 'Duplicate provider for:' prefix", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;
    type Message = ErrorType["__message"];

    // Should extend template literal with prefix
    type HasPrefix = Message extends `Duplicate provider for: ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error message __message property includes port name", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;
    type Message = ErrorType["__message"];

    // Should be exactly "Duplicate provider for: Logger"
    expectTypeOf<Message>().toEqualTypeOf<"Duplicate provider for: Logger">();
  });

  it("error type has __errorBrand property for type discrimination", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;

    // The error type should have the error brand
    expectTypeOf<ErrorType["__errorBrand"]>().toEqualTypeOf<"DuplicateProviderError">();
  });

  it("error type has __duplicate property with duplicate port", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;

    // The error type should carry the duplicate port
    expectTypeOf<ErrorType["__duplicate"]>().toEqualTypeOf<LoggerPortType>();
  });
});

// =============================================================================
// build() Error Integration Tests
// =============================================================================

describe("build() returns error type when unsatisfied", () => {
  it("build() on satisfied graph returns valid Graph type", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should NOT be an error string
    type IsError = BuildResult extends string ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();

    // Should be a valid Graph with adapters
    type HasAdapters = BuildResult extends { adapters: readonly unknown[] } ? true : false;
    expectTypeOf<HasAdapters>().toEqualTypeOf<true>();
  });

  it("build() on unsatisfied graph returns error string", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a template literal string with "ERROR[HEX008]: Missing adapters for" prefix
    type IsTemplateLiteral = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsTemplateLiteral>().toEqualTypeOf<true>();
  });

  it("error message at build() is readable and actionable", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Message should contain "ERROR[HEX008]: Missing adapters for" prefix
    type HasPrefix = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error message shows specific missing port names", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Verify error contains both missing port names (order is implementation-dependent)
    type ContainsLogger = BuildResult extends `${string}Logger${string}` ? true : false;
    type ContainsDatabase = BuildResult extends `${string}Database${string}` ? true : false;
    type HasErrorPrefix = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<ContainsLogger>().toEqualTypeOf<true>();
    expectTypeOf<ContainsDatabase>().toEqualTypeOf<true>();
    expectTypeOf<HasErrorPrefix>().toEqualTypeOf<true>();
  });

  it("empty graph builds successfully", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Empty graph has no requirements, so should succeed
    type IsError = BuildResult extends { __errorBrand: string } ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();

    // Should be a valid Graph type
    type IsGraph = BuildResult extends Graph<never> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });

  it("build result with valid graph has __provides tracking provided ports", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should be Graph with TProvides union
    type Provided = BuildResult extends Graph<infer P> ? P : never;
    expectTypeOf<Provided>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
  });
});
