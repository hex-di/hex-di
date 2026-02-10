/**
 * useFlowState Hook
 *
 * Subscribes to FlowInspector for a specific machine's state snapshot
 * using push-based notifications via useSyncExternalStore.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import { usePort, type Port } from "@hex-di/react";
import type { FlowInspector, MachineSnapshot } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";

/**
 * Subscribes to a FlowInspector for a machine's current state snapshot.
 *
 * @param inspectorPort - Port to resolve FlowInspector from the container
 * @param portName - The machine's port name
 * @param instanceId - The machine's instance ID
 * @returns The current MachineSnapshot, or undefined if not found
 */
export function useFlowState(
  inspectorPort: Port<FlowInspector, string>,
  portName: string,
  instanceId: string
): MachineSnapshot<string, unknown> | undefined {
  const inspector = usePort(inspectorPort);

  const subscribe = useCallback(
    (onStoreChange: () => void) => inspector.subscribe(onStoreChange),
    [inspector]
  );

  const lastValueRef = useRef<
    | { readonly hasValue: true; readonly value: MachineSnapshot<string, unknown> | undefined }
    | { readonly hasValue: false }
  >({ hasValue: false });

  const getSnapshot = useCallback((): MachineSnapshot<string, unknown> | undefined => {
    const newValue = inspector.getMachineState(portName, instanceId);

    if (lastValueRef.current.hasValue) {
      if (shallowEqual(lastValueRef.current.value, newValue)) {
        return lastValueRef.current.value;
      }
    }

    lastValueRef.current = { value: newValue, hasValue: true };
    return newValue;
  }, [inspector, portName, instanceId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
