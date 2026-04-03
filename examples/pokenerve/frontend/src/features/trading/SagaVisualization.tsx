import type { ReactNode } from "react";
import type { SagaSuccess, SagaError } from "@hex-di/saga";
import type { TradingError } from "@pokenerve/shared/types/trading";
import type { TradeOutput } from "../../sagas/trade-saga.js";

// ---------------------------------------------------------------------------
// Step label mapping
// ---------------------------------------------------------------------------

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
// Step status helpers
// ---------------------------------------------------------------------------

type StepStatus = "pending" | "executing" | "completed" | "failed";

function computeStepStatus(
  stepName: string,
  index: number,
  stepNames: readonly string[],
  status: string,
  currentStep: string | undefined,
  result: SagaSuccess<TradeOutput> | undefined,
  error: SagaError<TradingError> | null
): StepStatus {
  if (result !== undefined) return "completed";

  if (error !== null) {
    return computeStepStatusFromError(stepName, index, stepNames, error);
  }

  if (status === "running") {
    return computeStepStatusFromRunning(index, stepNames, currentStep);
  }

  return "pending";
}

function computeStepStatusFromError(
  stepName: string,
  index: number,
  stepNames: readonly string[],
  error: SagaError<TradingError>
): StepStatus {
  if (error._tag !== "StepFailed") return "pending";

  if (error.stepName === stepName) return "failed";

  const failedIdx = stepNames.indexOf(error.stepName ?? "");
  if (index < failedIdx) return "completed";
  return "pending";
}

function computeStepStatusFromRunning(
  index: number,
  stepNames: readonly string[],
  currentStep: string | undefined
): StepStatus {
  if (currentStep === undefined) return "pending";

  if (stepNames[index] === currentStep) return "executing";

  const currentIdx = stepNames.indexOf(currentStep);
  if (index < currentIdx) return "completed";
  return "pending";
}

function getStepDotColor(stepStatus: StepStatus): string {
  switch (stepStatus) {
    case "completed":
      return "bg-emerald-500";
    case "executing":
      return "bg-yellow-500";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-gray-600";
  }
}

function getStepTextColor(stepStatus: StepStatus): string {
  switch (stepStatus) {
    case "completed":
      return "text-emerald-400";
    case "executing":
      return "text-yellow-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-gray-500";
  }
}

function getStepLineColor(stepStatus: StepStatus): string {
  switch (stepStatus) {
    case "completed":
      return "bg-emerald-500/50";
    case "executing":
      return "bg-yellow-500/50";
    case "failed":
      return "bg-red-500/50";
    default:
      return "bg-gray-700";
  }
}

function getStepStatusLabel(stepStatus: StepStatus): string {
  switch (stepStatus) {
    case "completed":
      return "Completed";
    case "executing":
      return "Executing...";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function getStepErrorMessage(error: SagaError<TradingError>): string {
  if (error._tag === "StepFailed" && error.cause !== undefined) {
    return `Step failed: ${String(error.cause)}`;
  }
  return error._tag;
}

// ---------------------------------------------------------------------------
// SagaStep Component
// ---------------------------------------------------------------------------

function StepDotIcon({ stepStatus }: { readonly stepStatus: StepStatus }): ReactNode {
  if (stepStatus === "completed") {
    return (
      <svg
        className="h-full w-full p-0.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (stepStatus === "failed") {
    return (
      <svg
        className="h-full w-full p-0.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  return null;
}

function SagaStep({
  stepName,
  stepStatus,
  isLast,
  error,
}: {
  readonly stepName: string;
  readonly stepStatus: StepStatus;
  readonly isLast: boolean;
  readonly error: SagaError<TradingError> | null;
}): ReactNode {
  const dotColor = getStepDotColor(stepStatus);
  const textColor = getStepTextColor(stepStatus);
  const lineColor = getStepLineColor(stepStatus);
  const statusLabel = getStepStatusLabel(stepStatus);

  return (
    <div className="relative flex items-start gap-4 pb-6">
      {!isLast && <div className={`absolute left-[11px] top-6 h-full w-0.5 ${lineColor}`} />}
      <div className="relative z-10 flex-shrink-0">
        <div
          className={`h-6 w-6 rounded-full border-2 border-gray-900 ${dotColor} ${
            stepStatus === "executing" ? "animate-pulse" : ""
          }`}
        >
          <StepDotIcon stepStatus={stepStatus} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{getStepLabel(stepName)}</span>
          <span className={`text-xs font-medium ${textColor}`}>{statusLabel}</span>
        </div>
        {stepStatus === "failed" && error !== null && (
          <span className="text-xs text-red-400/80">{getStepErrorMessage(error)}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SagaTimeline
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
          const stepStatus = computeStepStatus(
            stepName,
            index,
            stepNames,
            status,
            currentStep,
            result,
            error
          );

          return (
            <SagaStep
              key={stepName}
              stepName={stepName}
              stepStatus={stepStatus}
              isLast={isLast}
              error={stepStatus === "failed" ? error : null}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompensationBanner
// ---------------------------------------------------------------------------

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

export { SagaTimeline, CompensationBanner };
