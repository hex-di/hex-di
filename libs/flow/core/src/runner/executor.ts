/**
 * Effect Executor Module
 *
 * This module provides the EffectExecutor interface and a basic implementation
 * for executing effect descriptors. The real DI-integrated executor will be
 * in the integration module.
 *
 * @packageDocumentation
 */

import { ok, err, ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { EffectAny } from "../effects/types.js";
import type { EffectExecutionError } from "../errors/index.js";
import { ParallelErrors } from "../errors/index.js";

// =============================================================================
// Re-export EffectExecutor from types
// =============================================================================

// The EffectExecutor interface is defined in types.ts to avoid circular dependencies
export type { EffectExecutor } from "./types.js";

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely accesses an additional property on an EffectAny value.
 *
 * EffectAny is a structural interface with only `_tag`. After switching on `_tag`,
 * TypeScript cannot narrow to the concrete effect type, so we access additional
 * properties via runtime check.
 *
 * @internal
 */
function getEffectProperty(effect: EffectAny, prop: string): unknown {
  if (typeof effect === "object" && effect !== null && prop in effect) {
    const desc = Object.getOwnPropertyDescriptor(effect, prop);
    return desc !== undefined ? desc.value : undefined;
  }
  return undefined;
}

/**
 * Type guard that validates whether an unknown value is an EffectAny.
 * Checks that the value is a non-null object with a `_tag` property that is a string.
 *
 * @internal
 */
function isEffectAny(value: unknown): value is EffectAny {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    typeof Object.getOwnPropertyDescriptor(value, "_tag")?.value === "string"
  );
}

/**
 * Combines multiple ResultAsync<void, EffectExecutionError> in parallel.
 * Returns ok if all succeed, or ParallelErrors if any fail.
 *
 * Collects all results via Promise.all (which never rejects since ResultAsync
 * captures errors), then analyzes the collected Result values.
 *
 * @internal
 */
function runParallelEffects(
  tasks: readonly ResultAsync<void, EffectExecutionError>[]
): ResultAsync<void, EffectExecutionError> {
  return ResultAsync.fromResult(
    // ResultAsync never rejects, so Promise.all is safe
    Promise.all(tasks.map(task => task.then((r: Result<void, EffectExecutionError>) => r))).then(
      (results): Result<void, EffectExecutionError> => {
        const errors: unknown[] = [];
        for (const result of results) {
          if (result._tag === "Err") {
            errors.push(result.error);
          }
        }
        return errors.length > 0 ? err(ParallelErrors({ errors })) : ok(undefined);
      }
    )
  );
}

// =============================================================================
// Sequential Execution Helper
// =============================================================================

/**
 * Executes an array of effects sequentially, short-circuiting on first error.
 *
 * Uses an async loop with early return on error, wrapped in ResultAsync.fromResult.
 * This avoids both marker class throws and the andThen TS 5.9 `| null` inference bug.
 *
 * @internal
 */
function executeSequentially(
  effects: readonly EffectAny[],
  execute: (effect: EffectAny) => ResultAsync<void, EffectExecutionError>
): ResultAsync<void, EffectExecutionError> {
  return ResultAsync.fromResult(
    (async (): Promise<Result<void, EffectExecutionError>> => {
      for (const effect of effects) {
        const result = await execute(effect);
        if (result._tag === "Err") {
          return result;
        }
      }
      return ok(undefined);
    })()
  );
}

// =============================================================================
// Basic Effect Executor
// =============================================================================

/**
 * Creates a basic effect executor that handles only simple effects.
 *
 * This executor handles:
 * - DelayEffect: Waits for the specified duration
 * - NoneEffect: No-op
 * - ParallelEffect: Executes effects concurrently
 * - SequenceEffect: Executes effects sequentially
 *
 * For effects that require DI (Invoke, Spawn, Stop, Emit), this executor
 * does nothing. Use DIEffectExecutor for full effect support.
 *
 * @returns A basic EffectExecutor
 *
 * @remarks
 * This is useful for testing or when full DI integration is not needed.
 *
 * @example
 * ```typescript
 * const executor = createBasicExecutor();
 *
 * // Delay effect will wait
 * await executor.execute({ _tag: 'Delay', milliseconds: 100 });
 *
 * // None effect is no-op
 * await executor.execute({ _tag: 'None' });
 * ```
 */
export function createBasicExecutor(): {
  execute(effect: EffectAny): ResultAsync<void, EffectExecutionError>;
} {
  const execute = (effect: EffectAny): ResultAsync<void, EffectExecutionError> => {
    switch (effect._tag) {
      case "Delay": {
        const ms = getEffectProperty(effect, "milliseconds");
        if (typeof ms === "number") {
          return ResultAsync.fromSafePromise(new Promise<void>(resolve => setTimeout(resolve, ms)));
        }
        return ResultAsync.ok(undefined);
      }

      case "None":
        return ResultAsync.ok(undefined);

      case "Parallel": {
        const effects = getEffectProperty(effect, "effects");
        if (Array.isArray(effects)) {
          const validEffects = effects.filter(isEffectAny);
          return runParallelEffects(validEffects.map(e => execute(e)));
        }
        return ResultAsync.ok(undefined);
      }

      case "Sequence": {
        const effects = getEffectProperty(effect, "effects");
        if (Array.isArray(effects)) {
          const validEffects = effects.filter(isEffectAny);
          return executeSequentially(validEffects, execute);
        }
        return ResultAsync.ok(undefined);
      }

      case "Invoke":
      case "Spawn":
      case "Stop":
      case "Emit":
      case "Choose":
      case "Log":
        // These require DI - no-op in basic executor
        return ResultAsync.ok(undefined);
    }
  };

  return { execute };
}
