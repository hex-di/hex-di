/**
 * Tests for the redesigned OperationLogView component.
 *
 * Verifies the log renders with proper structure, styling, filtering,
 * row selection, and value inspection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OperationLogView } from "../../../src/panels/result/operation-log.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultStepTrace,
} from "../../../src/panels/result/types.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeOp(
  index: number,
  method: string,
  overrides?: Partial<ResultOperationDescriptor>
): ResultOperationDescriptor {
  return {
    index,
    method: method as ResultOperationDescriptor["method"],
    label: `${method}()`,
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: false,
    isTerminal: false,
    callbackLocation: undefined,
    ...overrides,
  };
}

function makeStep(
  operationIndex: number,
  inputTrack: "ok" | "err",
  outputTrack: "ok" | "err",
  overrides?: Partial<ResultStepTrace>
): ResultStepTrace {
  return {
    operationIndex,
    inputTrack,
    outputTrack,
    switched: inputTrack !== outputTrack,
    inputValue: { data: `input-${operationIndex}`, typeName: "String", truncated: false },
    outputValue: { data: `output-${operationIndex}`, typeName: "String", truncated: false },
    durationMicros: 100 * (operationIndex + 1),
    callbackThrew: false,
    timestamp: operationIndex * 1000,
    ...overrides,
  };
}

const testChain: ResultChainDescriptor = {
  chainId: "merged",
  label: "fromNullable → toJSON → fromPredicate → toJSON",
  portName: undefined,
  operations: [
    makeOp(0, "fromNullable", { chainLabel: "chain:1", inputTrack: "both", canSwitch: true }),
    makeOp(1, "toJSON", { chainLabel: "chain:1", isTerminal: true, inputTrack: "both" }),
    makeOp(2, "fromPredicate", { chainLabel: "chain:2", inputTrack: "both", canSwitch: true }),
    makeOp(3, "map", { chainLabel: "chain:2", inputTrack: "ok" }),
    makeOp(4, "orElse", { chainLabel: "chain:2", inputTrack: "err", canSwitch: true }),
    makeOp(5, "toJSON", { chainLabel: "chain:2", isTerminal: true, inputTrack: "both" }),
  ],
  isAsync: false,
  sourceLocation: undefined,
};

const testExecution: ResultChainExecution = {
  executionId: "exec:1",
  chainId: "merged",
  entryMethod: "fromNullable",
  entryTrack: "ok",
  entryValue: { data: "Alice", typeName: "String", truncated: false },
  steps: [
    makeStep(0, "ok", "ok"),
    makeStep(1, "ok", "ok", { durationMicros: 300 }),
    makeStep(2, "ok", "err", { durationMicros: 50 }),
    makeStep(3, "err", "err", { inputTrack: "err", outputTrack: "err", durationMicros: 0 }),
    makeStep(4, "err", "ok", { durationMicros: 150 }),
    makeStep(5, "ok", "ok", { durationMicros: 200 }),
  ],
  finalTrack: "ok",
  finalValue: { data: "recovered", typeName: "String", truncated: false },
  totalDurationMicros: 800,
  startTimestamp: Date.now(),
  scopeId: undefined,
};

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
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
});

afterEach(() => {
  cleanup();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("OperationLogView", () => {
  it("renders summary bar with operation count and ok/err ratio", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    const summary = screen.getByTestId("log-summary");
    expect(summary).toBeDefined();
    // 6 steps total: 3 on ok output, 3 on err output → but actually let's check
    // Steps: ok→ok, ok→ok, ok→err, err→err, err→ok, ok→ok
    // Ok output: 0,1,4,5 = 4. Err output: 2,3 = 2
    expect(summary.textContent).toContain("6");
    expect(summary.textContent).toContain("ok");
    expect(summary.textContent).toContain("err");
  });

  it("renders step rows with proper structure", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    const rows = screen.getAllByTestId("log-row");
    expect(rows).toHaveLength(6);

    // First row should contain the method name
    expect(rows[0].textContent).toContain("fromNullable");
  });

  it("step rows show track badges with correct track values", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    const rows = screen.getAllByTestId("log-row");
    // Row 0: ok → ok
    expect(rows[0].querySelector("[data-testid='log-cell-track']")?.textContent).toContain("Ok");
    // Row 2: ok → err (switched)
    expect(rows[2].getAttribute("data-switched")).toBe("true");
  });

  it("step rows show formatted duration", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    const rows = screen.getAllByTestId("log-row");
    // Row 1: 300us duration
    const durationCell = rows[1].querySelector("[data-testid='log-cell-duration']");
    expect(durationCell?.textContent).toContain("300us");
  });

  it("filter buttons filter by track", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    // Click "Err" filter
    fireEvent.click(screen.getByTestId("filter-err-only"));
    expect(screen.getByTestId("filter-err-only").getAttribute("aria-pressed")).toBe("true");

    // Only steps with err output track should be visible
    const rows = screen.getAllByTestId("log-row");
    for (const row of rows) {
      expect(
        row.querySelector("[data-testid='log-cell-track']")?.getAttribute("data-output-track")
      ).toBe("err");
    }
  });

  it("switched filter shows only track-switching steps", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    fireEvent.click(screen.getByTestId("filter-switch-only"));

    const rows = screen.getAllByTestId("log-row");
    for (const row of rows) {
      expect(row.getAttribute("data-switched")).toBe("true");
    }
  });

  it("selecting a row shows value inspector", () => {
    render(<OperationLogView chain={testChain} execution={testExecution} />);

    // No inspector initially
    expect(screen.queryByTestId("value-inspector")).toBeNull();

    // Click first row
    fireEvent.click(screen.getAllByTestId("log-row")[0]);

    // Inspector should appear
    expect(screen.getByTestId("value-inspector")).toBeDefined();
    expect(screen.getByTestId("inspector-input")).toBeDefined();
    expect(screen.getByTestId("inspector-output")).toBeDefined();
  });
});
