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

// Depth utilities
export type {
  DefaultMaxDepth,
  ValidateMaxDepth,
  Depth,
  IncrementDepth,
  DepthExceeded,
  CompareNumbers,
  MaxNumber,
  MinNumber,
} from "./depth.js";

// Adapter name extraction (re-exported from canonical source for backward compatibility)
export type { AdapterProvidesName, AdapterRequiresNames } from "./detection.js";

// Detection utilities (dependency map, reachability)
export type {
  AddEdge,
  GetDirectDeps,
  MergeDependencyMaps,
  AddManyEdges,
  DebugGetDirectDeps,
  IsReachable,
  WouldCreateCycle,
  WouldExceedDepthLimit,
  DepthExceededResult,
  IsDepthExceeded,
  ExtractDepthExceededPort,
} from "./detection.js";

// Error types (path extraction, lazy suggestions)
export type {
  FindCyclePath,
  BuildCyclePath,
  CircularDependencyError,
  FormatLazySuggestion,
  LazySuggestions,
  FormatLazySuggestionMessage,
} from "./errors.js";

// Batch utilities
export type { WouldAnyCreateCycle, DetectCycleInMergedGraph } from "./batch.js";
