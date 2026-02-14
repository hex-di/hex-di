/**
 * Unit tests for Result Panel export utilities.
 *
 * Spec: 14-integration.md Sections 14.5, 14.6
 */

import { describe, it, expect } from "vitest";
import {
  exportChainJson,
  exportChainMermaid,
  exportChainDot,
  exportExecutionJson,
  exportExecutionCsv,
  exportStatsJson,
  exportStatsCsv,
  getExportFilename,
  encodeUrlState,
  decodeUrlState,
} from "../../../src/panels/result/export.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultPanelSnapshot,
  ResultPanelState,
} from "../../../src/panels/result/types.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

const chain: ResultChainDescriptor = {
  chainId: "chain-1",
  label: "validateUser",
  portName: "UserPort",
  operations: [
    {
      index: 0,
      method: "andThen",
      label: "validate",
      inputTrack: "ok",
      outputTracks: ["ok", "err"],
      canSwitch: true,
      isTerminal: false,
      callbackLocation: undefined,
    },
    {
      index: 1,
      method: "match",
      label: "extract",
      inputTrack: "both",
      outputTracks: ["ok", "err"],
      canSwitch: false,
      isTerminal: true,
      callbackLocation: undefined,
    },
  ],
  isAsync: false,
  sourceLocation: undefined,
};

const execution: ResultChainExecution = {
  executionId: "exec-42",
  chainId: "chain-1",
  entryMethod: "ok",
  entryTrack: "ok",
  entryValue: { data: 42, typeName: "number", truncated: false },
  steps: [
    {
      operationIndex: 0,
      inputTrack: "ok",
      outputTrack: "ok",
      switched: false,
      inputValue: { data: 42, typeName: "number", truncated: false },
      outputValue: { data: 42, typeName: "number", truncated: false },
      durationMicros: 50,
      callbackThrew: false,
      timestamp: 1000,
    },
    {
      operationIndex: 1,
      inputTrack: "ok",
      outputTrack: "ok",
      switched: false,
      inputValue: { data: 42, typeName: "number", truncated: false },
      outputValue: { data: "valid", typeName: "string", truncated: false },
      durationMicros: 10,
      callbackThrew: false,
      timestamp: 1050,
    },
  ],
  finalTrack: "ok",
  finalValue: { data: "valid", typeName: "string", truncated: false },
  totalDurationMicros: 60,
  startTimestamp: 1000,
  scopeId: undefined,
};

const snapshot: ResultPanelSnapshot = {
  chains: new Map([["chain-1", chain]]),
  portStats: new Map([
    [
      "UserPort",
      {
        portName: "UserPort",
        totalCalls: 100,
        okCount: 90,
        errCount: 10,
        errorRate: 0.1,
        errorsByCode: new Map([["VALIDATION", 10]]),
        lastError: undefined,
        stabilityScore: 0.9,
        chainIds: ["chain-1"],
        lastExecutionTimestamp: 1000,
      },
    ],
  ]),
  recentExecutions: [execution],
  paths: new Map(),
  totalOperationsObserved: 100,
  globalOkRate: 0.9,
  snapshotTimestamp: Date.now(),
};

// ── Chain exports ───────────────────────────────────────────────────────────

describe("exportChainJson", () => {
  it("produces valid JSON with chain descriptor + executions", () => {
    const result = exportChainJson(chain, [execution]);
    const parsed = JSON.parse(result);
    expect(parsed.chain.chainId).toBe("chain-1");
    expect(parsed.executions).toHaveLength(1);
  });
});

describe("exportChainMermaid", () => {
  it("produces valid Mermaid flowchart", () => {
    const result = exportChainMermaid(chain);
    expect(result).toContain("graph LR");
  });

  it("includes Ok/Err track nodes", () => {
    const result = exportChainMermaid(chain);
    expect(result).toMatch(/andThen|validate/);
    expect(result).toMatch(/match|extract/);
  });
});

describe("exportChainDot", () => {
  it("produces valid DOT format", () => {
    const result = exportChainDot(chain);
    expect(result).toContain("digraph");
  });

  it("includes color attributes for tracks", () => {
    const result = exportChainDot(chain);
    expect(result).toContain("color");
  });
});

// ── Execution exports ───────────────────────────────────────────────────────

describe("exportExecutionJson", () => {
  it("includes all step traces", () => {
    const result = exportExecutionJson(execution);
    const parsed = JSON.parse(result);
    expect(parsed.steps).toHaveLength(2);
  });
});

describe("exportExecutionCsv", () => {
  it("has correct columns: index, method, inputTrack, outputTrack, duration, switched", () => {
    const result = exportExecutionCsv(execution, chain);
    const lines = result.split("\n");
    expect(lines[0]).toBe("index,method,inputTrack,outputTrack,duration,switched");
    expect(lines).toHaveLength(3); // header + 2 steps
  });
});

// ── Statistics exports ──────────────────────────────────────────────────────

describe("exportStatsJson", () => {
  it("includes full ResultPanelSnapshot", () => {
    const result = exportStatsJson(snapshot);
    const parsed = JSON.parse(result);
    expect(parsed.globalOkRate).toBe(0.9);
    expect(parsed.totalOperationsObserved).toBe(100);
  });
});

describe("exportStatsCsv", () => {
  it("has per-port columns", () => {
    const result = exportStatsCsv(snapshot);
    const lines = result.split("\n");
    expect(lines[0]).toBe("portName,totalCalls,okCount,errCount,errorRate,stabilityScore");
    expect(lines[1]).toContain("UserPort");
  });
});

// ── Filename patterns ───────────────────────────────────────────────────────

describe("getExportFilename", () => {
  it("chain JSON filename: hex-result-chain-{label}-{timestamp}.json", () => {
    const name = getExportFilename("chain-json", "validateUser", undefined, 1700000000000);
    expect(name).toBe("hex-result-chain-validateUser-1700000000000.json");
  });

  it("chain Mermaid filename: hex-result-chain-{label}-{timestamp}.mmd", () => {
    const name = getExportFilename("chain-mermaid", "validateUser", undefined, 1700000000000);
    expect(name).toBe("hex-result-chain-validateUser-1700000000000.mmd");
  });

  it("execution CSV filename: hex-result-exec-{label}-{executionId}.csv", () => {
    const name = getExportFilename("execution-csv", "validateUser", "exec-42");
    expect(name).toBe("hex-result-exec-validateUser-exec-42.csv");
  });
});

// ── URL state ───────────────────────────────────────────────────────────────

describe("URL state encoding/decoding", () => {
  it("encodes and decodes chain, execution, step, view, filter", () => {
    const state: Partial<ResultPanelState> = {
      selectedChainId: "chain-1",
      selectedExecutionId: "exec-42",
      selectedStepIndex: 2,
      activeView: "log",
    };
    const encoded = encodeUrlState(state);
    expect(encoded).toContain("result-chain=chain-1");
    expect(encoded).toContain("result-view=log");

    const decoded = decodeUrlState(encoded);
    expect(decoded.selectedChainId).toBe("chain-1");
    expect(decoded.selectedExecutionId).toBe("exec-42");
    expect(decoded.selectedStepIndex).toBe(2);
    expect(decoded.activeView).toBe("log");
  });
});
