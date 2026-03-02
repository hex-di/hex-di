/**
 * Unit tests for DecisionLog component.
 *
 * Spec: 03-views-and-wireframes.md (3.4), 05-decision-log.md
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { DecisionLog } from "../../../src/panels/guard/decision-log.js";
import type {
  GuardEvaluationExecution,
  EvaluationNodeTrace,
} from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeTrace(overrides?: Partial<EvaluationNodeTrace>): EvaluationNodeTrace {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    result: "allow",
    evaluated: true,
    durationMs: 0.5,
    children: [],
    reason: undefined,
    resolvedValue: undefined,
    asyncResolution: false,
    visibleFields: undefined,
    ...overrides,
  };
}

function makeExecution(overrides?: Partial<GuardEvaluationExecution>): GuardEvaluationExecution {
  return {
    executionId: "exec-1",
    descriptorId: "guard:testPort",
    portName: "testPort",
    subject: {
      id: "user-1",
      roles: ["admin"],
      permissions: ["docs:read"],
      attributes: {},
      authenticationMethod: "jwt",
      authenticatedAt: "2026-01-01T00:00:00Z",
      identityProvider: undefined,
    },
    decision: "allow",
    rootTrace: makeTrace(),
    durationMs: 0.5,
    evaluatedAt: "2026-01-01T00:00:00Z",
    reason: undefined,
    visibleFields: undefined,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DecisionLog", () => {
  afterEach(cleanup);

  it("renders empty state when no executions", () => {
    render(<DecisionLog executions={[]} onSelect={vi.fn()} selectedId={undefined} />);

    expect(screen.getByTestId("guard-decision-log-empty")).toBeDefined();
  });

  it("renders 7 column headers", () => {
    render(<DecisionLog executions={[]} onSelect={vi.fn()} selectedId={undefined} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBe(7);
  });

  it("renders execution rows", () => {
    const executions = [
      makeExecution({ executionId: "exec-1", evaluatedAt: "2026-01-01T00:00:01Z" }),
      makeExecution({ executionId: "exec-2", evaluatedAt: "2026-01-01T00:00:02Z" }),
      makeExecution({ executionId: "exec-3", evaluatedAt: "2026-01-01T00:00:03Z" }),
    ];

    render(<DecisionLog executions={executions} onSelect={vi.fn()} selectedId={undefined} />);

    const entries = screen.getAllByTestId("guard-decision-log-entry");
    expect(entries.length).toBe(3);
  });

  it("sorts by timestamp descending by default", () => {
    const timestampHeader = "guard-decision-log-col-timestamp";

    render(<DecisionLog executions={[]} onSelect={vi.fn()} selectedId={undefined} />);

    const col = screen.getByTestId(timestampHeader);
    expect(col.getAttribute("aria-sort")).toBe("descending");
  });

  it("toggles sort on header click", () => {
    render(<DecisionLog executions={[]} onSelect={vi.fn()} selectedId={undefined} />);

    const idHeader = screen.getByTestId("guard-decision-log-col-id");

    // Initially "none" since default sort is on timestamp
    expect(idHeader.getAttribute("aria-sort")).toBe("none");

    // Click to sort by ID ascending
    act(() => {
      fireEvent.click(idHeader);
    });
    expect(idHeader.getAttribute("aria-sort")).toBe("ascending");

    // Click again to toggle to descending
    act(() => {
      fireEvent.click(idHeader);
    });
    expect(idHeader.getAttribute("aria-sort")).toBe("descending");
  });

  it("marks selected execution", () => {
    const executions = [
      makeExecution({ executionId: "exec-1" }),
      makeExecution({ executionId: "exec-2" }),
    ];

    render(<DecisionLog executions={executions} onSelect={vi.fn()} selectedId="exec-2" />);

    const entries = screen.getAllByTestId("guard-decision-log-entry");
    const selectedEntry = entries.find(e => e.getAttribute("data-execution-id") === "exec-2");
    const unselectedEntry = entries.find(e => e.getAttribute("data-execution-id") === "exec-1");

    expect(selectedEntry?.getAttribute("data-selected")).toBe("true");
    expect(unselectedEntry?.getAttribute("data-selected")).toBe("false");
  });

  it("calls onSelect when row clicked", () => {
    const onSelect = vi.fn();
    const executions = [makeExecution({ executionId: "exec-1" })];

    render(<DecisionLog executions={executions} onSelect={onSelect} selectedId={undefined} />);

    const entry = screen.getByTestId("guard-decision-log-entry");
    fireEvent.click(entry);

    expect(onSelect).toHaveBeenCalledWith("exec-1");
  });

  it("displays execution details in each cell", () => {
    const executions = [
      makeExecution({
        executionId: "exec-1",
        portName: "authPort",
        subject: {
          id: "user-42",
          roles: ["admin"],
          permissions: ["docs:read"],
          attributes: {},
          authenticationMethod: "jwt",
          authenticatedAt: "2026-01-01T00:00:00Z",
          identityProvider: undefined,
        },
        decision: "deny",
        rootTrace: makeTrace({ kind: "hasPermission" }),
        durationMs: 1.2,
      }),
    ];

    render(<DecisionLog executions={executions} onSelect={vi.fn()} selectedId={undefined} />);

    // Port cell
    const portCell = screen.getByTestId("guard-log-cell-port");
    expect(portCell.textContent).toBe("authPort");

    // Subject cell
    const subjectCell = screen.getByTestId("guard-log-cell-subject");
    expect(subjectCell.textContent).toBe("user-42");

    // Decision cell
    const decisionCell = screen.getByTestId("guard-log-cell-decision");
    expect(decisionCell.textContent).toBe("deny");

    // Kind cell
    const kindCell = screen.getByTestId("guard-log-cell-kind");
    expect(kindCell.textContent).toContain("hasPermission");

    // Duration cell
    const durationCell = screen.getByTestId("guard-log-cell-duration");
    expect(durationCell.textContent).toBeDefined();
  });

  it("handles single execution", () => {
    const executions = [makeExecution({ executionId: "exec-only" })];

    render(<DecisionLog executions={executions} onSelect={vi.fn()} selectedId={undefined} />);

    const entries = screen.getAllByTestId("guard-decision-log-entry");
    expect(entries.length).toBe(1);
    expect(screen.queryByTestId("guard-decision-log-empty")).toBeNull();
  });

  it("sorts numerically for duration column", () => {
    const executions = [
      makeExecution({
        executionId: "exec-slow",
        durationMs: 100,
        evaluatedAt: "2026-01-01T00:00:01Z",
      }),
      makeExecution({
        executionId: "exec-fast",
        durationMs: 1,
        evaluatedAt: "2026-01-01T00:00:02Z",
      }),
      makeExecution({
        executionId: "exec-mid",
        durationMs: 50,
        evaluatedAt: "2026-01-01T00:00:03Z",
      }),
    ];

    render(<DecisionLog executions={executions} onSelect={vi.fn()} selectedId={undefined} />);

    const durationHeader = screen.getByTestId("guard-decision-log-col-duration");

    // Click to sort by duration ascending
    act(() => {
      fireEvent.click(durationHeader);
    });

    const entries = screen.getAllByTestId("guard-decision-log-entry");
    const ids = entries.map(e => e.getAttribute("data-execution-id"));

    // Ascending: fast (1ms), mid (50ms), slow (100ms)
    expect(ids).toEqual(["exec-fast", "exec-mid", "exec-slow"]);
  });
});
