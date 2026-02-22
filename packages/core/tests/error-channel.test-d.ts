/**
 * Type-level tests for Result-based error channel inference.
 *
 * These tests verify compile-time behavior of the error channel feature,
 * including:
 * - InferAdapterError extraction from infallible and fallible adapters
 * - adapterOrDie() and adapterOrElse() error channel erasure
 * - InferManyErrors on mixed adapter arrays
 * - Class-based adapters always have TError = never
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port, createAdapter, adapterOrDie, adapterOrElse } from "../src/index.js";
import type {
  InferAdapterError,
  InferManyErrors,
  FactoryResult,
  IsAsyncFactory,
  InferFactoryError,
} from "../src/index.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Config {
  host: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const ConfigPort = port<Config>()({ name: "Config" });

type MyError = { code: string; message: string };

// =============================================================================
// Infallible Factory (plain T return) -> TError = never
// =============================================================================

describe("infallible factory returns TError = never", () => {
  it("factory returning plain T has TError = never", () => {
    const InfallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: (): Logger => ({ log: () => {} }),
    });

    type ErrorType = InferAdapterError<typeof InfallibleAdapter>;
    expectTypeOf<ErrorType>().toBeNever();
  });

  it("factory returning inferred T has TError = never", () => {
    const InfallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    type ErrorType = InferAdapterError<typeof InfallibleAdapter>;
    expectTypeOf<ErrorType>().toBeNever();
  });
});

// =============================================================================
// Fallible Factory (FactoryResult return) -> TError = E
// =============================================================================

describe("fallible factory returns TError = E", () => {
  it("factory returning FactoryResult<T, E> has TError = E", () => {
    const FallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });

    type ErrorType = InferAdapterError<typeof FallibleAdapter>;
    expectTypeOf<ErrorType>().toEqualTypeOf<MyError>();
  });

  it("factory returning FactoryResult with string error has TError = string", () => {
    const FallibleAdapter = createAdapter({
      provides: ConfigPort,
      factory: (): FactoryResult<Config, string> => ({
        _tag: "Ok" as const,
        value: { host: "localhost" },
      }),
    });

    type ErrorType = InferAdapterError<typeof FallibleAdapter>;
    expectTypeOf<ErrorType>().toEqualTypeOf<string>();
  });
});

// =============================================================================
// adapterOrDie() -> TError = never
// =============================================================================

describe("adapterOrDie erases error channel", () => {
  it("adapterOrDie on fallible adapter produces TError = never", () => {
    const FallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });

    // Verify the original is fallible
    type OriginalError = InferAdapterError<typeof FallibleAdapter>;
    expectTypeOf<OriginalError>().toEqualTypeOf<MyError>();

    // adapterOrDie should erase TError to never
    const SafeAdapter = adapterOrDie(FallibleAdapter);
    type SafeError = InferAdapterError<typeof SafeAdapter>;
    expectTypeOf<SafeError>().toBeNever();
  });

  it("adapterOrDie on infallible adapter also has TError = never", () => {
    const InfallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const SafeAdapter = adapterOrDie(InfallibleAdapter);
    type SafeError = InferAdapterError<typeof SafeAdapter>;
    expectTypeOf<SafeError>().toBeNever();
  });
});

// =============================================================================
// adapterOrElse() -> TError = never
// =============================================================================

describe("adapterOrElse erases error channel", () => {
  it("adapterOrElse on fallible adapter produces TError = never", () => {
    const FallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });

    const FallbackAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // Verify the original is fallible
    type OriginalError = InferAdapterError<typeof FallibleAdapter>;
    expectTypeOf<OriginalError>().toEqualTypeOf<MyError>();

    // adapterOrElse should erase TError to never
    const SafeAdapter = adapterOrElse(FallibleAdapter, FallbackAdapter);
    type SafeError = InferAdapterError<typeof SafeAdapter>;
    expectTypeOf<SafeError>().toBeNever();
  });

  it("adapterOrElse on infallible adapter also has TError = never", () => {
    const InfallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const FallbackAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const SafeAdapter = adapterOrElse(InfallibleAdapter, FallbackAdapter);
    type SafeError = InferAdapterError<typeof SafeAdapter>;
    expectTypeOf<SafeError>().toBeNever();
  });

  it("adapterOrElse merges requires from both adapters", () => {
    const FallibleAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: (_deps): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });

    const FallbackAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const SafeAdapter = adapterOrElse(FallibleAdapter, FallbackAdapter);

    // TRequires should be union of both adapters' requires
    type Requires = typeof SafeAdapter extends { requires: infer R } ? R : never;
    expectTypeOf<Requires>().toEqualTypeOf<readonly [typeof ConfigPort]>();
  });

  it("adapterOrElse preserves primary adapter lifetime", () => {
    const FallibleAdapter = createAdapter({
      provides: LoggerPort,
      lifetime: "scoped",
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });

    const FallbackAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const SafeAdapter = adapterOrElse(FallibleAdapter, FallbackAdapter);
    expectTypeOf(SafeAdapter.lifetime).toEqualTypeOf<"scoped">();
  });
});

// =============================================================================
// InferManyErrors on mixed arrays
// =============================================================================

describe("InferManyErrors on mixed adapter arrays", () => {
  it("all infallible adapters -> InferManyErrors = never", () => {
    const AdapterA = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: ConfigPort,
      factory: () => ({ host: "localhost" }),
    });

    type Errors = InferManyErrors<readonly [typeof AdapterA, typeof AdapterB]>;
    expectTypeOf<Errors>().toBeNever();
  });

  it("mixed infallible and fallible -> InferManyErrors = union of error types", () => {
    const InfallibleAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    type DbError = { dbCode: number };

    const FallibleAdapter = createAdapter({
      provides: ConfigPort,
      factory: (): FactoryResult<Config, DbError> => ({
        _tag: "Ok" as const,
        value: { host: "localhost" },
      }),
    });

    type Errors = InferManyErrors<readonly [typeof InfallibleAdapter, typeof FallibleAdapter]>;

    // Should be DbError (never from infallible is absorbed by the union)
    expectTypeOf<Errors>().toEqualTypeOf<DbError>();
  });

  it("multiple fallible adapters -> InferManyErrors = union of all error types", () => {
    type ErrorA = { kind: "a" };
    type ErrorB = { kind: "b" };

    const FallibleA = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, ErrorA> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });

    const FallibleB = createAdapter({
      provides: ConfigPort,
      factory: (): FactoryResult<Config, ErrorB> => ({
        _tag: "Ok" as const,
        value: { host: "localhost" },
      }),
    });

    type Errors = InferManyErrors<readonly [typeof FallibleA, typeof FallibleB]>;
    expectTypeOf<Errors>().toEqualTypeOf<ErrorA | ErrorB>();
  });
});

// =============================================================================
// Class-based adapters always have TError = never
// =============================================================================

describe("class-based adapters always have TError = never", () => {
  it("class adapter with no dependencies has TError = never", () => {
    class ConsoleLogger implements Logger {
      log(_msg: string): void {
        // no-op
      }
    }

    const ClassAdapter = createAdapter({
      provides: LoggerPort,
      class: ConsoleLogger,
    });

    type ErrorType = InferAdapterError<typeof ClassAdapter>;
    expectTypeOf<ErrorType>().toBeNever();
  });

  it("class adapter with dependencies has TError = never", () => {
    class ConfigImpl implements Config {
      host = "localhost";
    }

    class AppLogger implements Logger {
      constructor(private _config: Config) {}
      log(_msg: string): void {
        // no-op
      }
    }

    const ClassAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      class: AppLogger,
    });

    type ErrorType = InferAdapterError<typeof ClassAdapter>;
    expectTypeOf<ErrorType>().toBeNever();
  });
});

// =============================================================================
// IsAsyncFactory for PromiseLike
// =============================================================================

describe("IsAsyncFactory detects PromiseLike", () => {
  it("PromiseLike return is detected as async", () => {
    type Factory = () => PromiseLike<Logger>;
    expectTypeOf<IsAsyncFactory<Factory>>().toEqualTypeOf<true>();
  });

  it("plain return is detected as sync", () => {
    type Factory = () => Logger;
    expectTypeOf<IsAsyncFactory<Factory>>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// InferFactoryError for PromiseLike+Result
// =============================================================================

describe("InferFactoryError unwraps PromiseLike", () => {
  it("PromiseLike<FactoryResult<T, E>> infers E", () => {
    type Return = PromiseLike<FactoryResult<Logger, MyError>>;
    expectTypeOf<InferFactoryError<Return>>().toEqualTypeOf<MyError>();
  });

  it("PromiseLike<T> without Result infers never", () => {
    type Return = PromiseLike<Logger>;
    expectTypeOf<InferFactoryError<Return>>().toBeNever();
  });
});

// =============================================================================
// adapterOrElse async propagation at the type level
// =============================================================================

describe("adapterOrElse factoryKind async propagation", () => {
  it("sync primary + ResultAsync fallback → factoryKind async", () => {
    const syncPrimary = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });
    const asyncFallback = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: () => {} }),
    });

    const result = adapterOrElse(syncPrimary, asyncFallback);
    expectTypeOf(result.factoryKind).toEqualTypeOf<"async">();
  });

  it("PromiseLike primary + sync fallback → factoryKind async", () => {
    const asyncPrimary = createAdapter({
      provides: LoggerPort,
      factory: (): PromiseLike<FactoryResult<Logger, MyError>> =>
        Promise.resolve({
          _tag: "Ok" as const,
          value: { log: () => {} },
        }),
    });
    const syncFallback = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const result = adapterOrElse(asyncPrimary, syncFallback);
    expectTypeOf(result.factoryKind).toEqualTypeOf<"async">();
  });

  it("PromiseLike primary + ResultAsync fallback → factoryKind async", () => {
    const asyncPrimary = createAdapter({
      provides: LoggerPort,
      factory: (): PromiseLike<FactoryResult<Logger, MyError>> =>
        Promise.resolve({
          _tag: "Ok" as const,
          value: { log: () => {} },
        }),
    });
    const asyncFallback = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: () => {} }),
    });

    const result = adapterOrElse(asyncPrimary, asyncFallback);
    expectTypeOf(result.factoryKind).toEqualTypeOf<"async">();
  });

  it("sync primary + sync fallback → factoryKind sync", () => {
    const syncPrimary = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });
    const syncFallback = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const result = adapterOrElse(syncPrimary, syncFallback);
    expectTypeOf(result.factoryKind).toEqualTypeOf<"sync">();
  });
});

// =============================================================================
// adapterOrElse merges requires and preserves clonable
// =============================================================================

describe("adapterOrElse requires merge and clonable", () => {
  it("merges requires from both adapters with distinct ports", () => {
    interface Db {
      query(): void;
    }
    const DbPort = port<Db>()({ name: "Db" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: (_deps): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      requires: [DbPort],
      factory: _deps => ({ log: () => {} }),
    });

    const result = adapterOrElse(primary, fb);
    type Requires = typeof result extends { requires: infer R } ? R : never;
    expectTypeOf<Requires>().toEqualTypeOf<readonly [typeof ConfigPort, typeof DbPort]>();
  });

  it("preserves clonable from primary", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      clonable: true,
      factory: (): FactoryResult<Logger, MyError> => ({
        _tag: "Ok" as const,
        value: { log: () => {} },
      }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const result = adapterOrElse(primary, fb);
    expectTypeOf(result.clonable).toEqualTypeOf<true>();
  });
});
