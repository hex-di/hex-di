/**
 * Chaos mode controls for trading saga.
 *
 * Provides a toggle for chaos mode (on/off), a slider for failure
 * probability (0-100%), and displays the current step name. These
 * controls modify the trading adapter's behavior to randomly fail
 * steps, demonstrating saga compensation patterns.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChaosControlsProps {
  readonly chaosMode: boolean;
  readonly failureProbability: number;
  readonly currentStep: string | null;
  readonly onChaosModeChange: (enabled: boolean) => void;
  readonly onFailureProbabilityChange: (probability: number) => void;
  readonly disabled: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STEP_DISPLAY_NAMES: Record<string, string> = {
  ValidateTrade: "Validate Trade",
  ReservePokemon: "Reserve Pokemon",
  ExecuteSwap: "Execute Swap",
  ConfirmTrade: "Confirm Trade",
};

function getStepDisplayName(step: string | null): string {
  if (step === null) return "N/A";
  return STEP_DISPLAY_NAMES[step] ?? step;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ChaosControls({
  chaosMode,
  failureProbability,
  currentStep,
  onChaosModeChange,
  onFailureProbabilityChange,
  disabled,
}: ChaosControlsProps): ReactNode {
  const probabilityPercent = Math.round(failureProbability * 100);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
        Chaos Engineering
      </h3>

      <div className="flex flex-col gap-4">
        {/* Chaos mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Chaos Mode</span>
            <span className="text-xs text-gray-500">Randomly fail saga steps</span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChaosModeChange(!chaosMode)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            } ${chaosMode ? "bg-red-500" : "bg-gray-600"}`}
          >
            <span
              className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                chaosMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Failure probability slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Failure Probability</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                chaosMode ? "bg-red-500/20 text-red-400" : "bg-gray-700 text-gray-500"
              }`}
            >
              {String(probabilityPercent)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={probabilityPercent}
            disabled={disabled || !chaosMode}
            onChange={e => {
              const pct = Number(e.target.value);
              onFailureProbabilityChange(pct / 100);
            }}
            className={`h-2 w-full cursor-pointer appearance-none rounded-full ${
              chaosMode ? "accent-red-500 bg-red-500/20" : "bg-gray-700"
            } ${disabled || !chaosMode ? "cursor-not-allowed opacity-50" : ""}`}
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Current step display */}
        <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2">
          <span className="text-xs text-gray-500">Current Step</span>
          <span
            className={`text-sm font-medium ${
              currentStep !== null ? "text-amber-400" : "text-gray-600"
            }`}
          >
            {getStepDisplayName(currentStep)}
          </span>
        </div>
      </div>
    </div>
  );
}

export { ChaosControls };
export type { ChaosControlsProps };
