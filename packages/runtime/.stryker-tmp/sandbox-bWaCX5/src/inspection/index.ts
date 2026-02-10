/**
 * Inspection module for @hex-di/runtime.
 *
 * Provides runtime state inspection via the built-in `container.inspector` property.
 *
 * @example Using the built-in inspector
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 *
 * const container = createContainer({ graph: graph, name: 'Root'  });
 *
 * // Access inspector via built-in property
 * const snapshot = container.inspector.getSnapshot();
 * const ports = container.inspector.listPorts();
 * ```
 *
 * @packageDocumentation
 */
// @ts-nocheck

// =============================================================================
// Symbol Exports
// =============================================================================

export { INTERNAL_ACCESS, TRACING_ACCESS, ADAPTER_ACCESS, HOOKS_ACCESS } from "./symbols.js";

// =============================================================================
// Factory Exports
// =============================================================================

export { createInspector } from "./api.js";

// =============================================================================
// Internal State Type Exports
// =============================================================================

export type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
  AdapterInfo as InternalAdapterInfo,
  InternalAccessor,
  HasInternalAccess,
  InternalAccessible,
  ContainerInspector,
  ContainerSnapshot as InternalContainerSnapshot,
  SingletonEntry as InternalSingletonEntry,
  ScopeTree as InternalScopeTree,
} from "./internal-state-types.js";

// =============================================================================
// API Type Exports
// =============================================================================

export type {
  InspectorAPI,
  InspectorEvent,
  InspectorListener,
  AdapterInfo,
  VisualizableAdapter,
  ContainerGraphData,
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
} from "./types.js";

// =============================================================================
// Type Guard Exports
// =============================================================================

export { hasInspector, getInspectorAPI, type ContainerWithInspector } from "./type-guards.js";

// =============================================================================
// Helper Exports (for advanced use cases)
// =============================================================================

export { detectContainerKind, detectPhase, buildTypedSnapshot } from "./helpers.js";

// =============================================================================
// Creation Utilities (re-exported for compatibility)
// =============================================================================

export { createInspector as createRuntimeInspector, getInternalAccessor } from "./creation.js";

export type { InternalAccessible as CreationInternalAccessible } from "./creation.js";
