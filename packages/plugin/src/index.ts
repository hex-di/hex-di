/**
 * @hex-di/plugin - Shared types for HexDI plugins, inspector, and tracing.
 *
 * This package provides foundational types used by the inspector and tracing
 * packages. It has no runtime dependencies beyond @hex-di/graph and can be
 * used in any JavaScript environment.
 *
 * ## Key Types
 *
 * - **Container Types**: ContainerSnapshot, ContainerKind, ContainerPhase,
 *   ScopeTree, ScopeInfo for container inspection.
 *
 * - **Tracing Types**: TraceEntry, TraceStats, TraceFilter, TracingAPI
 *   for resolution tracing and performance monitoring.
 *
 * - **Inheritance Types**: InheritanceMode, ServiceOrigin for understanding
 *   adapter ownership in child containers.
 *
 * @packageDocumentation
 */

export type {
  // Graph re-exports
  Lifetime,
  FactoryKind,
  // Inheritance/origin types
  InheritanceMode,
  ServiceOrigin,
  // Container types
  ContainerKind,
  ContainerPhase,
  SingletonEntry,
  ScopeInfo,
  ScopeTree,
  ContainerSnapshot,
  RootContainerSnapshot,
  ChildContainerSnapshot,
  LazyContainerSnapshot,
  ScopeSnapshot,
  // Tracing types
  TraceEntry,
  TraceStats,
  TraceFilter,
  TraceRetentionPolicy,
  TracingOptions,
  TracingAPI,
} from "./types/index.js";

export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./types/index.js";
