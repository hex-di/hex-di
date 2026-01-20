/**
 * Framework-Agnostic Plugin Core Types
 *
 * This module provides framework-agnostic type definitions for the plugin system.
 * These types can be used without any UI framework dependency, enabling:
 * - Framework-agnostic plugin metadata
 * - Potential support for non-React frameworks
 * - Cleaner separation between runtime logic and UI concerns
 *
 * React-specific types are defined in plugin-types.ts which extends these core types.
 *
 * @packageDocumentation
 */

import type { ContainerSnapshot } from "@hex-di/plugin";

// =============================================================================
// Plugin Shortcut (Framework-Agnostic)
// =============================================================================

/**
 * Keyboard shortcut definition for a plugin.
 *
 * Plugins can define keyboard bindings to provide quick access
 * to their functionality. Shortcuts are registered with the runtime
 * and displayed in the DevTools UI for discoverability.
 *
 * ## Design Note: Action Callback
 *
 * The `action` callback serves primarily as a hook for future extensibility.
 * Currently, the DevTools panel handles keyboard events and performs tab
 * navigation directly via the store. The action callback is NOT invoked
 * by the keyboard event handler - it exists for:
 *
 * 1. **Metadata completeness** - Allows plugins to declare intent
 * 2. **Future extensibility** - May be used for custom plugin actions
 * 3. **Testing** - Can be invoked directly in unit tests
 *
 * For now, providing an empty function `() => {}` is acceptable and expected.
 *
 * Key format follows standard keyboard event patterns:
 * - Single key: "g", "s", "t"
 * - With modifiers: "ctrl+s", "shift+t", "ctrl+shift+g"
 *
 * @example
 * ```typescript
 * // Typical usage - action is a stub for now
 * const shortcut: PluginShortcut = {
 *   key: "g",
 *   action: () => {},  // Keyboard handling done by DevTools panel
 *   description: "Focus graph tab",
 * };
 * ```
 */
export interface PluginShortcut {
  /** Keyboard key or combination (e.g., "g", "ctrl+s", "shift+t") */
  readonly key: string;
  /**
   * Callback invoked when shortcut is triggered.
   *
   * Note: Currently not called by the DevTools keyboard handler.
   * Tab switching is handled directly via the store. This callback
   * is reserved for future plugin-specific shortcut actions.
   */
  readonly action: () => void;
  /** Human-readable description for help/tooltips */
  readonly description: string;
}

// =============================================================================
// Plugin Metadata (Framework-Agnostic)
// =============================================================================

/**
 * Framework-agnostic plugin metadata.
 *
 * Contains all plugin information except UI-framework-specific fields.
 * This interface can be extended by framework-specific interfaces
 * to add icon and component properties.
 *
 * @example
 * ```typescript
 * const metadata: PluginMetadata = {
 *   id: "my-plugin",
 *   label: "My Plugin",
 *   shortcuts: [{ key: "m", action: () => {}, description: "Focus my plugin" }],
 * };
 * ```
 */
export interface PluginMetadata {
  /** Unique identifier for the plugin (lowercase, no spaces) */
  readonly id: string;
  /** Display label shown in the tab */
  readonly label: string;
  /** Optional keyboard shortcuts for this plugin */
  readonly shortcuts?: readonly PluginShortcut[];
}

// =============================================================================
// Generic Plugin Definition
// =============================================================================

/**
 * Generic plugin definition that can work with any UI framework.
 *
 * TIcon and TComponent are parameterized to allow different frameworks
 * to provide their own icon and component types:
 * - React: TIcon = ReactElement, TComponent = React.ComponentType<PluginProps>
 * - Vue: TIcon = VNode, TComponent = Component
 * - Svelte: TIcon = SvelteComponent, TComponent = ComponentType
 *
 * @typeParam TProps - Props type passed to the component
 * @typeParam TIcon - Icon element type (framework-specific)
 * @typeParam TComponent - Component type (framework-specific)
 *
 * @example
 * ```typescript
 * // React-specific binding
 * type ReactPlugin = PluginDefinition<PluginProps, ReactElement, React.ComponentType<PluginProps>>;
 * ```
 */
export interface PluginDefinition<
  TProps = unknown,
  TIcon = unknown,
  TComponent = (props: TProps) => unknown,
> extends PluginMetadata {
  /** Optional icon element for the tab */
  readonly icon?: TIcon;
  /** Component that renders the tab content */
  readonly component: TComponent;
}

// =============================================================================
// Tab Configuration (Framework-Agnostic)
// =============================================================================

/**
 * Framework-agnostic tab configuration for rendering.
 *
 * This is a minimal projection of plugin properties needed for tab rendering,
 * without the icon property (which is framework-specific).
 *
 * Framework-specific extensions (like TabConfig in selectors/plugins.ts)
 * add the icon property with the appropriate framework type.
 */
export interface TabConfigCore {
  /** Unique identifier for the tab */
  readonly id: string;
  /** Display label for the tab */
  readonly label: string;
}

// =============================================================================
// Plugin Commands (Framework-Agnostic)
// =============================================================================

/**
 * Command types that plugins can dispatch.
 *
 * Commands are framework-agnostic actions that modify runtime state.
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
// Plugin Runtime Access (Framework-Agnostic)
// =============================================================================

/**
 * Minimal runtime interface required by plugins.
 *
 * This interface is framework-agnostic - it only requires a dispatch function.
 */
export interface PluginRuntimeAccess {
  /**
   * Dispatch a command to mutate runtime state.
   * Commands are processed synchronously.
   */
  dispatch(command: PluginCommand): void;
}

// =============================================================================
// Plugin State Snapshot (Framework-Agnostic)
// =============================================================================

/**
 * Framework-agnostic state snapshot for plugins.
 *
 * This version uses `readonly PluginMetadata[]` instead of the React-specific
 * `DevToolsPlugin[]`. The React layer extends this with the full plugin type.
 *
 * @typeParam TPlugin - The plugin type (defaults to PluginMetadata for framework-agnostic use)
 */
export interface PluginStateSnapshotCore<TPlugin extends PluginMetadata = PluginMetadata> {
  readonly activeTabId: string;
  readonly selectedContainerIds: ReadonlySet<string>;
  readonly tracingEnabled: boolean;
  readonly tracingPaused: boolean;
  readonly tracingThreshold: number;
  readonly plugins: readonly TPlugin[];
}

// =============================================================================
// Container Discovery State (Framework-Agnostic)
// =============================================================================

/**
 * Lifecycle state for container discovery and subscription.
 *
 * Tracks the progression of container integration with DevTools:
 * - pending: Container registered but not yet subscribed
 * - subscribing: Subscription in progress
 * - active: Actively receiving events
 * - paused: Subscription paused (e.g., DevTools minimized)
 * - error: Subscription failed
 * - disposing: Container being disposed
 * - disposed: Container fully disposed
 */
export type ContainerDiscoveryState =
  | "pending"
  | "subscribing"
  | "active"
  | "paused"
  | "error"
  | "disposing"
  | "disposed";

// =============================================================================
// Container Entry (Framework-Agnostic)
// =============================================================================

/**
 * Entry representing a registered container with all metadata needed for UI display.
 *
 * This type is framework-agnostic - it contains only data, no UI elements.
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
// Plugin Config (Framework-Agnostic Base)
// =============================================================================

/**
 * Framework-agnostic plugin configuration.
 *
 * This is the base type for plugin configuration. Framework-specific
 * versions extend this with icon and component types.
 */
export interface PluginConfigCore {
  readonly id: string;
  readonly label: string;
  readonly shortcuts?: readonly PluginShortcut[];
}
