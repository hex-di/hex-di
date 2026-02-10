/**
 * useQueries Hook
 *
 * Subscribes to multiple queries simultaneously and returns an
 * array of QueryState objects matching the input order.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore, useEffect } from "react";
import type { QueryPort, QueryState, QueryObserver } from "@hex-di/query";
import { stableStringify } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// UseQueriesConfig
// =============================================================================

/**
 * Minimal port-like interface for useQueries configs.
 * Avoids branded type variance issues that prevent widening to
 * `QueryPort<string, unknown, unknown, unknown>`.
 */
interface PortLike {
  readonly __portName: string;
}

export interface UseQueriesConfig {
  readonly port: PortLike;
  readonly params: unknown;
  readonly enabled?: boolean;
}

// =============================================================================
// Internal config fingerprint
// =============================================================================

function configFingerprint(config: UseQueriesConfig): string {
  return config.port.__portName + "\0" + stableStringify(config.params);
}

/**
 * Widens a PortLike to QueryPort via overload signature (no cast).
 * The PortLike interface structurally satisfies QueryPort at runtime;
 * the branded type info is erased in the config array but preserved
 * by the client's generic method.
 */
function toQueryPort(port: PortLike): QueryPort<string, unknown, unknown, unknown>;
function toQueryPort(port: object): object {
  return port;
}

// =============================================================================
// useQueries Hook
// =============================================================================

/**
 * Subscribe to multiple queries simultaneously.
 *
 * Returns an array of QueryState in the same order as the input configs.
 */
export function useQueries(
  configs: ReadonlyArray<UseQueriesConfig>
): ReadonlyArray<QueryState<unknown, unknown>> {
  const client = useQueryClient();

  const observersRef = useRef<Array<QueryObserver<unknown, unknown>>>([]);
  const fingerprintRef = useRef<string>("");
  const snapshotRef = useRef<ReadonlyArray<QueryState<unknown, unknown>> | null>(null);

  // Compute fingerprint for current configs
  const currentFingerprint = configs.map(configFingerprint).join("\n");

  // Recreate observers when configs change
  if (fingerprintRef.current !== currentFingerprint) {
    // Destroy old observers
    for (const obs of observersRef.current) {
      obs.destroy();
    }

    // Create new observers
    observersRef.current = configs.map(config =>
      client.observe(toQueryPort(config.port), config.params, {
        enabled: config.enabled,
      })
    );
    fingerprintRef.current = currentFingerprint;
    snapshotRef.current = null;
  }

  const observers = observersRef.current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const obs of observers) {
        obs.destroy();
      }
    };
  }, [observers]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribes = observers.map(obs =>
        obs.subscribe(() => {
          snapshotRef.current = null;
          onStoreChange();
        })
      );
      return () => {
        for (const unsub of unsubscribes) {
          unsub();
        }
      };
    },
    [observers]
  );

  const getSnapshot = useCallback((): ReadonlyArray<QueryState<unknown, unknown>> => {
    if (snapshotRef.current !== null) {
      return snapshotRef.current;
    }
    const states = observers.map(obs => obs.getState());
    snapshotRef.current = states;
    return states;
  }, [observers]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
