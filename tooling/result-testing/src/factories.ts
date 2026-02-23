/**
 * Test data builders for creating Result and Option fixtures.
 *
 * @see {@link https://github.com/hex-di/hex-di | @hex-di/result}
 * @since 0.2.0
 * @packageDocumentation
 */

import type { Ok, Err, Result, ResultAsync as ResultAsyncType, Some, None } from "@hex-di/result";
import { ok, err, ResultAsync, some, none } from "@hex-di/result";

/**
 * Creates a fixture factory for Result and ResultAsync values with a default Ok value.
 *
 * @example
 * ```ts
 * const fixture = createResultFixture({ id: 1, name: "Alice" });
 * fixture.ok();           // Ok({ id: 1, name: "Alice" })
 * fixture.ok({ id: 2 });  // Ok({ id: 2 })
 * fixture.err("fail");    // Err("fail")
 * ```
 *
 * @param defaults - The default Ok value used when no override is provided
 * @returns Factory object with ok, err, okAsync, errAsync methods
 * @see BEH-T03-001
 * @since 0.2.0
 */
export function createResultFixture<T>(defaults: T): {
  ok: (value?: T) => Ok<T, never>;
  err: <E>(error: E) => Err<never, E>;
  okAsync: (value?: T) => ResultAsyncType<T, never>;
  errAsync: <E>(error: E) => ResultAsyncType<T, E>;
} {
  return {
    ok: (value?: T) => ok(value !== undefined ? value : defaults),
    err: <E>(error: E) => err(error),
    okAsync: (value?: T) =>
      ResultAsync.fromSafePromise(Promise.resolve(value !== undefined ? value : defaults)),
    errAsync: <E>(error: E) => ResultAsync.fromPromise(Promise.reject(error), () => error),
  };
}

/**
 * Creates a fixture factory for Option values with a default Some value.
 *
 * @example
 * ```ts
 * const fixture = createOptionFixture({ timeout: 3000 });
 * fixture.some();              // Some({ timeout: 3000 })
 * fixture.some({ timeout: 0 }); // Some({ timeout: 0 })
 * fixture.none();              // None
 * ```
 *
 * @param defaults - The default Some value used when no override is provided
 * @returns Factory object with some and none methods
 * @see BEH-T03-002
 * @since 0.2.0
 */
export function createOptionFixture<T>(defaults: T): {
  some: (value?: T) => Some<T>;
  none: () => None;
} {
  return {
    some: (value?: T) => some(value !== undefined ? value : defaults),
    none: () => none(),
  };
}

/**
 * Creates a deferred ResultAsync whose resolution is controlled by the caller.
 *
 * @example
 * ```ts
 * const { resultAsync, resolve, reject } = mockResultAsync<string, Error>();
 * // resultAsync is pending...
 * resolve("hello"); // resolves to Ok("hello")
 * ```
 *
 * @returns Object with resultAsync, resolve, and reject
 * @see BEH-T03-003
 * @since 0.2.0
 */
export function mockResultAsync<T, E>(): {
  resultAsync: ResultAsyncType<T, E>;
  resolve: (value: T) => void;
  reject: (error: E) => void;
} {
  let resolvePromise!: (result: Result<T, E>) => void;
  const promise = new Promise<Result<T, E>>(res => {
    resolvePromise = res;
  });

  return {
    resultAsync: ResultAsync.fromResult(promise),
    resolve: (value: T) => resolvePromise(ok(value)),
    reject: (error: E) => resolvePromise(err(error)),
  };
}
