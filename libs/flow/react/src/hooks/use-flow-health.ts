/**
 * useFlowHealth Hook
 *
 * Subscribes to FlowInspector for health events using push-based
 * notifications via useSyncExternalStore.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import { usePort, type Port } from "@hex-di/react";
import type { FlowInspector, HealthEvent } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";

/**
 * Options for useFlowHealth.
 */
export interface UseFlowHealthOptions {
  /** Maximum number of health events to return. */
  readonly limit?: number;
}

/**
 * Subscribes to a FlowInspector for health events.
 *
 * @param inspectorPort - Port to resolve FlowInspector from the container
 * @param options - Optional configuration
 * @returns The latest health events
 */
export function useFlowHealth(
  inspectorPort: Port<string, FlowInspector>,
  options?: UseFlowHealthOptions
): readonly HealthEvent[] {
  const inspector = usePort(inspectorPort);
  const limit = options?.limit;

  const subscribe = useCallback(
    (onStoreChange: () => void) => inspector.subscribe(onStoreChange),
    [inspector]
  );

  const lastValueRef = useRef<
    | { readonly hasValue: true; readonly value: readonly HealthEvent[] }
    | { readonly hasValue: false }
  >({ hasValue: false });

  const getSnapshot = useCallback((): readonly HealthEvent[] => {
    const newValue = inspector.getHealthEvents(limit !== undefined ? { limit } : undefined);

    if (lastValueRef.current.hasValue) {
      if (shallowEqual(lastValueRef.current.value, newValue)) {
        return lastValueRef.current.value;
      }
    }

    lastValueRef.current = { value: newValue, hasValue: true };
    return newValue;
  }, [inspector, limit]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
