/**
 * Type-level regression test: Chained dependency satisfaction.
 *
 * ## Bug Description
 *
 * When adapters form a transitive dependency chain (A → B → C → D),
 * `build()` incorrectly reports HEX008 "Missing adapters" for ports
 * that ARE provided but whose adapters themselves have requirements.
 *
 * Example chain:
 *   Config (no deps) → Database (requires Config, Logger)
 *     → UserRepo (requires Database, Logger) → AuthService (requires UserRepo, Logger)
 *
 * ## Root Cause
 *
 * `ProvideResultSuccess` returned the full `GraphBuilder` class type,
 * creating a circular type reference:
 *
 *   GraphBuilder.provide() → ProvideResult → ProvideResultSuccess → GraphBuilder
 *
 * With deep chains (5+ `.provide()` calls), TypeScript's type evaluator
 * could not fully resolve the accumulated `TProvides`/`TRequires` unions,
 * causing `Exclude<TRequires, TProvides>` to fail at `build()` time.
 *
 * ## Fix
 *
 * `ProvideResultSuccess` now returns `GraphBuilderSignature` (lightweight
 * interface with phantom types only). The `provide()` method converts
 * back to `GraphBuilder` via `ToBuilder<T>` at the method boundary,
 * breaking the circular type reference.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createAdapter, port } from "@hex-di/core";
import { GraphBuilder, Graph } from "../src/index.js";

// =============================================================================
// Domain Interfaces
// =============================================================================

interface Config {
  readonly dbUrl: string;
}
interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): string[];
}
interface UserRepo {
  findById(id: string): string;
}
interface AuthService {
  authenticate(token: string): boolean;
}

// =============================================================================
// Ports
// =============================================================================

const ConfigPort = port<Config>()({ name: "Config" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserRepoPort = port<UserRepo>()({ name: "UserRepo" });
const AuthServicePort = port<AuthService>()({ name: "AuthService" });

// =============================================================================
// Adapters — transitive chain: Auth → UserRepo → Database → Config/Logger
// =============================================================================

const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ dbUrl: "postgres://localhost/app" }),
  lifetime: "singleton",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: (_msg: string) => {} }),
  lifetime: "singleton",
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort, LoggerPort],
  factory: ({ Config, Logger }) => {
    Logger.log(`Connecting to ${Config.dbUrl}`);
    return { query: (sql: string) => [`result for: ${sql}`] };
  },
  lifetime: "singleton",
});

const userRepoAdapter = createAdapter({
  provides: UserRepoPort,
  requires: [DatabasePort, LoggerPort],
  factory: ({ Database, Logger }) => ({
    findById: (id: string) => {
      Logger.log(`Finding user ${id}`);
      return Database.query(`SELECT * FROM users WHERE id = '${id}'`)[0];
    },
  }),
  lifetime: "singleton",
});

const authServiceAdapter = createAdapter({
  provides: AuthServicePort,
  requires: [UserRepoPort, LoggerPort],
  factory: ({ UserRepo, Logger }) => ({
    authenticate: (token: string) => {
      Logger.log(`Authenticating token: ${token}`);
      const user = UserRepo.findById("user-1");
      return user !== undefined;
    },
  }),
  lifetime: "singleton",
});

// =============================================================================
// Regression: Full chain builds without false HEX008
// =============================================================================

describe("chained dependency satisfaction (regression)", () => {
  it("3-level chain: build() returns Graph, not error string", () => {
    const graph = GraphBuilder.create()
      .provide(configAdapter)
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(userRepoAdapter)
      .provide(authServiceAdapter)
      .build();

    // Must be a valid Graph — the bug caused this to be an error string
    type BuildResult = typeof graph;
    type IsGraph = BuildResult extends Graph<unknown> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();

    // Must NOT be an error string
    type IsError = BuildResult extends string ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("reverse provide order also builds successfully", () => {
    const graph = GraphBuilder.create()
      .provide(authServiceAdapter)
      .provide(userRepoAdapter)
      .provide(databaseAdapter)
      .provide(loggerAdapter)
      .provide(configAdapter)
      .build();

    type BuildResult = typeof graph;
    type IsError = BuildResult extends string ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("2-level chain: adapter-with-deps depending on adapter-with-deps", () => {
    // Database requires [Config, Logger], UserRepo requires [Database, Logger]
    const graph = GraphBuilder.create()
      .provide(configAdapter)
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(userRepoAdapter)
      .build();

    type BuildResult = typeof graph;
    type IsError = BuildResult extends string ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("built graph tracks all 5 port types in __provides", () => {
    const graph = GraphBuilder.create()
      .provide(configAdapter)
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(userRepoAdapter)
      .provide(authServiceAdapter)
      .build();

    type ProvidesType = typeof graph extends { __provides: infer P } ? P : never;

    type HasConfig = typeof ConfigPort extends ProvidesType ? true : false;
    type HasLogger = typeof LoggerPort extends ProvidesType ? true : false;
    type HasDatabase = typeof DatabasePort extends ProvidesType ? true : false;
    type HasUserRepo = typeof UserRepoPort extends ProvidesType ? true : false;
    type HasAuthService = typeof AuthServicePort extends ProvidesType ? true : false;

    expectTypeOf<HasConfig>().toEqualTypeOf<true>();
    expectTypeOf<HasLogger>().toEqualTypeOf<true>();
    expectTypeOf<HasDatabase>().toEqualTypeOf<true>();
    expectTypeOf<HasUserRepo>().toEqualTypeOf<true>();
    expectTypeOf<HasAuthService>().toEqualTypeOf<true>();
  });

  it("partial chain still detects genuinely missing deps", () => {
    // Provide auth + userRepo but NOT database, config, logger → should error
    const builder = GraphBuilder.create().provide(authServiceAdapter).provide(userRepoAdapter);

    type BuildResult = ReturnType<typeof builder.build>;

    // Should be an error mentioning missing ports
    type IsError = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();

    // Should mention Database (required by userRepoAdapter but not provided)
    type MentionsDatabase = BuildResult extends `${string}Database${string}` ? true : false;
    expectTypeOf<MentionsDatabase>().toEqualTypeOf<true>();

    // Should mention Logger (required by both but not provided)
    type MentionsLogger = BuildResult extends `${string}Logger${string}` ? true : false;
    expectTypeOf<MentionsLogger>().toEqualTypeOf<true>();
  });

  it("intermediate chain completion still detects missing leaf deps", () => {
    // Provide everything except Config — Database requires it
    const builder = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(userRepoAdapter)
      .provide(authServiceAdapter);

    type BuildResult = ReturnType<typeof builder.build>;

    type IsError = BuildResult extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();

    type MentionsConfig = BuildResult extends `${string}Config${string}` ? true : false;
    expectTypeOf<MentionsConfig>().toEqualTypeOf<true>();
  });
});
