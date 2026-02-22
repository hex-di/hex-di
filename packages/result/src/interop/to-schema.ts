import type { Result } from "../core/types.js";

/**
 * Subset of the StandardSchemaV1 interface (from `@standard-schema/spec`),
 * inlined to avoid a runtime dependency.
 *
 * Represents a validation schema compatible with any library that accepts
 * Standard Schema validators.
 *
 * @since v1.0.0
 * @see spec/result/behaviors/13-interop.md — BEH-13-002
 */
export interface StandardSchemaV1<Input, Output> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "@hex-di/result";
    readonly validate: (
      value: Input,
    ) =>
      | { readonly value: Output }
      | { readonly issues: ReadonlyArray<{ readonly message: string }> };
  };
}

/**
 * Wraps a `Result`-returning validation function as a `StandardSchemaV1` schema object.
 *
 * The returned schema's `~standard.validate` method calls the provided function.
 * If the `Result` is `Ok`, returns `{ value }`. If `Err`, returns
 * `{ issues: [{ message: String(error) }] }`.
 *
 * @example
 * ```ts
 * import { ok, err, toSchema } from '@hex-di/result';
 *
 * const positiveNumber = toSchema((input: unknown) => {
 *   if (typeof input !== "number") return err("Expected number");
 *   if (input <= 0) return err("Expected positive number");
 *   return ok(input);
 * });
 *
 * // positiveNumber implements StandardSchemaV1<unknown, number>
 * positiveNumber["~standard"].validate(5);  // { value: 5 }
 * positiveNumber["~standard"].validate(-1); // { issues: [{ message: "Expected positive number" }] }
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/13-interop.md — BEH-13-002
 */
export function toSchema<T, E>(
  validate: (input: unknown) => Result<T, E>,
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "@hex-di/result",
      validate(value: unknown) {
        const result = validate(value);
        if (result.isOk()) {
          return { value: result.value };
        }
        return { issues: [{ message: String(result.error) }] };
      },
    },
  };
}
