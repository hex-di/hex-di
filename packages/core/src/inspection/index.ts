/**
 * Inspection Module
 *
 * Types for inspecting containers, graphs, and tracing resolution.
 *
 * @packageDocumentation
 */

// Container inspection types
export type {
  Lifetime,
  FactoryKind,
  InheritanceMode,
  ServiceOrigin,
  ContainerKind,
  ContainerPhase,
  SingletonEntry,
  ScopeInfo,
  ScopeTree,
  RootContainerSnapshot,
  ChildContainerSnapshot,
  LazyContainerSnapshot,
  ScopeSnapshot,
  ContainerSnapshot,
} from "./container-types.js";

// Tracing types
export type {
  TraceEntry,
  TraceStats,
  TraceFilter,
  TraceRetentionPolicy,
  TracingOptions,
  TracingAPI,
} from "./tracing-types.js";
export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./tracing-types.js";

// Graph inspection types
export type {
  InspectableGraph,
  GraphSuggestion,
  GraphInspection,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
} from "./graph-types.js";

// Inspector API types
export type {
  ScopeEventInfo,
  AdapterInfo,
  VisualizableAdapter,
  ContainerGraphData,
  InspectorEvent,
  InspectorListener,
  InspectorAPI,
} from "./inspector-types.js";
