/**
 * Random AI strategy adapter.
 *
 * Implements the AiStrategyPort with a simple strategy: pick a random move
 * from the active Pokemon's available moves that still has PP remaining.
 * Falls back to the first move if no moves have PP.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { AiMoveInput, AiAction } from "@pokenerve/shared/types/battle";
import { AiStrategyPort } from "../../ports/battle.js";

// ---------------------------------------------------------------------------
// Random AI adapter
// ---------------------------------------------------------------------------

const randomAiAdapter = createAdapter({
  provides: AiStrategyPort,
  lifetime: "scoped",
  factory: () => ({
    selectAction(input: AiMoveInput): AiAction {
      const { activeOwn } = input;

      // Find moves with remaining PP
      const availableMoveIndices: number[] = [];
      for (let i = 0; i < activeOwn.moves.length; i++) {
        const move = activeOwn.moves[i];
        if (move && move.currentPp > 0) {
          availableMoveIndices.push(i);
        }
      }

      // If at least one move has PP, pick randomly from available moves
      if (availableMoveIndices.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableMoveIndices.length);
        const moveIndex = availableMoveIndices[randomIndex];
        if (moveIndex !== undefined) {
          return { _tag: "UseMove", moveIndex };
        }
      }

      // Fallback: use first move even with 0 PP (struggle equivalent)
      return { _tag: "UseMove", moveIndex: 0 };
    },
  }),
});

export { randomAiAdapter };
