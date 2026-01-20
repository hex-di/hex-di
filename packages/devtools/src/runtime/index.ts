/**
 * DevTools Runtime Module
 *
 * Provides the core runtime infrastructure for DevTools plugin architecture.
 *
 * @packageDocumentation
 */

// =============================================================================
// DevToolsFlowRuntime (New Unified API)
// =============================================================================

export {
  DevToolsFlowRuntime,
  createDevToolsFlowRuntime,
  type DevToolsFlowRuntimeConfig,
} from "./devtools-flow-runtime.js";

export {
  // Snapshot Types
  type DevToolsSnapshot,
  type UISnapshot,
  type TracingSnapshot,
  type ContainerTreeSnapshot,

  // Event Types
  type DevToolsFlowEvent,
  type UIEvent,
  type TracingEvent,
  type ContainerTreeEvent,
  type ContainerEntryPayload,
  type ContainerTreeEntry,

  // Derived Selectors
  selectIsOpen,
  selectActiveTab,
  selectSelectedContainerIds,
  selectIsTracing,
  selectTraceCount,
  selectIsContainerTreeReady,
  selectContainers,
} from "./devtools-snapshot.js";

// =============================================================================
// Plugin Factory and Validation
// =============================================================================

// Note: defineDevToolsPlugin is React-specific
// and have been moved to the React layer. For backward compatibility,
// they are re-exported from ../react/define-plugin.js below.

export {
  validatePluginId,
  validatePluginConfig,
  validateUniquePluginIds,
  validatePluginConfigs,
  validateShortcuts,
  PluginValidationError,
  PluginConfigurationError,
} from "./validation.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  // State
  DevToolsRuntimeState,
  DevToolsRuntimeConfig,

  // Commands
  DevToolsCommand,
  SelectTabCommand,
  SelectContainersCommand,
  ToggleTracingCommand,
  PauseTracingCommand,
  ResumeTracingCommand,
  SetThresholdCommand,
  ClearTracesCommand,

  // Events
  DevToolsEvent,
  TabChangedEvent,
  ContainersSelectedEvent,
  TracingStateChangedEvent,
  TracesClearedEvent,

  // Runtime
  DevToolsRuntime,
  StateListener,
  EventListener,

  // Utility Types
  CommandType,
  EventType,
  ExtractCommand,
  ExtractEvent,
} from "./types.js";

// =============================================================================
// Framework-Agnostic Core Types (from plugin-types-core.ts)
// =============================================================================

export type {
  // Plugin Metadata (framework-agnostic)
  PluginShortcut,
  PluginMetadata,
  PluginDefinition,
  TabConfigCore,
} from "./plugin-types-core.js";

// =============================================================================
// Plugin Types (React-specific)
// =============================================================================

/**
 * Note: React-specific plugin types are now in the React layer.
 * Import from `@hex-di/devtools/react` or `../react/types/plugin-types.js`.
 *
 * For framework-agnostic types, use PluginDefinition/PluginMetadata from
 * plugin-types-core.ts.
 */

// Re-export from React types for backward compatibility in this release
// TODO: Remove these re-exports in next major version
export type {
  // React-Specific Plugin Types
  DevToolsPlugin,
  PluginProps,
  ContainerEntry,

  // Plugin Runtime Access
  PluginRuntimeAccess,
  PluginCommand,
  PluginStateSnapshot,

  // Utility Types
  ExtractPluginIds,
  PluginConfig,
  HasShortcuts,
  StrictPlugin,
  MinimalPlugin,
} from "../react/types/plugin-types.js";

// Re-export React-specific factory functions for backward compatibility
// TODO: Remove these re-exports in next major version - import from @hex-di/devtools/react
export { defineDevToolsPlugin } from "../react/define-plugin.js";

// =============================================================================
// Type Guards
// =============================================================================

export { isDevToolsCommand, isDevToolsEvent } from "./types.js";

// =============================================================================
// Selectors (Plugin Architecture)
// =============================================================================

export {
  // Utilities
  createSelector,
  createParameterizedSelector,
  compose2Selectors,
  compose3Selectors,
  type Selector,
  type ParameterizedSelector,
  // Plugin Selectors
  selectPlugins,
  selectActivePlugin,
  selectPluginById,
  selectTabList,
  type TabConfig,
  // Container Selectors
  selectSelectedContainers,
  selectIsContainerSelected,
  selectSelectedContainerCount,
  selectHasSelectedContainers,
  // Tracing Selectors
  selectTracingState,
  selectIsTracingActive,
  selectTracingEnabled,
  selectTracingPaused,
  selectTracingThreshold,
  type TracingStateSnapshot,
} from "./selectors/index.js";

// =============================================================================
// Container Lifecycle Types
// =============================================================================

export type {
  ContainerDiscoveryState,
  ContainerDiscoveryContext,
  InspectorEventType,
  TaggedContainerEvent,
  EventFilter,
} from "./types.js";

// =============================================================================
// Extended Runtime Types
// =============================================================================

export type {
  // Extended Commands
  UICommand,
  UIOpenCommand,
  UICloseCommand,
  UIToggleCommand,
  UISelectContainerCommand,
  UIToggleContainerCommand,
  UIExpandContainerCommand,
  UICollapseContainerCommand,
  TracingFilterCommand,
  TracingSetFilterCommand,
  ExtendedDevToolsCommand,

  // Extended State Types
  UiState,
  TracingState,
  DevToolsRuntimeSnapshot,
  DevToolsRuntimeWithContainers,
} from "./types.js";

// =============================================================================
// Plugin Props Derivation Utilities
// =============================================================================

export {
  deriveContainerEntries,
  deriveGraphFromContainers,
  deriveGraphFromSnapshot,
  isSelectedContainer,
  isActiveContainer,
  getSelectedContainers,
  getActiveContainers,
} from "./plugin-props-derivation.js";
