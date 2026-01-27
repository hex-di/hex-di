/**
 * Validation module - Compile-time graph validation types.
 *
 * This module exports types for compile-time validation of dependency graphs:
 *
 * - **Error types**: Branded error messages for duplicates, cycles, captive deps
 * - **Cycle detection**: Type-level cycle detection in dependency graphs
 * - **Captive detection**: Detection of lifetime scope violations
 * - **Lazy transforms**: Utilities for lazy port handling
 *
 * All validation happens at compile-time via TypeScript's type system.
 *
 * @packageDocumentation
 */
export * from "./errors.js";
export * from "./dependency-satisfaction.js";
export type { AdapterProvidesName, AdapterRequiresNames, BrandedPortName, IsBrandedPortName, BrandedAdapterProvidesName, BrandedAdapterRequiresNames, } from "./adapter-extraction.js";
export type { HasDuplicatesInBatch, FindBatchDuplicate, BatchDuplicateErrorMessage, } from "./batch-duplicates.js";
export type { TransformLazyToOriginal, ExtractLazyPorts, HasLazyPorts } from "./lazy-transforms.js";
export type { DefaultMaxDepth, ValidateMaxDepth, Depth, IncrementDepth, DepthExceeded, CompareNumbers, MaxNumber, MinNumber, AddEdge, GetDirectDeps, MergeDependencyMaps, AddManyEdges, DebugGetDirectDeps, IsReachable, WouldCreateCycle, WouldExceedDepthLimit, DepthExceededResult, IsDepthExceeded, ExtractDepthExceededPort, FindCyclePath, BuildCyclePath, CircularDependencyError, FormatLazySuggestion, LazySuggestions, FormatLazySuggestionMessage, WouldAnyCreateCycle, DetectCycleInMergedGraph, } from "./cycle/index.js";
export type { SINGLETON_LEVEL, SCOPED_LEVEL, TRANSIENT_LEVEL, LifetimeLevelValue, LifetimeLevel, LifetimeName, AddLifetime, GetLifetimeLevel, MergeLifetimeMaps, IsCaptiveDependency, CaptiveDependencyError, ReverseCaptiveDependencyError, MalformedAdapterError, FindAnyCaptiveDependency, FindReverseCaptiveDependency, AddManyLifetimes, WouldAnyBeCaptive, WouldAnyCreateReverseCaptive, DebugCaptiveCheck, DetectCaptiveInMergedGraph, FindLifetimeInconsistency, } from "./captive/index.js";
export type { IsAsyncAdapter } from "./init-priority.js";
export type { HasSelfDependency, HasSelfDependencyInBatch, FindSelfDependencyPort, } from "./self-dependency.js";
export type { CommonKeys, StringUnionEqual, MergeConflictError, MergeConflictErrorMessage, DetectMergeConflict, } from "./merge-conflict.js";
