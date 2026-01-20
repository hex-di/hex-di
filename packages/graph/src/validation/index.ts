export * from "./errors.js";
export * from "./logic.js";

// Explicit exports from cycle-detection.ts (excluding @internal types)
export type {
  DefaultMaxDepth,
  ValidateMaxDepth,
  AdapterProvidesName,
  AdapterRequiresNames,
  AddEdge,
  GetDirectDeps,
  IsReachable,
  WouldCreateCycle,
  FindCyclePath,
  BuildCyclePath,
  CircularDependencyError,
  MergeDependencyMaps,
  AddManyEdges,
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
} from "./cycle-detection.js";

// Explicit exports from captive-dependency.ts (excluding @internal types)
export type {
  LifetimeLevel,
  AddLifetime,
  GetLifetimeLevel,
  IsCaptiveDependency,
  LifetimeName,
  CaptiveDependencyError,
  FindAnyCaptiveDependency,
  MergeLifetimeMaps,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
} from "./captive-dependency.js";

// Init priority types (infrastructure for future compile-time validation)
export type {
  PriorityBand,
  PriorityBandLevel,
  GetBandLevel,
  IsValidBandOrder,
  EmptyInitPriorityMap,
  AddInitPriority,
  GetInitPriority,
  DefaultInitPriority,
  InferAdapterInitPriority,
  InitPriorityErrorMessage,
  MergeInitPriorityMaps,
  AddManyInitPriorities,
} from "./init-priority.js";
