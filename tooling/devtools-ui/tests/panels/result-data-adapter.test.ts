/**
 * Tests for result-data-adapter pure functions.
 *
 * Verifies synthesis of ResultChainDescriptor and ResultChainExecution
 * from ResultStatistics and inspector events.
 */

import { describe, it, expect } from "vitest";
import {
  buildChainFromPort,
  buildChainsFromStats,
  buildExecution,
  buildOverviewFromChains,
  mergeAllChains,
  mergeAllExecutions,
} from "../../src/panels/result-data-adapter.js";
import type { ResultStatistics } from "@hex-di/core";
import type { ResultChainDescriptor, ResultChainExecution } from "../../src/panels/result/types.js";

describe("buildChainFromPort", () => {
  it("creates a 3-operation chain with ok constructor, map transformation, and match extraction", () => {
    const chain: ResultChainDescriptor = buildChainFromPort("Logger");

    expect(chain.chainId).toBe("port:Logger");
    expect(chain.label).toBe("Logger");
    expect(chain.portName).toBe("Logger");
    expect(chain.isAsync).toBe(false);
    expect(chain.sourceLocation).toBeUndefined();
    expect(chain.operations).toHaveLength(3);

    // Op 0: ok() constructor
    const op0 = chain.operations[0];
    expect(op0.index).toBe(0);
    expect(op0.method).toBe("ok");
    expect(op0.label).toBe("ok()");
    expect(op0.inputTrack).toBe("both");
    expect(op0.outputTracks).toEqual(["ok", "err"]);
    expect(op0.canSwitch).toBe(false);
    expect(op0.isTerminal).toBe(false);

    // Op 1: map() transformation
    const op1 = chain.operations[1];
    expect(op1.index).toBe(1);
    expect(op1.method).toBe("map");
    expect(op1.label).toBe("map()");
    expect(op1.inputTrack).toBe("ok");
    expect(op1.outputTracks).toEqual(["ok"]);
    expect(op1.canSwitch).toBe(false);
    expect(op1.isTerminal).toBe(false);

    // Op 2: match() extraction
    const op2 = chain.operations[2];
    expect(op2.index).toBe(2);
    expect(op2.method).toBe("match");
    expect(op2.label).toBe("match()");
    expect(op2.inputTrack).toBe("both");
    expect(op2.canSwitch).toBe(false);
    expect(op2.isTerminal).toBe(true);
  });
});

describe("buildChainsFromStats", () => {
  it("returns empty map for empty stats", () => {
    const result = buildChainsFromStats(new Map());
    expect(result.size).toBe(0);
  });

  it("creates one chain per port from stats", () => {
    const stats: ReadonlyMap<string, ResultStatistics> = new Map([
      [
        "Logger",
        {
          portName: "Logger",
          totalCalls: 10,
          okCount: 9,
          errCount: 1,
          errorRate: 0.1,
          errorsByCode: new Map(),
          lastError: undefined,
        },
      ],
      [
        "Database",
        {
          portName: "Database",
          totalCalls: 5,
          okCount: 5,
          errCount: 0,
          errorRate: 0,
          errorsByCode: new Map(),
          lastError: undefined,
        },
      ],
    ]);

    const chains = buildChainsFromStats(stats);

    expect(chains.size).toBe(2);
    expect(chains.has("port:Logger")).toBe(true);
    expect(chains.has("port:Database")).toBe(true);

    const loggerChain = chains.get("port:Logger");
    expect(loggerChain?.portName).toBe("Logger");
    expect(loggerChain?.operations).toHaveLength(3);

    const dbChain = chains.get("port:Database");
    expect(dbChain?.portName).toBe("Database");
    expect(dbChain?.operations).toHaveLength(3);
  });
});

