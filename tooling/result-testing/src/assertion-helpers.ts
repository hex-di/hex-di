/**
 * Type-narrowing assertion functions for Result and Option types in tests.
 *
 * @see {@link https://github.com/hex-di/hex-di | @hex-di/result}
 * @since 0.1.0
 * @packageDocumentation
 */

import type { Result, ResultAsync, Option } from "@hex-di/result";

/**
 * Formats a value for error messages. Uses JSON.stringify with String fallback.
 *
 * @internal
 */
function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Asserts that a Result is Ok and returns the value with narrowed type `T`.
 *
 * @example
 * ```ts
 * const value = expectOk(ok(42));
 * // value: number
 * ```
 *
 * @param result - The Result to assert
 * @returns The Ok value typed as `T`
 * @throws If the result is not Ok
 * @see BEH-T01-001
 * @since 0.1.0
 */
export function expectOk<T, E>(result: Result<T, E>): T {
  if (result._tag === "Ok") {
    return result.value;
  }
  throw new Error(`Expected Ok but got Err: ${formatValue(result.error)}`);
}

/**
 * Asserts that a Result is Err and returns the error with narrowed type `E`.
 *
 * @example
 * ```ts
 * const error = expectErr(err("not found"));
 * // error: string
 * ```
 *
 * @param result - The Result to assert
 * @returns The Err error typed as `E`
 * @throws If the result is not Err
 * @see BEH-T01-002
 * @since 0.1.0
 */
export function expectErr<T, E>(result: Result<T, E>): E {
  if (result._tag === "Err") {
    return result.error;
  }
  throw new Error(`Expected Err but got Ok: ${formatValue(result.value)}`);
}

/**
 * Asserts that a ResultAsync resolves to Ok and returns the value.
 *
 * @example
 * ```ts
 * const value = await expectOkAsync(ResultAsync.ok(42));
 * // value: number
 * ```
 *
 * @param resultAsync - The ResultAsync to assert
 * @returns The Ok value typed as `T`
 * @throws If the result resolves to Err
 * @see BEH-T01-003
 * @since 0.1.0
 */
export async function expectOkAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<T> {
  const result = await resultAsync;
  return expectOk(result);
}

/**
 * Asserts that a ResultAsync resolves to Err and returns the error.
 *
 * @example
 * ```ts
 * const error = await expectErrAsync(ResultAsync.err("fail"));
 * // error: string
 * ```
 *
 * @param resultAsync - The ResultAsync to assert
 * @returns The Err error typed as `E`
 * @throws If the result resolves to Ok
 * @see BEH-T01-004
 * @since 0.1.0
 */
export async function expectErrAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<E> {
  const result = await resultAsync;
  return expectErr(result);
}

/**
 * Asserts that an Option is Some and returns the value with narrowed type `T`.
 *
 * @example
 * ```ts
 * const value = expectSome(some(42));
 * // value: number
 * ```
 *
 * @param option - The Option to assert
 * @returns The Some value typed as `T`
 * @throws If the option is None
 * @see BEH-T01-005
 * @since 0.2.0
 */
export function expectSome<T>(option: Option<T>): T {
  if (option._tag === "Some") {
    return option.value;
  }
  throw new Error("Expected Some but got None");
}

/**
 * Asserts that an Option is None. Returns void.
 *
 * @example
 * ```ts
 * expectNone(none()); // passes
 * ```
 *
 * @param option - The Option to assert
 * @throws If the option is Some
 * @see BEH-T01-006
 * @since 0.2.0
 */
export function expectNone<T>(option: Option<T>): void {
  if (option._tag === "None") {
    return;
  }
  throw new Error(`Expected None but got Some: ${formatValue(option.value)}`);
}

/**
 * Asserts that a tagged error has a specific `_tag` value.
 *
 * @example
 * ```ts
 * const NotFound = createError("NotFound");
 * expectErrorTag(NotFound({ id: "1" }), "NotFound"); // passes
 * ```
 *
 * @param error - The tagged error to check
 * @param tag - The expected _tag value
 * @throws If the error's _tag does not match
 * @since 0.3.0
 */
export function expectErrorTag(error: { _tag: string }, tag: string): void {
  if (error._tag === tag) {
    return;
  }
  throw new Error(`Expected error tag "${tag}" but got "${error._tag}"`);
}

/**
 * Asserts that a tagged error has a specific `_namespace` value.
 *
 * @example
 * ```ts
 * const Http = createErrorGroup("HttpError");
 * const NotFound = Http.create("NotFound");
 * expectErrorNamespace(NotFound({ url: "/" }), "HttpError"); // passes
 * ```
 *
 * @param error - The tagged error to check (must have _namespace)
 * @param namespace - The expected _namespace value
 * @throws If the error's _namespace does not match
 * @since 0.3.0
 */
export function expectErrorNamespace(error: { _namespace: string }, namespace: string): void {
  if (error._namespace === namespace) {
    return;
  }
  throw new Error(`Expected error namespace "${namespace}" but got "${error._namespace}"`);
}
