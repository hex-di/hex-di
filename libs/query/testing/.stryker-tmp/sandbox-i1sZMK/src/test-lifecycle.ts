/**
 * Query Test Lifecycle Helpers
 *
 * Provides vitest lifecycle hooks and manual scoping for test setup/teardown.
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
import { beforeEach, afterEach } from "vitest";
import type { QueryClient } from "@hex-di/query";
import {
  createQueryTestContainer,
  type QueryTestContainerConfig,
  type QueryTestContainer,
} from "./test-container.js";

// =============================================================================
// useQueryTestContainer
// =============================================================================

/**
 * Vitest lifecycle hook that creates a fresh QueryTestContainer before each
 * test and disposes it after each test.
 *
 * @example
 * ```typescript
 * describe("my query tests", () => {
 *   const ctx = useQueryTestContainer();
 *
 *   beforeEach(() => {
 *     ctx.container.register(UsersPort, () => ResultAsync.ok(["Alice"]));
 *   });
 *
 *   it("fetches data", async () => {
 *     const result = await ctx.queryClient.fetchQuery(UsersPort, undefined);
 *     expectQueryResult(result).toBeOk();
 *   });
 * });
 * ```
 */
export function useQueryTestContainer(config?: QueryTestContainerConfig): {
  readonly queryClient: QueryClient;
  readonly container: QueryTestContainer;
} {
  if (stryMutAct_9fa48("191")) {
    {
    }
  } else {
    stryCov_9fa48("191");
    let container: QueryTestContainer | undefined;
    beforeEach(() => {
      if (stryMutAct_9fa48("192")) {
        {
        }
      } else {
        stryCov_9fa48("192");
        container = createQueryTestContainer(config);
      }
    });
    afterEach(() => {
      if (stryMutAct_9fa48("193")) {
        {
        }
      } else {
        stryCov_9fa48("193");
        stryMutAct_9fa48("194")
          ? container.dispose()
          : (stryCov_9fa48("194"), container?.dispose());
        container = undefined;
      }
    });
    return stryMutAct_9fa48("195")
      ? {}
      : (stryCov_9fa48("195"),
        {
          get queryClient(): QueryClient {
            if (stryMutAct_9fa48("196")) {
              {
              }
            } else {
              stryCov_9fa48("196");
              if (
                stryMutAct_9fa48("199")
                  ? container !== undefined
                  : stryMutAct_9fa48("198")
                    ? false
                    : stryMutAct_9fa48("197")
                      ? true
                      : (stryCov_9fa48("197", "198", "199"), container === undefined)
              ) {
                if (stryMutAct_9fa48("200")) {
                  {
                  }
                } else {
                  stryCov_9fa48("200");
                  throw new Error(
                    stryMutAct_9fa48("201")
                      ? ""
                      : (stryCov_9fa48("201"),
                        "useQueryTestContainer: accessed queryClient outside of a test. Ensure the test is running within a describe() block that calls useQueryTestContainer.")
                  );
                }
              }
              return container.queryClient;
            }
          },
          get container(): QueryTestContainer {
            if (stryMutAct_9fa48("202")) {
              {
              }
            } else {
              stryCov_9fa48("202");
              if (
                stryMutAct_9fa48("205")
                  ? container !== undefined
                  : stryMutAct_9fa48("204")
                    ? false
                    : stryMutAct_9fa48("203")
                      ? true
                      : (stryCov_9fa48("203", "204", "205"), container === undefined)
              ) {
                if (stryMutAct_9fa48("206")) {
                  {
                  }
                } else {
                  stryCov_9fa48("206");
                  throw new Error(
                    stryMutAct_9fa48("207")
                      ? ""
                      : (stryCov_9fa48("207"),
                        "useQueryTestContainer: accessed container outside of a test.")
                  );
                }
              }
              return container;
            }
          },
        });
  }
}

// =============================================================================
// createQueryTestScope
// =============================================================================

/**
 * Creates a manual test scope with a QueryClient. Caller is responsible
 * for calling `dispose()`.
 *
 * @example
 * ```typescript
 * it("manual scope", async () => {
 *   const scope = createQueryTestScope();
 *   scope.register(UsersPort, () => ResultAsync.ok(["Alice"]));
 *
 *   const result = await scope.queryClient.fetchQuery(UsersPort, undefined);
 *   scope.dispose();
 * });
 * ```
 */
export function createQueryTestScope(config?: QueryTestContainerConfig): QueryTestContainer {
  if (stryMutAct_9fa48("208")) {
    {
    }
  } else {
    stryCov_9fa48("208");
    return createQueryTestContainer(config);
  }
}
