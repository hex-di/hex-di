/**
 * Captive Dependency Detection Types.
 *
 * This module exports all captive dependency detection related types:
 * - Lifetime level mapping and names
 * - Lifetime map operations
 * - Comparison utilities
 * - Detection utilities for single and batch operations
 * - Merge utilities for graph merging
 *
 * @packageDocumentation
 */

// Lifetime level constants and types
export type {
  SINGLETON_LEVEL,
  SCOPED_LEVEL,
  TRANSIENT_LEVEL,
  LifetimeLevelValue,
} from "./lifetime-constants.js";
export type { LifetimeLevel, LifetimeName } from "./lifetime-level.js";

// Lifetime map operations
export type { AddLifetime, GetLifetimeLevel, MergeLifetimeMaps } from "./lifetime-map.js";

// Comparison utilities
export type { IsCaptiveDependency } from "./comparison.js";

// Error types
export type {
  CaptiveDependencyError,
  ReverseCaptiveDependencyError,
  MalformedAdapterError,
  ForwardReferenceMarker,
  IsForwardReference,
} from "./errors.js";

// Detection utilities
export type {
  FindCaptiveDependency,
  FindAnyCaptiveDependency,
  FindReverseCaptiveDependency,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  WouldAnyCreateReverseCaptive,
  DebugCaptiveCheck,
} from "./detection.js";

// Merge utilities
export type { DetectCaptiveInMergedGraph, FindLifetimeInconsistency } from "./merge.js";
