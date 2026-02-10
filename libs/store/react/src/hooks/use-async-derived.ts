/**
 * useAsyncDerived Hook
 *
 * Reads an async derived value and subscribes to status changes.
 * Returns the snapshot as a discriminated union plus a stable refresh function.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore } from "react";
import { usePort } from "@hex-di/react";
import type { AsyncDerivedPortDef, AsyncDerivedSnapshot } from "@hex-di/store";
import { EMPTY } from "./sentinel.js";

export interface UseAsyncDerivedResult<TResult, E> {
  readonly snapshot: AsyncDerivedSnapshot<TResult, E>;
  readonly refresh: () => void;
}

/**
 * Read an async derived value with status-based discriminated union.
 */
export function useAsyncDerived<TResult, E = never>(
  port: AsyncDerivedPortDef<string, TResult, E>
): UseAsyncDerivedResult<TResult, E> {
  const service = usePort(port);

  const snapshotRef = useRef<AsyncDerivedSnapshot<TResult, E> | typeof EMPTY>(EMPTY);
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

  const getSnapshot = useCallback((): AsyncDerivedSnapshot<TResult, E> => {
    if (snapshotRef.current !== EMPTY) {
      return snapshotRef.current;
    }
    const snap = service.snapshot;
    snapshotRef.current = snap;
    return snap;
  }, [service]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { snapshot, refresh: service.refresh };
}
