/**
 * Operation Completeness Verification Types.
 *
 * Provides compile-time verification that adapter factory return types
 * implement all operations declared by the port interface they provide.
 *
 * Inspired by ML module system signature matching: a module (adapter) must
 * provide all operations declared in its signature (port).
 *
 * @see {@link VerifyOperationCompleteness} - Main verification type
 * @see {@link MissingOperationsError} - Error type for missing operations
 *
 * @packageDocumentation
 */

import type { Port, InferService, InferPortName } from "../ports/types.js";

// =============================================================================
// Error Type
// =============================================================================

/**
 * Branded error type for missing operations in an adapter factory.
 *
 * Appears in IDE tooltips when an adapter's factory does not implement
 * all methods declared by the port interface.
 *
 * @typeParam TPortName - The name of the port with missing operations
 * @typeParam TMissing - Union of missing operation keys
 *
 * @example IDE tooltip
 * ```
 * {
 *   readonly __inferenceError: true;
 *   readonly __source: "VerifyOperationCompleteness";
 *   readonly __message: "Adapter factory is missing operations required by port 'UserService'";
 *   readonly __portName: "UserService";
 *   readonly __missingOperations: "createUser" | "deleteUser";
 * }
 * ```
 */
export type MissingOperationsError<TPortName extends string, TMissing> = {
  readonly __inferenceError: true;
  readonly __source: "VerifyOperationCompleteness";
  readonly __message: `Adapter factory is missing operations required by port '${TPortName}'`;
  readonly __portName: TPortName;
  readonly __missingOperations: TMissing;
};

// =============================================================================
// Verification Type
// =============================================================================

/**
 * Verifies that a factory return type implements all operations of the port service interface.
 *
 * ## Algorithm
 *
 * 1. Extract the port's service interface `TService` from `TProvides`
 * 2. Compute `Exclude<keyof TService, keyof TFactoryReturn>` -- the missing operations
 * 3. If the exclusion is `never`, all operations are present -- returns `true`
 * 4. Otherwise, returns `MissingOperationsError` listing the missing operations
 *
 * ## Behavior Table
 *
 * | Port Interface | Factory Return | Result |
 * |---------------|---------------|--------|
 * | `{ get(): T; set(v: T): void }` | `{ get(): T; set(v: T): void }` | `true` |
 * | `{ get(): T; set(v: T): void }` | `{ get(): T }` | `MissingOperationsError<..., "set">` |
 * | `{ get(): T; set(v: T): void }` | `{ get(): T; set(v: T): void; extra(): void }` | `true` (superset allowed) |
 * | `{ get(): T }` | `{}` | `MissingOperationsError<..., "get">` |
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TFactoryReturn - The return type of the factory function (unwrapped from Result/Promise)
 */
/**
 * Extracts only the required keys from a type (excludes optional properties).
 */
type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type VerifyOperationCompleteness<TProvides extends Port<string, unknown>, TFactoryReturn> = [
  TFactoryReturn,
] extends [never]
  ? true // Factory always errors (returns never) -- no instance to check
  : [RequiredKeys<InferService<TProvides>>] extends [never]
    ? true // Port with no required keys (e.g., unknown service) -- always passes
    : Exclude<RequiredKeys<InferService<TProvides>>, keyof TFactoryReturn> extends never
      ? true // All required operations present
      : MissingOperationsError<
          InferPortName<TProvides> & string,
          Exclude<RequiredKeys<InferService<TProvides>>, keyof TFactoryReturn>
        >;

/**
 * Checks if a `VerifyOperationCompleteness` result is an error.
 *
 * @typeParam T - The result of `VerifyOperationCompleteness`
 * @returns `true` if T is a `MissingOperationsError`, `false` otherwise
 */
export type IsMissingOperationsError<T> = T extends {
  readonly __inferenceError: true;
  readonly __source: "VerifyOperationCompleteness";
}
  ? true
  : false;

// =============================================================================
// Factory Return Unwrapping
// =============================================================================

/**
 * Unwraps the "Ok" value type from a factory return type.
 *
 * Handles:
 * - Plain `T` returns -- returns `T`
 * - `Promise<T>` -- unwraps to `T`
 * - `PromiseLike<T>` -- unwraps to `T`
 * - `{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }` -- extracts `T`
 * - `Promise<{ _tag: "Ok"; value: T } | ...>` -- extracts `T`
 * - `PromiseLike<{ _tag: "Ok"; value: T } | ...>` -- extracts `T`
 *
 * @typeParam TReturn - The factory function's return type
 */
export type UnwrapFactoryOk<TReturn> = [TReturn] extends [never]
  ? never
  : TReturn extends Promise<infer TInner>
    ? UnwrapFactoryOk<TInner>
    : TReturn extends PromiseLike<infer TInner>
      ? UnwrapFactoryOk<TInner>
      : TReturn extends { readonly _tag: "Ok"; readonly value: infer T }
        ? T
        : TReturn extends { readonly _tag: "Err" }
          ? never
          : TReturn;

// =============================================================================
// Conditional Adapter Return Type
// =============================================================================

/**
 * Wraps an Adapter return type with operation completeness verification.
 *
 * If the factory return type implements all operations of the port service interface,
 * returns the Adapter type as-is. Otherwise, returns the `MissingOperationsError`
 * which produces a clear compile-time error naming the missing methods.
 *
 * @typeParam TProvides - The port being implemented
 * @typeParam TFactory - The factory function type (used to extract return type)
 * @typeParam TAdapter - The Adapter type to return if completeness passes
 */
export type AdapterWithCompletenessCheck<
  TProvides extends Port<string, unknown>,
  TFactory extends (...args: never[]) => unknown,
  TAdapter,
> =
  VerifyOperationCompleteness<TProvides, UnwrapFactoryOk<ReturnType<TFactory>>> extends true
    ? TAdapter
    : VerifyOperationCompleteness<TProvides, UnwrapFactoryOk<ReturnType<TFactory>>>;
