/**
 * useSelector Hook
 *
 * React hook for deriving values from FlowService state/context.
 * Uses useSyncExternalStore with memoization and configurable equality.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Port } from "@hex-di/react";
import type { FlowService } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";
import { useFlowPort } from "./use-flow-port.js";

// =============================================================================
// Equality Function Type
// =============================================================================

export type EqualityFn<T> = (a: T, b: T) => boolean;

// =============================================================================
// useSelector Hook
// =============================================================================

export function useSelector<TState extends string, TEvent extends string, TContext, TSelected>(
  port: Port<string, FlowService<TState, TEvent, TContext>>,
  selector: (state: TState, context: TContext) => TSelected,
  equals: EqualityFn<TSelected> = shallowEqual
): TSelected {
  const flowService = useFlowPort<TState, TEvent, TContext>(port);

  const lastSelectedRef = useRef<
    { readonly hasValue: true; readonly value: TSelected } | { readonly hasValue: false }
  >({ hasValue: false });

  const subscribe = useCallback(
    (onStoreChange: () => void) => flowService.subscribe(onStoreChange),
    [flowService]
  );

  const getSnapshot = useCallback((): TSelected => {
    const snapshot = flowService.snapshot();
    const newSelected = selector(snapshot.state, snapshot.context);

    if (lastSelectedRef.current.hasValue) {
      if (equals(lastSelectedRef.current.value, newSelected)) {
        return lastSelectedRef.current.value;
      }
    }

    lastSelectedRef.current = { value: newSelected, hasValue: true };
    return newSelected;
  }, [flowService, selector, equals]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