describe("buildExecution", () => {
  it("creates execution with entryTrack ok and 3 steps all on ok track", () => {
    const exec: ResultChainExecution = buildExecution("port:Logger", "ok", 1000);

    expect(exec.chainId).toBe("port:Logger");
    expect(exec.entryMethod).toBe("ok");
    expect(exec.entryTrack).toBe("ok");
    expect(exec.entryValue).toBeUndefined();
    expect(exec.finalTrack).toBe("ok");
    expect(exec.finalValue).toBeUndefined();
    expect(exec.totalDurationMicros).toBe(0);
    expect(exec.startTimestamp).toBe(1000);
    expect(exec.scopeId).toBeUndefined();
    expect(exec.executionId).toMatch(/^exec:/);

    expect(exec.steps).toHaveLength(3);

    // Step 0: ok() constructor
    expect(exec.steps[0].operationIndex).toBe(0);
    expect(exec.steps[0].inputTrack).toBe("ok");
    expect(exec.steps[0].outputTrack).toBe("ok");
    expect(exec.steps[0].switched).toBe(false);

    // Step 1: map() transformation
    expect(exec.steps[1].operationIndex).toBe(1);
    expect(exec.steps[1].inputTrack).toBe("ok");
    expect(exec.steps[1].outputTrack).toBe("ok");

    // Step 2: match() extraction
    expect(exec.steps[2].operationIndex).toBe(2);
    expect(exec.steps[2].inputTrack).toBe("ok");
    expect(exec.steps[2].outputTrack).toBe("ok");
  });

  it("creates execution with entryTrack err and 3 steps all on err track", () => {
    const exec: ResultChainExecution = buildExecution("port:Database", "err", 2000);

    expect(exec.chainId).toBe("port:Database");
    expect(exec.entryMethod).toBe("err");
    expect(exec.entryTrack).toBe("err");
    expect(exec.finalTrack).toBe("err");
    expect(exec.startTimestamp).toBe(2000);

    expect(exec.steps).toHaveLength(3);

    expect(exec.steps[0].operationIndex).toBe(0);
    expect(exec.steps[0].inputTrack).toBe("err");
    expect(exec.steps[0].outputTrack).toBe("err");

    // Step 1: map() — on err track (bypassed in practice)
    expect(exec.steps[1].operationIndex).toBe(1);
    expect(exec.steps[1].inputTrack).toBe("err");
    expect(exec.steps[1].outputTrack).toBe("err");

    expect(exec.steps[2].operationIndex).toBe(2);
    expect(exec.steps[2].inputTrack).toBe("err");
    expect(exec.steps[2].outputTrack).toBe("err");
  });

  it("generates unique execution IDs", () => {
    const exec1 = buildExecution("port:A", "ok", 100);
    const exec2 = buildExecution("port:A", "ok", 101);

    expect(exec1.executionId).not.toBe(exec2.executionId);
  });
});

// =============================================================================
// buildOverviewFromChains
// =============================================================================

function makeChain(chainId: string, label: string, methods: string[]): ResultChainDescriptor {
  return {
    chainId,
    label,
    portName: undefined,
    operations: methods.map((method, index) => ({
      index,
      method: method as ResultChainDescriptor["operations"][number]["method"],
      label: `${method}()`,
      inputTrack: "both" as const,
      outputTracks: ["ok", "err"] as const,
      canSwitch: false,
      isTerminal: false,
      callbackLocation: undefined,
    })),
    isAsync: false,
    sourceLocation: undefined,
  };
}

function makeExecution(chainId: string, finalTrack: "ok" | "err"): ResultChainExecution {
  return {
    executionId: `exec:${Date.now()}-${Math.random()}`,
    chainId,
    entryMethod: "ok",
    entryTrack: "ok",
    entryValue: undefined,
    steps: [],
    finalTrack,
    finalValue: undefined,
    totalDurationMicros: 100,
    startTimestamp: Date.now(),
    scopeId: undefined,
  };
}

