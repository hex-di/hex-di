/**
 * Unit tests for MockResultDataSource.
 *
 * Spec: 14-integration.md Section 14.2
 */

import { describe, it, expect, vi } from "vitest";
import { MockResultDataSource } from "../../../src/panels/result/mock-data-source.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultDataEvent,
} from "../../../src/panels/result/types.js";

// ── Fixture helpers ─────────────────────────────────────────────────────────

function makeChain(overrides?: Partial<ResultChainDescriptor>): ResultChainDescriptor {
  return {
    chainId: "chain-1",
    label: "validateUser",
    portName: "UserPort",
    operations: [],
    isAsync: false,
    sourceLocation: undefined,
    ...overrides,
  };
}

function makeExecution(overrides?: Partial<ResultChainExecution>): ResultChainExecution {
  return {
    executionId: "exec-1",
    chainId: "chain-1",
    entryMethod: "ok",
    entryTrack: "ok",
    entryValue: undefined,
    steps: [],
    finalTrack: "ok",
    finalValue: undefined,
    totalDurationMicros: 100,
    startTimestamp: Date.now(),
    scopeId: undefined,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("MockResultDataSource", () => {
  it("getChains() returns empty map initially", () => {
    const ds = new MockResultDataSource();
    expect(ds.getChains().size).toBe(0);
  });

  it("after registerChain(), getChains() includes chain", () => {
    const ds = new MockResultDataSource();
    const chain = makeChain();
    ds.registerChain(chain);
    expect(ds.getChains().get("chain-1")).toBe(chain);
  });

  it("getPortStatistics() returns stats for all ports", () => {
    const ds = new MockResultDataSource();
    ds.setPortStatistics("UserPort", {
      portName: "UserPort",
      totalCalls: 100,
      okCount: 90,
      errCount: 10,
      errorRate: 0.1,
      errorsByCode: new Map(),
      lastError: undefined,
      stabilityScore: 0.9,
      chainIds: ["chain-1"],
      lastExecutionTimestamp: undefined,
    });
    const stats = ds.getPortStatistics();
    expect(stats.has("UserPort")).toBe(true);
    expect(stats.get("UserPort")?.totalCalls).toBe(100);
  });

  it("getExecutions(chainId) returns executions newest first", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    const exec1 = makeExecution({ executionId: "exec-1", startTimestamp: 1000 });
    const exec2 = makeExecution({ executionId: "exec-2", startTimestamp: 2000 });
    ds.addExecution(exec1);
    ds.addExecution(exec2);
    const executions = ds.getExecutions("chain-1");
    expect(executions[0].executionId).toBe("exec-2");
    expect(executions[1].executionId).toBe("exec-1");
  });

  it("getExecutions() respects ring buffer limit", () => {
    const ds = new MockResultDataSource({ maxExecutionsPerChain: 3 });
    ds.registerChain(makeChain());
    for (let i = 0; i < 5; i++) {
      ds.addExecution(makeExecution({ executionId: `exec-${i}`, startTimestamp: i }));
    }
    expect(ds.getExecutions("chain-1")).toHaveLength(3);
  });

  it("subscribe() listener called on chain-registered event", () => {
    const ds = new MockResultDataSource();
    const listener = vi.fn();
    ds.subscribe(listener);
    ds.registerChain(makeChain());
    expect(listener).toHaveBeenCalledWith({
      type: "chain-registered",
      chainId: "chain-1",
    } satisfies ResultDataEvent);
  });

  it("subscribe() listener called on execution-added event", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    const listener = vi.fn();
    ds.subscribe(listener);
    ds.addExecution(makeExecution());
    expect(listener).toHaveBeenCalledWith({
      type: "execution-added",
      chainId: "chain-1",
      executionId: "exec-1",
    } satisfies ResultDataEvent);
  });

  it("subscribe() listener called on statistics-updated event", () => {
    const ds = new MockResultDataSource();
    const listener = vi.fn();
    ds.subscribe(listener);
    ds.setPortStatistics("UserPort", {
      portName: "UserPort",
      totalCalls: 1,
      okCount: 1,
      errCount: 0,
      errorRate: 0,
      errorsByCode: new Map(),
      lastError: undefined,
      stabilityScore: 1,
      chainIds: [],
      lastExecutionTimestamp: undefined,
    });
    expect(listener).toHaveBeenCalledWith({
      type: "statistics-updated",
      portName: "UserPort",
    } satisfies ResultDataEvent);
  });

  it("subscribe() returns unsubscribe function", () => {
    const ds = new MockResultDataSource();
    const listener = vi.fn();
    const unsub = ds.subscribe(listener);
    expect(typeof unsub).toBe("function");
  });

  it("unsubscribed listener not called on subsequent events", () => {
    const ds = new MockResultDataSource();
    const listener = vi.fn();
    const unsub = ds.subscribe(listener);
    unsub();
    ds.registerChain(makeChain());
    expect(listener).not.toHaveBeenCalled();
  });

  it("getPaths(chainId) computes paths from chain descriptor", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(
      makeChain({
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
      })
    );
    const paths = ds.getPaths("chain-1");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("getSnapshot() returns complete panel snapshot", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    const snapshot = ds.getSnapshot();
    expect(snapshot.chains.size).toBe(1);
    expect(typeof snapshot.globalOkRate).toBe("number");
    expect(typeof snapshot.snapshotTimestamp).toBe("number");
  });
});
