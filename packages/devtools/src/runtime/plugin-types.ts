/**
 * DevTools Plugin Types
 *
 * This module provides a focused re-export of plugin-related types
 * from the DevTools runtime type system, along with additional utility
 * types for plugin development.
 *
 * ## Core Types (Framework-Agnostic)
 * - `PluginShortcut`: Keyboard shortcut definition for plugins
 * - `PluginMetadata`: Framework-agnostic plugin metadata
 * - `PluginDefinition`: Generic plugin definition with type parameters
 *
 * ## React-Specific Types
 * - `DevToolsPlugin`: React-specific plugin interface
 * - `PluginProps`: Props passed to React plugin components
 * - `ContainerEntry`: Container information for multi-container support
 *
 * ## Usage
 *
 * Import these types when creating custom DevTools plugins:
 *
 * ```typescript
 * import type { DevToolsPlugin, PluginProps } from "@hex-di/devtools";
 *
 * function MyPluginContent(props: PluginProps) {
 *   const { runtime, state, graph } = props;
 *   return <div>My Plugin</div>;
 * }
 *
 * export const MyPlugin: DevToolsPlugin = {
 *   id: "my-plugin",
 *   label: "My Plugin",
 *   component: MyPluginContent,
 * };
 * ```
 *
 * @packageDocumentation
 */

import type { ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI, ContainerSnapshot } from "@hex-di/plugin";

// =============================================================================
// Re-export Framework-Agnostic Core Types
// =============================================================================

export type {
  PluginShortcut,
  PluginMetadata,
  PluginDefinition,
  TabConfigCore,
} from "./plugin-types-core.js";

// =============================================================================
// Container Entry
// =============================================================================

import type { ContainerDiscoveryState } from "./types.js";

/**
 * Entry representing a registered container with all metadata needed for UI display.
 *
 * Used for container selection in multi-container scenarios.
 * Each entry provides the container's identity, hierarchy position,
 * discovery state, and selection status.
 *
 * @example
 * ```typescript
 * const entry: ContainerEntry = {
 *   id: "root-container",
 *   name: "Application Root",
 *   path: "root-container",
 *   kind: "root",
 *   state: "active",
 *   isSelected: true,
 *   snapshot: {
 *     kind: "root",
 *     phase: "initialized",
 *     // ... other snapshot fields
 *   },
 * };
 * ```
 */
export interface ContainerEntry {
  /** Unique identifier for the container */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Formatted path string (e.g., "root/child/grandchild") */
  readonly path: string;
  /** Container type in the hierarchy */
  readonly kind: "root" | "child" | "lazy";
  /** Current discovery/subscription state */
  readonly state: ContainerDiscoveryState;
  /** Whether this container is currently selected in the UI */
  readonly isSelected: boolean;
  /** Optional current snapshot of container state (for backward compatibility) */
  readonly snapshot?: ContainerSnapshot;
}

// =============================================================================
// Plugin Shortcut (re-exported from core)
// =============================================================================

// PluginShortcut is now defined in plugin-types-core.ts and re-exported above.
// Import from this module or directly from plugin-types-core.ts.
import type { PluginShortcut, PluginMetadata } from "./plugin-types-core.js";

// =============================================================================
// Plugin Props (Forward Declaration Pattern)
// =============================================================================

/**
 * Minimal runtime interface required by plugins.
 *
 * This interface defines only what plugins need to interact with the runtime.
 * The full `DevToolsRuntime` interface is defined in types.ts.
 */
export interface PluginRuntimeAccess {
  /**
   * Dispatch a command to mutate runtime state.
   * Commands are processed synchronously.
   */
  dispatch(command: PluginCommand): void;
  /**
   * Get the current immutable state snapshot.
   */
  getState(): PluginStateSnapshot;
}

/**
 * Command types that plugins can dispatch.
 */
export type PluginCommand =
  | { readonly type: "selectTab"; readonly tabId: string }
  | { readonly type: "selectContainers"; readonly ids: ReadonlySet<string> }
  | { readonly type: "toggleTracing" }
  | { readonly type: "pauseTracing" }
  | { readonly type: "resumeTracing" }
  | { readonly type: "setThreshold"; readonly value: number }
  | { readonly type: "clearTraces" };

/**
 * State snapshot that plugins receive.
 */
export interface PluginStateSnapshot {
  readonly activeTabId: string;
  readonly selectedContainerIds: ReadonlySet<string>;
  readonly tracingEnabled: boolean;
  readonly tracingPaused: boolean;
  readonly tracingThreshold: number;
  readonly plugins: readonly DevToolsPlugin[];
}

