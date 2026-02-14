/**
 * Graph build error types, constructors, and guards.
 *
 * @packageDocumentation
 */

// Error constructors
export {
  CyclicDependencyBuild,
  CaptiveDependencyBuild,
  MissingDependencyBuild,
} from "./graph-build-errors.js";

// Error interfaces and unions
export type {
  CyclicDependencyBuildError,
  CaptiveDependencyBuildError,
  MissingDependencyBuildError,
  GraphBuildError,
  GraphValidationError,
} from "./graph-build-errors.js";

// Exception class
export { GraphBuildException } from "./graph-build-exception.js";

// Type guards
export { isGraphBuildError } from "./guards.js";
