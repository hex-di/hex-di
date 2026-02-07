/**
 * @hex-di/result - Rust-style Result type for TypeScript
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

export type { Result, Ok, Err, ResultAsync } from "./core/types.js";

// =============================================================================
// Factories
// =============================================================================

export { ok, err } from "./core/result.js";
export { isResult } from "./core/guards.js";

// =============================================================================
// Constructors
// =============================================================================

export { fromThrowable } from "./constructors/from-throwable.js";
export { fromNullable } from "./constructors/from-nullable.js";
export { fromPredicate } from "./constructors/from-predicate.js";
export { tryCatch } from "./constructors/try-catch.js";
export { fromPromise, fromSafePromise, fromAsyncThrowable } from "./constructors/from-promise.js";

// =============================================================================
// ResultAsync
// =============================================================================

export { ResultAsyncImpl } from "./async/result-async.js";

// =============================================================================
// Combinators
// =============================================================================

export { all } from "./combinators/all.js";
export { allSettled } from "./combinators/all-settled.js";
export { any } from "./combinators/any.js";
export { collect } from "./combinators/collect.js";

// =============================================================================
// Generators
// =============================================================================

export { safeTry } from "./generators/safe-try.js";

// =============================================================================
// Error Patterns
// =============================================================================

export { createError } from "./errors/create-error.js";
export { assertNever } from "./errors/assert-never.js";

// =============================================================================
// Type Utilities
// =============================================================================

export type {
  InferOk,
  InferErr,
  InferAsyncOk,
  InferAsyncErr,
  IsResult,
  IsResultAsync,
  FlattenResult,
  InferOkTuple,
  InferErrUnion,
  InferOkRecord,
  InferOkUnion,
  InferErrTuple,
} from "./type-utils.js";
