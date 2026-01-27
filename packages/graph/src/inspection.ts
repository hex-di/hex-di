/**
 * @hex-di/graph/inspection - Graph Inspection Utilities
 *
 * This module exports all runtime inspection utilities for dependency graphs.
 * Use this when you need to analyze, debug, or visualize graph structure
 * at runtime.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Inspection
// =============================================================================

export { inspectGraph } from "./graph/inspection/inspector.js";
export type { InspectOptions } from "./graph/inspection/inspector.js";

// =============================================================================
// Inspection Types
// =============================================================================

export type {
  GraphInspection,
  GraphSuggestion,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
} from "./graph/types/inspection.js";

// =============================================================================
// Inspection Configuration
// =============================================================================

export { INSPECTION_CONFIG } from "./graph/inspection/complexity.js";

// =============================================================================
// Runtime Cycle Detection
// =============================================================================

export { detectCycleAtRuntime } from "./graph/inspection/runtime-cycle-detection.js";

// =============================================================================
// Graph Traversal Utilities
// =============================================================================

export type { DependencyMap } from "./graph/inspection/traversal.js";
export {
  buildDependencyMap,
  topologicalSort,
  getTransitiveDependencies,
  getTransitiveDependents,
  findDependencyPath,
  findCommonDependencies,
  computeDependencyLayers,
  getPortsByLayer,
} from "./graph/inspection/traversal.js";

// =============================================================================
// Serialization
// =============================================================================

export { inspectionToJSON } from "./graph/inspection/serialization.js";

// =============================================================================
// Error Formatting
// =============================================================================

export {
  formatCycleError,
  formatMissingDepsError,
  formatCaptiveError,
  formatDuplicateError,
} from "./graph/inspection/error-formatting.js";

// =============================================================================
// Structured Logging
// =============================================================================

export type {
  LogLevel,
  StructuredLogEntry,
  StructuredLogOptions,
} from "./graph/inspection/structured-logging.js";
export { toStructuredLogs } from "./graph/inspection/structured-logging.js";
