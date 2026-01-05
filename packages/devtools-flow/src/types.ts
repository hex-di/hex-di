/**
 * FlowPlugin Type Definitions
 *
 * This module defines the types and interfaces for the FlowPlugin,
 * which provides visibility filtering for Flow state machines in DevTools.
 *
 * @packageDocumentation
 */

// =============================================================================
// FlowPlugin Options
// =============================================================================

/**
 * Visibility mode for filtering which Flow machines to display.
 *
 * - `"user"`: Only shows user-defined machines (excludes internal DevTools machines)
 * - `"all"`: Shows all machines including internal DevTools machines
 * - `"custom"`: Uses a custom filter function to determine visibility
 */
export type FlowVisibilityMode = "user" | "all" | "custom";

/**
 * Configuration options for the FlowPlugin.
 *
 * Controls which Flow state machines are visible in the DevTools panel.
 * By default, internal DevTools machines (with prefixes like `__devtools`)
 * are hidden to reduce noise.
 *
 * @example Default usage (user mode)
 * ```typescript
 * const plugin = FlowPlugin(); // Shows only user machines
 * ```
 *
 * @example Show all machines
 * ```typescript
 * const plugin = FlowPlugin({ visibility: "all" });
 * ```
 *
 * @example Custom filter
 * ```typescript
 * const plugin = FlowPlugin({
 *   visibility: "custom",
 *   filter: (machineId) => machineId.startsWith("App."),
 * });
 * ```
 */
export interface FlowPluginOptions {
  /**
   * Filter mode for which FlowServices to display.
   *
   * @default "user" - excludes DevTools internal machines
   */
  readonly visibility?: FlowVisibilityMode;

  /**
   * Custom filter function when visibility is `"custom"`.
   *
   * Called with each machine's ID to determine if it should be visible.
   * Return `true` to show the machine, `false` to hide it.
   *
   * @param machineId - The unique identifier of the machine
   * @returns Whether the machine should be visible
   */
  readonly filter?: (machineId: string) => boolean;

  /**
   * Prefixes to exclude when visibility is `"user"`.
   *
   * Any machine ID starting with one of these prefixes will be hidden.
   * Use this to customize which machines are considered "internal".
   *
   * @default ["__devtools", "__internal", "devtools."]
   */
  readonly internalPrefixes?: readonly string[];
}

// =============================================================================
// Visibility Filter
// =============================================================================

/**
 * Type for a visibility filter function.
 *
 * Takes a machine ID and returns whether it should be visible.
 */
export type VisibilityFilter = (machineId: string) => boolean;
