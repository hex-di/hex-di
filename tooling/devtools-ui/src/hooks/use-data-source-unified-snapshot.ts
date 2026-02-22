/**
 * useDataSourceUnifiedSnapshot hook for reactive unified snapshot access.
 *
 * Returns the current UnifiedSnapshot from the InspectorDataSource
 * and automatically re-renders when data changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import type { UnifiedSnapshot } from "@hex-di/core";
import { useDataSource } from "../context/data-source-context.js";

/**
 * Reactive unified snapshot (container + all library snapshots) from the
 * current data source. Returns undefined when data hasn't arrived yet.
 */
export function useDataSourceUnifiedSnapshot(): UnifiedSnapshot | undefined {
  const dataSource = useDataSource();

  return useSyncExternalStore(
    onStoreChange => dataSource.subscribe(() => onStoreChange()),
    () => dataSource.getUnifiedSnapshot(),
    () => dataSource.getUnifiedSnapshot()
  );
}
