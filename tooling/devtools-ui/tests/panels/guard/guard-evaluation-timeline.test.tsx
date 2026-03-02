/**
 * Unit tests for EvaluationTimeline component.
 *
 * Spec: 03-views-and-wireframes.md (3.7), 08-timeline-view.md
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EvaluationTimeline } from "../../../src/panels/guard/evaluation-timeline.js";
import type {
  GuardEvaluationExecution,
  EvaluationNodeTrace,
  SerializedSubject,
} from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeSubject(overrides?: Partial<SerializedSubject>): SerializedSubject {
  return {
    id: "user-1",
    roles: ["admin"],
    permissions: ["docs:read"],
    attributes: {},
    authenticationMethod: "jwt",
    authenticatedAt: "2026-01-01T00:00:00Z",
    identityProvider: undefined,
    ...overrides,
  };
}

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
    subject: makeSubject(),
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

describe("EvaluationTimeline", () => {
  afterEach(cleanup);

  it("renders timeline", () => {
    render(<EvaluationTimeline executions={[makeExecution()]} selectedExecutionId={undefined} />);

    expect(screen.getByTestId("guard-evaluation-timeline")).toBeDefined();
  });

  it("shows statistics", () => {
    const executions = [
      makeExecution({ executionId: "exec-1", durationMs: 1.0 }),
      makeExecution({ executionId: "exec-2", durationMs: 3.0 }),
    ];

    render(<EvaluationTimeline executions={executions} selectedExecutionId={undefined} />);

    expect(screen.getByTestId("guard-timeline-count")).toBeDefined();
    expect(screen.getByTestId("guard-timeline-avg")).toBeDefined();
    expect(screen.getByTestId("guard-timeline-p50")).toBeDefined();
    expect(screen.getByTestId("guard-timeline-p95")).toBeDefined();
  });

  it("renders duration bars", () => {
    const executions = [
      makeExecution({ executionId: "exec-1" }),
      makeExecution({ executionId: "exec-2" }),
      makeExecution({ executionId: "exec-3" }),
    ];

    render(<EvaluationTimeline executions={executions} selectedExecutionId={undefined} />);

    const bars = screen.getAllByTestId("guard-timeline-bar");
    expect(bars.length).toBe(3);
  });

  it("color-codes bars by decision", () => {
    const executions = [
      makeExecution({ executionId: "exec-allow", decision: "allow" }),
      makeExecution({ executionId: "exec-deny", decision: "deny", reason: "no role" }),
    ];

    render(<EvaluationTimeline executions={executions} selectedExecutionId={undefined} />);

    const bars = screen.getAllByTestId("guard-timeline-bar");
    const allowBar = bars.find(b => b.getAttribute("data-execution-id") === "exec-allow");
    const denyBar = bars.find(b => b.getAttribute("data-execution-id") === "exec-deny");

    expect(allowBar?.getAttribute("data-decision")).toBe("allow");
    expect(denyBar?.getAttribute("data-decision")).toBe("deny");
  });

  it("highlights selected execution", () => {
    const executions = [
      makeExecution({ executionId: "exec-1" }),
      makeExecution({ executionId: "exec-2" }),
    ];

    render(<EvaluationTimeline executions={executions} selectedExecutionId="exec-1" />);

    const bars = screen.getAllByTestId("guard-timeline-bar");
    const selected = bars.find(b => b.getAttribute("data-execution-id") === "exec-1");
    const unselected = bars.find(b => b.getAttribute("data-execution-id") === "exec-2");

    expect(selected?.getAttribute("data-selected")).toBe("true");
    expect(unselected?.getAttribute("data-selected")).toBe("false");
  });

  it("handles empty executions", () => {
    render(<EvaluationTimeline executions={[]} selectedExecutionId={undefined} />);

    const count = screen.getByTestId("guard-timeline-count");
    expect(count.textContent).toContain("0");
  });
});
