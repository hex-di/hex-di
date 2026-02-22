/**
 * A specialized `Error` subclass thrown by all unsafe extraction operations
 * (`unwrap`, `unwrapErr`, `expect`, `expectErr`).
 *
 * Carries a `context` object with the variant tag and contained value,
 * enabling programmatic inspection of what was inside the `Result` when
 * the unwrap failed.
 *
 * @example
 * ```ts
 * import { err } from '@hex-di/result';
 * import { unwrap, UnwrapError } from '@hex-di/result/unsafe';
 *
 * try {
 *   unwrap(err("something went wrong"));
 * } catch (e) {
 *   if (e instanceof UnwrapError) {
 *     console.log(e.message);       // "Called unwrap on Err"
 *     console.log(e.context._tag);  // "Err"
 *     console.log(e.context.value); // "something went wrong"
 *   }
 * }
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/11-unsafe.md — BEH-11-001
 */
export class UnwrapError extends Error {
  readonly context: {
    readonly _tag: "Ok" | "Err";
    readonly value: unknown;
  };

  constructor(
    message: string,
    context: { _tag: "Ok" | "Err"; value: unknown }
  ) {
    super(message);
    this.name = "UnwrapError";
    this.context = context;
  }
}
