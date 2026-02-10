/**
 * useSagaStatus Hook
 *
 * Read-only hook for monitoring the status of a specific saga execution.
 * Resolves a SagaManagementExecutor from the nearest SagaManagementProvider context.
 *
 * @packageDocumentation
 */

import { useState, useEffect, useCallback } from "react";
import type { SagaError, SagaStatus } from "@hex-di/saga";
import { useSagaManagementExecutor } from "../context/saga-management-context.js";

// =============================================================================
// Types
// =============================================================================

export type SagaStatusHookStatus =
  | "pending"
  | "running"
  | "compensating"
  | "completed"
  | "failed"
  | "not-found";

export interface SagaStatusResult {
  readonly status: SagaStatusHookStatus;
  readonly completedSteps: readonly string[];
  readonly compensated: boolean;
  readonly error: SagaError<unknown> | null;
  readonly loading: boolean;
  readonly currentStep: string | undefined;
  readonly updatedAt: Date | undefined;
  readonly refresh: () => void;
}

// =============================================================================
// useSagaStatus Hook
// =============================================================================

/**
 * Monitor the status of a specific saga execution by ID.
 *
 * Resolves the SagaManagementExecutor from the nearest SagaManagementProvider
 * and calls `getStatus` to fetch the current execution status.
 */
export function useSagaStatus(executionId: string): SagaStatusResult {
  const executor = useSagaManagementExecutor();

  const [state, setState] = useState<{
    status: SagaStatusHookStatus;
    completedSteps: readonly string[];
    compensated: boolean;
    error: SagaError<unknown> | null;
    loading: boolean;
    currentStep: string | undefined;
    updatedAt: Date | undefined;
  }>({
    status: "pending",
    completedSteps: [],
    compensated: false,
    error: null,
    loading: true,
    currentStep: undefined,
    updatedAt: undefined,
  });

  const fetchStatus = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    const result = await executor.getStatus(executionId);

    if (result.isOk()) {
      const sagaStatus: SagaStatus = result.value;
      setState({
        status: mapSagaStatusToHookStatus(sagaStatus),
        completedSteps: extractCompletedSteps(sagaStatus),
        compensated: extractCompensated(sagaStatus),
        error: null,
        loading: false,
        currentStep: extractCurrentStepName(sagaStatus),
        updatedAt: new Date(),
      });
    } else {
      const managementError = result.error;
      if (managementError._tag === "ExecutionNotFound") {
        setState({
          status: "not-found",
          completedSteps: [],
          compensated: false,
          error: null,
          loading: false,
          currentStep: undefined,
          updatedAt: undefined,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
        }));
      }
    }
  }, [executor, executionId]);

  useEffect(() => {
    let cancelled = false;
    executor.getStatus(executionId).then(result => {
      if (cancelled) return;
      if (result.isOk()) {
        const sagaStatus: SagaStatus = result.value;
        setState({
          status: mapSagaStatusToHookStatus(sagaStatus),
          completedSteps: extractCompletedSteps(sagaStatus),
          compensated: extractCompensated(sagaStatus),
          error: null,
          loading: false,
          currentStep: extractCurrentStepName(sagaStatus),
          updatedAt: new Date(),
        });
      } else {
        const managementError = result.error;
        if (managementError._tag === "ExecutionNotFound") {
          setState({
            status: "not-found",
            completedSteps: [],
            compensated: false,
            error: null,
            loading: false,
            currentStep: undefined,
            updatedAt: undefined,
          });
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
          }));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [executor, executionId]);

  return {
    status: state.status,
    completedSteps: state.completedSteps,
    compensated: state.compensated,
    error: state.error,
    loading: state.loading,
    currentStep: state.currentStep,
    updatedAt: state.updatedAt,
    refresh: () => {
      void fetchStatus();
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function mapSagaStatusToHookStatus(status: SagaStatus): SagaStatusHookStatus {
  switch (status.state) {
    case "running":
      return "running";
    case "compensating":
      return "compensating";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "failed";
    case "pending":
      return "pending";
  }
}

function extractCompletedSteps(status: SagaStatus): readonly string[] {
  if ("completedSteps" in status) {
    return status.completedSteps;
  }
  return [];
}

function extractCompensated(status: SagaStatus): boolean {
  if (status.state === "failed") {
    return status.compensated;
  }
  return false;
}

function extractCurrentStepName(status: SagaStatus): string | undefined {
  if (status.state === "running") {
    return status.currentStepName || undefined;
  }
  return undefined;
}
