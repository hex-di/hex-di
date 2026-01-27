/**
 * @hex-di/graph - Dependency Graph Construction and Validation
 *
 * The compile-time validation layer of HexDI.
 * Provides Adapter type, createAdapter function, and GraphBuilder
 * with type-level dependency tracking that produces actionable
 * compile-time error messages when the graph is incomplete.
 *
 * @packageDocumentation
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";
export { GraphBuilder, GRAPH_BUILDER_BRAND } from "./builder/builder.js";
export type { __prettyViewSymbol } from "./symbols/index.js";
export type { GraphBuilderFactory } from "./builder/builder.js";
export type { Graph } from "./graph/types/graph-types.js";
export { createAdapter, createAsyncAdapter } from "./adapter/factory.js";
export { defineService, defineAsyncService, createClassAdapter } from "./adapter/service.js";
export { lazyPort, isLazyPort } from "./adapter/lazy.js";
export type { LazyPort } from "./adapter/lazy.js";
export type { Adapter, AdapterConstraint, Lifetime, FactoryKind, ResolvedDeps, EmptyDeps, } from "./adapter/types/adapter-types.js";
export { isLifetime, isFactoryKind, isAdapter } from "./adapter/guards.js";
export { isGraphBuilder } from "./builder/guards.js";
export { isGraph } from "./graph/guards.js";
export type { InferAdapterProvides, InferAdapterRequires, InferAdapterLifetime, } from "./adapter/types/adapter-inference.js";
export type { InferGraphProvides, InferGraphRequires, InferGraphAsyncPorts, InferGraphOverrides, } from "./graph/types/graph-inference.js";
export type { MissingDependencyError, DuplicateProviderError, } from "./validation/types/errors.js";
export type { CircularDependencyError } from "./validation/types/cycle/errors.js";
export type { CaptiveDependencyError } from "./validation/types/captive/errors.js";
export type { GraphInspection, GraphSuggestion, ValidationResult, GraphInspectionJSON, InspectionToJSONOptions, } from "./graph/types/inspection.js";
export { inspectGraph, inspectionToJSON, detectCycleAtRuntime, detectCaptiveAtRuntime, detectAllCaptivesAtRuntime, computeTypeComplexity, } from "./graph/inspection/index.js";
export type { CaptiveDependencyResult, ComplexityBreakdown } from "./graph/inspection/index.js";
export { INSPECTION_CONFIG } from "./graph/inspection/complexity.js";
export type { InspectOptions } from "./graph/inspection/inspector.js";
export type { DependencyMap } from "./graph/inspection/traversal.js";
export { buildDependencyMap, topologicalSort, getTransitiveDependencies, getTransitiveDependents, findDependencyPath, findCommonDependencies, computeDependencyLayers, getPortsByLayer, } from "./graph/inspection/traversal.js";
export { formatCycleError, formatMissingDepsError, formatCaptiveError, formatDuplicateError, } from "./graph/inspection/error-formatting.js";
export { GraphErrorNumericCode, GraphErrorCode, isGraphError, parseGraphError, } from "./validation/error-parsing.js";
export type { GraphErrorNumericCodeType, GraphErrorCodeType, ParsedGraphError, DuplicateAdapterDetails, CircularDependencyDetails, CaptiveDependencyDetails, ReverseCaptiveDependencyDetails, LifetimeInconsistencyDetails, SelfDependencyDetails, DepthLimitExceededDetails, MissingDependencyDetails, OverrideWithoutParentDetails, MissingProvidesDetails, InvalidProvidesDetails, InvalidRequiresTypeDetails, InvalidRequiresElementDetails, InvalidLifetimeTypeDetails, InvalidLifetimeValueDetails, InvalidFactoryDetails, DuplicateRequiresDetails, InvalidFinalizerDetails, InvalidLazyPortDetails, MultipleErrorsDetails, UnknownErrorDetails, ParsedDuplicateAdapterError, ParsedCircularDependencyError, ParsedCaptiveDependencyError, ParsedReverseCaptiveDependencyError, ParsedLifetimeInconsistencyError, ParsedSelfDependencyError, ParsedDepthLimitExceededError, ParsedMissingDependencyError, ParsedOverrideWithoutParentError, ParsedMissingProvidesError, ParsedInvalidProvidesError, ParsedInvalidRequiresTypeError, ParsedInvalidRequiresElementError, ParsedInvalidLifetimeTypeError, ParsedInvalidLifetimeValueError, ParsedInvalidFactoryError, ParsedDuplicateRequiresError, ParsedInvalidFinalizerError, ParsedInvalidLazyPortError, ParsedMultipleErrorsError, ParsedUnknownErrorError, } from "./validation/error-parsing.js";
export { toStructuredLogs } from "./graph/inspection/structured-logging.js";
export type { LogLevel, StructuredLogEntry, StructuredLogOptions, } from "./graph/inspection/structured-logging.js";
export type { IsNever, TupleToUnion, Prettify } from "./types/type-utilities.js";
export type { DefaultMaxDepth, ValidateMaxDepth, WouldCreateCycle, CircularErrorMessage, DepthLimitError, DepthLimitWarning, LifetimeLevel, IsCaptiveDependency, UnsatisfiedDependencies, OrphanPorts, JoinPortNames, TransformLazyToOriginal, ExtractLazyPorts, HasLazyPorts, } from "./validation/types/index.js";
export { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "./builder/types/index.js";
export type { EmptyDependencyGraph, EmptyLifetimeMap, AnyBuilderInternals, BuilderInternals, DefaultInternals, GetDepthExceededWarning, } from "./builder/types/index.js";
export type { ProvideResult, ProvideResultAllErrors, ProvideAsyncResult, ProvideManyResult, ProvideUncheckedResult, MergeResult, MergeWithResult, OverrideResult, PrettyBuilder, } from "./builder/types/index.js";
export type { HasDuplicatesInBatch, FindBatchDuplicate, BatchDuplicateErrorMessage, } from "./validation/types/batch-duplicates.js";
export type { InferManyProvides, InferManyRequires, InferManyAsyncPorts, InferClonable, IsClonableAdapter, } from "./adapter/types/adapter-inference.js";
