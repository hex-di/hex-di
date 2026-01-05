/**
 * Type definitions for @hex-di/plugin.
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
} from "./container.js";

export type {
  // Tracing types
  TraceEntry,
  TraceStats,
  TraceFilter,
  TraceRetentionPolicy,
  TracingOptions,
  TracingAPI,
} from "./tracing.js";

export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./tracing.js";
