/**
 * @hex-di/graph/inspection - Runtime Inspection Utilities
 *
 * This module exports runtime inspection utilities for built dependency graphs.
 * These functions complement the compile-time validation performed by GraphBuilder.
 *
 * Use this entry point when you need:
 * - Runtime graph analysis and debugging
 * - Cycle and captive dependency detection at runtime
 * - Graph traversal and path finding
 * - Structured logging and error formatting
 * - Serialization for debugging tools
 *
 * For compile-time types and validation, use "@hex-di/graph/advanced".
 * For basic graph building, use "@hex-di/graph".
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Inspection
// =============================================================================

export { inspectGraph } from "./graph/inspection/inspector.js";
export { inspectionToJSON } from "./graph/inspection/serialization.js";
export { INSPECTION_CONFIG, computeTypeComplexity } from "./graph/inspection/complexity.js";

// =============================================================================
// Inspection Types
// =============================================================================

export type {
  GraphInspection,
  GraphSuggestion,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
  PortInfo,
  DirectionSummary,
  PortDirection,
  GraphSummary,
  InspectOptions,
} from "./graph/types/inspection.js";

export type { ComplexityBreakdown } from "./graph/inspection/complexity.js";

// =============================================================================
// Runtime Detection
// =============================================================================

export { detectCycleAtRuntime } from "./graph/inspection/runtime-cycle-detection.js";
export {
  detectCaptiveAtRuntime,
  detectAllCaptivesAtRuntime,
} from "./graph/inspection/runtime-captive-detection.js";
export type { CaptiveDependencyResult } from "./graph/inspection/runtime-captive-detection.js";

// =============================================================================
// Graph Traversal
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
// Port Filtering
// =============================================================================

export type { PortFilter, FilteredPorts } from "./graph/inspection/filter.js";
export {
  filterPorts,
  getInboundPorts,
  getOutboundPorts,
  getPortsByCategory,
  getPortsByTags,
} from "./graph/inspection/filter.js";

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

// =============================================================================
// Correlation ID Utilities
// =============================================================================

export type { CorrelationIdGenerator } from "./graph/inspection/correlation.js";
export { createCorrelationIdGenerator } from "./graph/inspection/correlation.js";
