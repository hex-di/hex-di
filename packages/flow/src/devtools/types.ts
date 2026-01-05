/**
 * DevTools Types
 *
 * This module provides type definitions for DevTools integration,
 * including metadata extraction for activities and visualization support.
 *
 * @packageDocumentation
 */

// =============================================================================
// Activity Metadata Interface
// =============================================================================

/**
 * Metadata about an activity for DevTools visualization.
 *
 * This interface provides a serializable representation of an activity's
 * configuration that can be used by DevTools for:
 * - Displaying activity information in the graph
 * - Showing dependency relationships
 * - Visualizing event emission capabilities
 * - Tracking timeout and cleanup configurations
 *
 * @remarks
 * All properties are readonly and primitive types (or readonly arrays of strings)
 * to ensure the metadata is easily serializable and immutable.
 *
 * @example
 * ```typescript
 * const metadata: ActivityMetadata = {
 *   portName: 'TaskActivity',
 *   requires: ['Api', 'Logger'],
 *   emits: ['PROGRESS', 'COMPLETED', 'FAILED'],
 *   hasCleanup: true,
 *   defaultTimeout: 30000,
 * };
 * ```
 */
export interface ActivityMetadata {
  /**
   * The name of the activity's port.
   * Extracted from `activity.port.__portName`.
   */
  readonly portName: string;

  /**
   * List of port names that this activity depends on.
   * Extracted from the `requires` array of the activity.
   */
  readonly requires: readonly string[];

  /**
   * List of event type names that this activity can emit.
   * Extracted from the keys of the `emits` object.
   */
  readonly emits: readonly string[];

  /**
   * Whether the activity has a cleanup function defined.
   */
  readonly hasCleanup: boolean;

  /**
   * The default timeout in milliseconds, or undefined if no timeout.
   */
  readonly defaultTimeout: number | undefined;
}
