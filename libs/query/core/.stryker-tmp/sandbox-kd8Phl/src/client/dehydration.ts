/**
 * Dehydration and hydration utilities for SSR support.
 *
 * dehydrate() serializes the query cache into a portable format.
 * hydrate() restores it on the client side.
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
import type { QueryClient } from "./query-client.js";

// =============================================================================
// DehydratedState
// =============================================================================

export interface DehydratedState {
  readonly version: 2;
  readonly queries: ReadonlyArray<{
    readonly portName: string;
    readonly paramsHash: string;
    readonly data: unknown;
    readonly dataUpdatedAt: number | undefined;
    readonly status: string;
  }>;
}

// =============================================================================
// dehydrate
// =============================================================================

/**
 * Extracts the current query cache state into a serializable format.
 *
 * Only includes queries with data (success status). Pending and error
 * entries are omitted since they don't provide useful SSR state.
 */
export function dehydrate(client: QueryClient): DehydratedState {
  if (stryMutAct_9fa48("471")) {
    {
    }
  } else {
    stryCov_9fa48("471");
    const queries: Array<{
      readonly portName: string;
      readonly paramsHash: string;
      readonly data: unknown;
      readonly dataUpdatedAt: number | undefined;
      readonly status: string;
    }> = stryMutAct_9fa48("472") ? ["Stryker was here"] : (stryCov_9fa48("472"), []);
    const allEntries = client.cache.getAll();
    for (const [serializedKey, entry] of allEntries) {
      if (stryMutAct_9fa48("473")) {
        {
        }
      } else {
        stryCov_9fa48("473");
        if (
          stryMutAct_9fa48("476")
            ? entry.status !== "success" && entry.data === undefined
            : stryMutAct_9fa48("475")
              ? false
              : stryMutAct_9fa48("474")
                ? true
                : (stryCov_9fa48("474", "475", "476"),
                  (stryMutAct_9fa48("478")
                    ? entry.status === "success"
                    : stryMutAct_9fa48("477")
                      ? false
                      : (stryCov_9fa48("477", "478"),
                        entry.status !==
                          (stryMutAct_9fa48("479") ? "" : (stryCov_9fa48("479"), "success")))) ||
                    (stryMutAct_9fa48("481")
                      ? entry.data !== undefined
                      : stryMutAct_9fa48("480")
                        ? false
                        : (stryCov_9fa48("480", "481"), entry.data === undefined)))
        )
          continue;

        // serializedKey format is "portName\0paramsHash"
        const separatorIndex = serializedKey.indexOf(
          stryMutAct_9fa48("482") ? "" : (stryCov_9fa48("482"), "\0")
        );
        if (
          stryMutAct_9fa48("485")
            ? separatorIndex !== -1
            : stryMutAct_9fa48("484")
              ? false
              : stryMutAct_9fa48("483")
                ? true
                : (stryCov_9fa48("483", "484", "485"),
                  separatorIndex === (stryMutAct_9fa48("486") ? +1 : (stryCov_9fa48("486"), -1)))
        )
          continue;
        const portName = stryMutAct_9fa48("487")
          ? serializedKey
          : (stryCov_9fa48("487"), serializedKey.slice(0, separatorIndex));
        const paramsHash = stryMutAct_9fa48("488")
          ? serializedKey
          : (stryCov_9fa48("488"),
            serializedKey.slice(
              stryMutAct_9fa48("489")
                ? separatorIndex - 1
                : (stryCov_9fa48("489"), separatorIndex + 1)
            ));
        queries.push(
          stryMutAct_9fa48("490")
            ? {}
            : (stryCov_9fa48("490"),
              {
                portName,
                paramsHash,
                data: entry.data,
                dataUpdatedAt: entry.dataUpdatedAt,
                status: entry.status,
              })
        );
      }
    }
    return stryMutAct_9fa48("491")
      ? {}
      : (stryCov_9fa48("491"),
        {
          version: 2,
          queries,
        });
  }
}

// =============================================================================
// hydrate helpers
// =============================================================================

/**
 * Reconstructs params from a paramsHash string so that
 * `stableStringify(result)` produces the same hash.
 *
 * The paramsHash is produced by stableStringify, which outputs
 * valid JSON for objects/arrays/strings/numbers/booleans/null,
 * and the literal string "undefined" for undefined.
 */
function parseParamsHash(paramsHash: string): unknown {
  if (stryMutAct_9fa48("492")) {
    {
    }
  } else {
    stryCov_9fa48("492");
    if (
      stryMutAct_9fa48("495")
        ? paramsHash !== "undefined"
        : stryMutAct_9fa48("494")
          ? false
          : stryMutAct_9fa48("493")
            ? true
            : (stryCov_9fa48("493", "494", "495"),
              paramsHash === (stryMutAct_9fa48("496") ? "" : (stryCov_9fa48("496"), "undefined")))
    ) {
      if (stryMutAct_9fa48("497")) {
        {
        }
      } else {
        stryCov_9fa48("497");
        return undefined;
      }
    }
    try {
      if (stryMutAct_9fa48("498")) {
        {
        }
      } else {
        stryCov_9fa48("498");
        return JSON.parse(paramsHash);
      }
    } catch {
      if (stryMutAct_9fa48("499")) {
        {
        }
      } else {
        stryCov_9fa48("499");
        // If parsing fails, return the raw hash string
        return paramsHash;
      }
    }
  }
}

// =============================================================================
// hydrate
// =============================================================================

/**
 * Restores dehydrated query state into a QueryClient's cache.
 *
 * For each entry, creates a cache entry via `cache.set()` using
 * a minimal port-like object. Existing entries are not overwritten
 * (hydration fills in missing data, doesn't replace fresh data).
 */
export function hydrate(client: QueryClient, state: DehydratedState): void {
  if (stryMutAct_9fa48("500")) {
    {
    }
  } else {
    stryCov_9fa48("500");
    for (const query of state.queries) {
      if (stryMutAct_9fa48("501")) {
        {
        }
      } else {
        stryCov_9fa48("501");
        const portLike = stryMutAct_9fa48("502")
          ? {}
          : (stryCov_9fa48("502"),
            {
              __portName: query.portName,
            });
        const params = parseParamsHash(query.paramsHash);

        // Check if entry already exists with success data
        const existing = client.cache.get(portLike, params);
        if (
          stryMutAct_9fa48("505")
            ? existing !== undefined || existing.status === "success"
            : stryMutAct_9fa48("504")
              ? false
              : stryMutAct_9fa48("503")
                ? true
                : (stryCov_9fa48("503", "504", "505"),
                  (stryMutAct_9fa48("507")
                    ? existing === undefined
                    : stryMutAct_9fa48("506")
                      ? true
                      : (stryCov_9fa48("506", "507"), existing !== undefined)) &&
                    (stryMutAct_9fa48("509")
                      ? existing.status !== "success"
                      : stryMutAct_9fa48("508")
                        ? true
                        : (stryCov_9fa48("508", "509"),
                          existing.status ===
                            (stryMutAct_9fa48("510") ? "" : (stryCov_9fa48("510"), "success")))))
        ) {
          if (stryMutAct_9fa48("511")) {
            {
            }
          } else {
            stryCov_9fa48("511");
            continue;
          }
        }
        client.cache.set(portLike, params, query.data);
      }
    }
  }
}
