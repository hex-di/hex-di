/**
 * React-Specific Plugin Types
 *
 * This module provides React-specific plugin types for the DevTools system.
 * Framework-agnostic core types are in `runtime/plugin-types-core.ts`.
 *
 * @packageDocumentation
 */

import type { ReactElement, ComponentType } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI, ContainerSnapshot } from "@hex-di/core";
import type { PluginShortcut, PluginMetadata } from "../../runtime/plugin-types-core.js";
import type { ContainerDiscoveryState } from "../../runtime/types.js";
import type { UseContainerScopeTreeResult } from "../hooks/use-container-scope-tree.js";

// =============================================================================
// Container Entry
// =============================================================================

/**
 * Entry representing a registered container with all metadata needed for UI display.
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
  /** Optional current snapshot of container state */
  readonly snapshot?: ContainerSnapshot;
}

// =============================================================================
// Plugin Commands
// =============================================================================

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
  | { readonly type: "clearTraces" }
  | { readonly type: "pinTrace"; readonly traceId: string }
  | { readonly type: "unpinTrace"; readonly traceId: string };

// =============================================================================
// Plugin Runtime Access
// =============================================================================

/**
 * Minimal runtime interface required by plugins.
 */
export interface PluginRuntimeAccess {
  /**
   * Dispatch a command to mutate runtime state.
   * Commands are processed synchronously.
   */
  dispatch(command: PluginCommand): void;
}

// =============================================================================
// Plugin State Snapshot
// =============================================================================

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

// =============================================================================
// Plugin Props
// =============================================================================

/**
 * Props passed to plugin components.
 *
 * Provides runtime access and current state for plugin rendering.
 * All properties are readonly to enforce immutability patterns.
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
  /** Container scope tree data (null if not available) */
  readonly containerScopeTree: UseContainerScopeTreeResult | null;
}

// =============================================================================
// DevTools Plugin
// =============================================================================

/**
 * DevTools plugin definition (React-specific).
 *
 * Extends the framework-agnostic `PluginMetadata` with React-specific
 * icon and component types.
 */
export interface DevToolsPlugin extends PluginMetadata {
  /** Optional icon element for the tab */
  readonly icon?: ReactElement;
  /** React component that renders the tab content */
  readonly component: ComponentType<PluginProps>;
}

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extracts the plugin IDs from an array of plugins.
 */
export type ExtractPluginIds<T extends readonly DevToolsPlugin[]> = T[number]["id"];

/**
 * Type representing a valid plugin configuration object.
 */
export type PluginConfig = {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactElement;
  readonly shortcuts?: readonly PluginShortcut[];
  readonly component: ComponentType<PluginProps>;
};

/**
 * Helper type to check if a plugin has shortcuts defined.
 */
export type HasShortcuts<P extends DevToolsPlugin> =
  P["shortcuts"] extends readonly PluginShortcut[] ? true : false;

/**
 * Creates a type that requires all plugin fields to be present.
 */
export type StrictPlugin = Required<Pick<DevToolsPlugin, "id" | "label" | "component">> &
  Pick<DevToolsPlugin, "icon" | "shortcuts">;

/**
 * Type for a minimal plugin without optional fields.
 */
export type MinimalPlugin = Pick<DevToolsPlugin, "id" | "label" | "component">;
