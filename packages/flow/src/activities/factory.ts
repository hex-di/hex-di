/**
 * Activity Factory
 *
 * This module provides the `activity()` factory function for creating
 * type-safe activity definitions with dependency injection support.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { ActivityPort } from "./port.js";
import type { ActivityConfig, ConfiguredActivity } from "./types.js";

// =============================================================================
// Activity Factory
// =============================================================================

/**
 * Creates a fully configured activity with type-safe dependencies and events.
 *
 * This factory function takes an ActivityPort and configuration to create
 * an immutable activity definition. The activity can then be registered
 * and spawned by the runtime.
 *
 * @typeParam TPort - The ActivityPort type defining input/output types
 * @typeParam TRequires - The tuple of Port types for dependencies (use const modifier)
 * @typeParam TEvents - The events definition from defineEvents()
 *
 * @param port - The activity port this activity implements
 * @param config - The activity configuration
 * @returns A frozen ConfiguredActivity object
 *
 * @remarks
 * The `const` modifier on `TRequires` ensures the tuple type is preserved,
 * enabling proper type inference for the `deps` object in the execute function.
 *
 * @example
 * ```typescript
 * const TaskActivityPort = activityPort<{ taskId: string }, TaskResult>()('TaskActivity');
 *
 * const TaskEvents = defineEvents({
 *   PROGRESS: (percent: number) => ({ percent }),
 *   COMPLETED: (result: TaskResult) => ({ result }),
 * });
 *
 * const TaskActivity = activity(TaskActivityPort, {
 *   requires: [ApiPort, LoggerPort],
 *   emits: TaskEvents,
 *   timeout: 30_000,
 *
 *   execute: async (input, { deps, sink, signal }) => {
 *     sink.emit(TaskEvents.PROGRESS(0));
 *     const result = await deps.Api.fetch(input.taskId);
 *     deps.Logger.info('Complete');
 *     sink.emit(TaskEvents.COMPLETED(result));
 *     return result;
 *   },
 *
 *   cleanup: async (reason, { deps }) => {
 *     if (reason !== 'completed') {
 *       deps.Logger.warn('Task cleanup', { reason });
 *     }
 *   },
 * });
 * ```
 */
export function activity<
  TPort extends ActivityPort<unknown, unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TEvents,
>(
  port: TPort,
  config: ActivityConfig<TPort, TRequires, TEvents>
): ConfiguredActivity<TPort, TRequires, TEvents> {
  const baseActivity = {
    port,
    requires: config.requires,
    emits: config.emits,
    timeout: config.timeout,
    execute: config.execute,
  };

  if (config.cleanup !== undefined) {
    return Object.freeze({
      ...baseActivity,
      cleanup: config.cleanup,
    });
  }

  return Object.freeze(baseActivity);
}
