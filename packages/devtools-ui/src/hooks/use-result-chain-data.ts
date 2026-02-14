/**
 * useResultChainData hook — provides a single unified chain from InspectorDataSource.
 *
 * Merges ALL registered chains into one combined chain descriptor and one
 * combined execution so the Railway view shows every Result operation in a
 * single timeline.
 *
 * Prefers real chain data from TracedResult instrumentation (Level 1) when
 * available. Falls back to synthesizing data from ResultStatistics (Level 0).
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspectorDataSource } from "../data/inspector-data-source.js";
import type { ResultChainDescriptor, ResultChainExecution } from "../panels/result/types.js";
import {
  buildChainsFromStats,
  buildExecution,
  mergeAllChains,
  mergeAllExecutions,
} from "../panels/result-data-adapter.js";

interface UseResultChainDataResult {
  /** The single merged chain containing all Result operations, or undefined when empty. */
  readonly mergedChain: ResultChainDescriptor | undefined;
  /** The single merged execution (latest from each chain), or undefined when empty. */
  readonly mergedExecution: ResultChainExecution | undefined;
  /** Individual chains map (for overview and other uses). */
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  /** Get executions for a specific chain (for overview). */
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
  /** True when using real TracedResult data, false when using synthesized Level 0 data. */
  readonly isRealData: boolean;
}

/**
 * Wraps InspectorDataSource to provide unified chain data for the Railway view.
 *
 * Merges all chains into one combined chain/execution so the Railway shows
 * every Result operation in a single timeline instead of a per-chain dropdown.
 */
function useResultChainData(dataSource: InspectorDataSource): UseResultChainDataResult {
  const [version, setVersion] = useState(0);

  // Mutable ref for accumulated executions when using Level 0 fallback
  const fallbackExecutionsRef = useRef(new Map<string, ResultChainExecution[]>());

  // Check for real chain data (Level 1 — TracedResult instrumentation)
  const realChains = useMemo(() => {
    void version;
    return dataSource.getResultChains?.();
  }, [dataSource, version]);

  const isRealData = realChains !== undefined && realChains.size > 0;

  // Derive chains: prefer real data, fall back to stats-based synthesis
  const chains = useMemo(() => {
    void version;
    if (isRealData) {
      return realChains;
    }
    const stats = dataSource.getAllResultStatistics();
    if (stats === undefined) {
      return new Map<string, ResultChainDescriptor>();
    }
    return buildChainsFromStats(stats);
  }, [dataSource, version, isRealData, realChains]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = dataSource.subscribe(event => {
      if (event.type === "snapshot-changed") {
        setVersion(v => v + 1);
        return;
      }

      // Real chain data events (from TracedResult instrumentation)
      if (event.type === "chain-registered" || event.type === "execution-added") {
        setVersion(v => v + 1);
        return;
      }

      // Level 0 fallback: synthesize executions from result:ok/result:err events
      if (!isRealData && (event.type === "result:ok" || event.type === "result:err")) {
        const track = event.type === "result:ok" ? "ok" : "err";
        const chainId = `port:${event.portName}`;
        const exec = buildExecution(chainId, track, event.timestamp);

        const list = fallbackExecutionsRef.current.get(chainId);
        if (list) {
          list.push(exec);
        } else {
          fallbackExecutionsRef.current.set(chainId, [exec]);
        }

        setVersion(v => v + 1);
      }
    });

    return unsubscribe;
  }, [dataSource, isRealData]);

  const getExecutions = useCallback(
    (chainId: string): readonly ResultChainExecution[] => {
      void version;
      if (isRealData) {
        return dataSource.getResultExecutions?.(chainId) ?? [];
      }
      return fallbackExecutionsRef.current.get(chainId) ?? [];
    },
    [version, isRealData, dataSource]
  );

  // Compute merged chain
  const mergedChain = useMemo(() => {
    void version;
    return mergeAllChains(chains);
  }, [chains, version]);

  // Compute merged execution
  const mergedExecution = useMemo(() => {
    void version;
    return mergeAllExecutions(chains, getExecutions);
  }, [chains, getExecutions, version]);

  return {
    mergedChain,
    mergedExecution,
    chains,
    getExecutions,
    isRealData,
  };
}

export { useResultChainData };
export type { UseResultChainDataResult };
