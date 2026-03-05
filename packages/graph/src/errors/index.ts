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
  MissingOperationBuild,
} from "./graph-build-errors.js";

// Error interfaces and unions
export type {
  CyclicDependencyBuildError,
  CaptiveDependencyBuildError,
  MissingDependencyBuildError,
  MissingOperationBuildError,
  GraphBuildError,
  GraphValidationError,
} from "./graph-build-errors.js";

// Exception class
export { GraphBuildException } from "./graph-build-exception.js";

// Type guards
export { isGraphBuildError, isCycleError, isMultipleCyclesError } from "./guards.js";

// Cycle diagram generator
export { generateCycleDiagram } from "./cycle-diagram.js";

// Cycle suggestion engine
export { generateCycleSuggestions } from "./cycle-suggestions.js";
export type {
  CycleSuggestion,
  CycleSuggestionTag,
  GraphRegistrations,
} from "./cycle-suggestions.js";

// Cycle error types
export { createCycleError, createMultipleCyclesError } from "./cycle-error.js";
export type {
  CycleError,
  MultipleCyclesError,
  CycleDetectionError,
  CycleLazyEdge,
} from "./cycle-error.js";
