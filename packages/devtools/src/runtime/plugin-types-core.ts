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

// =============================================================================
// Plugin Shortcut (Framework-Agnostic)
// =============================================================================

/**
 * Keyboard shortcut definition for a plugin.
 *
 * Plugins can define keyboard bindings to provide quick access
 * to their functionality. Shortcuts are registered with the runtime
 * and handled by the DevTools panel.
 *
 * Key format follows standard keyboard event patterns:
 * - Single key: "g", "s", "t"
 * - With modifiers: "ctrl+s", "shift+t", "ctrl+shift+g"
 *
 * @example
 * ```typescript
 * const shortcut: PluginShortcut = {
 *   key: "g",
 *   action: () => runtime.dispatch({ type: "selectTab", tabId: "graph" }),
 *   description: "Focus graph tab",
 * };
 * ```
 */
export interface PluginShortcut {
  /** Keyboard key or combination (e.g., "g", "ctrl+s", "shift+t") */
  readonly key: string;
  /** Callback invoked when shortcut is triggered */
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
