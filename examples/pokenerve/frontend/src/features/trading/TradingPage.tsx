/**
 * Trading page - saga-driven Pokemon trade with chaos engineering.
 *
 * Two phases:
 * 1. Setup phase: select offered and requested Pokemon, configure chaos mode
 * 2. Execution phase: watch the saga execute, see results or compensation
 *
 * Uses @hex-di/saga via useSaga(TradeSagaPort) for typed multi-step
 * execution with automatic compensation on failure.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useCallback, useMemo } from "react";
import { useSaga } from "@hex-di/saga-react";
import type { SagaSuccess, SagaError } from "@hex-di/saga";
import type { TradingError } from "@pokenerve/shared/types/trading";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";
import { TradeSagaPort } from "../../ports/saga/trade-saga-port.js";
import type { TradeOutput } from "../../sagas/trade-saga.js";
import { setChaosEnabled, setChaosFailureProbability } from "../../adapters/trade-steps/chaos.js";
import gen1Data from "../../data/gen1-pokemon.json";
import { PokemonSelector } from "./PokemonSelector.js";
import { ChaosControls } from "./ChaosControls.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// The inferred element type from the JSON import
type Gen1Entry = (typeof gen1Data)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPokemon(entry: Gen1Entry): Pokemon {
  return {
    id: entry.id,
    name: entry.name,
    types: entry.types,
    stats: entry.stats,
    abilities: entry.abilities,
    sprites: entry.sprites,
    species: entry.species,
    height: entry.height,
    weight: entry.weight,
    base_experience: entry.base_experience,
    moves: entry.moves.map(m => ({
      move: m.move,
      version_group_details: [],
    })),
  };
}

function findEntryById(id: number): Gen1Entry | undefined {
  return gen1Data.find(p => p.id === id);
}

function formatName(name: string): string {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const SAGA_STEP_LABELS: Record<string, string> = {
  ValidateTrade: "Validate Trade",
  ReservePokemon: "Reserve Pokemon",
  ExecuteSwap: "Execute Swap",
  ConfirmTrade: "Confirm Trade",
};

function getStepLabel(name: string): string {
  return SAGA_STEP_LABELS[name] ?? name;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SagaTimeline({
  status,
  currentStep,
  result,
  error,
}: {
  readonly status: string;
  readonly currentStep: string | undefined;
  readonly result: SagaSuccess<TradeOutput> | undefined;
  readonly error: SagaError<TradingError> | null;
}): ReactNode {
  const stepNames = ["ValidateTrade", "ReservePokemon", "ExecuteSwap", "ConfirmTrade"];

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Saga Progress
        </h3>
        {status === "compensating" && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            Compensating
          </span>
        )}
      </div>

      <div className="relative flex flex-col">
        {stepNames.map((stepName, index) => {
          const isLast = index === stepNames.length - 1;
          let stepStatus: "pending" | "executing" | "completed" | "failed" = "pending";
          let duration = "";

          if (result !== undefined) {
            // Saga completed successfully - all steps completed
            stepStatus = "completed";
          } else if (error !== null) {
            // Saga failed
            if (error._tag === "StepFailed" && error.stepName === stepName) {
              stepStatus = "failed";
            } else if (result === undefined && error._tag === "StepFailed") {
              // Steps before the failed step are completed
              const failedIdx = stepNames.indexOf(error.stepName ?? "");
              if (index < failedIdx) {
                stepStatus = "completed";
              } else if (index > failedIdx) {
                stepStatus = "pending";
              }
            }
          } else if (status === "running") {
            if (currentStep === stepName) {
              stepStatus = "executing";
            } else if (currentStep !== undefined) {
              const currentIdx = stepNames.indexOf(currentStep);
              if (index < currentIdx) {
                stepStatus = "completed";
              }
            }
          }

          const dotColor =
            stepStatus === "completed"
              ? "bg-emerald-500"
              : stepStatus === "executing"
                ? "bg-yellow-500"
                : stepStatus === "failed"
                  ? "bg-red-500"
                  : "bg-gray-600";

          const textColor =
            stepStatus === "completed"
              ? "text-emerald-400"
              : stepStatus === "executing"
                ? "text-yellow-400"
                : stepStatus === "failed"
                  ? "text-red-400"
                  : "text-gray-500";

          const lineColor =
            stepStatus === "completed"
              ? "bg-emerald-500/50"
              : stepStatus === "executing"
                ? "bg-yellow-500/50"
                : stepStatus === "failed"
                  ? "bg-red-500/50"
                  : "bg-gray-700";

          const statusLabel =
            stepStatus === "completed"
              ? "Completed"
              : stepStatus === "executing"
                ? "Executing..."
                : stepStatus === "failed"
                  ? "Failed"
                  : "Pending";

          return (
            <div key={stepName} className="relative flex items-start gap-4 pb-6">
              {!isLast && (
                <div className={`absolute left-[11px] top-6 h-full w-0.5 ${lineColor}`} />
              )}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`h-6 w-6 rounded-full border-2 border-gray-900 ${dotColor} ${
                    stepStatus === "executing" ? "animate-pulse" : ""
                  }`}
                >
                  {stepStatus === "completed" && (
                    <svg
                      className="h-full w-full p-0.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {stepStatus === "failed" && (
                    <svg
                      className="h-full w-full p-0.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{getStepLabel(stepName)}</span>
                  <span className={`text-xs font-medium ${textColor}`}>{statusLabel}</span>
                  {duration !== "" && <span className="text-xs text-gray-600">{duration}</span>}
                </div>
                {stepStatus === "failed" && error !== null && "_tag" in error && (
                  <span className="text-xs text-red-400/80">
                    {error._tag === "StepFailed" && error.cause !== undefined
                      ? `Step failed: ${String(error.cause)}`
                      : error._tag}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompensationBanner({ error }: { readonly error: SagaError<TradingError> }): ReactNode {
  const compensatedSteps = error._tag === "StepFailed" ? error.compensatedSteps : [];

  return (
    <div className="rounded-xl border border-orange-800/50 bg-orange-950/20 p-5">
      <div className="mb-4 flex items-center gap-3">
        <svg
          className="h-5 w-5 text-orange-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
          Compensation (Unwinding)
        </h3>
      </div>
      <p className="mb-4 text-xs text-orange-300/60">
        A step failed. The saga compensated by undoing completed operations in reverse order to
        restore the system to a consistent state.
      </p>
      {compensatedSteps.length > 0 && (
        <div className="flex flex-col gap-2">
          {compensatedSteps.map(stepName => (
            <div
              key={stepName}
              className="flex items-center gap-3 rounded-lg border border-orange-700/50 bg-orange-900/20 px-4 py-3"
            >
              <svg
                className="h-5 w-5 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm font-medium text-orange-300">
                {getStepLabel(stepName)} - Compensated
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TradingPage(): ReactNode {
  const saga = useSaga(TradeSagaPort);

  // Setup state
  const [offeredPokemonId, setOfferedPokemonId] = useState<number | null>(null);
  const [requestedPokemonId, setRequestedPokemonId] = useState<number | null>(null);

  // Chaos configuration
  const [chaosMode, setChaosMode] = useState(false);
  const [failureProbability, setFailureProbability] = useState(0.3);

  // Track saga result for timeline display
  const [lastResult, setLastResult] = useState<SagaSuccess<TradeOutput> | undefined>(undefined);

  const isSetup = saga.status === "idle";
  const isExecuting = saga.status === "running" || saga.status === "compensating";
  const isDone = saga.status === "success" || saga.status === "error";
  const canStartTrade = offeredPokemonId !== null && requestedPokemonId !== null && isSetup;

  // Derive outcome display
  const outcome = useMemo((): { label: string; color: string } | null => {
    if (saga.status === "success") {
      return { label: "Trade Completed Successfully", color: "text-emerald-400" };
    }
    if (saga.status === "error" && saga.compensated) {
      return { label: "Trade Failed - Compensated", color: "text-orange-400" };
    }
    if (saga.status === "error") {
      return { label: "Trade Failed", color: "text-red-400" };
    }
    return null;
  }, [saga.status, saga.compensated]);

  // Start trade handler
  const handleStartTrade = useCallback(async () => {
    if (offeredPokemonId === null || requestedPokemonId === null) return;

    const offeredEntry = findEntryById(offeredPokemonId);
    const requestedEntry = findEntryById(requestedPokemonId);

    if (offeredEntry === undefined || requestedEntry === undefined) return;

    const offered = toPokemon(offeredEntry);
    const requested = toPokemon(requestedEntry);

    // Sync chaos settings to the shared config
    setChaosEnabled(chaosMode);
    setChaosFailureProbability(failureProbability);

    setLastResult(undefined);
    const result = await saga.execute({ offeredPokemon: offered, requestedPokemon: requested });

    if (result.isOk()) {
      setLastResult(result.value);
    }
  }, [offeredPokemonId, requestedPokemonId, saga, chaosMode, failureProbability]);

  // Reset handler
  const handleReset = useCallback(() => {
    saga.reset();
    setLastResult(undefined);
  }, [saga]);

  // Chaos mode change handler
  const handleChaosModeChange = useCallback((enabled: boolean) => {
    setChaosMode(enabled);
    setChaosEnabled(enabled);
  }, []);

  const handleFailureProbabilityChange = useCallback((probability: number) => {
    setFailureProbability(probability);
    setChaosFailureProbability(probability);
  }, []);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Trading Post</h1>
        <p className="mt-1 text-sm text-gray-500">
          Execute Pokemon trades using the saga pattern with compensation
        </p>
      </div>

      {isSetup && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Pokemon selection */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Select Pokemon to Trade</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <PokemonSelector
                  label="You Offer"
                  selectedId={offeredPokemonId}
                  onSelect={setOfferedPokemonId}
                  disabledId={requestedPokemonId}
                />
                <PokemonSelector
                  label="You Request"
                  selectedId={requestedPokemonId}
                  onSelect={setRequestedPokemonId}
                  disabledId={offeredPokemonId}
                />
              </div>

              {/* Trade arrow */}
              {offeredPokemonId !== null && requestedPokemonId !== null && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <span className="text-sm text-gray-500">
                    {formatName(findEntryById(offeredPokemonId)?.name ?? "?")}
                  </span>
                  <svg
                    className="h-5 w-8 text-amber-400"
                    fill="none"
                    viewBox="0 0 32 20"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M2 10h28M22 4l8 6-8 6" />
                  </svg>
                  <svg
                    className="h-5 w-8 text-amber-400"
                    fill="none"
                    viewBox="0 0 32 20"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M30 10H2M10 4l-8 6 8 6" />
                  </svg>
                  <span className="text-sm text-gray-500">
                    {formatName(findEntryById(requestedPokemonId)?.name ?? "?")}
                  </span>
                </div>
              )}

              {/* Start button */}
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={!canStartTrade}
                  onClick={() => {
                    void handleStartTrade();
                  }}
                  className={`rounded-xl px-8 py-3 text-sm font-bold transition-all ${
                    canStartTrade
                      ? "bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
                      : "cursor-not-allowed bg-gray-700 text-gray-500"
                  }`}
                >
                  Start Trade
                </button>
              </div>
            </div>
          </div>

          {/* Chaos controls (setup phase) */}
          <div>
            <ChaosControls
              chaosMode={chaosMode}
              failureProbability={failureProbability}
              currentStep={null}
              onChaosModeChange={handleChaosModeChange}
              onFailureProbabilityChange={handleFailureProbabilityChange}
              disabled={false}
            />
          </div>
        </div>
      )}

      {(isExecuting || isDone) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Saga visualization */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Trade summary */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Trade Execution</h2>
                {isExecuting && (
                  <span className="flex items-center gap-2 text-sm text-yellow-400">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
                    Running...
                  </span>
                )}
                {outcome !== null && (
                  <span className={`text-sm font-medium ${outcome.color}`}>{outcome.label}</span>
                )}
              </div>
              {saga.executionId !== undefined && (
                <div className="mb-1 text-xs text-gray-600">Execution ID: {saga.executionId}</div>
              )}

              {/* Timeline */}
              <div className="mt-4">
                <SagaTimeline
                  status={saga.status}
                  currentStep={saga.currentStep}
                  result={lastResult}
                  error={saga.error}
                />
              </div>
            </div>

            {/* Compensation view */}
            {saga.compensated && saga.error !== null && <CompensationBanner error={saga.error} />}

            {/* Done actions */}
            {isDone && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-amber-500 hover:text-amber-400"
                >
                  New Trade
                </button>
              </div>
            )}
          </div>

          {/* Chaos controls (execution phase) */}
          <div>
            <ChaosControls
              chaosMode={chaosMode}
              failureProbability={failureProbability}
              currentStep={saga.currentStep ?? null}
              onChaosModeChange={handleChaosModeChange}
              onFailureProbabilityChange={handleFailureProbabilityChange}
              disabled={isDone}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { TradingPage };
