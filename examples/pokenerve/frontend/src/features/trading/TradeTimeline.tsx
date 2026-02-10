/**
 * Trade saga timeline visualization.
 *
 * Renders a vertical timeline showing all 7 forward saga steps with
 * real-time status updates. Each step displays its name, status badge,
 * and duration. Uses color coding for step states:
 * - Green: completed
 * - Yellow: executing (with animated pulse)
 * - Gray: pending
 * - Red: failed
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { TradeSagaStep } from "@pokenerve/shared/types/trading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TradeTimelineProps {
  readonly steps: readonly TradeSagaStep[];
  readonly isCompensating: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, string> = {
  initiate_trade: "Initiate Trade",
  select_pokemon: "Select Pokemon",
  verify_ownership: "Verify Ownership",
  lock_pokemon: "Lock Pokemon",
  execute_swap: "Execute Swap",
  confirm_receipt: "Confirm Receipt",
  complete: "Complete",
};

function getStepLabel(name: string): string {
  return STEP_LABELS[name] ?? name;
}

function getStatusColor(status: TradeSagaStep["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "executing":
      return "bg-yellow-500";
    case "pending":
      return "bg-gray-600";
    case "failed":
      return "bg-red-500";
    case "compensated":
      return "bg-orange-500";
  }
}

function getStatusTextColor(status: TradeSagaStep["status"]): string {
  switch (status) {
    case "completed":
      return "text-emerald-400";
    case "executing":
      return "text-yellow-400";
    case "pending":
      return "text-gray-500";
    case "failed":
      return "text-red-400";
    case "compensated":
      return "text-orange-400";
  }
}

function getStatusLabel(status: TradeSagaStep["status"]): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "executing":
      return "Executing...";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "compensated":
      return "Compensated";
  }
}

function getLineColor(status: TradeSagaStep["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/50";
    case "executing":
      return "bg-yellow-500/50";
    case "failed":
      return "bg-red-500/50";
    case "compensated":
      return "bg-orange-500/50";
    case "pending":
      return "bg-gray-700";
  }
}

function formatDuration(step: TradeSagaStep): string {
  if (step.startedAt === null || step.completedAt === null) return "";
  const durationMs = step.completedAt - step.startedAt;
  if (durationMs < 1000) return `${String(durationMs)}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TradeTimeline({ steps, isCompensating }: TradeTimelineProps): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Saga Progress
        </h3>
        {isCompensating && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            Compensating
          </span>
        )}
      </div>

      <div className="relative flex flex-col">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const duration = formatDuration(step);

          return (
            <div key={step.name} className="relative flex items-start gap-4 pb-6">
              {/* Vertical line connector */}
              {!isLast && (
                <div
                  className={`absolute left-[11px] top-6 h-full w-0.5 ${getLineColor(step.status)}`}
                />
              )}

              {/* Status dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`h-6 w-6 rounded-full border-2 border-gray-900 ${getStatusColor(step.status)} ${
                    step.status === "executing" ? "animate-pulse" : ""
                  }`}
                >
                  {step.status === "completed" && (
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
                  {step.status === "failed" && (
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

              {/* Step info */}
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{getStepLabel(step.name)}</span>
                  <span className={`text-xs font-medium ${getStatusTextColor(step.status)}`}>
                    {getStatusLabel(step.status)}
                  </span>
                  {duration !== "" && <span className="text-xs text-gray-600">{duration}</span>}
                </div>
                {step.error !== null && (
                  <span className="text-xs text-red-400/80">{step.error}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { TradeTimeline };
export type { TradeTimelineProps };
