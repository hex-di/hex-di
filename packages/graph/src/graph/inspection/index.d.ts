/**
 * Runtime inspection utilities for dependency graphs.
 *
 * This module provides runtime inspection capabilities for built graphs,
 * complementing the compile-time validation performed by GraphBuilder.
 *
 * @packageDocumentation
 */
export type { GraphSuggestion, GraphInspection, ValidationResult, GraphInspectionJSON, InspectionToJSONOptions, } from "../types/inspection.js";
export { inspectGraph } from "./inspector.js";
export type { InspectOptions } from "./inspector.js";
export { INSPECTION_CONFIG, computeTypeComplexity } from "./complexity.js";
export type { ComplexityBreakdown } from "./complexity.js";
export { detectCycleAtRuntime } from "./runtime-cycle-detection.js";
export { detectCaptiveAtRuntime, detectAllCaptivesAtRuntime } from "./runtime-captive-detection.js";
export type { CaptiveDependencyResult } from "./runtime-captive-detection.js";
export { inspectionToJSON } from "./serialization.js";
export { formatCycleError, formatMissingDepsError, formatCaptiveError, formatDuplicateError, } from "./error-formatting.js";
export type { LogLevel, StructuredLogEntry, StructuredLogOptions, } from "./structured-logging.js";
export { toStructuredLogs } from "./structured-logging.js";
export type { CorrelationIdGenerator } from "./correlation.js";
export { createCorrelationIdGenerator } from "./correlation.js";
export type { DependencyMap } from "./traversal.js";
export { buildDependencyMap, topologicalSort, getTransitiveDependencies, getTransitiveDependents, findDependencyPath, findCommonDependencies, computeDependencyLayers, getPortsByLayer, } from "./traversal.js";