describe("buildOverviewFromChains", () => {
  it("computes aggregate stats from chain executions", () => {
    const chain1 = makeChain("c1", "fromNullable → map", ["fromNullable", "map"]);
    const chain2 = makeChain("c2", "ok", ["ok"]);

    const chains = new Map<string, ResultChainDescriptor>([
      ["c1", chain1],
      ["c2", chain2],
    ]);

    const executions = new Map<string, readonly ResultChainExecution[]>([
      ["c1", [makeExecution("c1", "ok"), makeExecution("c1", "err")]],
      ["c2", [makeExecution("c2", "ok"), makeExecution("c2", "ok"), makeExecution("c2", "ok")]],
    ]);

    const getExecutions = (chainId: string): readonly ResultChainExecution[] =>
      executions.get(chainId) ?? [];

    const overview = buildOverviewFromChains(chains, getExecutions);

    expect(overview.totalExecutions).toBe(5);
    expect(overview.okCount).toBe(4);
    expect(overview.errCount).toBe(1);
    expect(overview.chainCount).toBe(2);
    expect(overview.okRate).toBeCloseTo(0.8);
    expect(overview.chainsWithErrors).toBe(1);
  });

  it("includes per-chain breakdown with labels and ok/err counts", () => {
    const chain1 = makeChain("c1", "fromNullable → map", ["fromNullable", "map"]);
    const chain2 = makeChain("c2", "ok", ["ok"]);

    const chains = new Map<string, ResultChainDescriptor>([
      ["c1", chain1],
      ["c2", chain2],
    ]);

    const executions = new Map<string, readonly ResultChainExecution[]>([
      ["c1", [makeExecution("c1", "ok"), makeExecution("c1", "err")]],
      ["c2", [makeExecution("c2", "ok")]],
    ]);

    const getExecutions = (chainId: string): readonly ResultChainExecution[] =>
      executions.get(chainId) ?? [];

    const overview = buildOverviewFromChains(chains, getExecutions);

    expect(overview.perChain).toHaveLength(2);

    const c1Entry = overview.perChain.find(e => e.chainId === "c1");
    expect(c1Entry).toBeDefined();
    expect(c1Entry?.label).toBe("fromNullable → map");
    expect(c1Entry?.okCount).toBe(1);
    expect(c1Entry?.errCount).toBe(1);
    expect(c1Entry?.totalExecutions).toBe(2);

    const c2Entry = overview.perChain.find(e => e.chainId === "c2");
    expect(c2Entry).toBeDefined();
    expect(c2Entry?.label).toBe("ok");
    expect(c2Entry?.okCount).toBe(1);
    expect(c2Entry?.errCount).toBe(0);
    expect(c2Entry?.totalExecutions).toBe(1);
  });

  it("returns empty overview for empty chains map", () => {
    const overview = buildOverviewFromChains(new Map(), () => []);

    expect(overview.totalExecutions).toBe(0);
    expect(overview.okCount).toBe(0);
    expect(overview.errCount).toBe(0);
    expect(overview.okRate).toBe(1); // default to 1 when no data
    expect(overview.chainCount).toBe(0);
    expect(overview.chainsWithErrors).toBe(0);
    expect(overview.perChain).toHaveLength(0);
  });
});

// =============================================================================
// mergeAllChains
// =============================================================================

describe("mergeAllChains", () => {
  it("returns undefined for empty chains map", () => {
    const result = mergeAllChains(new Map());
    expect(result).toBeUndefined();
  });

  it("merges two chains into one with re-indexed operations", () => {
    const chain1 = makeChain("c1", "fromNullable", ["fromNullable"]);
    const chain2 = makeChain("c2", "fromPredicate → map", ["fromPredicate", "map"]);

    const chains = new Map<string, ResultChainDescriptor>([
      ["c1", chain1],
      ["c2", chain2],
    ]);

    const merged = mergeAllChains(chains);

    expect(merged).toBeDefined();
    expect(merged!.chainId).toBe("merged");
    expect(merged!.label).toBe("All Result Operations");
    expect(merged!.operations).toHaveLength(3);

    // First chain's operation at index 0
    expect(merged!.operations[0].index).toBe(0);
    expect(merged!.operations[0].method).toBe("fromNullable");
    expect(merged!.operations[0].chainLabel).toBe("fromNullable");

    // Second chain's operations at indices 1-2
    expect(merged!.operations[1].index).toBe(1);
    expect(merged!.operations[1].method).toBe("fromPredicate");
    expect(merged!.operations[1].chainLabel).toBe("fromPredicate → map");

    expect(merged!.operations[2].index).toBe(2);
    expect(merged!.operations[2].method).toBe("map");
    expect(merged!.operations[2].chainLabel).toBe("fromPredicate → map");
  });

  it("single chain produces a valid merged result", () => {
    const chain1 = makeChain("c1", "ok → map → match", ["ok", "map", "match"]);
    const chains = new Map([["c1", chain1]]);

    const merged = mergeAllChains(chains);

    expect(merged).toBeDefined();
    expect(merged!.operations).toHaveLength(3);
    expect(merged!.operations[0].chainLabel).toBe("ok → map → match");
    expect(merged!.operations[2].index).toBe(2);
  });
});

// =============================================================================
// mergeAllExecutions
// =============================================================================

