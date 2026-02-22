/**
 * useActivity Hook
 *
 * React hook for tracking a specific activity's status and instances.
 * Uses useSyncExternalStore with shallow equality for render optimization.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Port } from "@hex-di/react";
import type { FlowService, ActivityStatus, ActivityInstance } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";
import { useFlowPort } from "./use-flow-port.js";

// =============================================================================
// UseActivityResult Type
// =============================================================================

export interface UseActivityResult {
  readonly status: ActivityStatus | undefined;
  readonly events: readonly ActivityInstance[];
}

// =============================================================================
// useActivity Hook
// =============================================================================

export function useActivity<TState extends string, TEvent extends string, TContext>(
  port: Port<string, FlowService<TState, TEvent, TContext>>,
  activityId: string
): UseActivityResult {
  const flowService = useFlowPort<TState, TEvent, TContext>(port);

  const lastResultRef = useRef<{ value: UseActivityResult; hasValue: boolean }>({
    value: { status: undefined, events: [] },
    hasValue: false,
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => flowService.subscribe(onStoreChange),
    [flowService]
  );

  const getSnapshot = useCallback((): UseActivityResult => {
    const snapshot = flowService.snapshot();
    const status = flowService.getActivityStatus(activityId);
    const events = snapshot.activities.filter(a => a.id === activityId);

    const newResult: UseActivityResult = { status, events };

    if (lastResultRef.current.hasValue) {
      if (
        lastResultRef.current.value.status === newResult.status &&
        shallowEqual(lastResultRef.current.value.events, newResult.events)
      ) {
        return lastResultRef.current.value;
      }
    }

    lastResultRef.current = { value: newResult, hasValue: true };
    return newResult;
  }, [flowService, activityId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
