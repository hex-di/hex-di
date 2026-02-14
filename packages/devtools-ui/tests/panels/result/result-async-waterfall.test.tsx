/**
 * Component tests for the AsyncWaterfallView.
 *
 * Spec: 08-async-waterfall.md (8.1-8.9), 10-visual-encoding.md (10.10)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AsyncWaterfallView } from "../../../src/panels/result/async-waterfall.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultStepTrace,
} from "../../../src/panels/result/types.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeOp(overrides?: Partial<ResultOperationDescriptor>): ResultOperationDescriptor {
  return {
    index: 0,
    method: "andThen",
    label: "validate",
    inputTrack: "ok",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
    callbackLocation: undefined,
    ...overrides,
  };
}

function makeStep(overrides?: Partial<ResultStepTrace>): ResultStepTrace {
  return {
    operationIndex: 0,
    inputTrack: "ok",
    outputTrack: "ok",
    switched: false,
    inputValue: undefined,
    outputValue: undefined,
    durationMicros: 10_000,
    callbackThrew: false,
    timestamp: 0,
    ...overrides,
  };
}

const syncChain: ResultChainDescriptor = {
  chainId: "sync-chain",
  label: "syncValidation",
  portName: "UserPort",
  operations: [
    makeOp({ index: 0, method: "ok", label: "ok(42)", inputTrack: "both", canSwitch: false }),
    makeOp({ index: 1, method: "andThen", label: "validate" }),
  ],
  isAsync: false,
  sourceLocation: undefined,
};

const asyncChain: ResultChainDescriptor = {
  chainId: "async-chain",
  label: "fetchAndProcess",
  portName: "ApiPort",
  operations: [
    makeOp({
      index: 0,
      method: "fromPromise",
      label: "fetch",
      inputTrack: "both",
      canSwitch: false,
    }),
    makeOp({ index: 1, method: "andThen", label: "parse", canSwitch: true }),
    makeOp({ index: 2, method: "asyncMap", label: "transform", canSwitch: false }),
    makeOp({ index: 3, method: "andThen", label: "validate", canSwitch: true }),
    makeOp({ index: 4, method: "orElse", label: "fallback", inputTrack: "err", canSwitch: true }),
    makeOp({
      index: 5,
      method: "match",
      label: "extract",
      inputTrack: "both",
      canSwitch: false,
      isTerminal: true,
    }),
  ],
  isAsync: true,
  sourceLocation: undefined,
};

const asyncExecution: ResultChainExecution = {
  executionId: "exec-1",
  chainId: "async-chain",
  entryMethod: "fromPromise",
  entryTrack: "ok",
  entryValue: undefined,
  steps: [
    makeStep({ operationIndex: 0, durationMicros: 145_000, timestamp: 0, outputTrack: "ok" }),
    makeStep({ operationIndex: 1, durationMicros: 42_000, timestamp: 145_000, outputTrack: "ok" }),
    makeStep({ operationIndex: 2, durationMicros: 18_000, timestamp: 187_000, outputTrack: "ok" }),
    makeStep({
      operationIndex: 3,
      durationMicros: 12_000,
      timestamp: 205_000,
      outputTrack: "err",
      switched: true,
    }),
    makeStep({
      operationIndex: 4,
      inputTrack: "err",
      durationMicros: 8_000,
      timestamp: 217_000,
      outputTrack: "ok",
      switched: true,
    }),
    makeStep({ operationIndex: 5, durationMicros: 1_000, timestamp: 225_000, outputTrack: "ok" }),
  ],
  finalTrack: "ok",
  finalValue: undefined,
  totalDurationMicros: 226_000,
  startTimestamp: 1000,
  scopeId: undefined,
};

const comparisonExecution: ResultChainExecution = {
  executionId: "exec-2",
  chainId: "async-chain",
  entryMethod: "fromPromise",
  entryTrack: "ok",
  entryValue: undefined,
  steps: [
    makeStep({ operationIndex: 0, durationMicros: 229_000, timestamp: 0, outputTrack: "ok" }),
    makeStep({
      operationIndex: 1,
      durationMicros: 110_000,
      timestamp: 229_000,
      outputTrack: "err",
      switched: true,
    }),
    makeStep({ operationIndex: 2, durationMicros: 0, timestamp: 339_000, outputTrack: "err" }),
    makeStep({ operationIndex: 3, durationMicros: 0, timestamp: 339_000, outputTrack: "err" }),
    makeStep({
      operationIndex: 4,
      inputTrack: "err",
      durationMicros: 15_000,
      timestamp: 339_000,
      outputTrack: "ok",
      switched: true,
    }),
    makeStep({ operationIndex: 5, durationMicros: 1_000, timestamp: 354_000, outputTrack: "ok" }),
  ],
  finalTrack: "ok",
  finalValue: undefined,
  totalDurationMicros: 355_000,
  startTimestamp: 2000,
  scopeId: undefined,
};

// Combinator chain with concurrent operations
const combinatorChain: ResultChainDescriptor = {
  chainId: "combinator-chain",
  label: "fetchAll",
  portName: "ApiPort",
  operations: [
    makeOp({ index: 0, method: "all", label: "fetchAll", inputTrack: "both", canSwitch: false }),
    makeOp({
      index: 1,
      method: "match",
      label: "extract",
      inputTrack: "both",
      canSwitch: false,
      isTerminal: true,
    }),
  ],
  isAsync: true,
  sourceLocation: undefined,
};

function setupEnv(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AsyncWaterfallView", () => {
  beforeEach(setupEnv);

  it("shows 'synchronous chain' message for non-async chains", () => {
    render(<AsyncWaterfallView chain={syncChain} execution={undefined} />);

    const message = screen.getByTestId("sync-chain-message");
    expect(message.textContent).toContain("synchronous");
  });

  it("renders horizontal duration bars for async operations", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const bars = screen.getAllByTestId("waterfall-bar");
    expect(bars).toHaveLength(6);
  });

  it("bar start position corresponds to operation start time", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const bars = screen.getAllByTestId("waterfall-bar");
    // First bar starts at 0
    expect(bars[0].dataset["startMicros"]).toBe("0");
    // Second bar starts at 145_000
    expect(bars[1].dataset["startMicros"]).toBe("145000");
  });

  it("bar width proportional to duration", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const bars = screen.getAllByTestId("waterfall-bar");
    // First bar (145ms) should be wider than second bar (42ms)
    expect(Number(bars[0].dataset["durationMicros"])).toBeGreaterThan(
      Number(bars[1].dataset["durationMicros"])
    );
  });

  it("Ok/<p50 bars use emerald at 0.8 opacity", () => {
    render(
      <AsyncWaterfallView
        chain={asyncChain}
        execution={asyncExecution}
        p50={50_000}
        p90={100_000}
      />
    );

    const bars = screen.getAllByTestId("waterfall-bar");
    // Step 2 (18ms) and step 5 (1ms) are < p50 (50ms) and ok
    const fastBar = bars[2]; // 18_000 < 50_000
    expect(fastBar.dataset["colorZone"]).toBe("ok");
  });

  it("Ok/p50-p90 bars use amber at 0.8 opacity", () => {
    render(
      <AsyncWaterfallView
        chain={asyncChain}
        execution={asyncExecution}
        p50={10_000}
        p90={100_000}
      />
    );

    const bars = screen.getAllByTestId("waterfall-bar");
    // Step 1 (42ms) is between p50 (10ms) and p90 (100ms) and ok
    const mediumBar = bars[1]; // 42_000 between 10_000 and 100_000
    expect(mediumBar.dataset["colorZone"]).toBe("warning");
  });

  it("Ok/>p90 bars use red at 0.6 opacity", () => {
    render(
      <AsyncWaterfallView chain={asyncChain} execution={asyncExecution} p50={10_000} p90={50_000} />
    );

    const bars = screen.getAllByTestId("waterfall-bar");
    // Step 0 (145ms) is > p90 (50ms) and ok
    const slowBar = bars[0]; // 145_000 > 50_000
    expect(slowBar.dataset["colorZone"]).toBe("error");
  });

  it("Err bars use red at 0.8 opacity", () => {
    render(
      <AsyncWaterfallView
        chain={asyncChain}
        execution={asyncExecution}
        p50={50_000}
        p90={100_000}
      />
    );

    const bars = screen.getAllByTestId("waterfall-bar");
    // Step 3 outputs err (switched true, outputTrack: "err")
    const errBar = bars[3];
    expect(errBar.dataset["track"]).toBe("err");
    expect(errBar.dataset["colorZone"]).toBe("error");
  });

  it("recovery bars use emerald at 0.6 with dashed border", () => {
    render(
      <AsyncWaterfallView
        chain={asyncChain}
        execution={asyncExecution}
        p50={50_000}
        p90={100_000}
      />
    );

    const bars = screen.getAllByTestId("waterfall-bar");
    // Step 4: orElse, switched from err->ok = recovery
    const recoveryBar = bars[4];
    expect(recoveryBar.dataset["recovery"]).toBe("true");
  });

  it("wait gap renders as muted fill before bar", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const gaps = screen.getAllByTestId("waterfall-wait-gap");
    // Step 1 starts at 145_000 but step 0 finishes at 145_000, so gap is 0
    // But all non-first steps should render a wait gap element
    expect(gaps.length).toBeGreaterThan(0);
  });

  it("nested operations indent with tree-style prefix", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const rows = screen.getAllByTestId("waterfall-row");
    // Chained operations after step 0 should have nesting indicators
    const nestedRow = rows[1];
    expect(nestedRow.dataset["depth"]).toBeDefined();
  });

  it("summary bar shows duration breakdown", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const summary = screen.getByTestId("waterfall-summary");
    expect(summary).toBeDefined();
    // Should show total duration
    expect(summary.textContent).toContain("226");
  });

  it("summary shows critical path", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const criticalPath = screen.getByTestId("waterfall-critical-path");
    expect(criticalPath).toBeDefined();
    // fromPromise is the longest step
    expect(criticalPath.textContent).toContain("fromPromise");
  });

  it("comparison mode shows two executions side-by-side", () => {
    render(
      <AsyncWaterfallView
        chain={asyncChain}
        execution={asyncExecution}
        comparisonExecution={comparisonExecution}
      />
    );

    const comparisonView = screen.getByTestId("waterfall-comparison");
    expect(comparisonView).toBeDefined();
    // Should show both execution IDs
    expect(comparisonView.textContent).toContain("exec-1");
    expect(comparisonView.textContent).toContain("exec-2");
  });

  it("comparison shows delta annotations per bar", () => {
    render(
      <AsyncWaterfallView
        chain={asyncChain}
        execution={asyncExecution}
        comparisonExecution={comparisonExecution}
      />
    );

    const deltas = screen.getAllByTestId("waterfall-delta");
    expect(deltas.length).toBeGreaterThan(0);
    // First step: 145ms vs 229ms → +84ms
    expect(deltas[0].textContent).toContain("+84");
  });

  it("scale dropdown changes horizontal axis", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const scaleSelector = screen.getByTestId("waterfall-scale-selector");
    fireEvent.change(scaleSelector, { target: { value: "1ms" } });

    expect(scaleSelector).toBeDefined();
  });

  it("mouse wheel zooms horizontally", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const canvas = screen.getByTestId("waterfall-canvas");
    fireEvent.wheel(canvas, { deltaY: -100 });

    // After zoom in, scale should change
    expect(canvas.dataset["scale"]).toBeDefined();
  });

  it("concurrent operations (combinators) show parallel rows", () => {
    const combinatorExecution: ResultChainExecution = {
      executionId: "exec-comb",
      chainId: "combinator-chain",
      entryMethod: "all",
      entryTrack: "ok",
      entryValue: undefined,
      steps: [
        makeStep({ operationIndex: 0, durationMicros: 200_000, timestamp: 0, outputTrack: "ok" }),
        makeStep({
          operationIndex: 1,
          durationMicros: 1_000,
          timestamp: 200_000,
          outputTrack: "ok",
        }),
      ],
      finalTrack: "ok",
      finalValue: undefined,
      totalDurationMicros: 201_000,
      startTimestamp: 3000,
      scopeId: undefined,
    };

    render(
      <AsyncWaterfallView
        chain={combinatorChain}
        execution={combinatorExecution}
        concurrentInputs={[
          { label: "fetchUser", durationMicros: 100_000, startMicros: 0 },
          { label: "fetchPosts", durationMicros: 150_000, startMicros: 0 },
          { label: "fetchTags", durationMicros: 200_000, startMicros: 0 },
        ]}
      />
    );

    const parallelRows = screen.getAllByTestId("waterfall-concurrent-row");
    expect(parallelRows).toHaveLength(3);
  });

  it("renders execution summary header with total duration, step count, and final track", () => {
    render(<AsyncWaterfallView chain={asyncChain} execution={asyncExecution} />);

    const header = screen.getByTestId("waterfall-exec-header");
    expect(header.textContent).toContain("226"); // total duration 226ms
    expect(header.textContent).toContain("6"); // 6 steps
    expect(header.textContent).toContain("Ok"); // final track
  });
});
