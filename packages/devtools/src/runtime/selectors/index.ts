/**
 * Selector System
 *
 * Provides memoized selectors for deriving state from the DevTools runtime.
 * Selectors follow a pattern similar to Redux selectors but optimized
 * for the useSyncExternalStore pattern.
 *
 * @packageDocumentation
 */

// =============================================================================
// Utilities
// =============================================================================

export {
  createSelector,
  createParameterizedSelector,
  compose2Selectors,
  compose3Selectors,
  type Selector,
  type ParameterizedSelector,
} from "./utils.js";

// =============================================================================
// Plugin Selectors
// =============================================================================

export {
  selectPlugins,
  selectActivePlugin,
  selectPluginById,
  selectTabList,
  type TabConfig,
} from "./plugins.js";

// =============================================================================
// Container Selectors
// =============================================================================

export {
  selectSelectedContainers,
  selectIsContainerSelected,
  selectSelectedContainerCount,
  selectHasSelectedContainers,
} from "./containers.js";

// =============================================================================
// Tracing Selectors
// =============================================================================

export {
  selectTracingState,
  selectIsTracingActive,
  selectTracingEnabled,
  selectTracingPaused,
  selectTracingThreshold,
  type TracingStateSnapshot,
} from "./tracing.js";
