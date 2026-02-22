/**
 * useDataSourceScopeTree hook for reactive scope tree access.
 *
 * Returns the current ScopeTree from the InspectorDataSource
 * and automatically re-renders when data changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import type { ScopeTree } from "@hex-di/core";
import { useDataSource } from "../context/data-source-context.js";

/**
 * Reactive scope tree from the current data source.
 * Returns undefined when data hasn't arrived yet.
 */
export function useDataSourceScopeTree(): ScopeTree | undefined {
  const dataSource = useDataSource();

  return useSyncExternalStore(
    onStoreChange => dataSource.subscribe(() => onStoreChange()),
    () => dataSource.getScopeTree(),
    () => dataSource.getScopeTree()
  );
}
