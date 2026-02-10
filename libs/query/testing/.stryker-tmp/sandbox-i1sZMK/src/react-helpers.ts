/**
 * React Test Helpers
 *
 * Utility functions for setting up QueryClient in React testing scenarios.
 * These helpers work with @hex-di/query-react provider components.
 *
 * Note: This file uses React.createElement instead of JSX to avoid
 * requiring JSX configuration in the tsconfig.
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
import { createElement, type ReactNode, type FC } from "react";
import type { QueryClient, QueryDefaults } from "@hex-di/query";
import { QueryClientProvider } from "@hex-di/query-react";
import { createQueryTestContainer } from "./test-container.js";

// =============================================================================
// QueryTestWrapperConfig
// =============================================================================

export interface QueryTestWrapperConfig {
  readonly queryClient?: QueryClient;
  readonly defaults?: Partial<QueryDefaults>;
}

// =============================================================================
// createQueryTestWrapperProps
// =============================================================================

/**
 * Creates props for wrapping React components with a QueryClient provider
 * during tests.
 *
 * @example
 * ```typescript
 * import { QueryProvider } from "@hex-di/query-react";
 * import { createQueryTestWrapperProps } from "@hex-di/query-testing";
 *
 * const props = createQueryTestWrapperProps({ queryClient });
 * // Use props.queryClient when rendering QueryProvider in tests
 * ```
 */
export function createQueryTestWrapperProps(config: { readonly queryClient: QueryClient }): {
  readonly queryClient: QueryClient;
} {
  if (stryMutAct_9fa48("147")) {
    {
    }
  } else {
    stryCov_9fa48("147");
    return stryMutAct_9fa48("148")
      ? {}
      : (stryCov_9fa48("148"),
        {
          queryClient: config.queryClient,
        });
  }
}

// =============================================================================
// createQueryTestWrapper
// =============================================================================

/**
 * Creates a React wrapper component suitable for use with
 * `@testing-library/react`'s `render({ wrapper })` option.
 *
 * If a `queryClient` is provided in the config, it will be used directly.
 * Otherwise, a new `QueryClient` is created internally via
 * `createQueryTestContainer`.
 *
 * @example
 * ```typescript
 * import { render } from "@testing-library/react";
 * import { createQueryTestWrapper } from "@hex-di/query-testing";
 *
 * // With default QueryClient
 * const wrapper = createQueryTestWrapper();
 * render(<MyComponent />, { wrapper });
 *
 * // With custom defaults
 * const wrapper = createQueryTestWrapper({ defaults: { staleTime: 60_000 } });
 * render(<MyComponent />, { wrapper });
 *
 * // With pre-existing QueryClient
 * const wrapper = createQueryTestWrapper({ queryClient: myClient });
 * render(<MyComponent />, { wrapper });
 * ```
 */
export function createQueryTestWrapper(config?: QueryTestWrapperConfig): FC<{
  children: ReactNode;
}> {
  if (stryMutAct_9fa48("149")) {
    {
    }
  } else {
    stryCov_9fa48("149");
    const client = stryMutAct_9fa48("150")
      ? config?.queryClient &&
        createQueryTestContainer({
          defaults: config?.defaults,
        }).queryClient
      : (stryCov_9fa48("150"),
        (stryMutAct_9fa48("151")
          ? config.queryClient
          : (stryCov_9fa48("151"), config?.queryClient)) ??
          createQueryTestContainer(
            stryMutAct_9fa48("152")
              ? {}
              : (stryCov_9fa48("152"),
                {
                  defaults: stryMutAct_9fa48("153")
                    ? config.defaults
                    : (stryCov_9fa48("153"), config?.defaults),
                })
          ).queryClient);
    function QueryTestWrapper({ children }: { children: ReactNode }): ReactNode {
      if (stryMutAct_9fa48("154")) {
        {
        }
      } else {
        stryCov_9fa48("154");
        return createElement(
          QueryClientProvider,
          stryMutAct_9fa48("155")
            ? {}
            : (stryCov_9fa48("155"),
              {
                client,
                children,
              })
        );
      }
    }
    QueryTestWrapper.displayName = stryMutAct_9fa48("156")
      ? ""
      : (stryCov_9fa48("156"), "QueryTestWrapper");
    return QueryTestWrapper;
  }
}
