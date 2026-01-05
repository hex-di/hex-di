/**
 * Effect Executor Module
 *
 * This module provides the EffectExecutor interface and a basic implementation
 * for executing effect descriptors. The real DI-integrated executor will be
 * in the integration module.
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";

// =============================================================================
// Re-export EffectExecutor from types
// =============================================================================

// The EffectExecutor interface is defined in types.ts to avoid circular dependencies
export type { EffectExecutor } from "./types.js";

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
  execute(effect: EffectAny): Promise<void>;
} {
  const execute = async (effect: EffectAny): Promise<void> => {
    switch (effect._tag) {
      case "Delay": {
        const delayEffect = effect as { readonly _tag: "Delay"; readonly milliseconds: number };
        await new Promise<void>(resolve => setTimeout(resolve, delayEffect.milliseconds));
        break;
      }

      case "None":
        // No-op
        break;

      case "Parallel": {
        const parallelEffect = effect as {
          readonly _tag: "Parallel";
          readonly effects: readonly EffectAny[];
        };
        await Promise.all(parallelEffect.effects.map(e => execute(e)));
        break;
      }

      case "Sequence": {
        const sequenceEffect = effect as {
          readonly _tag: "Sequence";
          readonly effects: readonly EffectAny[];
        };
        for (const e of sequenceEffect.effects) {
          await execute(e);
        }
        break;
      }

      case "Invoke":
      case "Spawn":
      case "Stop":
      case "Emit":
        // These require DI - no-op in basic executor
        break;
    }
  };

  return { execute };
}
