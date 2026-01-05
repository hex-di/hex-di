/**
 * DevTools React hooks exports.
 *
 * @packageDocumentation
 */

// =============================================================================
// Unified DevTools Hooks
// These work with DevToolsFlowRuntime and DevToolsSnapshot
// =============================================================================

// Primary snapshot hook
export { useDevToolsSnapshot } from "./use-devtools-runtime.js";

// Deprecated alias for backward compatibility (will be removed in next major)
export { useDevToolsRuntime } from "./use-devtools-runtime.js";

export { useDevToolsSelector, type DevToolsSnapshotSelector } from "./use-devtools-selector.js";

export { useDevToolsDispatch, type DevToolsDispatch } from "./use-devtools-dispatch.js";

// =============================================================================
// Utility Hooks
// =============================================================================

export {
  useGraphFilters,
  type GraphFilterState,
  type UseGraphFiltersResult,
} from "./use-graph-filters.js";

export { useTraceStats } from "./use-trace-stats.js";

// =============================================================================
// Container Inspector Hooks (Keep - ADT migration completed in Task Group 5)
// =============================================================================

export { useContainerInspector, useContainerInspectorStrict } from "./use-container-inspector.js";
export { useInspectorSnapshot, type UseInspectorSnapshotResult } from "./use-inspector-snapshot.js";
export { useContainerPhase, type UseContainerPhaseResult } from "./use-container-phase.js";

// =============================================================================
// Container Scope Tree Hook (Multi-Container Support)
// =============================================================================

export {
  useContainerScopeTree,
  useContainerScopeTreeOptional,
  type UseContainerScopeTreeResult,
} from "./use-container-scope-tree.js";
