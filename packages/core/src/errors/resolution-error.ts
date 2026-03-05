/**
 * Resolution error tagged union type.
 *
 * Provides a discriminated union of all container resolution errors,
 * enabling pattern matching on the `_tag` field.
 *
 * @packageDocumentation
 */

import { ContainerError } from "./base.js";
import type {
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "./classes.js";
import type { ContractViolationError } from "../contracts/errors.js";

/**
 * Union of all container resolution errors.
 *
 * Each variant is distinguished by a unique `_tag` literal:
 * - `"CircularDependency"` — Circular dependency detected
 * - `"FactoryFailed"` — Sync factory threw
 * - `"DisposedScope"` — Resolution from disposed scope
 * - `"ScopeRequired"` — Scoped port resolved from root
 * - `"AsyncFactoryFailed"` — Async factory threw
 * - `"AsyncInitRequired"` — Async port resolved synchronously
 * - `"NonClonableForked"` — Forked inheritance on non-clonable adapter
 * - `"ContractViolationError"` — Adapter output violates port contract
 */
export type ResolutionError =
  | CircularDependencyError
  | FactoryError
  | DisposedScopeError
  | ScopeRequiredError
  | AsyncFactoryError
  | AsyncInitializationRequiredError
  | NonClonableForkedError
  | ContractViolationError;

/**
 * Checks if an unknown error is a `ResolutionError`.
 *
 * Uses `instanceof ContainerError` as the runtime check. Since all concrete
 * `ContainerError` subclasses are members of the `ResolutionError` union,
 * this is a sound type narrowing.
 *
 * @param error - The unknown value to check
 * @returns `true` if the error is a `ResolutionError`
 */
export function isResolutionError(error: unknown): error is ResolutionError {
  return error instanceof ContainerError;
}

/**
 * Converts an unknown error to a `ResolutionError` if it is a `ContainerError`.
 *
 * @param error - The unknown value to check
 * @returns The error narrowed to `ResolutionError`, or `null` if not a resolution error
 */
export function toResolutionError(error: unknown): ResolutionError | null {
  if (isResolutionError(error)) {
    return error;
  }
  return null;
}
