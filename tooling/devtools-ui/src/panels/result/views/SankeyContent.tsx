import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultPortStatistics,
} from "../types.js";
import { SankeyStatisticsView } from "../sankey-statistics.js";
import type { FlowData } from "../sankey-statistics.js";
import { ViewPlaceholder } from "./ViewPlaceholder.js";

interface SankeyContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function updateStepFlowEntry(
  entry: { okToOk: number; okToErr: number; errToOk: number; errToErr: number },
  inputTrack: string,
  outputTrack: string
): void {
  if (inputTrack === "ok" && outputTrack === "ok") {
    entry.okToOk++;
  } else if (inputTrack === "ok" && outputTrack === "err") {
    entry.okToErr++;
  } else if (inputTrack === "err" && outputTrack === "ok") {
    entry.errToOk++;
  } else {
    entry.errToErr++;
  }
}

function aggregateExecutionData(
  chains: ReadonlyMap<string, ResultChainDescriptor>,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): {
  flowMap: Map<number, { okToOk: number; okToErr: number; errToOk: number; errToErr: number }>;
  totalCalls: number;
  okCount: number;
  errCount: number;
  errorsByCode: Map<string, number>;
  lastTimestamp: number | undefined;
  chainIds: string[];
  displayChain: ResultChainDescriptor | undefined;
} {
  const flowMap = new Map<
    number,
    { okToOk: number; okToErr: number; errToOk: number; errToErr: number }
  >();
  let totalCalls = 0;
  let okCount = 0;
  let errCount = 0;
  const errorsByCode = new Map<string, number>();
  let lastTimestamp: number | undefined;
  const chainIds: string[] = [];
  let displayChain: ResultChainDescriptor | undefined;

  for (const [chainId, chain] of chains) {
    chainIds.push(chainId);
    if (displayChain === undefined || chain.operations.length > displayChain.operations.length) {
      displayChain = chain;
    }

    for (const exec of getExecutions(chainId)) {
      totalCalls++;
      if (exec.finalTrack === "ok") {
        okCount++;
      } else {
        errCount++;
        if (exec.finalValue !== undefined) {
          const code =
            typeof exec.finalValue.data === "string"
              ? exec.finalValue.data
              : exec.finalValue.typeName;
          errorsByCode.set(code, (errorsByCode.get(code) ?? 0) + 1);
        }
      }

      if (lastTimestamp === undefined || exec.startTimestamp > lastTimestamp) {
        lastTimestamp = exec.startTimestamp;
      }

      for (const step of exec.steps) {
        let entry = flowMap.get(step.operationIndex);
        if (entry === undefined) {
          entry = { okToOk: 0, okToErr: 0, errToOk: 0, errToErr: 0 };
          flowMap.set(step.operationIndex, entry);
        }
        updateStepFlowEntry(entry, step.inputTrack, step.outputTrack);
      }
    }
  }

  return {
    flowMap,
    totalCalls,
    okCount,
    errCount,
    errorsByCode,
    lastTimestamp,
    chainIds,
    displayChain,
  };
}

function SankeyContent({ chains, getExecutions }: SankeyContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="sankey" />;
  }

  const {
    flowMap,
    totalCalls,
    okCount,
    errCount,
    errorsByCode,
    lastTimestamp,
    chainIds,
    displayChain,
  } = aggregateExecutionData(chains, getExecutions);

  if (displayChain === undefined || totalCalls === 0) {
    return <ViewPlaceholder viewId="sankey" />;
  }

  const flows: FlowData[] = [...flowMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([operationIndex, counts]) => ({
      operationIndex,
      ...counts,
    }));

  const portStats: ResultPortStatistics = {
    portName: displayChain.portName ?? displayChain.label,
    totalCalls,
    okCount,
    errCount,
    errorRate: totalCalls > 0 ? errCount / totalCalls : 0,
    errorsByCode,
    lastError: undefined,
    stabilityScore: totalCalls > 0 ? okCount / totalCalls : 1,
    chainIds,
    lastExecutionTimestamp: lastTimestamp,
  };

  return (
    <SankeyStatisticsView
      chain={displayChain}
      flows={flows}
      portStats={portStats}
      stabilityHistory={[]}
    />
  );
}

export { SankeyContent };
