/**
 * useSagaHistory Hook
 *
 * Lists past saga executions with optional filtering.
 * Resolves a SagaManagementExecutor from the nearest SagaManagementProvider context.
 *
 * @packageDocumentation
 */

import { useState, useEffect, useCallback } from "react";
import type { SagaExecutionSummary, ManagementError, ExecutionFilters } from "@hex-di/saga";
import { useSagaManagementExecutor } from "../context/saga-management-context.js";

// =============================================================================
// Types
// =============================================================================

export interface SagaHistoryOptions {
  readonly sagaName?: string;
  readonly status?: "completed" | "failed" | "running";
  readonly limit?: number;
  readonly offset?: number;
}

export interface SagaHistoryResult {
  readonly entries: readonly SagaExecutionSummary[];
  readonly total: number;
  readonly loading: boolean;
  readonly error: ManagementError | null;
  readonly refresh: () => void;
}

// =============================================================================
// useSagaHistory Hook
// =============================================================================

/**
 * List past saga executions with optional filtering.
 *
 * Resolves the SagaManagementExecutor from the nearest SagaManagementProvider
 * and calls `listExecutions` to fetch execution history. Requires a
 * persistence adapter to be registered in the container.
 */
export function useSagaHistory(options?: SagaHistoryOptions): SagaHistoryResult {
  const executor = useSagaManagementExecutor();

  const [state, setState] = useState<{
    entries: readonly SagaExecutionSummary[];
    loading: boolean;
    error: ManagementError | null;
  }>({
    entries: [],
    loading: true,
    error: null,
  });

  const fetchHistory = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    const filters: ExecutionFilters = {};
    if (options?.sagaName) {
      Object.assign(filters, { sagaName: options.sagaName });
    }
    if (options?.status) {
      Object.assign(filters, { status: options.status });
    }
    if (options?.limit) {
      Object.assign(filters, { limit: options.limit });
    }
    if (options?.offset) {
      Object.assign(filters, { offset: options.offset });
    }

    const result = await executor.listExecutions(filters);

    if (result.isOk()) {
      setState({
        entries: result.value,
        loading: false,
        error: null,
      });
    } else {
      setState({
        entries: [],
        loading: false,
        error: result.error,
      });
    }
  }, [executor, options?.sagaName, options?.status, options?.limit, options?.offset]);

  useEffect(() => {
    let cancelled = false;
    const filters: ExecutionFilters = {};
    if (options?.sagaName) {
      Object.assign(filters, { sagaName: options.sagaName });
    }
    if (options?.status) {
      Object.assign(filters, { status: options.status });
    }
    if (options?.limit) {
      Object.assign(filters, { limit: options.limit });
    }
    if (options?.offset) {
      Object.assign(filters, { offset: options.offset });
    }

    executor.listExecutions(filters).then(result => {
      if (cancelled) return;
      if (result.isOk()) {
        setState({ entries: result.value, loading: false, error: null });
      } else {
        setState({ entries: [], loading: false, error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [executor, options?.sagaName, options?.status, options?.limit, options?.offset]);

  return {
    entries: state.entries,
    total: state.entries.length,
    loading: state.loading,
    error: state.error,
    refresh: () => {
      void fetchHistory();
    },
  };
}
