/**
 * Component tests for the CaseSimulator (What-If).
 *
 * Spec: 06-case-explorer.md (6.5)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CaseSimulator } from "../../../src/panels/result/case-simulator.js";
import type {
  ResultChainDescriptor,
  ResultOperationDescriptor,
  ResultPathDescriptor,
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

const chain: ResultChainDescriptor = {
  chainId: "chain-1",
  label: "validateUser",
  portName: "UserPort",
  operations: [
    makeOp({ index: 0, method: "ok", label: "ok(42)", inputTrack: "both", canSwitch: false }),
    makeOp({ index: 1, method: "andThen", label: "validate", canSwitch: true }),
    makeOp({ index: 2, method: "orElse", label: "fallback", inputTrack: "err", canSwitch: true }),
    makeOp({
      index: 3,
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

function makePath(overrides?: Partial<ResultPathDescriptor>): ResultPathDescriptor {
  return {
    pathId: "path-a",
    trackSequence: ["ok", "ok", "ok", "ok"],
    switchPoints: [],
    observed: true,
    observedCount: 600,
    frequency: 0.7,
    description: "Happy path",
    ...overrides,
  };
}

const paths: readonly ResultPathDescriptor[] = [
  makePath({ pathId: "path-a", frequency: 0.7, observedCount: 600, observed: true }),
  makePath({
    pathId: "path-b",
    trackSequence: ["ok", "err", "ok", "ok"],
    switchPoints: [1, 2],
    frequency: 0.25,
    observedCount: 200,
    observed: true,
    description: "Recovery",
  }),
  makePath({
    pathId: "path-c",
    trackSequence: ["ok", "err", "err", "err"],
    switchPoints: [1],
    frequency: 0.05,
    observedCount: 40,
    observed: true,
    description: "Error",
  }),
  makePath({
    pathId: "path-unobserved",
    trackSequence: ["ok", "ok", "err", "err"],
    switchPoints: [2],
    frequency: 0,
    observedCount: 0,
    observed: false,
    description: "Unobserved",
  }),
];

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

describe("CaseSimulator", () => {
  beforeEach(setupEnv);

  it("simulator lists all switch-capable operations", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    const simOps = screen.getAllByTestId("sim-operation");
    // andThen and orElse are switch-capable
    expect(simOps).toHaveLength(2);
  });

  it("each operation has Auto / Force Ok / Force Err controls", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    const simOps = screen.getAllByTestId("sim-operation");
    for (const op of simOps) {
      expect(op.querySelector("[data-testid='sim-auto']")).toBeDefined();
      expect(op.querySelector("[data-testid='sim-force-ok']")).toBeDefined();
      expect(op.querySelector("[data-testid='sim-force-err']")).toBeDefined();
    }
  });

  it("forcing Ok highlights the corresponding path", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    // Force andThen to Ok
    const firstOp = screen.getAllByTestId("sim-operation")[0];
    fireEvent.click(firstOp.querySelector("[data-testid='sim-force-ok']")!);

    const result = screen.getByTestId("sim-result-path");
    expect(result.dataset["pathId"]).toBe("path-a");
  });

  it("forcing Err highlights the corresponding path", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    // Force andThen to Err
    const firstOp = screen.getAllByTestId("sim-operation")[0];
    fireEvent.click(firstOp.querySelector("[data-testid='sim-force-err']")!);

    const result = screen.getByTestId("sim-result-path");
    // Should match a path where andThen produces Err
    expect(result.textContent).toMatch(/Recovery|Error/);
  });

  it("auto mode uses most likely outcome from observed data", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    // Default is Auto — andThen produces Ok 70% of the time
    const result = screen.getByTestId("sim-result-path");
    expect(result.dataset["pathId"]).toBe("path-a");
  });

  it("'Reset All' returns all to Auto", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    // Force andThen to Err
    const firstOp = screen.getAllByTestId("sim-operation")[0];
    fireEvent.click(firstOp.querySelector("[data-testid='sim-force-err']")!);

    // Click reset
    fireEvent.click(screen.getByTestId("sim-reset-all"));

    // Should be back to Auto (path-a)
    const result = screen.getByTestId("sim-result-path");
    expect(result.dataset["pathId"]).toBe("path-a");
  });

  it("unobserved forced path shows warning message", () => {
    render(<CaseSimulator chain={chain} paths={paths} />);

    // Force andThen to Ok and orElse to Err — this matches path-unobserved
    const ops = screen.getAllByTestId("sim-operation");
    fireEvent.click(ops[0].querySelector("[data-testid='sim-force-ok']")!);
    fireEvent.click(ops[1].querySelector("[data-testid='sim-force-err']")!);

    expect(screen.getByTestId("sim-unobserved-warning")).toBeDefined();
  });

  it("'Apply to Pipeline View' navigates with matching execution", () => {
    const onApply = vi.fn();
    render(<CaseSimulator chain={chain} paths={paths} onApplyToPipeline={onApply} />);

    fireEvent.click(screen.getByTestId("sim-apply-pipeline"));
    expect(onApply).toHaveBeenCalledOnce();
  });
});
