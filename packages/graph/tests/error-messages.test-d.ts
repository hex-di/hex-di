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
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  ExtractPortNames,
  MissingDependencyError,
  BuildErrorMessage,
  DuplicateProviderError,
  Graph,
} from "../src/index.js";

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

interface ConfigService {
  get(key: string): string;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", ConfigService>("Config");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;
type ConfigPortType = typeof ConfigPort;

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

  it("error message __message property lists multiple missing port names", () => {
    type ErrorType = MissingDependencyError<LoggerPortType | DatabasePortType>;
    type Message = ErrorType["__message"];

    // Should be a union of messages for each missing port
    expectTypeOf<Message>().toEqualTypeOf<
      "Missing dependencies: Logger" | "Missing dependencies: Database"
    >();
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
// BuildErrorMessage Tests
// =============================================================================

describe("BuildErrorMessage template literal type", () => {
  it("produces readable template literal for single missing port", () => {
    type ErrorMsg = BuildErrorMessage<LoggerPortType>;
    expectTypeOf<ErrorMsg>().toEqualTypeOf<"Cannot build: Missing adapters for Logger">();
  });

  it("produces union of template literals for multiple missing ports", () => {
    type ErrorMsg = BuildErrorMessage<LoggerPortType | DatabasePortType>;
    expectTypeOf<ErrorMsg>().toEqualTypeOf<
      "Cannot build: Missing adapters for Logger" | "Cannot build: Missing adapters for Database"
    >();
  });

  it("error message has 'Cannot build: Missing adapters for' prefix", () => {
    type ErrorMsg = BuildErrorMessage<ConfigPortType>;
    type HasPrefix = ErrorMsg extends `Cannot build: Missing adapters for ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("returns never for never input", () => {
    type ErrorMsg = BuildErrorMessage<never>;
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

    // Should be a template literal string with "ERROR: Missing adapters for" prefix
    type IsTemplateLiteral = BuildResult extends `ERROR: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsTemplateLiteral>().toEqualTypeOf<true>();
  });

  it("error message at build() is readable and actionable", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Message should contain "ERROR: Missing adapters for" prefix
    type HasPrefix = BuildResult extends `ERROR: Missing adapters for ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error message shows specific missing port names", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Message should be a union of template literals for each missing port
    expectTypeOf<BuildResult>().toEqualTypeOf<
      | "ERROR: Missing adapters for Logger. Call .provide() first."
      | "ERROR: Missing adapters for Database. Call .provide() first."
    >();
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
