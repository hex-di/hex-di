/**
 * useFlowTimeline Hook
 *
 * Subscribes to FlowInspector for transition event history using push-based
 * notifications via useSyncExternalStore.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import { usePort, type Port } from "@hex-di/react";
import type { FlowInspector, FlowTransitionEventAny } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";

/**
 * Options for useFlowTimeline.
 */
export interface UseFlowTimelineOptions {
  /** Maximum number of events to return. */
  readonly limit?: number;
  /** Only return events after this timestamp. */
  readonly since?: number;
}

/**
 * Subscribes to a FlowInspector for the transition event history.
 *
 * @param inspectorPort - Port to resolve FlowInspector from the container
 * @param options - Optional configuration
 * @returns The latest transition events
 */
export function useFlowTimeline(
  inspectorPort: Port<FlowInspector, string>,
  options?: UseFlowTimelineOptions
): readonly FlowTransitionEventAny[] {
  const inspector = usePort(inspectorPort);
  const limit = options?.limit;
  const since = options?.since;

  const subscribe = useCallback(
    (onStoreChange: () => void) => inspector.subscribe(onStoreChange),
    [inspector]
  );

  const lastValueRef = useRef<
    | { readonly hasValue: true; readonly value: readonly FlowTransitionEventAny[] }
    | { readonly hasValue: false }
  >({ hasValue: false });

  const getSnapshot = useCallback((): readonly FlowTransitionEventAny[] => {
    const newValue = inspector.getEventHistory(
      limit !== undefined || since !== undefined ? { limit, since } : undefined
    );

    if (lastValueRef.current.hasValue) {
      if (shallowEqual(lastValueRef.current.value, newValue)) {
        return lastValueRef.current.value;
      }
    }

    lastValueRef.current = { value: newValue, hasValue: true };
    return newValue;
  }, [inspector, limit, since]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
