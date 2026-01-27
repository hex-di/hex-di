/**
 * Runtime inspection utilities for dependency graphs.
 *
 * This module provides runtime inspection capabilities for built graphs,
 * complementing the compile-time validation performed by GraphBuilder.
 *
 * @packageDocumentation
 */

// Types
export type {
  GraphSuggestion,
  GraphInspection,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
} from "../types/inspection.js";

// Core inspection
export { inspectGraph } from "./inspector.js";
export type { InspectOptions } from "./inspector.js";

// Inspection configuration and complexity analysis
export { INSPECTION_CONFIG, computeTypeComplexity } from "./complexity.js";
export type { ComplexityBreakdown } from "./complexity.js";

// Runtime cycle detection
export { detectCycleAtRuntime } from "./runtime-cycle-detection.js";

// Runtime captive dependency detection
export { detectCaptiveAtRuntime, detectAllCaptivesAtRuntime } from "./runtime-captive-detection.js";
export type { CaptiveDependencyResult } from "./runtime-captive-detection.js";

// Serialization
export { inspectionToJSON } from "./serialization.js";

// Error formatting
export {
  formatCycleError,
  formatMissingDepsError,
  formatCaptiveError,
  formatDuplicateError,
} from "./error-formatting.js";

// Structured logging
export type { LogLevel, StructuredLogEntry, StructuredLogOptions } from "./structured-logging.js";
export { toStructuredLogs } from "./structured-logging.js";

// Correlation ID utilities
export type { CorrelationIdGenerator } from "./correlation.js";
export { createCorrelationIdGenerator } from "./correlation.js";

// Graph traversal utilities
export type { DependencyMap } from "./traversal.js";
export {
  buildDependencyMap,
  topologicalSort,
  getTransitiveDependencies,
  getTransitiveDependents,
  findDependencyPath,
  findCommonDependencies,
  computeDependencyLayers,
  getPortsByLayer,
} from "./traversal.js";
