/**
 * FlowPlugin Implementation
 *
 * This module provides the FlowPlugin factory function that creates a DevTools
 * plugin for visualizing Flow state machines. The plugin supports configurable
 * visibility filtering to show or hide internal DevTools machines.
 *
 * ## Key Features
 *
 * - Visibility filtering with three modes: user, all, custom
 * - Configurable internal prefix exclusion
 * - Frozen immutable plugin instances
 * - DevToolsPlugin compatible interface
 *
 * @packageDocumentation
 */

import { defineDevToolsPlugin, type DevToolsPlugin, type PluginProps } from "@hex-di/devtools";
import type { FlowPluginOptions, VisibilityFilter } from "./types.js";

// =============================================================================
// Constants
// =============================================================================

/** Plugin identifier */
const FLOW_PLUGIN_ID = "flow";

/** Plugin display label */
const FLOW_PLUGIN_LABEL = "Flow";

/** Keyboard shortcut to focus the flow tab */
const FLOW_PLUGIN_SHORTCUT_KEY = "f";

/** Shortcut description */
const FLOW_PLUGIN_SHORTCUT_DESCRIPTION = "Focus flow tab";

/**
 * Default prefixes used to identify internal/DevTools machines.
 *
 * Machines with IDs starting with any of these prefixes are hidden
 * by default in "user" visibility mode.
 */
export const DEFAULT_INTERNAL_PREFIXES: readonly string[] = Object.freeze([
  "__devtools",
  "__internal",
  "devtools.",
]);

// =============================================================================
// Visibility Filter Factory
// =============================================================================

/**
 * Creates a visibility filter function based on the provided options.
 *
 * The filter determines which machines should be visible in the DevTools panel.
 *
 * @param options - FlowPlugin options controlling visibility
 * @returns A filter function that takes a machineId and returns visibility
 *
 * @example User mode (default)
 * ```typescript
 * const filter = createVisibilityFilter({ visibility: "user" });
 * filter("__devtools.discovery"); // false (internal)
 * filter("App.authMachine");      // true (user)
 * ```
 *
 * @example All mode
 * ```typescript
 * const filter = createVisibilityFilter({ visibility: "all" });
 * filter("__devtools.discovery"); // true (all included)
 * filter("App.authMachine");      // true
 * ```
 *
 * @example Custom mode
 * ```typescript
 * const filter = createVisibilityFilter({
 *   visibility: "custom",
 *   filter: (id) => id.startsWith("App."),
 * });
 * filter("App.authMachine");   // true (matches prefix)
 * filter("other.machine");     // false (doesn't match)
 * ```
 */
export function createVisibilityFilter(options: FlowPluginOptions = {}): VisibilityFilter {
  const visibility = options.visibility ?? "user";

  switch (visibility) {
    case "all":
      // Include everything
      return () => true;

    case "custom":
      // Use provided filter or default to including all
      return options.filter ?? (() => true);

    case "user":
    default: {
      // Exclude machines with internal prefixes
      const prefixes = options.internalPrefixes ?? DEFAULT_INTERNAL_PREFIXES;
      return (machineId: string) => {
        for (const prefix of prefixes) {
          if (machineId.startsWith(prefix)) {
            return false;
          }
        }
        return true;
      };
    }
  }
}

// =============================================================================
// Flow Plugin Content Component
// =============================================================================

/**
 * Props for the FlowPluginContent component.
 *
 * Extends PluginProps with the visibility filter.
 */
interface FlowPluginContentProps extends PluginProps {
  /** Visibility filter for determining which machines to show */
  readonly visibilityFilter: VisibilityFilter;
}

/**
 * Flow plugin content component (placeholder).
 *
 * This component renders the Flow state machine visualization.
 * Currently a placeholder that shows a message - full implementation
 * will be added in a future spec.
 */
function FlowPluginContentInner(props: FlowPluginContentProps): React.ReactElement {
  const { visibilityFilter: _ } = props;

  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#666",
      }}
    >
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>Flow State Machines</div>
      <div style={{ fontSize: "14px", textAlign: "center" }}>
        Flow machine visualization coming soon.
        <br />
        This plugin will display state machine graphs and transitions.
      </div>
    </div>
  );
}

// =============================================================================
// Plugin Factory
// =============================================================================

/**
 * Creates a FlowPlugin instance for DevTools.
 *
 * The FlowPlugin provides visualization for Flow state machines registered
 * with the container. It supports configurable visibility filtering to
 * control which machines are displayed.
 *
 * ## Visibility Modes
 *
 * - **user** (default): Hides internal DevTools machines
 * - **all**: Shows all machines including internals
 * - **custom**: Uses a provided filter function
 *
 * ## Internal Prefix Detection
 *
 * In "user" mode, machines with IDs starting with these prefixes are hidden:
 * - `__devtools`
 * - `__internal`
 * - `devtools.`
 *
 * You can customize these prefixes via the `internalPrefixes` option.
 *
 * @param options - Configuration options for the plugin
 * @returns A frozen DevToolsPlugin instance
 *
 * @example Basic usage
 * ```typescript
 * import { FlowPlugin } from "@hex-di/devtools-flow";
 * import { HexDiDevTools, defaultPlugins } from "@hex-di/devtools/react";
 *
 * <HexDiDevTools
 *   container={container}
 *   plugins={[...defaultPlugins(), FlowPlugin()]}
 * />
 * ```
 *
 * @example Show all machines
 * ```typescript
 * FlowPlugin({ visibility: "all" })
 * ```
 *
 * @example Custom filter
 * ```typescript
 * FlowPlugin({
 *   visibility: "custom",
 *   filter: (id) => id.startsWith("App."),
 * })
 * ```
 *
 * @example Custom internal prefixes
 * ```typescript
 * FlowPlugin({
 *   visibility: "user",
 *   internalPrefixes: ["_private.", "internal."],
 * })
 * ```
 */
export function FlowPlugin(options: FlowPluginOptions = {}): DevToolsPlugin {
  // Create the visibility filter based on options
  const visibilityFilter = createVisibilityFilter(options);

  // Create shortcut action - primarily for documentation purposes
  // The DevTools panel handles actual tab switching via runtime.dispatch()
  const shortcutAction = (): void => {
    // Shortcut action is handled by the DevTools panel
  };

  // Create the wrapped component that includes the visibility filter
  function FlowPluginContent(props: PluginProps): React.ReactElement {
    return <FlowPluginContentInner {...props} visibilityFilter={visibilityFilter} />;
  }

  // Set display name for debugging
  FlowPluginContent.displayName = "FlowPluginContent";

  return defineDevToolsPlugin({
    id: FLOW_PLUGIN_ID,
    label: FLOW_PLUGIN_LABEL,
    component: FlowPluginContent,
    shortcuts: [
      {
        key: FLOW_PLUGIN_SHORTCUT_KEY,
        action: shortcutAction,
        description: FLOW_PLUGIN_SHORTCUT_DESCRIPTION,
      },
    ],
  });
}
