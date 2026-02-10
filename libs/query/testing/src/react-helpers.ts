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
  return { queryClient: config.queryClient };
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
export function createQueryTestWrapper(
  config?: QueryTestWrapperConfig
): FC<{ children: ReactNode }> {
  const client =
    config?.queryClient ?? createQueryTestContainer({ defaults: config?.defaults }).queryClient;

  function QueryTestWrapper({ children }: { children: ReactNode }): ReactNode {
    return createElement(QueryClientProvider, { client, children });
  }

  QueryTestWrapper.displayName = "QueryTestWrapper";

  return QueryTestWrapper;
}
