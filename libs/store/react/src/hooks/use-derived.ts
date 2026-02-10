/**
 * useDerived Hook
 *
 * Reads a computed value from a derived port.
 * Re-renders when the derived value changes.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore } from "react";
import { usePort } from "@hex-di/react";
import type { DerivedPortDef, DeepReadonly } from "@hex-di/store";
import { EMPTY } from "./sentinel.js";

/**
 * Read a derived (computed) value from a derived port.
 */
export function useDerived<TResult>(port: DerivedPortDef<string, TResult>): DeepReadonly<TResult> {
  const service = usePort(port);

  const snapshotRef = useRef<DeepReadonly<TResult> | typeof EMPTY>(EMPTY);
  const serviceRef = useRef(service);
  if (serviceRef.current !== service) {
    serviceRef.current = service;
    snapshotRef.current = EMPTY;
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return service.subscribe(() => {
        snapshotRef.current = EMPTY;
        onStoreChange();
      });
    },
    [service]
  );

  const getSnapshot = useCallback((): DeepReadonly<TResult> => {
    if (snapshotRef.current !== EMPTY) {
      return snapshotRef.current;
    }
    const value = service.value;
    snapshotRef.current = value;
    return value;
  }, [service]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
