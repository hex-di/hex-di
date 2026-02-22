/**
 * useMachineSelector Hook
 *
 * React hook for deriving values from a FlowService's full MachineSnapshot.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Port } from "@hex-di/react";
import type { FlowService, MachineSnapshot } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";
import type { EqualityFn } from "./use-selector.js";
import { useFlowPort } from "./use-flow-port.js";

// =============================================================================
// useMachineSelector Hook
// =============================================================================

export function useMachineSelector<
  TState extends string,
  TEvent extends string,
  TContext,
  TSelected,
>(
  port: Port<string, FlowService<TState, TEvent, TContext>>,
  selector: (snapshot: MachineSnapshot<TState, TContext>) => TSelected,
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
    const newSelected = selector(snapshot);

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
