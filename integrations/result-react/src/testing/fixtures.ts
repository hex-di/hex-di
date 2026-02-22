import { ok, err, ResultAsync, type Ok, type Err } from "@hex-di/result";

/**
 * Creates a test fixture factory for `Result` values. Merges `defaults` with
 * optional overrides, supporting both sync and async variants with optional delays.
 *
 * @typeParam T - The fixture data shape (must be a record)
 * @param defaults - Default values for the fixture
 * @returns An object with `ok`, `err`, `okAsync`, and `errAsync` factory methods
 *
 * @example
 * ```ts
 * import { createResultFixture } from "@hex-di/result-react/testing";
 *
 * const userFixture = createResultFixture({ name: "Alice", age: 30 });
 *
 * const okResult = userFixture.ok();           // Ok<{ name: "Alice", age: 30 }>
 * const custom = userFixture.ok({ age: 25 });  // Ok<{ name: "Alice", age: 25 }>
 * const errResult = userFixture.err("not found");
 * const delayed = userFixture.okAsync({}, 100); // resolves after 100ms
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/06-testing.md | BEH-R06-003}
 */
export function createResultFixture<T extends Record<string, unknown>>(
  defaults: T,
): {
  ok: (overrides?: Partial<T>) => Ok<T, never>;
  err: <E>(error: E) => Err<never, E>;
  okAsync: (overrides?: Partial<T>, delay?: number) => ResultAsync<T, never>;
  errAsync: <E>(error: E, delay?: number) => ResultAsync<never, E>;
} {
  return {
    ok: (overrides?: Partial<T>) => ok({ ...defaults, ...overrides } as T),
    err: <E>(error: E) => err(error),
    okAsync: (overrides?: Partial<T>, delay?: number) => {
      const value = { ...defaults, ...overrides } as T;
      if (delay !== undefined && delay > 0) {
        return ResultAsync.fromSafePromise(
          new Promise<T>((resolve) => setTimeout(() => resolve(value), delay)),
        );
      }
      return ResultAsync.ok(value);
    },
    errAsync: <E>(error: E, delay?: number) => {
      if (delay !== undefined && delay > 0) {
        return ResultAsync.fromPromise(
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(error), delay),
          ),
          () => error,
        );
      }
      return ResultAsync.err(error);
    },
  };
}
