/**
 * Export utilities for the Result Panel.
 *
 * JSON, Mermaid, DOT, CSV export and URL state encoding/decoding.
 *
 * Spec: 14-integration.md Sections 14.5, 14.6
 *
 * @packageDocumentation
 */

import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultPanelSnapshot,
  ResultPanelState,
  ResultViewId,
} from "./types.js";

// ── Chain Exports ───────────────────────────────────────────────────────────

/** Export chain descriptor + executions as JSON string. */
export function exportChainJson(
  chain: ResultChainDescriptor,
  executions: readonly ResultChainExecution[]
): string {
  return JSON.stringify({ chain, executions }, null, 2);
}

/** Export chain as Mermaid flowchart syntax. */
export function exportChainMermaid(chain: ResultChainDescriptor): string {
  const lines = ["graph LR"];
  const ops = chain.operations;

  for (let i = 0; i < ops.length; i++) {
    const current = ops[i];
    const nodeId = `op${current.index}`;
    const shape = current.isTerminal
      ? `${nodeId}[["${current.method}(${current.label})"]]`
      : `${nodeId}["${current.method}(${current.label})"]`;
    lines.push(`  ${shape}`);

    if (i > 0) {
      const prev = ops[i - 1];
      const prevId = `op${prev.index}`;
      if (current.canSwitch) {
        lines.push(`  ${prevId} -->|Ok| ${nodeId}`);
        lines.push(`  ${prevId} -.->|Err| ${nodeId}`);
      } else {
        lines.push(`  ${prevId} --> ${nodeId}`);
      }
    }
  }

  return lines.join("\n");
}

/** Export chain as Graphviz DOT format. */
export function exportChainDot(chain: ResultChainDescriptor): string {
  const lines = [
    `digraph "${chain.label}" {`,
    "  rankdir=LR;",
    '  node [shape=box, style=rounded, fontname="monospace"];',
  ];

  for (const op of chain.operations) {
    const color = op.isTerminal ? "#f59e0b" : op.canSwitch ? "#8b5cf6" : "#3b82f6";
    lines.push(`  op${op.index} [label="${op.method}(${op.label})", color="${color}"];`);
  }

  for (let i = 1; i < chain.operations.length; i++) {
    const prev = chain.operations[i - 1];
    const curr = chain.operations[i];
    lines.push(`  op${prev.index} -> op${curr.index} [color="#059669"];`);
    if (curr.canSwitch) {
      lines.push(`  op${prev.index} -> op${curr.index} [color="#e11d48", style=dashed];`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

// ── Execution Exports ───────────────────────────────────────────────────────

/** Export a single execution as JSON string. */
export function exportExecutionJson(execution: ResultChainExecution): string {
  return JSON.stringify(execution, null, 2);
}

/** Export a single execution as CSV. */
export function exportExecutionCsv(
  execution: ResultChainExecution,
  chain: ResultChainDescriptor
): string {
  const header = "index,method,inputTrack,outputTrack,duration,switched";
  const rows = execution.steps.map(step => {
    const op = chain.operations[step.operationIndex];
    const method = op?.method ?? "unknown";
    return `${step.operationIndex},${method},${step.inputTrack},${step.outputTrack},${step.durationMicros},${step.switched}`;
  });
  return [header, ...rows].join("\n");
}

// ── Statistics Exports ──────────────────────────────────────────────────────

/** Export panel snapshot as JSON string. */
export function exportStatsJson(snapshot: ResultPanelSnapshot): string {
  return JSON.stringify(
    {
      totalOperationsObserved: snapshot.totalOperationsObserved,
      globalOkRate: snapshot.globalOkRate,
      snapshotTimestamp: snapshot.snapshotTimestamp,
      portStats: Object.fromEntries(snapshot.portStats),
    },
    null,
    2
  );
}

/** Export per-port statistics as CSV. */
export function exportStatsCsv(snapshot: ResultPanelSnapshot): string {
  const header = "portName,totalCalls,okCount,errCount,errorRate,stabilityScore";
  const rows: string[] = [];
  for (const stats of snapshot.portStats.values()) {
    rows.push(
      `${stats.portName},${stats.totalCalls},${stats.okCount},${stats.errCount},${stats.errorRate},${stats.stabilityScore}`
    );
  }
  return [header, ...rows].join("\n");
}

// ── Filename Generation (Section 14.5) ──────────────────────────────────────

type ExportType =
  | "chain-json"
  | "chain-mermaid"
  | "chain-dot"
  | "chain-svg"
  | "chain-png"
  | "execution-json"
  | "execution-csv"
  | "stats-json"
  | "stats-csv";

const EXTENSION_MAP: Record<ExportType, string> = {
  "chain-json": ".json",
  "chain-mermaid": ".mmd",
  "chain-dot": ".dot",
  "chain-svg": ".svg",
  "chain-png": ".png",
  "execution-json": ".json",
  "execution-csv": ".csv",
  "stats-json": ".json",
  "stats-csv": ".csv",
};

/** Generate export filename per naming conventions. */
export function getExportFilename(
  type: ExportType,
  label: string,
  executionId?: string,
  timestamp?: number
): string {
  const ext = EXTENSION_MAP[type];
  const ts = timestamp ?? Date.now();

  if (type.startsWith("chain-")) {
    return `hex-result-chain-${label}-${ts}${ext}`;
  }
  if (type.startsWith("execution-")) {
    return `hex-result-exec-${label}-${executionId ?? ts}${ext}`;
  }
  // stats
  return `hex-result-stats-${ts}${ext}`;
}

// ── URL State Encoding/Decoding (Section 14.6) ─────────────────────────────

const VIEW_IDS: ReadonlySet<string> = new Set([
  "railway",
  "log",
  "cases",
  "sankey",
  "waterfall",
  "combinator",
  "overview",
]);

/** Encode panel state to URL search params string. */
export function encodeUrlState(state: Partial<ResultPanelState>): string {
  const params = new URLSearchParams();
  if (state.selectedChainId !== undefined) {
    params.set("result-chain", state.selectedChainId);
  }
  if (state.selectedExecutionId !== undefined) {
    params.set("result-exec", state.selectedExecutionId);
  }
  if (state.selectedStepIndex !== undefined) {
    params.set("result-step", String(state.selectedStepIndex));
  }
  if (state.activeView !== undefined) {
    params.set("result-view", state.activeView);
  }
  if (state.filter !== undefined) {
    params.set("result-filter", btoa(JSON.stringify(state.filter)));
  }
  return params.toString();
}

interface DecodedUrlState {
  readonly selectedChainId: string | undefined;
  readonly selectedExecutionId: string | undefined;
  readonly selectedStepIndex: number | undefined;
  readonly activeView: ResultViewId | undefined;
}

/** Decode URL search params string back to partial panel state. */
export function decodeUrlState(search: string): DecodedUrlState {
  const params = new URLSearchParams(search);

  const viewRaw = params.get("result-view");
  const stepRaw = params.get("result-step");

  return {
    selectedChainId: params.get("result-chain") ?? undefined,
    selectedExecutionId: params.get("result-exec") ?? undefined,
    selectedStepIndex: stepRaw !== null ? Number(stepRaw) : undefined,
    activeView: viewRaw !== null && VIEW_IDS.has(viewRaw) ? (viewRaw as ResultViewId) : undefined,
  };
}