describe("mergeAllExecutions", () => {
  it("returns undefined when no executions exist", () => {
    const chain1 = makeChain("c1", "ok", ["ok"]);
    const chains = new Map([["c1", chain1]]);

    const result = mergeAllExecutions(chains, () => []);
    expect(result).toBeUndefined();
  });

  it("merges latest execution from each chain with re-indexed steps", () => {
    const chain1 = makeChain("c1", "fromNullable", ["fromNullable"]);
    const chain2 = makeChain("c2", "fromPredicate → map", ["fromPredicate", "map"]);

    const chains = new Map<string, ResultChainDescriptor>([
      ["c1", chain1],
      ["c2", chain2],
    ]);

    const exec1: ResultChainExecution = {
      executionId: "e1",
      chainId: "c1",
      entryMethod: "fromNullable",
      entryTrack: "ok",
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok",
          outputTrack: "ok",
          switched: false,
          inputValue: undefined,
          outputValue: undefined,
          durationMicros: 10,
          callbackThrew: false,
          timestamp: 1000,
        },
      ],
      finalTrack: "ok",
      finalValue: undefined,
      totalDurationMicros: 10,
      startTimestamp: 1000,
      scopeId: undefined,
    };

    const exec2: ResultChainExecution = {
      executionId: "e2",
      chainId: "c2",
      entryMethod: "fromPredicate",
      entryTrack: "ok",
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok",
          outputTrack: "ok",
          switched: false,
          inputValue: undefined,
          outputValue: undefined,
          durationMicros: 20,
          callbackThrew: false,
          timestamp: 2000,
        },
        {
          operationIndex: 1,
          inputTrack: "ok",
          outputTrack: "ok",
          switched: false,
          inputValue: undefined,
          outputValue: undefined,
          durationMicros: 30,
          callbackThrew: false,
          timestamp: 2020,
        },
      ],
      finalTrack: "ok",
      finalValue: undefined,
      totalDurationMicros: 50,
      startTimestamp: 2000,
      scopeId: undefined,
    };

    const executions = new Map([
      ["c1", [exec1]],
      ["c2", [exec2]],
    ]);

    const merged = mergeAllExecutions(chains, chainId => executions.get(chainId) ?? []);

    expect(merged).toBeDefined();
    expect(merged!.chainId).toBe("merged");
    expect(merged!.steps).toHaveLength(3);

    // chain1's step: operationIndex re-indexed to 0
    expect(merged!.steps[0].operationIndex).toBe(0);
    expect(merged!.steps[0].durationMicros).toBe(10);

    // chain2's steps: operationIndex re-indexed to 1, 2
    expect(merged!.steps[1].operationIndex).toBe(1);
    expect(merged!.steps[1].durationMicros).toBe(20);
    expect(merged!.steps[2].operationIndex).toBe(2);
    expect(merged!.steps[2].durationMicros).toBe(30);

    // Final track is from the last chain's execution
    expect(merged!.finalTrack).toBe("ok");
  });

  it("picks the latest execution from each chain when multiple exist", () => {
    const chain1 = makeChain("c1", "ok", ["ok"]);
    const chains = new Map([["c1", chain1]]);

    const older: ResultChainExecution = {
      executionId: "old",
      chainId: "c1",
      entryMethod: "ok",
      entryTrack: "ok",
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok",
          outputTrack: "ok",
          switched: false,
          inputValue: undefined,
          outputValue: undefined,
          durationMicros: 5,
          callbackThrew: false,
          timestamp: 100,
        },
      ],
      finalTrack: "ok",
      finalValue: undefined,
      totalDurationMicros: 5,
      startTimestamp: 100,
      scopeId: undefined,
    };

    const newer: ResultChainExecution = {
      executionId: "new",
      chainId: "c1",
      entryMethod: "ok",
      entryTrack: "err",
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "err",
          outputTrack: "err",
          switched: false,
          inputValue: undefined,
          outputValue: undefined,
          durationMicros: 99,
          callbackThrew: false,
          timestamp: 200,
        },
      ],
      finalTrack: "err",
      finalValue: undefined,
      totalDurationMicros: 99,
      startTimestamp: 200,
      scopeId: undefined,
    };

    const merged = mergeAllExecutions(chains, () => [older, newer]);

    expect(merged).toBeDefined();
    // Should pick the newer (last) execution
    expect(merged!.steps[0].durationMicros).toBe(99);
    expect(merged!.finalTrack).toBe("err");
  });
});
