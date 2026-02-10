/**
 * useIsFetching Hook
 *
 * Returns the number of currently fetching queries, optionally
 * filtered by port name.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore, useCallback } from "react";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// QueryFilters
// =============================================================================

export interface QueryFilters {
  readonly port?: { readonly __portName: string };
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
  const client = useQueryClient();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return client.subscribe(() => {
        onStoreChange();
      });
    },
    [client]
  );

  const getSnapshot = useCallback((): number => {
    if (client.isDisposed) return 0;
    return client.isFetching(filters ? { port: filters.port } : undefined);
  }, [client, filters]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
