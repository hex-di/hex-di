/**
 * @hex-di/result - Rust-style Result type for TypeScript
 *
 * PUBLIC API CONTRACT
 * -------------------
 * Everything exported from this file constitutes the public API.
 * Internal modules (prefixed with `_`) are NOT part of the public API.
 * Breaking changes to exported symbols follow semver major version bumps.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

export type { Result, Ok, Err } from "./core/types.js";
export { RESULT_BRAND } from "./core/brand.js";

// =============================================================================
// Factories
// =============================================================================

export { ok, err } from "./core/result.js";
export { isResult, isResultAsync } from "./core/guards.js";

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

export { ResultAsync } from "./async/result-async.js";

// =============================================================================
// Combinators
// =============================================================================

export { all } from "./combinators/all.js";
export { allSettled } from "./combinators/all-settled.js";
export { any } from "./combinators/any.js";
export { collect } from "./combinators/collect.js";
export { partition } from "./combinators/partition.js";
export { forEach } from "./combinators/for-each.js";
export { zipOrAccumulate } from "./combinators/zip-or-accumulate.js";

// =============================================================================
// Generators
// =============================================================================

export { safeTry } from "./generators/safe-try.js";

// =============================================================================
// Do Notation
// =============================================================================

export { bind, let_ } from "./do/bind.js";

// =============================================================================
// Error Patterns
// =============================================================================

export { createError } from "./errors/create-error.js";
export { createErrorGroup } from "./errors/create-error-group.js";
export { assertNever } from "./errors/assert-never.js";

// =============================================================================
// Option
// =============================================================================

export type { Some, None, Option } from "./option/types.js";
export { OPTION_BRAND } from "./option/brand.js";
export { some, none } from "./option/option.js";
export { isOption } from "./option/guards.js";
export { fromOptionJSON } from "./option/from-option-json.js";
export type { OptionJSON } from "./option/from-option-json.js";

// =============================================================================
// Interop
// =============================================================================

export { fromJSON } from "./interop/from-json.js";
export type { ResultJSON } from "./interop/from-json.js";
export { toSchema } from "./interop/to-schema.js";
export type { StandardSchemaV1 } from "./interop/to-schema.js";

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
  NonEmptyArray,
} from "./type-utils.js";
