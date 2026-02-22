/**
 * useDataSourceSnapshot hook for reactive container snapshot access.
 *
 * Returns the current ContainerSnapshot from the InspectorDataSource
 * and automatically re-renders when data changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import type { ContainerSnapshot } from "@hex-di/core";
import { useDataSource } from "../context/data-source-context.js";

/**
 * Reactive container snapshot from the current data source.
 * Returns undefined when data hasn't arrived yet.
 */
export function useDataSourceSnapshot(): ContainerSnapshot | undefined {
  const dataSource = useDataSource();

  return useSyncExternalStore(
    onStoreChange => dataSource.subscribe(() => onStoreChange()),
    () => dataSource.getSnapshot(),
    () => dataSource.getSnapshot()
  );
}
