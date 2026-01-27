/**
 * Cycle Detection Types.
 *
 * This module exports all cycle detection related types:
 * - Depth utilities for tracking recursion depth
 * - Detection utilities for finding cycles
 * - Error types for cycle path formatting
 * - Batch utilities for multiple adapter operations
 *
 * @packageDocumentation
 */
export type { DefaultMaxDepth, ValidateMaxDepth, Depth, IncrementDepth, DepthExceeded, CompareNumbers, MaxNumber, MinNumber, } from "./depth.js";
export type { AdapterProvidesName, AdapterRequiresNames } from "./detection.js";
export type { AddEdge, GetDirectDeps, MergeDependencyMaps, AddManyEdges, DebugGetDirectDeps, IsReachable, WouldCreateCycle, WouldExceedDepthLimit, DepthExceededResult, IsDepthExceeded, ExtractDepthExceededPort, } from "./detection.js";
export type { FindCyclePath, BuildCyclePath, CircularDependencyError, FormatLazySuggestion, LazySuggestions, FormatLazySuggestionMessage, } from "./errors.js";
export type { WouldAnyCreateCycle, DetectCycleInMergedGraph } from "./batch.js";
