/**
 * Event Emission & Trace Building
 *
 * Functions for emitting saga events to listeners,
 * recording execution traces, and building the
 * final immutable ExecutionTrace snapshot.
 *
 * @packageDocumentation
 */

import { tryCatch } from "@hex-di/result";
import type { SagaEvent, ExecutionTrace } from "./types.js";
import type { ExecutionState } from "./execution-state.js";

// =============================================================================
// Event Emission
// =============================================================================

export function emit(state: ExecutionState, event: SagaEvent): void {
  recordTrace(state, event);
  for (const listener of state.listeners) {
    tryCatch(
      () => {
        listener(event);
      },
      () => undefined
    );
  }
}

// =============================================================================
// Trace Recording (private)
// =============================================================================

function recordTrace(state: ExecutionState, event: SagaEvent): void {
  switch (event.type) {
    case "step:started": {
      state.trace.stepTraces.push({
        stepName: event.stepName,
        stepIndex: event.stepIndex,
        status: "completed", // will be updated on completion/failure
        startedAt: event.timestamp,
        completedAt: undefined,
        durationMs: undefined,
        attemptCount: 1,
        error: undefined,
        skippedReason: undefined,
      });
      break;
    }
    case "step:completed": {
      const trace = state.trace.stepTraces.find(
        t => t.stepName === event.stepName && t.completedAt === undefined
      );
      if (trace) {
        trace.status = "completed";
        trace.completedAt = event.timestamp;
        trace.durationMs = event.durationMs;
      }
      break;
    }
    case "step:failed": {
      const trace = state.trace.stepTraces.find(
        t => t.stepName === event.stepName && t.completedAt === undefined
      );
      if (trace) {
        trace.status = "failed";
        trace.completedAt = event.timestamp;
        trace.durationMs =
          trace.startedAt !== undefined ? event.timestamp - trace.startedAt : undefined;
        trace.attemptCount = event.attemptCount;
        trace.error = event.error;
      }
      break;
    }
    case "step:skipped": {
      state.trace.stepTraces.push({
        stepName: event.stepName,
        stepIndex: event.stepIndex,
        status: "skipped",
        startedAt: undefined,
        completedAt: undefined,
        durationMs: undefined,
        attemptCount: 0,
        error: undefined,
        skippedReason: event.reason,
      });
      break;
    }
    case "compensation:started": {
      state.trace.compensationTrace = {
        triggeredBy: event.failedStepName,
        triggeredByIndex: event.failedStepIndex,
        steps: [],
        status: "completed",
        startedAt: event.timestamp,
        completedAt: event.timestamp,
        totalDurationMs: 0,
      };
      break;
    }
    case "compensation:step": {
      if (state.trace.compensationTrace) {
        state.trace.compensationTrace.steps.push({
          stepName: event.stepName,
          stepIndex: event.stepIndex,
          status: event.success ? "completed" : "failed",
          startedAt: event.timestamp - event.durationMs,
          completedAt: event.timestamp,
          durationMs: event.durationMs,
          error: event.error,
        });
        if (!event.success) {
          state.trace.compensationTrace.status = "failed";
        }
      }
      break;
    }
    case "compensation:completed": {
      if (state.trace.compensationTrace) {
        state.trace.compensationTrace.completedAt = event.timestamp;
        state.trace.compensationTrace.totalDurationMs = event.totalDurationMs;
      }
      break;
    }
    case "compensation:failed": {
      if (state.trace.compensationTrace) {
        state.trace.compensationTrace.status = "failed";
        state.trace.compensationTrace.completedAt = event.timestamp;
        state.trace.compensationTrace.totalDurationMs =
          event.timestamp - state.trace.compensationTrace.startedAt;
      }
      break;
    }
  }
}

// =============================================================================
// Build Immutable ExecutionTrace
// =============================================================================

export function buildExecutionTrace(state: ExecutionState): ExecutionTrace {
  const completedAt =
    state.status === "completed" || state.status === "failed" || state.status === "cancelled"
      ? Date.now()
      : undefined;
  const totalDurationMs = completedAt !== undefined ? completedAt - state.sagaStartTime : undefined;

  return Object.freeze({
    executionId: state.executionId,
    sagaName: state.sagaName,
    input: state.input,
    status: state.status === "running" ? "running" : state.status,
    steps: Object.freeze(state.trace.stepTraces.map(s => Object.freeze({ ...s }))),
    compensation: state.trace.compensationTrace
      ? Object.freeze({
          triggeredBy: state.trace.compensationTrace.triggeredBy,
          triggeredByIndex: state.trace.compensationTrace.triggeredByIndex,
          steps: Object.freeze(
            state.trace.compensationTrace.steps.map(s => Object.freeze({ ...s }))
          ),
          status: state.trace.compensationTrace.status,
          startedAt: state.trace.compensationTrace.startedAt,
          completedAt: state.trace.compensationTrace.completedAt,
          totalDurationMs: state.trace.compensationTrace.totalDurationMs,
        })
      : undefined,
    startedAt: state.sagaStartTime,
    completedAt,
    totalDurationMs,
    metadata: state.metadata,
  });
}
