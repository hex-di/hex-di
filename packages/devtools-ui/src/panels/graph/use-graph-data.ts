/**
 * Hook for building multi-container graph state from the data source.
 *
 * @packageDocumentation
 */

import { useMemo, useSyncExternalStore, useCallback, useRef } from "react";
import type { InspectorDataSource } from "../../data/inspector-data-source.js";
import type { ContainerGraphData, InspectorEvent } from "@hex-di/core";
import type { MultiContainerGraphState } from "./types.js";

/**
 * Hook subscribing to InspectorDataSource, building MultiContainerGraphState.
 *
 * @param dataSource - The data source to subscribe to
 * @param selectedContainerName - Currently selected container name
 */
function useGraphData(
  dataSource: InspectorDataSource,
  selectedContainerName: string | undefined
): MultiContainerGraphState {
  const snapshotRef = useRef<MultiContainerGraphState>({
    containers: new Map(),
    parentMap: new Map(),
    activeGraph: undefined,
  });
  const lastGraphDataRef = useRef<ContainerGraphData | undefined>(undefined);
  const lastContainerNameRef = useRef<string | undefined>(undefined);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return dataSource.subscribe((_event: InspectorEvent) => {
        onStoreChange();
      });
    },
    [dataSource]
  );

  const getSnapshot = useCallback(() => {
    const graphData = dataSource.getGraphData();

    // Return cached snapshot when inputs haven't changed
    if (
      graphData === lastGraphDataRef.current &&
      selectedContainerName === lastContainerNameRef.current
    ) {
      return snapshotRef.current;
    }

    lastGraphDataRef.current = graphData;
    lastContainerNameRef.current = selectedContainerName;

    if (graphData === undefined) {
      if (snapshotRef.current.containers.size === 0) {
        return snapshotRef.current;
      }
      const empty: MultiContainerGraphState = {
        containers: new Map(),
        parentMap: new Map(),
        activeGraph: undefined,
      };
      snapshotRef.current = empty;
      return empty;
    }

    // Build container map from single graph data
    // (multi-container support: in future, data source can provide multiple)
    const containers = new Map<string, ContainerGraphData>();
    containers.set(graphData.containerName, graphData);

    const parentMap = new Map<string, string>();
    if (graphData.parentName !== null) {
      parentMap.set(graphData.containerName, graphData.parentName);
    }

    const activeGraph =
      selectedContainerName !== undefined
        ? (containers.get(selectedContainerName) ?? graphData)
        : graphData;

    const next: MultiContainerGraphState = {
      containers,
      parentMap,
      activeGraph,
    };

    snapshotRef.current = next;
    return next;
  }, [dataSource, selectedContainerName]);

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return snapshotRef.current;
}

export { useGraphData };
