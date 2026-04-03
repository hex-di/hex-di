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
import type { SagaSuccess } from "@hex-di/saga";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";
import { TradeSagaPort } from "../../ports/saga/trade-saga-port.js";
import type { TradeOutput } from "../../sagas/trade-saga.js";
import { setChaosEnabled, setChaosFailureProbability } from "../../adapters/trade-steps/chaos.js";
import gen1Data from "../../data/gen1-pokemon.json";
import { PokemonSelector } from "./PokemonSelector.js";
import { ChaosControls } from "./ChaosControls.js";
import { SagaTimeline, CompensationBanner } from "./SagaVisualization.js";

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TradeSetupPanel({
  offeredPokemonId,
  requestedPokemonId,
  canStartTrade,
  chaosMode,
  failureProbability,
  onSelectOffered,
  onSelectRequested,
  onStartTrade,
  onChaosModeChange,
  onFailureProbabilityChange,
}: {
  readonly offeredPokemonId: number | null;
  readonly requestedPokemonId: number | null;
  readonly canStartTrade: boolean;
  readonly chaosMode: boolean;
  readonly failureProbability: number;
  readonly onSelectOffered: (id: number | null) => void;
  readonly onSelectRequested: (id: number | null) => void;
  readonly onStartTrade: () => void;
  readonly onChaosModeChange: (enabled: boolean) => void;
  readonly onFailureProbabilityChange: (probability: number) => void;
}): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Pokemon selection */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Select Pokemon to Trade</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PokemonSelector
              label="You Offer"
              selectedId={offeredPokemonId}
              onSelect={onSelectOffered}
              disabledId={requestedPokemonId}
            />
            <PokemonSelector
              label="You Request"
              selectedId={requestedPokemonId}
              onSelect={onSelectRequested}
              disabledId={offeredPokemonId}
            />
          </div>

          {/* Trade arrow */}
          {offeredPokemonId !== null && requestedPokemonId !== null && (
            <TradeArrow
              offeredPokemonId={offeredPokemonId}
              requestedPokemonId={requestedPokemonId}
            />
          )}

          {/* Start button */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              disabled={!canStartTrade}
              onClick={onStartTrade}
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
          onChaosModeChange={onChaosModeChange}
          onFailureProbabilityChange={onFailureProbabilityChange}
          disabled={false}
        />
      </div>
    </div>
  );
}

function TradeArrow({
  offeredPokemonId,
  requestedPokemonId,
}: {
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
}): ReactNode {
  return (
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
        <TradeSetupPanel
          offeredPokemonId={offeredPokemonId}
          requestedPokemonId={requestedPokemonId}
          canStartTrade={canStartTrade}
          chaosMode={chaosMode}
          failureProbability={failureProbability}
          onSelectOffered={setOfferedPokemonId}
          onSelectRequested={setRequestedPokemonId}
          onStartTrade={() => {
            void handleStartTrade();
          }}
          onChaosModeChange={handleChaosModeChange}
          onFailureProbabilityChange={handleFailureProbabilityChange}
        />
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
