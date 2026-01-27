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
export type { SINGLETON_LEVEL, SCOPED_LEVEL, TRANSIENT_LEVEL, LifetimeLevelValue, } from "./lifetime-constants.js";
export type { LifetimeLevel, LifetimeName } from "./lifetime-level.js";
export type { AddLifetime, GetLifetimeLevel, MergeLifetimeMaps } from "./lifetime-map.js";
export type { IsCaptiveDependency } from "./comparison.js";
export type { CaptiveDependencyError, ReverseCaptiveDependencyError, MalformedAdapterError, ForwardReferenceMarker, IsForwardReference, } from "./errors.js";
export type { FindCaptiveDependency, FindAnyCaptiveDependency, FindReverseCaptiveDependency, AddManyLifetimes, WouldAnyBeCaptive, WouldAnyCreateReverseCaptive, DebugCaptiveCheck, } from "./detection.js";
export type { DetectCaptiveInMergedGraph, FindLifetimeInconsistency } from "./merge.js";
