/**
 * useAtom Hook
 *
 * Returns a [value, setValue] tuple for an atom port,
 * following React's useState convention.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore } from "react";
import { usePort } from "@hex-di/react";
import type { AtomPortDef, DeepReadonly } from "@hex-di/store";
import { EMPTY } from "./sentinel.js";

/**
 * Read and write an atom value with useState-style tuple.
 *
 * The setter function is referentially stable.
 */
export function useAtom<TValue>(
  port: AtomPortDef<string, TValue>
): [DeepReadonly<TValue>, (value: TValue | ((prev: TValue) => TValue)) => void] {
  const service = usePort(port);

  const snapshotRef = useRef<DeepReadonly<TValue> | typeof EMPTY>(EMPTY);
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

  const getSnapshot = useCallback((): DeepReadonly<TValue> => {
    if (snapshotRef.current !== EMPTY) {
      return snapshotRef.current;
    }
    const value = service.value;
    snapshotRef.current = value;
    return value;
  }, [service]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (valueOrFn: TValue | ((prev: TValue) => TValue)) => {
      const isUpdater = (v: TValue | ((prev: TValue) => TValue)): v is (prev: TValue) => TValue =>
        typeof v === "function";

      if (isUpdater(valueOrFn)) {
        service.update(valueOrFn);
      } else {
        service.set(valueOrFn);
      }
    },
    [service]
  );

  return [value, setValue];
}
