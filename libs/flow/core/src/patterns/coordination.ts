/**
 * Multi-Machine Coordination Guards
 *
 * Provides guard helpers for coordinating multiple child activities:
 * - `waitForAll(childIds)`: returns true when all specified children completed
 * - `waitForAny(childIds)`: returns true when any specified child completed
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Context shape expected by coordination guards.
 * The machine context must have an `activities` record mapping
 * activity IDs to their status.
 */
export interface CoordinationContext {
  readonly completedActivities?: readonly string[];
}

// =============================================================================
// Guards
// =============================================================================

/**
 * Creates a guard that returns true when ALL specified child activity IDs
 * have been recorded as completed in the context.
 *
 * @param childIds - The activity IDs that must all be completed
 * @returns A guard function
 *
 * @example
 * ```typescript
 * const allDone = waitForAll(['fetch-users', 'fetch-settings']);
 *
 * const machine = defineMachine({
 *   states: {
 *     waiting: {
 *       on: {
 *         ACTIVITY_DONE: [
 *           { target: 'ready', guard: allDone },
 *           { target: 'waiting' },
 *         ],
 *       },
 *     },
 *   },
 * });
 * ```
 */
export function waitForAll(childIds: readonly string[]): (context: CoordinationContext) => boolean {
  return (context: CoordinationContext): boolean => {
    const completed = context.completedActivities ?? [];
    return childIds.every(id => completed.includes(id));
  };
}

/**
 * Creates a guard that returns true when ANY of the specified child activity IDs
 * has been recorded as completed in the context.
 *
 * @param childIds - The activity IDs, at least one of which must be completed
 * @returns A guard function
 *
 * @example
 * ```typescript
 * const anyDone = waitForAny(['fast-api', 'slow-api']);
 *
 * const machine = defineMachine({
 *   states: {
 *     racing: {
 *       on: {
 *         ACTIVITY_DONE: [
 *           { target: 'done', guard: anyDone },
 *           { target: 'racing' },
 *         ],
 *       },
 *     },
 *   },
 * });
 * ```
 */
export function waitForAny(childIds: readonly string[]): (context: CoordinationContext) => boolean {
  return (context: CoordinationContext): boolean => {
    const completed = context.completedActivities ?? [];
    return childIds.some(id => completed.includes(id));
  };
}
