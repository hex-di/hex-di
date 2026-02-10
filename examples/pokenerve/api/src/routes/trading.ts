import { Hono } from "hono";
import type {
  TradeSagaState,
  TradeSagaStep,
  TradeSagaStepName,
  TradeCompensationStepName,
} from "@pokenerve/shared/types/trading.js";

const trades = new Map<string, TradeSagaState>();

let tradeCounter = 0;

function generateTradeId(): string {
  tradeCounter++;
  return `trade-${Date.now()}-${tradeCounter}`;
}

const FORWARD_STEPS: readonly TradeSagaStepName[] = [
  "initiate_trade",
  "select_pokemon",
  "verify_ownership",
  "lock_pokemon",
  "execute_swap",
  "confirm_receipt",
  "complete",
];

const COMPENSATION_STEPS: readonly TradeCompensationStepName[] = [
  "unlock_pokemon",
  "return_pokemon",
  "notify_cancellation",
];

function createInitialStep(name: TradeSagaStepName | TradeCompensationStepName): TradeSagaStep {
  return {
    name,
    status: "pending",
    startedAt: null,
    completedAt: null,
    error: null,
  };
}

/**
 * Type guard for forward step names.
 * Uses .some() comparison to avoid type casting the readonly array.
 */
function isForwardStep(step: string | null): step is TradeSagaStepName {
  if (step === null) return false;
  return FORWARD_STEPS.some(s => s === step);
}

/**
 * Type guard for compensation step names.
 * Uses .some() comparison to avoid type casting the readonly array.
 */
function isCompensationStep(step: string | null): step is TradeCompensationStepName {
  if (step === null) return false;
  return COMPENSATION_STEPS.some(s => s === step);
}

const tradingRoutes = new Hono();

// POST /trading/initiate - create a new trade
tradingRoutes.post("/trading/initiate", async c => {
  const body = await c.req.json<{
    trainerId?: string;
    partnerTrainerId?: string;
    offeredPokemonId?: number;
    requestedPokemonId?: number;
    chaosMode?: boolean;
    failureProbability?: number;
  }>();

  const tradeId = generateTradeId();

  const initialState: TradeSagaState = {
    tradeId,
    currentStep: "initiate_trade",
    forwardSteps: FORWARD_STEPS.map(createInitialStep),
    compensationSteps: COMPENSATION_STEPS.map(createInitialStep),
    isCompensating: false,
    isComplete: false,
    chaosMode: body.chaosMode ?? false,
    failureProbability: body.failureProbability ?? 0,
  };

  trades.set(tradeId, initialState);

  return c.json(
    {
      tradeId,
      status: "initiated",
      currentStep: initialState.currentStep,
      message: "Trade initiated. Call /trading/:id/step to advance.",
    },
    201
  );
});

// POST /trading/:id/step - advance the saga by one step
tradingRoutes.post("/trading/:id/step", async c => {
  const id = c.req.param("id");
  const state = trades.get(id);

  if (state === undefined) {
    return c.json({ error: `Trade ${id} not found` }, 404);
  }

  if (state.isComplete) {
    return c.json({ error: "Trade is already complete", state }, 400);
  }

  const now = Date.now();

  // Chaos mode: randomly fail steps
  if (state.chaosMode && !state.isCompensating && Math.random() < state.failureProbability) {
    // Start compensation
    if (!isForwardStep(state.currentStep)) {
      return c.json({ error: "Invalid forward step" }, 400);
    }

    const failedStepIndex = FORWARD_STEPS.indexOf(state.currentStep);

    const updatedForwardSteps = state.forwardSteps.map((step, i) => {
      if (i === failedStepIndex) {
        return { ...step, status: "failed" as const, startedAt: now, error: "Chaos mode failure" };
      }
      return step;
    });

    const compensationState: TradeSagaState = {
      ...state,
      forwardSteps: updatedForwardSteps,
      isCompensating: true,
      currentStep: COMPENSATION_STEPS[0],
    };

    trades.set(id, compensationState);

    return c.json({
      tradeId: id,
      status: "compensating",
      currentStep: compensationState.currentStep,
      failedAt: state.currentStep,
      message: "Step failed. Starting compensation.",
    });
  }

  if (state.isCompensating) {
    // Advance compensation steps
    if (!isCompensationStep(state.currentStep)) {
      return c.json({ error: "Invalid compensation step" }, 400);
    }

    const currentCompIdx = COMPENSATION_STEPS.indexOf(state.currentStep);

    const updatedCompSteps = state.compensationSteps.map((step, i) => {
      if (i === currentCompIdx) {
        return { ...step, status: "compensated" as const, startedAt: now, completedAt: now };
      }
      return step;
    });

    const nextCompIdx = currentCompIdx + 1;
    const isComplete = nextCompIdx >= COMPENSATION_STEPS.length;

    const updatedState: TradeSagaState = {
      ...state,
      compensationSteps: updatedCompSteps,
      currentStep: isComplete ? null : COMPENSATION_STEPS[nextCompIdx],
      isComplete,
    };

    trades.set(id, updatedState);

    return c.json({
      tradeId: id,
      status: isComplete ? "compensation_complete" : "compensating",
      currentStep: updatedState.currentStep,
      completedStep: COMPENSATION_STEPS[currentCompIdx],
    });
  }

  // Advance forward steps
  if (!isForwardStep(state.currentStep)) {
    return c.json({ error: "Invalid forward step" }, 400);
  }

  const currentIdx = FORWARD_STEPS.indexOf(state.currentStep);

  const updatedForwardSteps = state.forwardSteps.map((step, i) => {
    if (i === currentIdx) {
      return { ...step, status: "completed" as const, startedAt: now, completedAt: now };
    }
    return step;
  });

  const nextIdx = currentIdx + 1;
  const isComplete = nextIdx >= FORWARD_STEPS.length;

  const updatedState: TradeSagaState = {
    ...state,
    forwardSteps: updatedForwardSteps,
    currentStep: isComplete ? null : FORWARD_STEPS[nextIdx],
    isComplete,
  };

  trades.set(id, updatedState);

  return c.json({
    tradeId: id,
    status: isComplete ? "completed" : "in_progress",
    currentStep: updatedState.currentStep,
    completedStep: FORWARD_STEPS[currentIdx],
  });
});

// GET /trading/:id - get trade state
tradingRoutes.get("/trading/:id", c => {
  const id = c.req.param("id");
  const state = trades.get(id);

  if (state === undefined) {
    return c.json({ error: `Trade ${id} not found` }, 404);
  }

  return c.json(state);
});

export { tradingRoutes };
