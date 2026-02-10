/**
 * useIsFetching Hook
 *
 * Returns the number of currently fetching queries, optionally
 * filtered by port name.
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
import { useSyncExternalStore, useCallback } from "react";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// QueryFilters
// =============================================================================

export interface QueryFilters {
  readonly port?: {
    readonly __portName: string;
  };
}

// =============================================================================
// useIsFetching Hook
// =============================================================================

/**
 * Returns the count of currently fetching queries.
 *
 * Useful for showing global loading indicators.
 */
export function useIsFetching(filters?: QueryFilters): number {
  if (stryMutAct_9fa48("169")) {
    {
    }
  } else {
    stryCov_9fa48("169");
    const client = useQueryClient();
    const subscribe = useCallback(
      (onStoreChange: () => void) => {
        if (stryMutAct_9fa48("170")) {
          {
          }
        } else {
          stryCov_9fa48("170");
          return client.subscribe(() => {
            if (stryMutAct_9fa48("171")) {
              {
              }
            } else {
              stryCov_9fa48("171");
              onStoreChange();
            }
          });
        }
      },
      stryMutAct_9fa48("172") ? [] : (stryCov_9fa48("172"), [client])
    );
    const getSnapshot = useCallback(
      (): number => {
        if (stryMutAct_9fa48("173")) {
          {
          }
        } else {
          stryCov_9fa48("173");
          if (
            stryMutAct_9fa48("175")
              ? false
              : stryMutAct_9fa48("174")
                ? true
                : (stryCov_9fa48("174", "175"), client.isDisposed)
          )
            return 0;
          return client.isFetching(
            filters
              ? stryMutAct_9fa48("176")
                ? {}
                : (stryCov_9fa48("176"),
                  {
                    port: filters.port,
                  })
              : undefined
          );
        }
      },
      stryMutAct_9fa48("177") ? [] : (stryCov_9fa48("177"), [client, filters])
    );
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }
}
