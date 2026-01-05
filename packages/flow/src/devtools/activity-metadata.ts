/**
 * Activity Metadata Extraction
 *
 * This module provides utilities for extracting metadata from activities
 * for DevTools visualization and debugging purposes.
 *
 * @packageDocumentation
 */

import type { ConfiguredActivityAny } from "../activities/types.js";
import type { ActivityMetadata } from "./types.js";

// =============================================================================
// Metadata Extraction
// =============================================================================

/**
 * Extracts metadata from a configured activity for DevTools visualization.
 *
 * This function takes a ConfiguredActivity and extracts all relevant
 * information into a frozen, serializable metadata object. The metadata
 * can be used by DevTools to:
 *
 * - Display activity information in dependency graphs
 * - Show which ports an activity depends on
 * - Visualize which events an activity can emit
 * - Indicate cleanup and timeout configurations
 *
 * @param activity - The configured activity to extract metadata from
 * @returns A frozen ActivityMetadata object
 *
 * @remarks
 * The returned metadata object is frozen to prevent modification.
 * All string arrays are also frozen for immutability.
 *
 * @example
 * ```typescript
 * const TaskActivity = activity(TaskActivityPort, {
 *   requires: [ApiPort, LoggerPort],
 *   emits: TaskEvents,
 *   timeout: 30_000,
 *   execute: async (input, ctx) => { ... },
 *   cleanup: async (reason, ctx) => { ... },
 * });
 *
 * const metadata = getActivityMetadata(TaskActivity);
 * // {
 * //   portName: 'TaskActivity',
 * //   requires: ['Api', 'Logger'],
 * //   emits: ['PROGRESS', 'COMPLETED', 'FAILED'],
 * //   hasCleanup: true,
 * //   defaultTimeout: 30000,
 * // }
 * ```
 */
export function getActivityMetadata(activity: ConfiguredActivityAny): ActivityMetadata {
  // Extract port name from the activity's port
  const portName = activity.port.__portName;

  // Extract port names from the requires array
  const requires: readonly string[] = Object.freeze(activity.requires.map(port => port.__portName));

  // Extract event type keys from the emits object
  // The emits object is a record where keys are event type names
  const emitsObject = activity.emits;
  const emits: readonly string[] = Object.freeze(
    emitsObject !== null && typeof emitsObject === "object" ? Object.keys(emitsObject) : []
  );

  // Check if cleanup function exists
  const hasCleanup = activity.cleanup !== undefined;

  // Get the default timeout
  const defaultTimeout = activity.timeout;

  // Return frozen metadata object
  return Object.freeze({
    portName,
    requires,
    emits,
    hasCleanup,
    defaultTimeout,
  });
}
