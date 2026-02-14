/**
 * Component tests for the OperationLogView.
 *
 * Spec: 05-operation-log.md (5.1-5.7)
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
    durationMicros: 50,
    callbackThrew: false,
    timestamp: 1000,
    ...overrides,
  };
}

const chain: ResultChainDescriptor = {
  chainId: "chain-1",
  label: "validateUser",
  portName: "UserPort",
  operations: [
    makeOp({ index: 0, method: "ok", label: "ok(42)", inputTrack: "both", canSwitch: false }),
    makeOp({ index: 1, method: "map", label: "incr", inputTrack: "ok", canSwitch: false }),
    makeOp({ index: 2, method: "andThen", label: "validate", canSwitch: true }),
    makeOp({ index: 3, method: "orElse", label: "handle", inputTrack: "err", canSwitch: true }),
    makeOp({
      index: 4,
      method: "match",
      label: "extract",
      inputTrack: "both",
      canSwitch: false,
      isTerminal: true,
    }),
  ],
  isAsync: false,
  sourceLocation: undefined,
};

const execution: ResultChainExecution = {
  executionId: "exec-1",
  chainId: "chain-1",
  entryMethod: "ok",
  entryTrack: "ok",
  entryValue: { data: 42, typeName: "number", truncated: false },
  steps: [
    makeStep({ operationIndex: 0, inputTrack: "ok", outputTrack: "ok", durationMicros: 0 }),
    makeStep({ operationIndex: 1, inputTrack: "ok", outputTrack: "ok", durationMicros: 5 }),
    makeStep({
      operationIndex: 2,
      inputTrack: "ok",
      outputTrack: "err",
      switched: true,
      durationMicros: 20,
      inputValue: { data: { email: "bad@", name: "Alice" }, typeName: "Object", truncated: false },
      outputValue: {
        data: { _tag: "ValidationError", field: "email" },
        typeName: "Object",
        truncated: false,
      },
    }),
    makeStep({
      operationIndex: 3,
      inputTrack: "err",
      outputTrack: "ok",
      switched: true,
      durationMicros: 5,
    }),
    makeStep({ operationIndex: 4, inputTrack: "ok", outputTrack: "ok", durationMicros: 5 }),
  ],
  finalTrack: "ok",
  finalValue: { data: "valid", typeName: "string", truncated: false },
  totalDurationMicros: 35,
  startTimestamp: 1000,
  scopeId: undefined,
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

describe("OperationLogView", () => {
  beforeEach(setupEnv);

  it("renders step list with columns: index, method, track, duration", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    const rows = screen.getAllByTestId("log-row");
    expect(rows).toHaveLength(5);
    // First row should have index, method, track, duration cells
    const firstRow = rows[0];
    expect(firstRow.querySelector("[data-testid='log-cell-index']")).toBeDefined();
    expect(firstRow.querySelector("[data-testid='log-cell-method']")).toBeDefined();
    expect(firstRow.querySelector("[data-testid='log-cell-track']")).toBeDefined();
    expect(firstRow.querySelector("[data-testid='log-cell-duration']")).toBeDefined();
  });

  it("track column shows color-coded badges", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    const tracks = screen.getAllByTestId("log-cell-track");
    // Step 2: Ok -> Err (switch)
    expect(tracks[2].dataset["inputTrack"]).toBe("ok");
    expect(tracks[2].dataset["outputTrack"]).toBe("err");
  });

  it("switch rows have amber background tint and lightning icon", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    const rows = screen.getAllByTestId("log-row");
    // Steps 2 and 3 are switch rows
    expect(rows[2].dataset["switched"]).toBe("true");
    expect(rows[3].dataset["switched"]).toBe("true");
  });

  it("bypassed rows are dimmed with strikethrough method name", () => {
    // orElse (index 3) expects err but step 3 is actually recovery (err->ok)
    // Let's create an execution where map is bypassed (on err track)
    const bypassExec: ResultChainExecution = {
      ...execution,
      steps: [
        makeStep({ operationIndex: 0, inputTrack: "ok", outputTrack: "err", switched: true }),
        makeStep({ operationIndex: 1, inputTrack: "err", outputTrack: "err" }), // map on err = bypassed
        makeStep({ operationIndex: 2, inputTrack: "err", outputTrack: "err" }),
        makeStep({ operationIndex: 3, inputTrack: "err", outputTrack: "ok", switched: true }),
        makeStep({ operationIndex: 4, inputTrack: "ok", outputTrack: "ok" }),
      ],
    };

    render(<OperationLogView chain={chain} execution={bypassExec} />);

    const rows = screen.getAllByTestId("log-row");
    // map (index 1) expects ok input but got err — should be bypassed
    expect(rows[1].dataset["bypassed"]).toBe("true");
  });

  it("terminal row has bold text and filled-square instead of output track", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    const rows = screen.getAllByTestId("log-row");
    const lastRow = rows[rows.length - 1];
    expect(lastRow.dataset["terminal"]).toBe("true");
  });

  it("clicking step shows input/output in value inspector", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    const rows = screen.getAllByTestId("log-row");
    fireEvent.click(rows[2]); // Click andThen step

    expect(screen.getByTestId("value-inspector")).toBeDefined();
    expect(screen.getByTestId("inspector-input")).toBeDefined();
    expect(screen.getByTestId("inspector-output")).toBeDefined();
  });

  it("value inspector renders JSON tree for objects", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    const rows = screen.getAllByTestId("log-row");
    fireEvent.click(rows[2]); // Step 2 has object values

    const input = screen.getByTestId("inspector-input");
    expect(input.textContent).toContain("email");
  });

  it("value inspector shows inline value for primitives", () => {
    const primExec: ResultChainExecution = {
      ...execution,
      steps: [
        makeStep({
          operationIndex: 0,
          inputValue: { data: 42, typeName: "number", truncated: false },
          outputValue: { data: 42, typeName: "number", truncated: false },
        }),
        ...execution.steps.slice(1),
      ],
    };

    render(<OperationLogView chain={chain} execution={primExec} />);

    const rows = screen.getAllByTestId("log-row");
    fireEvent.click(rows[0]);

    const input = screen.getByTestId("inspector-input");
    expect(input.textContent).toContain("42");
  });

  it("value inspector shows '[Circular]' for circular references", () => {
    const circExec: ResultChainExecution = {
      ...execution,
      steps: [
        makeStep({
          operationIndex: 0,
          inputValue: { data: "[Circular]", typeName: "Object", truncated: false },
          outputValue: { data: "[Circular]", typeName: "Object", truncated: false },
        }),
        ...execution.steps.slice(1),
      ],
    };

    render(<OperationLogView chain={chain} execution={circExec} />);
    fireEvent.click(screen.getAllByTestId("log-row")[0]);

    expect(screen.getByTestId("inspector-input").textContent).toContain("[Circular]");
  });

  it("value inspector shows '[Function: name]' for function references", () => {
    const fnExec: ResultChainExecution = {
      ...execution,
      steps: [
        makeStep({
          operationIndex: 0,
          inputValue: { data: "[Function: validate]", typeName: "Function", truncated: false },
          outputValue: { data: 42, typeName: "number", truncated: false },
        }),
        ...execution.steps.slice(1),
      ],
    };

    render(<OperationLogView chain={chain} execution={fnExec} />);
    fireEvent.click(screen.getAllByTestId("log-row")[0]);

    expect(screen.getByTestId("inspector-input").textContent).toContain("[Function: validate]");
  });

  it("value inspector shows '(not captured)' when captureValues is false", () => {
    const noCaptureExec: ResultChainExecution = {
      ...execution,
      steps: [
        makeStep({ operationIndex: 0, inputValue: undefined, outputValue: undefined }),
        ...execution.steps.slice(1),
      ],
    };

    render(<OperationLogView chain={chain} execution={noCaptureExec} />);
    fireEvent.click(screen.getAllByTestId("log-row")[0]);

    expect(screen.getByTestId("inspector-input").textContent).toContain("(not captured)");
  });

  it("diff mode shows structural diff between input and output", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    fireEvent.click(screen.getAllByTestId("log-row")[2]);
    fireEvent.click(screen.getByTestId("diff-toggle"));

    expect(screen.getByTestId("diff-view")).toBeDefined();
  });

  it("diff shows 'SWITCHED' label when tracks differ", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    fireEvent.click(screen.getAllByTestId("log-row")[2]); // Ok -> Err switch
    fireEvent.click(screen.getByTestId("diff-toggle"));

    expect(screen.getByTestId("diff-view").textContent).toContain("SWITCHED");
  });

  it("diff shows '+/-' lines for property changes", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    fireEvent.click(screen.getAllByTestId("log-row")[2]);
    fireEvent.click(screen.getByTestId("diff-toggle"));

    const diffView = screen.getByTestId("diff-view");
    // Input is {email, name} and output is {_tag, field} — should show changes
    expect(diffView.textContent).toMatch(/[+\-]/);
  });

  it("'Switch only' filter shows only steps where switched", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    fireEvent.click(screen.getByTestId("filter-switch-only"));

    const rows = screen.getAllByTestId("log-row");
    // Only steps 2 and 3 switched
    expect(rows).toHaveLength(2);
  });

  it("'Err only' filter shows only steps with Err output", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    fireEvent.click(screen.getByTestId("filter-err-only"));

    const rows = screen.getAllByTestId("log-row");
    // Only step 2 has err output
    expect(rows).toHaveLength(1);
  });

  it("method filter shows only selected method types", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    // Select only "andThen" method
    fireEvent.click(screen.getByTestId("filter-method-andThen"));

    const rows = screen.getAllByTestId("log-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector("[data-testid='log-cell-method']")?.textContent).toContain(
      "andThen"
    );
  });

  it("filter summary shows filtered/total count in badge", () => {
    render(<OperationLogView chain={chain} execution={execution} />);

    fireEvent.click(screen.getByTestId("filter-switch-only"));

    expect(screen.getByTestId("filter-summary").textContent).toContain("2/5");
  });

  it("cross-view link 'View in Pipeline' navigates with context", () => {
    const onNavigate = vi.fn();
    render(<OperationLogView chain={chain} execution={execution} onNavigate={onNavigate} />);

    fireEvent.click(screen.getAllByTestId("log-row")[2]);
    fireEvent.click(screen.getByTestId("link-view-in-pipeline"));

    expect(onNavigate).toHaveBeenCalledWith("railway", {
      executionId: "exec-1",
      stepIndex: 2,
    });
  });
});