/**
 * Props passed to plugin components.
 *
 * Provides runtime access and current state for plugin rendering.
 * Plugins receive this via their `component` function and should
 * use it to read state and dispatch commands.
 *
 * All properties are readonly to enforce immutability patterns.
 * Plugins should never mutate the props directly but instead
 * use `runtime.dispatch()` to trigger state changes.
 *
 * @example
 * ```typescript
 * function MyPluginContent(props: PluginProps) {
 *   const { runtime, state, graph, containers } = props;
 *
 *   // Read current state
 *   const selectedIds = state.selectedContainerIds;
 *
 *   // Dispatch commands to change state
 *   const handleSelectContainer = (id: string) => {
 *     runtime.dispatch({
 *       type: "selectContainers",
 *       ids: new Set([id]),
 *     });
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export interface PluginProps {
  /** Access to the DevTools runtime for dispatching commands */
  readonly runtime: PluginRuntimeAccess;
  /** Current runtime state snapshot */
  readonly state: PluginStateSnapshot;
  /** Current dependency graph data */
  readonly graph: ExportedGraph;
  /** Optional tracing API access (undefined if tracing not enabled) */
  readonly tracingAPI?: TracingAPI;
  /** Available containers for inspection */
  readonly containers: readonly ContainerEntry[];
}

// =============================================================================
// DevTools Plugin
// =============================================================================

/**
 * DevTools plugin definition (React-specific).
 *
 * Extends the framework-agnostic `PluginMetadata` with React-specific
 * icon and component types.
 *
 * Each plugin contributes one tab to the DevTools panel.
 * Plugins are statically registered at runtime creation and
 * are immutable afterward.
 *
 * ## Required Fields
 * - `id`: Unique identifier used internally (lowercase, no spaces)
 * - `label`: Display text shown in the tab header
 * - `component`: React component that renders the tab content
 *
 * ## Optional Fields
 * - `icon`: React element displayed next to the label
 * - `shortcuts`: Keyboard shortcuts for this plugin
 *
 * ## Plugin Component Requirements
 * The component must accept `PluginProps` and should:
 * 1. Read state from `props.state`, not internal component state
 * 2. Dispatch commands via `props.runtime.dispatch()`
 * 3. Be pure renderers - derive all display data from props
 *
 * @example
 * ```typescript
 * import { GraphIcon } from "./icons";
 *
 * function GraphContent(props: PluginProps) {
 *   const { graph, state, runtime } = props;
 *   return <DependencyGraph nodes={graph.nodes} edges={graph.edges} />;
 * }
 *
 * const GraphPlugin: DevToolsPlugin = {
 *   id: "graph",
 *   label: "Graph",
 *   icon: <GraphIcon />,
 *   component: GraphContent,
 *   shortcuts: [
 *     {
 *       key: "g",
 *       action: () => console.log("Graph focused"),
 *       description: "Focus graph tab"
 *     }
 *   ],
 * };
 * ```
 */
export interface DevToolsPlugin extends PluginMetadata {
  /** Optional icon element for the tab (React-specific) */
  readonly icon?: ReactElement;
  /** React component that renders the tab content */
  readonly component: React.ComponentType<PluginProps>;
}

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extracts the plugin IDs from an array of plugins.
 *
 * Useful for type-safe plugin ID validation and tab management.
 *
 * @example
 * ```typescript
 * const plugins = [GraphPlugin, ServicesPlugin] as const;
 * type PluginId = ExtractPluginIds<typeof plugins>;
 * // type PluginId = "graph" | "services"
 * ```
 */
export type ExtractPluginIds<T extends readonly DevToolsPlugin[]> = T[number]["id"];

/**
 * Type representing a valid plugin configuration object.
 *
 * This type mirrors `DevToolsPlugin` but is useful for creating
 * plugin factory functions with proper type inference.
 */
export type PluginConfig = {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactElement;
  readonly shortcuts?: readonly PluginShortcut[];
  readonly component: React.ComponentType<PluginProps>;
};

/**
 * Helper type to check if a plugin has shortcuts defined.
 *
 * @example
 * ```typescript
 * type GraphHasShortcuts = HasShortcuts<typeof GraphPlugin>;
 * // If GraphPlugin has shortcuts, this is true
 * ```
 */
export type HasShortcuts<P extends DevToolsPlugin> =
  P["shortcuts"] extends readonly PluginShortcut[] ? true : false;

/**
 * Creates a type that requires all plugin fields to be present.
 * Useful for strict plugin validation at compile time.
 */
export type StrictPlugin = Required<Pick<DevToolsPlugin, "id" | "label" | "component">> &
  Pick<DevToolsPlugin, "icon" | "shortcuts">;

/**
 * Type for a minimal plugin without optional fields.
 */
export type MinimalPlugin = Pick<DevToolsPlugin, "id" | "label" | "component">;
