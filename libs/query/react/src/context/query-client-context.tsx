/**
 * QueryClient React Context
 *
 * Provides QueryClient instance to child components via React context.
 *
 * @packageDocumentation
 */

import { createContext, useContext, type ReactNode } from "react";
import type { QueryClient } from "@hex-di/query";

// =============================================================================
// Context
// =============================================================================

const QueryClientContext = createContext<QueryClient | undefined>(undefined);
QueryClientContext.displayName = "QueryClientContext";

// =============================================================================
// QueryClientProvider
// =============================================================================

export interface QueryClientProviderProps {
  readonly client: QueryClient;
  readonly children: ReactNode;
}

/**
 * Provides a QueryClient instance to child hooks via React context.
 *
 * Unlike container-based providers, the client is passed explicitly,
 * decoupling React context setup from container resolution.
 */
export function QueryClientProvider({
  client,
  children,
}: QueryClientProviderProps): React.ReactNode {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
}

// =============================================================================
// useQueryClient
// =============================================================================

/**
 * Access the QueryClient from the nearest QueryClientProvider.
 *
 * @throws Error if used outside a QueryClientProvider
 */
export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (client === undefined) {
    throw new Error(
      "useQueryClient must be used within a QueryClientProvider. " +
        "Wrap your component tree with <QueryClientProvider client={queryClient}>."
    );
  }
  return client;
}
