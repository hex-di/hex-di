/**
 * Pure functions that synthesize ResultChainDescriptor and ResultChainExecution
 * from ResultStatistics and inspector events.
 *
 * Each port becomes a single-node chain (constructor operation).
 * Each result:ok / result:err event becomes a single-step execution.
 *
 * @packageDocumentation
 */

import type { ResultStatistics } from "@hex-di/core";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultStepTrace,
} from "./result/types.js";

let executionCounter = 0;

/**
 * Creates a 3-operation chain descriptor for a port:
 *  0. ok()    — constructor (entry point)
 *  1. map()   — transformation (processes ok track)
 *  2. match() — extraction (terminal)
 */
function buildChainFromPort(portName: string): ResultChainDescriptor {
  const ops: readonly ResultOperationDescriptor[] = [
    {
      index: 0,
      method: "ok",
      label: "ok()",
      inputTrack: "both",
      outputTracks: ["ok", "err"],
      canSwitch: false,
      isTerminal: false,
      callbackLocation: undefined,
    },
    {
      index: 1,
      method: "map",
      label: "map()",
      inputTrack: "ok",
      outputTracks: ["ok"],
      canSwitch: false,
      isTerminal: false,
      callbackLocation: undefined,
    },
    {
      index: 2,
      method: "match",
      label: "match()",
      inputTrack: "both",
      outputTracks: ["ok", "err"],
      canSwitch: false,
      isTerminal: true,
      callbackLocation: undefined,
    },
  ];

  return {
    chainId: `port:${portName}`,
    label: portName,
    portName,
    operations: ops,
    isAsync: false,
    sourceLocation: undefined,
  };
}

/**
 * Creates a chain map from ResultStatistics — one chain per port.
 */
function buildChainsFromStats(
  stats: ReadonlyMap<string, ResultStatistics>
): ReadonlyMap<string, ResultChainDescriptor> {
  const chains = new Map<string, ResultChainDescriptor>();

  for (const [, stat] of stats) {
    const chain = buildChainFromPort(stat.portName);
    chains.set(chain.chainId, chain);
  }

  return chains;
}

/**
 * Creates a 3-step execution matching the 3-operation chain.
 *
 * For an "ok" entry: all steps flow on the ok track.
 * For an "err" entry: step 1 (map, ok-only) is bypassed, rest on err track.
 */
function buildExecution(
  chainId: string,
  track: "ok" | "err",
  timestamp: number
): ResultChainExecution {
  executionCounter += 1;

  const steps: readonly ResultStepTrace[] = [
    {
      operationIndex: 0,
      inputTrack: track,
      outputTrack: track,
      switched: false,
      inputValue: undefined,
      outputValue: undefined,
      durationMicros: 0,
      callbackThrew: false,
      timestamp,
    },
    {
      operationIndex: 1,
      inputTrack: track,
      outputTrack: track,
      switched: false,
      inputValue: undefined,
      outputValue: undefined,
      durationMicros: 0,
      callbackThrew: false,
      timestamp,
    },
    {
      operationIndex: 2,
      inputTrack: track,
      outputTrack: track,
      switched: false,
      inputValue: undefined,
      outputValue: undefined,
      durationMicros: 0,
      callbackThrew: false,
      timestamp,
    },
  ];

  return {
    executionId: `exec:${timestamp}-${executionCounter}`,
    chainId,
    entryMethod: track,
    entryTrack: track,
    entryValue: undefined,
    steps,
    finalTrack: track,
    finalValue: undefined,
    totalDurationMicros: 0,
    startTimestamp: timestamp,
    scopeId: undefined,
  };
}

// =============================================================================
// Chain-based overview
// =============================================================================

interface ChainOverview {
  readonly totalExecutions: number;
  readonly okCount: number;
  readonly errCount: number;
  readonly okRate: number;
  readonly chainCount: number;
  readonly chainsWithErrors: number;
  readonly perChain: readonly ChainOverviewEntry[];
}

interface ChainOverviewEntry {
  readonly chainId: string;
  readonly label: string;
  readonly okCount: number;
  readonly errCount: number;
  readonly totalExecutions: number;
}

/**
 * Derives overview statistics from real chain data (TracedResult instrumentation).
 * Used when DI-based ResultStatistics are not available.
 */
