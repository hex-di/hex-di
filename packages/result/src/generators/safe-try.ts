import type { Result, Err, ResultAsync } from "../core/types.js";
import { err } from "../core/result.js";
import { ResultAsync as ResultAsyncClass } from "../async/result-async.js";

/**
 * Uses JavaScript generators to emulate Rust's `?` operator for early error returns.
 *
 * Inside a `safeTry` block, `yield*` on a Result either extracts the Ok value (allowing
 * the generator to continue) or early-returns the Err (cleaning up the generator via
 * `gen.return()`). The generator function must return a `Result<T, E>` as its final value.
 *
 * Supports both sync generators (returning `Result`) and async generators (returning
 * `ResultAsync`). Dispatch is determined by checking `Symbol.asyncIterator` on the generator.
 *
 * @example
 * ```ts
 * import { ok, err, safeTry } from '@hex-di/result';
 *
 * const result = safeTry(function* () {
 *   const a = yield* ok(1);       // a = 1
 *   const b = yield* ok(2);       // b = 2
 *   const c = yield* err("oops"); // early return: Err("oops")
 *   // This line is never reached
 *   return ok(a + b + c);
 * });
 * // result => Err("oops")
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/07-generators.md — BEH-07-001
 */

/** Extract E from Err<never, E> or union of Err<never, E1> | Err<never, E2> */
type ExtractErrType<Y> = Y extends Err<never, infer E> ? E : never;

// Sync overload — T from return, E from both yield and return
export function safeTry<Y extends Err<never, unknown>, T, RE>(
  generator: () => Generator<Y, Result<T, RE>, unknown>
): Result<T, ExtractErrType<Y> | RE>;

// Async overload
export function safeTry<Y extends Err<never, unknown>, T, RE>(
  generator: () => AsyncGenerator<Y, Result<T, RE>, unknown>
): ResultAsync<T, ExtractErrType<Y> | RE>;

// Implementation
export function safeTry(
  generator: () =>
    | Generator<Err<never, unknown>, Result<unknown, unknown>, unknown>
    | AsyncGenerator<Err<never, unknown>, Result<unknown, unknown>, unknown>
): Result<unknown, unknown> | ResultAsync<unknown, unknown> {
  const gen = generator();

  // AsyncGenerator has Symbol.asyncIterator; sync Generator does not
  if (isAsyncGenerator(gen)) {
    return runAsync(gen);
  }

  return runSync(gen);
}

function isAsyncGenerator(
  gen:
    | Generator<Err<never, unknown>, Result<unknown, unknown>, unknown>
    | AsyncGenerator<Err<never, unknown>, Result<unknown, unknown>, unknown>
): gen is AsyncGenerator<Err<never, unknown>, Result<unknown, unknown>, unknown> {
  return Symbol.asyncIterator in gen;
}

function runSync(
  gen: Generator<Err<never, unknown>, Result<unknown, unknown>, unknown>
): Result<unknown, unknown> {
  for (;;) {
    const next = gen.next();

    if (next.done) {
      return next.value;
    }

    // The yielded value is an Err — early return
    const yieldedErr = next.value;
    // Tell the generator to clean up (run finally blocks)
    gen.return(err(yieldedErr.error));
    return err(yieldedErr.error);
  }
}

function runAsync(
  gen: AsyncGenerator<Err<never, unknown>, Result<unknown, unknown>, unknown>
): ResultAsync<unknown, unknown> {
  const promise = (async (): Promise<Result<unknown, unknown>> => {
    for (;;) {
      const next = await gen.next();

      if (next.done) {
        return next.value;
      }

      // The yielded value is an Err — early return
      const yieldedErr = next.value;
      // Tell the generator to clean up (run finally blocks)
      await gen.return(err(yieldedErr.error));
      return err(yieldedErr.error);
    }
  })();

  return ResultAsyncClass.fromSafePromise(promise).andThen(result => result);
}
