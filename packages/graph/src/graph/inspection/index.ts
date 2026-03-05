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
  PortInfo,
  DirectionSummary,
  PortDirection,
  GraphSummary,
  InspectOptions,
} from "../types/inspection.js";

// Core inspection
export { inspectGraph } from "./inspector.js";

// Inspection configuration and complexity analysis
export { INSPECTION_CONFIG, computeTypeComplexity } from "./complexity.js";
export type { ComplexityBreakdown } from "./complexity.js";

// Runtime cycle detection
export { detectCycleAtRuntime, detectAllCyclesAtRuntime } from "./runtime-cycle-detection.js";

// Runtime captive dependency detection
export { detectCaptiveAtRuntime, detectAllCaptivesAtRuntime } from "./runtime-captive-detection.js";
export type { CaptiveDependencyResult } from "./runtime-captive-detection.js";

// Well-founded cycle detection and verification
export {
  extractLazyEdges,
  verifyWellFoundedness,
  classifyAllCycles,
} from "./well-founded-cycle.js";
export type { LazyEdge, WellFoundednessCheck } from "./well-founded-cycle.js";

// Serialization
export { inspectionToJSON } from "./serialization.js";

// Error formatting
export {
  formatCycleError,
  formatMissingDepsError,
  formatCaptiveError,
  formatDuplicateError,
} from "./error-formatting.js";

// Enhanced cycle error formatting
export {
  formatEnhancedCycleError,
  formatEnhancedCycleErrors,
} from "./enhanced-cycle-formatting.js";

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

// Initialization order computation
export { computeInitializationOrder } from "./init-order.js";

// Port filtering utilities
export {
  filterPorts,
  getInboundPorts,
  getOutboundPorts,
  getPortsByCategory,
  getPortsByTags,
} from "./filter.js";
export type { PortFilter, FilteredPorts } from "./filter.js";

// Effect propagation analysis
export {
  computeErrorProfile,
  computeEffectSummaries,
  detectUnhandledErrors,
} from "./effect-propagation.js";
export type { ErrorTagEntry, PortEffectSummary } from "./effect-propagation.js";
