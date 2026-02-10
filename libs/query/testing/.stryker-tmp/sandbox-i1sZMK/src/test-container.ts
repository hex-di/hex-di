/**
 * Query Test Container
 *
 * Creates a self-contained QueryClient with a minimal DI container
 * for easy test setup and teardown.
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
import {
  createQueryClient,
  type QueryClient,
  type QueryContainer,
  type QueryDefaults,
} from "@hex-di/query";

// =============================================================================
// QueryTestContainerConfig
// =============================================================================

/**
 * Configuration for the query test container.
 */
export interface QueryTestContainerConfig {
  readonly defaults?: Partial<QueryDefaults>;
}

// =============================================================================
// QueryTestContainer
// =============================================================================

export interface QueryTestContainer {
  readonly queryClient: QueryClient;
  /** Register a service (fetcher/executor) for a port */
  register(
    port: {
      readonly __portName: string;
    },
    service: unknown
  ): void;
  dispose(): void;
}

// =============================================================================
// createQueryTestContainer
// =============================================================================

/**
 * Creates a test container with a QueryClient and mutable service registration.
 *
 * @example
 * ```typescript
 * const testContainer = createQueryTestContainer();
 * testContainer.register(UsersPort, () => ResultAsync.ok(["Alice", "Bob"]));
 * testContainer.register(CreateUserPort, (input) => ResultAsync.ok({ id: "1", ...input }));
 *
 * const result = await testContainer.queryClient.fetchQuery(UsersPort, undefined);
 * testContainer.dispose();
 * ```
 */
/**
 * Creates a minimal container that satisfies QueryContainer via overload (no cast).
 * The resolve method returns unknown at runtime, but the overload signature
 * declares it as QueryContainer so the generic `resolve<T>` matches.
 */
function createMinimalContainer(services: Map<string, unknown>): QueryContainer;
function createMinimalContainer(services: Map<string, unknown>): object {
  if (stryMutAct_9fa48("177")) {
    {
    }
  } else {
    stryCov_9fa48("177");
    return stryMutAct_9fa48("178")
      ? {}
      : (stryCov_9fa48("178"),
        {
          resolve(port: { readonly __portName: string }): unknown {
            if (stryMutAct_9fa48("179")) {
              {
              }
            } else {
              stryCov_9fa48("179");
              const service = services.get(port.__portName);
              if (
                stryMutAct_9fa48("182")
                  ? service !== undefined
                  : stryMutAct_9fa48("181")
                    ? false
                    : stryMutAct_9fa48("180")
                      ? true
                      : (stryCov_9fa48("180", "181", "182"), service === undefined)
              ) {
                if (stryMutAct_9fa48("183")) {
                  {
                  }
                } else {
                  stryCov_9fa48("183");
                  throw new Error(
                    stryMutAct_9fa48("184")
                      ? ``
                      : (stryCov_9fa48("184"),
                        `No adapter registered for port "${port.__portName}"`)
                  );
                }
              }
              return service;
            }
          },
        });
  }
}
export function createQueryTestContainer(config?: QueryTestContainerConfig): QueryTestContainer {
  if (stryMutAct_9fa48("185")) {
    {
    }
  } else {
    stryCov_9fa48("185");
    const services = new Map<string, unknown>();
    const container = createMinimalContainer(services);
    const queryClient = createQueryClient(
      stryMutAct_9fa48("186")
        ? {}
        : (stryCov_9fa48("186"),
          {
            container,
            defaults: stryMutAct_9fa48("187")
              ? config.defaults
              : (stryCov_9fa48("187"), config?.defaults),
          })
    );
    return stryMutAct_9fa48("188")
      ? {}
      : (stryCov_9fa48("188"),
        {
          queryClient,
          register(
            port: {
              readonly __portName: string;
            },
            service: unknown
          ): void {
            if (stryMutAct_9fa48("189")) {
              {
              }
            } else {
              stryCov_9fa48("189");
              services.set(port.__portName, service);
            }
          },
          dispose() {
            if (stryMutAct_9fa48("190")) {
              {
              }
            } else {
              stryCov_9fa48("190");
              queryClient.dispose();
            }
          },
        });
  }
}
