/**
 * Trading adapter with client-side saga simulation.
 *
 * Implements the TradingPort by simulating a multi-step trading saga
 * entirely in-memory. Supports chaos mode with configurable failure
 * probability for demonstrating saga compensation patterns.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  TradeOffer,
  TradeSagaState,
  TradeSagaStep,
  TradeSagaStepName,
  TradeCompensationStepName,
  TradingError,
} from "@pokenerve/shared/types/trading";
import { TradeNotFound } from "@pokenerve/shared/types/trading";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";
import { TradingPort } from "../../ports/trading.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORWARD_STEP_NAMES: readonly TradeSagaStepName[] = [
  "initiate_trade",
  "select_pokemon",
  "verify_ownership",
  "lock_pokemon",
  "execute_swap",
  "confirm_receipt",
  "complete",
];

const COMPENSATION_STEP_NAMES: readonly TradeCompensationStepName[] = [
  "unlock_pokemon",
  "return_pokemon",
  "notify_cancellation",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTradeId(): string {
  return `trade-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function createInitialForwardSteps(): readonly TradeSagaStep[] {
  return FORWARD_STEP_NAMES.map(name => ({
    name,
    status: "pending" as const,
    startedAt: null,
    completedAt: null,
    error: null,
  }));
}

function createInitialCompensationSteps(): readonly TradeSagaStep[] {
  return COMPENSATION_STEP_NAMES.map(name => ({
    name,
    status: "pending" as const,
    startedAt: null,
    completedAt: null,
    error: null,
  }));
}

function createInitialState(tradeId: string): TradeSagaState {
  return {
    tradeId,
    currentStep: "initiate_trade",
    forwardSteps: createInitialForwardSteps(),
    compensationSteps: createInitialCompensationSteps(),
    isCompensating: false,
    isComplete: false,
    chaosMode: false,
    failureProbability: 0.3,
  };
}

function updateStepInList(
  steps: readonly TradeSagaStep[],
  stepName: TradeSagaStepName | TradeCompensationStepName,
  update: Partial<Pick<TradeSagaStep, "status" | "startedAt" | "completedAt" | "error">>
): readonly TradeSagaStep[] {
  return steps.map(step => {
    if (step.name !== stepName) return step;
    return { ...step, ...update };
  });
}

function findCurrentForwardStepIndex(state: TradeSagaState): number {
  return state.forwardSteps.findIndex(s => s.status === "pending" || s.status === "executing");
}

function findCurrentCompensationStepIndex(state: TradeSagaState): number {
  return state.compensationSteps.findIndex(s => s.status === "pending" || s.status === "executing");
}

function shouldFailInChaosMode(state: TradeSagaState): boolean {
  if (!state.chaosMode) return false;
  return Math.random() < state.failureProbability;
}

// ---------------------------------------------------------------------------
// Trading adapter
// ---------------------------------------------------------------------------

const tradingAdapter = createAdapter({
  provides: TradingPort,
  lifetime: "scoped",
  factory: () => {
    const tradeStates = new Map<string, TradeSagaState>();

    return {
      async initiateTrade(
        offeredPokemon: Pokemon,
        requestedPokemon: Pokemon
      ): Promise<Result<TradeOffer, TradingError>> {
        const tradeId = generateTradeId();
        const now = Date.now();

        const initialState = createInitialState(tradeId);
        tradeStates.set(tradeId, initialState);

        const offer: TradeOffer = {
          id: tradeId,
          offeredPokemon,
          requestedPokemon,
          status: "pending",
          trainerId: "trainer-local",
          partnerTrainerId: "trainer-remote",
          createdAt: now,
          updatedAt: now,
        };

        return ok(offer);
      },

      async advanceStep(tradeId: string): Promise<Result<TradeSagaState, TradingError>> {
        const existing = tradeStates.get(tradeId);
        if (existing === undefined) {
          return err(TradeNotFound({ tradeId }));
        }

        if (existing.isComplete) {
          return ok(existing);
        }

        // --- Compensation path ---
        if (existing.isCompensating) {
          const compIdx = findCurrentCompensationStepIndex(existing);
          if (compIdx < 0) {
            // All compensation steps done
            const completed: TradeSagaState = {
              ...existing,
              currentStep: null,
              isComplete: true,
            };
            tradeStates.set(tradeId, completed);
            return ok(completed);
          }

          const compStep = existing.compensationSteps[compIdx];
          if (compStep === undefined) {
            return ok(existing);
          }

          const compStepName = compStep.name;
          const now = Date.now();

          // Mark step as executing
          const executing: TradeSagaState = {
            ...existing,
            currentStep: compStepName,
            compensationSteps: updateStepInList(existing.compensationSteps, compStepName, {
              status: "executing",
              startedAt: now,
            }),
          };
          tradeStates.set(tradeId, executing);

          // Complete the compensation step
          const completed: TradeSagaState = {
            ...executing,
            compensationSteps: updateStepInList(executing.compensationSteps, compStepName, {
              status: "compensated",
              completedAt: Date.now(),
            }),
          };

          // Check if this was the last compensation step
          const nextCompIdx = compIdx + 1;
          if (nextCompIdx >= existing.compensationSteps.length) {
            const finalState: TradeSagaState = {
              ...completed,
              currentStep: null,
              isComplete: true,
            };
            tradeStates.set(tradeId, finalState);
            return ok(finalState);
          }

          const nextCompStep = existing.compensationSteps[nextCompIdx];
          const finalState: TradeSagaState = {
            ...completed,
            currentStep: nextCompStep !== undefined ? nextCompStep.name : null,
          };
          tradeStates.set(tradeId, finalState);
          return ok(finalState);
        }

        // --- Forward path ---
        const fwdIdx = findCurrentForwardStepIndex(existing);
        if (fwdIdx < 0) {
          // All forward steps are done
          const completed: TradeSagaState = {
            ...existing,
            currentStep: null,
            isComplete: true,
          };
          tradeStates.set(tradeId, completed);
          return ok(completed);
        }

        const fwdStep = existing.forwardSteps[fwdIdx];
        if (fwdStep === undefined) {
          return ok(existing);
        }

        const fwdStepName = fwdStep.name;
        const now = Date.now();

        // Mark step as executing
        const executing: TradeSagaState = {
          ...existing,
          currentStep: fwdStepName,
          forwardSteps: updateStepInList(existing.forwardSteps, fwdStepName, {
            status: "executing",
            startedAt: now,
          }),
        };
        tradeStates.set(tradeId, executing);

        // Check for chaos failure (not on the first or last step)
        if (
          fwdStepName !== "initiate_trade" &&
          fwdStepName !== "complete" &&
          shouldFailInChaosMode(existing)
        ) {
          const failedState: TradeSagaState = {
            ...executing,
            forwardSteps: updateStepInList(executing.forwardSteps, fwdStepName, {
              status: "failed",
              completedAt: Date.now(),
              error: `Chaos mode failure at step: ${fwdStepName}`,
            }),
            isCompensating: true,
            currentStep: COMPENSATION_STEP_NAMES[0] ?? null,
          };
          tradeStates.set(tradeId, failedState);
          return ok(failedState);
        }

        // Complete the forward step
        const completed: TradeSagaState = {
          ...executing,
          forwardSteps: updateStepInList(executing.forwardSteps, fwdStepName, {
            status: "completed",
            completedAt: Date.now(),
          }),
        };

        // Advance to next step or mark complete
        const nextFwdIdx = fwdIdx + 1;
        if (nextFwdIdx >= existing.forwardSteps.length) {
          const finalState: TradeSagaState = {
            ...completed,
            currentStep: null,
            isComplete: true,
          };
          tradeStates.set(tradeId, finalState);
          return ok(finalState);
        }

        const nextFwdStep = existing.forwardSteps[nextFwdIdx];
        const finalState: TradeSagaState = {
          ...completed,
          currentStep: nextFwdStep !== undefined ? nextFwdStep.name : null,
        };
        tradeStates.set(tradeId, finalState);
        return ok(finalState);
      },

      async cancelTrade(tradeId: string): Promise<Result<TradeSagaState, TradingError>> {
        const existing = tradeStates.get(tradeId);
        if (existing === undefined) {
          return err(TradeNotFound({ tradeId }));
        }

        if (existing.isComplete) {
          return ok(existing);
        }

        // Begin compensation
        const cancelledState: TradeSagaState = {
          ...existing,
          isCompensating: true,
          currentStep: COMPENSATION_STEP_NAMES[0] ?? null,
        };
        tradeStates.set(tradeId, cancelledState);
        return ok(cancelledState);
      },

      getTradeState(tradeId: string): Result<TradeSagaState, TradingError> {
        const state = tradeStates.get(tradeId);
        if (state === undefined) {
          return err(TradeNotFound({ tradeId }));
        }
        return ok(state);
      },

      /**
       * Update chaos mode settings on an active trade.
       * This is an extension beyond the port interface, accessed via
       * the adapter directly in the trading feature UI.
       */
      setChaosSettings(
        tradeId: string,
        chaosMode: boolean,
        failureProbability: number
      ): Result<TradeSagaState, TradingError> {
        const existing = tradeStates.get(tradeId);
        if (existing === undefined) {
          return err(TradeNotFound({ tradeId }));
        }
        const updated: TradeSagaState = {
          ...existing,
          chaosMode,
          failureProbability,
        };
        tradeStates.set(tradeId, updated);
        return ok(updated);
      },
    };
  },
});

export { tradingAdapter };
