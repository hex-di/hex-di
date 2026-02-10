/**
 * Compensation visualization component.
 *
 * Shows only when the saga is compensating (unwinding). Lists the
 * compensation steps: unlock_pokemon, return_pokemon, notify_cancellation.
 * Displays which steps have completed with a visual "unwinding" effect
 * using orange color coding and reverse-direction indicators.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { TradeSagaStep } from "@pokenerve/shared/types/trading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompensationViewProps {
  readonly steps: readonly TradeSagaStep[];
  readonly isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMP_STEP_LABELS: Record<string, string> = {
  unlock_pokemon: "Unlock Pokemon",
  return_pokemon: "Return Pokemon",
  notify_cancellation: "Notify Cancellation",
};

const COMP_STEP_DESCRIPTIONS: Record<string, string> = {
  unlock_pokemon: "Releasing locked Pokemon back to owners",
  return_pokemon: "Reverting any partially swapped Pokemon",
  notify_cancellation: "Sending cancellation notifications to all parties",
};

function getCompStepLabel(name: string): string {
  return COMP_STEP_LABELS[name] ?? name;
}

function getCompStepDescription(name: string): string {
  return COMP_STEP_DESCRIPTIONS[name] ?? "";
}

function getCompStatusIcon(status: TradeSagaStep["status"]): ReactNode {
  switch (status) {
    case "compensated":
      return (
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
      );
    case "executing":
      return (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      );
    case "pending":
      return <div className="h-5 w-5 rounded-full border-2 border-gray-600" />;
    case "failed":
      return (
        <svg
          className="h-5 w-5 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CompensationView({ steps, isComplete }: CompensationViewProps): ReactNode {
  return (
    <div className="rounded-xl border border-orange-800/50 bg-orange-950/20 p-5">
      {/* Header */}
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
        {isComplete && (
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
            Complete
          </span>
        )}
      </div>

      {/* Description */}
      <p className="mb-4 text-xs text-orange-300/60">
        A step failed. The saga is compensating by undoing completed operations in reverse order to
        restore the system to a consistent state.
      </p>

      {/* Compensation steps */}
      <div className="flex flex-col gap-3">
        {steps.map(step => (
          <div
            key={step.name}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
              step.status === "compensated"
                ? "border-orange-700/50 bg-orange-900/20"
                : step.status === "executing"
                  ? "border-orange-600/50 bg-orange-900/30"
                  : "border-gray-700/50 bg-gray-800/30"
            }`}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">{getCompStatusIcon(step.status)}</div>

            {/* Step info */}
            <div className="flex flex-1 flex-col">
              <span
                className={`text-sm font-medium ${
                  step.status === "compensated"
                    ? "text-orange-300"
                    : step.status === "executing"
                      ? "text-orange-400"
                      : "text-gray-400"
                }`}
              >
                {getCompStepLabel(step.name)}
              </span>
              <span className="text-xs text-gray-500">{getCompStepDescription(step.name)}</span>
            </div>

            {/* Reverse arrow indicator */}
            <svg
              className={`h-4 w-4 ${
                step.status === "compensated" ? "text-orange-500" : "text-gray-700"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

export { CompensationView };
export type { CompensationViewProps };