function buildOverviewFromChains(
  chains: ReadonlyMap<string, ResultChainDescriptor>,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): ChainOverview {
  let totalOk = 0;
  let totalErr = 0;
  let chainsWithErrors = 0;
  const perChain: ChainOverviewEntry[] = [];

  for (const [chainId, chain] of chains) {
    const executions = getExecutions(chainId);
    let chainOk = 0;
    let chainErr = 0;

    for (const exec of executions) {
      if (exec.finalTrack === "ok") {
        chainOk += 1;
      } else {
        chainErr += 1;
      }
    }

    totalOk += chainOk;
    totalErr += chainErr;
    if (chainErr > 0) {
      chainsWithErrors += 1;
    }

    perChain.push({
      chainId,
      label: chain.label,
      okCount: chainOk,
      errCount: chainErr,
      totalExecutions: chainOk + chainErr,
    });
  }

  const total = totalOk + totalErr;

  return {
    totalExecutions: total,
    okCount: totalOk,
    errCount: totalErr,
    okRate: total > 0 ? totalOk / total : 1,
    chainCount: chains.size,
    chainsWithErrors,
    perChain,
  };
}

// =============================================================================
// Unified (merged) chain
// =============================================================================

/**
 * Merges all registered chain descriptors into a single unified chain by
 * concatenating their operations sequentially.  Each operation carries a
 * `chainLabel` so the Railway can render visual boundaries between segments.
 *
 * Returns `undefined` when the input map is empty.
 */
function mergeAllChains(
  chains: ReadonlyMap<string, ResultChainDescriptor>
): ResultChainDescriptor | undefined {
  if (chains.size === 0) return undefined;

  const allOps: ResultOperationDescriptor[] = [];
  let globalIndex = 0;

  for (const [, chain] of chains) {
    for (const op of chain.operations) {
      allOps.push({
        ...op,
        index: globalIndex,
        chainLabel: chain.label,
      });
      globalIndex += 1;
    }
  }

  return {
    chainId: "merged",
    label: "All Result Operations",
    portName: undefined,
    operations: allOps,
    isAsync: false,
    sourceLocation: undefined,
  };
}

/**
 * Merges the latest execution from each chain into a single unified execution.
 *
 * For each chain (in iteration order), picks the last execution and appends
 * its steps — with `operationIndex` re-based to match the merged chain.
 *
 * Returns `undefined` when no chains have executions.
 */
function mergeAllExecutions(
  chains: ReadonlyMap<string, ResultChainDescriptor>,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): ResultChainExecution | undefined {
  const allSteps: ResultStepTrace[] = [];
  let globalOffset = 0;
  let finalTrack: "ok" | "err" = "ok";
  let hasAnyExecution = false;
  let earliestTimestamp = Infinity;
  let totalDuration = 0;

  for (const [chainId, chain] of chains) {
    const executions = getExecutions(chainId);
    const latest = executions.length > 0 ? executions[executions.length - 1] : undefined;

    if (latest) {
      hasAnyExecution = true;
      if (latest.startTimestamp < earliestTimestamp) {
        earliestTimestamp = latest.startTimestamp;
      }
      totalDuration += latest.totalDurationMicros;
      finalTrack = latest.finalTrack;

      for (const step of latest.steps) {
        allSteps.push({
          ...step,
          operationIndex: globalOffset + step.operationIndex,
        });
      }
    }

    globalOffset += chain.operations.length;
  }

  if (!hasAnyExecution) return undefined;

  return {
    executionId: "merged",
    chainId: "merged",
    entryMethod: "ok",
    entryTrack: allSteps.length > 0 ? allSteps[0].inputTrack : "ok",
    entryValue: undefined,
    steps: allSteps,
    finalTrack,
    finalValue: undefined,
    totalDurationMicros: totalDuration,
    startTimestamp: earliestTimestamp === Infinity ? 0 : earliestTimestamp,
    scopeId: undefined,
  };
}

export {
  buildChainFromPort,
  buildChainsFromStats,
  buildExecution,
  buildOverviewFromChains,
  mergeAllChains,
  mergeAllExecutions,
};
export type { ChainOverview, ChainOverviewEntry };
