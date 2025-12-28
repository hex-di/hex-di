/**
 * Rust-like Algebraic Data Types for type-safe optional values and error handling.
 *
 * Provides Option<T> and Result<T, E> ADTs with exhaustive pattern matching support.
 * These replace nullable types (T | null) and thrown errors with discriminated unions
 * that enable compile-time exhaustiveness checking.
 *
 * @example Option usage
 * ```typescript
 * function findUser(id: string): Option<User> {
 *   const user = users.get(id);
 *   return user !== undefined ? Some(user) : None;
 * }
 *
 * const result = findUser("123");
 * if (isSome(result)) {
 *   console.log(result.value.name);
 * }
 * ```
 *
 * @example Result usage
 * ```typescript
 * function parseJson<T>(text: string): Result<T, ParseError> {
 *   try {
 *     return Ok(JSON.parse(text));
 *   } catch (e) {
 *     return Err({ message: "Invalid JSON" });
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Option<T> - Represents an optional value
// =============================================================================

/**
 * The Some variant of Option, containing a value.
 */
export interface Some<T> {
  readonly _tag: "Some";
  readonly value: T;
}

/**
 * The None variant of Option, representing absence of value.
 */
export interface None {
  readonly _tag: "None";
}

/**
 * Rust-like Option ADT for nullable values.
 *
 * Replaces `T | null` with exhaustive pattern matching.
 * Use isSome() and isNone() type guards for narrowing.
 */
export type Option<T> = Some<T> | None;

/**
 * Constructs a Some variant wrapping a value.
 *
 * @param value - The value to wrap
 * @returns Option containing the value
 */
export const Some = <T>(value: T): Option<T> => ({ _tag: "Some", value });

/**
 * The None variant singleton representing absence of value.
 */
export const None: None = { _tag: "None" };

/**
 * Type guard for the Some variant.
 *
 * @param opt - The option to check
 * @returns true if opt is Some, narrowing the type
 */
export const isSome = <T>(opt: Option<T>): opt is Some<T> => opt._tag === "Some";

/**
 * Type guard for the None variant.
 *
 * @param opt - The option to check
 * @returns true if opt is None, narrowing the type
 */
export const isNone = <T>(opt: Option<T>): opt is None => opt._tag === "None";

/**
 * Unwraps an Option with a default value (like Rust's unwrap_or).
 *
 * @param opt - The option to unwrap
 * @param defaultValue - Value to return if None
 * @returns The contained value or the default
 */
export const unwrapOr = <T>(opt: Option<T>, defaultValue: T): T =>
  isSome(opt) ? opt.value : defaultValue;

/**
 * Maps a function over Option (like Rust's map).
 *
 * @param opt - The option to map over
 * @param fn - Function to apply to the value if Some
 * @returns Option containing the mapped value, or None
 */
export const mapOption = <T, U>(opt: Option<T>, fn: (value: T) => U): Option<U> =>
  isSome(opt) ? Some(fn(opt.value)) : None;

/**
 * Flat-maps a function over Option (like Rust's and_then).
 *
 * @param opt - The option to flat-map over
 * @param fn - Function returning Option to apply if Some
 * @returns The result of fn, or None
 */
export const flatMapOption = <T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
  isSome(opt) ? fn(opt.value) : None;

/**
 * Converts Option to array (empty for None, single-element for Some).
 *
 * @param opt - The option to convert
 * @returns Array with zero or one elements
 */
export const optionToArray = <T>(opt: Option<T>): readonly T[] => (isSome(opt) ? [opt.value] : []);

/**
 * Creates Option from a nullable value.
 *
 * @param value - A value that may be null or undefined
 * @returns Some if value is defined, None otherwise
 */
export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
  value !== null && value !== undefined ? Some(value) : None;

// =============================================================================
// Result<T, E> - Represents success or error
// =============================================================================

/**
 * The Ok variant of Result, containing a success value.
 */
export interface Ok<T> {
  readonly _tag: "Ok";
  readonly value: T;
}

/**
 * The Err variant of Result, containing an error value.
 */
export interface Err<E> {
  readonly _tag: "Err";
  readonly error: E;
}

/**
 * Rust-like Result ADT for error handling.
 *
 * Replaces thrown errors with exhaustive pattern matching.
 * Use isOk() and isErr() type guards for narrowing.
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Constructs an Ok variant wrapping a success value.
 *
 * @param value - The success value
 * @returns Result containing the success value
 */
export const Ok = <T>(value: T): Result<T, never> => ({ _tag: "Ok", value });

/**
 * Constructs an Err variant wrapping an error value.
 *
 * @param error - The error value
 * @returns Result containing the error
 */
export const Err = <E>(error: E): Result<never, E> => ({ _tag: "Err", error });

/**
 * Type guard for the Ok variant.
 *
 * @param result - The result to check
 * @returns true if result is Ok, narrowing the type
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result._tag === "Ok";

/**
 * Type guard for the Err variant.
 *
 * @param result - The result to check
 * @returns true if result is Err, narrowing the type
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => result._tag === "Err";

/**
 * Unwraps a Result with a default value for errors.
 *
 * @param result - The result to unwrap
 * @param defaultValue - Value to return if Err
 * @returns The success value or the default
 */
export const unwrapOrDefault = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  isOk(result) ? result.value : defaultValue;

/**
 * Maps a function over Result's success value.
 *
 * @param result - The result to map over
 * @param fn - Function to apply to the success value
 * @returns Result with mapped success value, or original error
 */
export const mapResult = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  isOk(result) ? Ok(fn(result.value)) : result;

/**
 * Maps a function over Result's error value.
 *
 * @param result - The result to map over
 * @param fn - Function to apply to the error value
 * @returns Result with original success, or mapped error
 */
export const mapError = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  isErr(result) ? Err(fn(result.error)) : result;

/**
 * Flat-maps a function over Result (like Rust's and_then).
 *
 * @param result - The result to flat-map over
 * @param fn - Function returning Result to apply if Ok
 * @returns The result of fn, or original error
 */
export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => (isOk(result) ? fn(result.value) : result);

/**
 * Converts Result to Option, discarding error information.
 *
 * @param result - The result to convert
 * @returns Some if Ok, None if Err
 */
export const resultToOption = <T, E>(result: Result<T, E>): Option<T> =>
  isOk(result) ? Some(result.value) : None;

/**
 * Wraps a throwing function to return Result.
 *
 * @param fn - A function that may throw
 * @returns Result with success value or caught error
 */
export const tryCatch = <T, E = Error>(fn: () => T): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(e as E);
  }
};
