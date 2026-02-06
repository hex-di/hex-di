/**
 * @hex-di/runtime - Runtime Container Layer
 *
 * The runtime layer of HexDI that creates immutable containers from validated graphs
 * and provides type-safe service resolution with lifetime management.
 *
 * For ports and adapters, import from `@hex-di/core`.
 * For graph building, import from `@hex-di/graph`.
 * For graph inspection, import from `@hex-di/graph/advanced`.
 *
 * @packageDocumentation
 */

// =============================================================================
// Error Hierarchy
// =============================================================================

export {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "./errors/index.js";

// =============================================================================
// Container and Scope Types
// =============================================================================

export type {
  Container,
  Scope,
  LazyContainer,
  ContainerPhase,
  CreateContainerOptions,
  CreateChildOptions,
  ContainerDevToolsOptions,
  InheritanceMode,
  InheritanceModeConfig,
  InferContainerEffectiveProvides,
  IsRootContainer,
  IsChildContainer,
} from "./types.js";

export { ContainerBrand, ScopeBrand } from "./types.js";

// =============================================================================
// Scope Lifecycle Events
// =============================================================================

export type {
  ScopeLifecycleEvent,
  ScopeLifecycleListener,
  ScopeSubscription,
  ScopeDisposalState,
} from "./scope/lifecycle-events.js";

// =============================================================================
// Type Utility Functions
// =============================================================================

export type {
  InferContainerProvides,
  InferScopeProvides,
  IsResolvable,
  ServiceFromContainer,
} from "./types.js";

// =============================================================================
// Type Utilities for Context Variables
// =============================================================================

export type { ContextVariableKey } from "./types/branded-types.js";
export { createContextVariableKey } from "./types/branded-types.js";

export type { TypeSafeContext } from "./types/helpers.js";
export {
  getContextVariable,
  setContextVariable,
  getContextVariableOrDefault,
  portComparator,
} from "./types/helpers.js";

export { isPort, isPortNamed } from "./types/type-guards.js";

export { isRecord } from "./util/type-guards.js";

// =============================================================================
// Container Factory
// =============================================================================

export { createContainer } from "./container/factory.js";

// =============================================================================
// Override Builder
// =============================================================================

export { OverrideBuilder } from "./container/override-builder.js";
export type {
  ValidateOverrideAdapter,
  PortNotInGraphError,
  MissingDependenciesError,
} from "./types.js";

// =============================================================================
// Resolution Hooks
// =============================================================================

export type {
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
  ContainerOptions,
  ContainerKind,
  HookType,
  HookHandler,
  ImmutableHooksConfig,
} from "./resolution/hooks.js";

export { sealHooks, isSealed } from "./resolution/hooks.js";

// =============================================================================
// Captive Dependency Prevention Types
// =============================================================================

export type {
  LifetimeLevel,
  IsCaptiveDependency,
  CaptiveDependencyError,
  ValidateCaptiveDependency,
  ValidateAllDependencies,
} from "./captive-dependency.js";

// =============================================================================
// Container State Inspection
// =============================================================================

export { INTERNAL_ACCESS, TRACING_ACCESS, INSPECTOR } from "./inspection/symbols.js";

export type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
  AdapterInfo,
  InternalAccessor,
  HasInternalAccess,
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
} from "./inspection/internal-state-types.js";

export {
  createInspector,
  getInternalAccessor,
  type InternalAccessible,
} from "./inspection/creation.js";

// =============================================================================
// Inspector Module
// =============================================================================

export { createInspector as createInspectorAPI } from "./inspection/index.js";

export { hasInspector, getInspectorAPI, type ContainerWithInspector } from "./inspection/index.js";

export { detectContainerKind, detectPhase, buildTypedSnapshot } from "./inspection/index.js";

export type {
  InspectorAPI,
  InspectorEvent,
  InspectorListener,
  AdapterInfo as InspectorAdapterInfo,
  VisualizableAdapter,
  ContainerGraphData,
  ContainerKind as InspectorContainerKind,
  ContainerPhase as InspectorContainerPhase,
  ContainerSnapshot as InspectorContainerSnapshot,
  ScopeTree as InspectorScopeTree,
} from "./inspection/index.js";

// =============================================================================
// Standalone Inspection Functions
// =============================================================================

export { inspect } from "./inspect.js";
