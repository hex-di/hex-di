/**
 * useQueries Hook
 *
 * Subscribes to multiple queries simultaneously and returns an
 * array of QueryState objects matching the input order.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("259")) {
    {
    }
  } else {
    stryCov_9fa48("259");
    return (
      config.port.__portName +
      (stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), "\0")) +
      stableStringify(config.params)
    );
  }
}

/**
 * Widens a PortLike to QueryPort via overload signature (no cast).
 * The PortLike interface structurally satisfies QueryPort at runtime;
 * the branded type info is erased in the config array but preserved
 * by the client's generic method.
 */
function toQueryPort(port: PortLike): QueryPort<string, unknown, unknown, unknown>;
function toQueryPort(port: object): object {
  if (stryMutAct_9fa48("261")) {
    {
    }
  } else {
    stryCov_9fa48("261");
    return port;
  }
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
  if (stryMutAct_9fa48("262")) {
    {
    }
  } else {
    stryCov_9fa48("262");
    const client = useQueryClient();
    const observersRef = useRef<Array<QueryObserver<unknown, unknown>>>(
      stryMutAct_9fa48("263") ? ["Stryker was here"] : (stryCov_9fa48("263"), [])
    );
    const fingerprintRef = useRef<string>(
      stryMutAct_9fa48("264") ? "Stryker was here!" : (stryCov_9fa48("264"), "")
    );
    const snapshotRef = useRef<ReadonlyArray<QueryState<unknown, unknown>> | null>(null);

    // Compute fingerprint for current configs
    const currentFingerprint = configs
      .map(configFingerprint)
      .join(stryMutAct_9fa48("265") ? "" : (stryCov_9fa48("265"), "\n"));

    // Recreate observers when configs change
    if (
      stryMutAct_9fa48("268")
        ? fingerprintRef.current === currentFingerprint
        : stryMutAct_9fa48("267")
          ? false
          : stryMutAct_9fa48("266")
            ? true
            : (stryCov_9fa48("266", "267", "268"), fingerprintRef.current !== currentFingerprint)
    ) {
      if (stryMutAct_9fa48("269")) {
        {
        }
      } else {
        stryCov_9fa48("269");
        // Destroy old observers
        for (const obs of observersRef.current) {
          if (stryMutAct_9fa48("270")) {
            {
            }
          } else {
            stryCov_9fa48("270");
            obs.destroy();
          }
        }

        // Create new observers
        observersRef.current = configs.map(
          stryMutAct_9fa48("271")
            ? () => undefined
            : (stryCov_9fa48("271"),
              config =>
                client.observe(
                  toQueryPort(config.port),
                  config.params,
                  stryMutAct_9fa48("272")
                    ? {}
                    : (stryCov_9fa48("272"),
                      {
                        enabled: config.enabled,
                      })
                ))
        );
        fingerprintRef.current = currentFingerprint;
        snapshotRef.current = null;
      }
    }
    const observers = observersRef.current;

    // Cleanup on unmount
    useEffect(
      () => {
        if (stryMutAct_9fa48("273")) {
          {
          }
        } else {
          stryCov_9fa48("273");
          return () => {
            if (stryMutAct_9fa48("274")) {
              {
              }
            } else {
              stryCov_9fa48("274");
              for (const obs of observers) {
                if (stryMutAct_9fa48("275")) {
                  {
                  }
                } else {
                  stryCov_9fa48("275");
                  obs.destroy();
                }
              }
            }
          };
        }
      },
      stryMutAct_9fa48("276") ? [] : (stryCov_9fa48("276"), [observers])
    );
    const subscribe = useCallback(
      (onStoreChange: () => void) => {
        if (stryMutAct_9fa48("277")) {
          {
          }
        } else {
          stryCov_9fa48("277");
          const unsubscribes = observers.map(
            stryMutAct_9fa48("278")
              ? () => undefined
              : (stryCov_9fa48("278"),
                obs =>
                  obs.subscribe(() => {
                    if (stryMutAct_9fa48("279")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("279");
                      snapshotRef.current = null;
                      onStoreChange();
                    }
                  }))
          );
          return () => {
            if (stryMutAct_9fa48("280")) {
              {
              }
            } else {
              stryCov_9fa48("280");
              for (const unsub of unsubscribes) {
                if (stryMutAct_9fa48("281")) {
                  {
                  }
                } else {
                  stryCov_9fa48("281");
                  unsub();
                }
              }
            }
          };
        }
      },
      stryMutAct_9fa48("282") ? [] : (stryCov_9fa48("282"), [observers])
    );
    const getSnapshot = useCallback(
      (): ReadonlyArray<QueryState<unknown, unknown>> => {
        if (stryMutAct_9fa48("283")) {
          {
          }
        } else {
          stryCov_9fa48("283");
          if (
            stryMutAct_9fa48("286")
              ? snapshotRef.current === null
              : stryMutAct_9fa48("285")
                ? false
                : stryMutAct_9fa48("284")
                  ? true
                  : (stryCov_9fa48("284", "285", "286"), snapshotRef.current !== null)
          ) {
            if (stryMutAct_9fa48("287")) {
              {
              }
            } else {
              stryCov_9fa48("287");
              return snapshotRef.current;
            }
          }
          const states = observers.map(
            stryMutAct_9fa48("288")
              ? () => undefined
              : (stryCov_9fa48("288"), obs => obs.getState())
          );
          snapshotRef.current = states;
          return states;
        }
      },
      stryMutAct_9fa48("289") ? [] : (stryCov_9fa48("289"), [observers])
    );
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }
}
