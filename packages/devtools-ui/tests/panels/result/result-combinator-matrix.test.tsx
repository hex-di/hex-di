/**
 * Component tests for the CombinatorMatrixView.
 *
 * Spec: 09-combinator-matrix.md (9.1-9.14), 10-visual-encoding.md (10.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CombinatorMatrixView } from "../../../src/panels/result/combinator-matrix.js";
import type {
  ResultChainDescriptor,
  ResultOperationDescriptor,
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

const noCombinatorChain: ResultChainDescriptor = {
  chainId: "no-combinator",
  label: "simpleChain",
  portName: "UserPort",
  operations: [
    makeOp({ index: 0, method: "ok", label: "ok(42)", inputTrack: "both", canSwitch: false }),
    makeOp({ index: 1, method: "andThen", label: "validate" }),
    makeOp({
      index: 2,
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

const allChain: ResultChainDescriptor = {
  chainId: "all-chain",
  label: "fetchAllData",
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

const anyChain: ResultChainDescriptor = {
  chainId: "any-chain",
  label: "fetchAny",
  portName: "DbPort",
  operations: [
    makeOp({ index: 0, method: "any", label: "fallbackDb", inputTrack: "both", canSwitch: false }),
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

const collectChain: ResultChainDescriptor = {
  chainId: "collect-chain",
  label: "collectFields",
  portName: "FormPort",
  operations: [
    makeOp({ index: 0, method: "collect", label: "fields", inputTrack: "both", canSwitch: false }),
    makeOp({
      index: 1,
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

const allSettledChain: ResultChainDescriptor = {
  chainId: "allSettled-chain",
  label: "validateAll",
  portName: "ValidatorPort",
  operations: [
    makeOp({
      index: 0,
      method: "allSettled",
      label: "validate",
      inputTrack: "both",
      canSwitch: false,
    }),
    makeOp({
      index: 1,
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

interface CombinatorInput {
  readonly index: number;
  readonly name?: string;
  readonly sourceLabel: string;
  readonly track: "ok" | "err";
  readonly valuePreview: string;
  readonly isShortCircuitCause: boolean;
  readonly isSkipped: boolean;
}

interface CombinatorOutput {
  readonly track: "ok" | "err";
  readonly valuePreview: string;
  readonly sourceNote: string;
}

interface CombinatorData {
  readonly combinatorMethod: "all" | "allSettled" | "any" | "collect";
  readonly inputs: readonly CombinatorInput[];
  readonly output: CombinatorOutput;
  readonly nestedCombinator?: { readonly index: number; readonly method: string };
}

// Input data for `all` with short-circuit
const allInputs: CombinatorData = {
  combinatorMethod: "all",
  inputs: [
    {
      index: 0,
      sourceLabel: "fetchUser",
      track: "ok",
      valuePreview: "{ id: 1 }",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 1,
      sourceLabel: "fetchPosts",
      track: "ok",
      valuePreview: "[...3]",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 2,
      sourceLabel: "fetchTags",
      track: "err",
      valuePreview: "Timeout",
      isShortCircuitCause: true,
      isSkipped: false,
    },
  ],
  output: { track: "err", valuePreview: "Timeout", sourceNote: "Failed at input #3 (Timeout)" },
};

// Input data for `any` with first ok
const anyInputs: CombinatorData = {
  combinatorMethod: "any",
  inputs: [
    {
      index: 0,
      sourceLabel: "primaryDb",
      track: "err",
      valuePreview: "ConnRefused",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 1,
      sourceLabel: "replicaDb",
      track: "ok",
      valuePreview: "{ data: .. }",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 2,
      sourceLabel: "cache",
      track: "err",
      valuePreview: "CacheMiss",
      isShortCircuitCause: false,
      isSkipped: true,
    },
  ],
  output: {
    track: "ok",
    valuePreview: '{ source: "replica" }',
    sourceNote: "First Ok: input #2 (replicaDb)",
  },
};

// Input data for `collect` with field names
const collectInputs: CombinatorData = {
  combinatorMethod: "collect",
  inputs: [
    {
      index: 0,
      name: "user",
      sourceLabel: "fetchUser",
      track: "ok",
      valuePreview: "{ id: 1 }",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 1,
      name: "posts",
      sourceLabel: "getPosts",
      track: "ok",
      valuePreview: "[...5]",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 2,
      name: "config",
      sourceLabel: "loadCfg",
      track: "ok",
      valuePreview: "{ theme: .. }",
      isShortCircuitCause: false,
      isSkipped: false,
    },
  ],
  output: { track: "ok", valuePreview: "{ user, posts, config }", sourceNote: "All fields Ok" },
};

// Input data for `allSettled` with collected errors
const allSettledInputs: CombinatorData = {
  combinatorMethod: "allSettled",
  inputs: [
    {
      index: 0,
      sourceLabel: "validateEmail",
      track: "err",
      valuePreview: "InvalidEmail",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 1,
      sourceLabel: "validateAge",
      track: "ok",
      valuePreview: "25",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 2,
      sourceLabel: "validateName",
      track: "err",
      valuePreview: "TooShort",
      isShortCircuitCause: false,
      isSkipped: false,
    },
  ],
  output: { track: "err", valuePreview: "2 errors collected", sourceNote: "2 Ok, 1 Err" },
};

// Nested combinator data
const nestedAllInputs: CombinatorData = {
  combinatorMethod: "all",
  inputs: [
    {
      index: 0,
      sourceLabel: "inner-all",
      track: "ok",
      valuePreview: "nested",
      isShortCircuitCause: false,
      isSkipped: false,
    },
    {
      index: 1,
      sourceLabel: "fetchB",
      track: "ok",
      valuePreview: "data",
      isShortCircuitCause: false,
      isSkipped: false,
    },
  ],
  output: { track: "ok", valuePreview: "[...]", sourceNote: "All 2 inputs Ok" },
  nestedCombinator: { index: 0, method: "all" },
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

describe("CombinatorMatrixView", () => {
  beforeEach(setupEnv);

  it("shows 'no combinator' message for chains without combinators", () => {
    render(<CombinatorMatrixView chain={noCombinatorChain} combinatorData={undefined} />);

    const message = screen.getByTestId("no-combinator-message");
    expect(message.textContent).toContain("no combinator");
  });

  it("renders input cells for each combinator input", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const cells = screen.getAllByTestId("combinator-input-cell");
    expect(cells).toHaveLength(3);
  });

  it("input cell shows index/name, source label, Ok/Err badge, value preview", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const cells = screen.getAllByTestId("combinator-input-cell");
    const firstCell = cells[0];
    expect(firstCell.textContent).toContain("fetchUser");
    expect(firstCell.textContent).toContain("Ok");
    expect(firstCell.textContent).toContain("{ id: 1 }");
  });

  it("Ok inputs have green left border", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const cells = screen.getAllByTestId("combinator-input-cell");
    expect(cells[0].dataset["track"]).toBe("ok");
  });

  it("Err inputs have red left border", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const cells = screen.getAllByTestId("combinator-input-cell");
    expect(cells[2].dataset["track"]).toBe("err");
  });

  it("short-circuit cause input has pulsing label", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const shortCircuit = screen.getByTestId("short-circuit-label");
    expect(shortCircuit).toBeDefined();
    expect(shortCircuit.textContent).toContain("SHORT-CIRCUIT");
  });

  it("skipped inputs (after short-circuit) are dimmed at 40%", () => {
    render(<CombinatorMatrixView chain={anyChain} combinatorData={anyInputs} />);

    const cells = screen.getAllByTestId("combinator-input-cell");
    const skippedCell = cells[2]; // cache is skipped
    expect(skippedCell.dataset["skipped"]).toBe("true");
  });

  it("`collect` inputs show field names instead of indices", () => {
    render(<CombinatorMatrixView chain={collectChain} combinatorData={collectInputs} />);

    const cells = screen.getAllByTestId("combinator-input-cell");
    expect(cells[0].textContent).toContain("user");
    expect(cells[1].textContent).toContain("posts");
    expect(cells[2].textContent).toContain("config");
  });

  it("connector lines colored by input track", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const connectors = screen.getAllByTestId("combinator-connector");
    expect(connectors[0].dataset["track"]).toBe("ok");
    expect(connectors[2].dataset["track"]).toBe("err");
  });

  it("combinator box shows name and input counts", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const box = screen.getByTestId("combinator-box");
    expect(box.textContent).toContain("all");
    expect(box.textContent).toContain("3");
  });

  it("output box shows combined result badge and value", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const outputBox = screen.getByTestId("combinator-output-box");
    expect(outputBox.dataset["track"]).toBe("err");
    expect(outputBox.textContent).toContain("Timeout");
  });

  it("output source note for `all` shows 'Failed at input #N' on Err", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const sourceNote = screen.getByTestId("combinator-source-note");
    expect(sourceNote.textContent).toContain("Failed at input #3");
  });

  it("output source note for `any` shows 'First Ok: input #N' on Ok", () => {
    render(<CombinatorMatrixView chain={anyChain} combinatorData={anyInputs} />);

    const sourceNote = screen.getByTestId("combinator-source-note");
    expect(sourceNote.textContent).toContain("First Ok: input #2");
  });

  it("`allSettled` output shows collected errors list", () => {
    render(<CombinatorMatrixView chain={allSettledChain} combinatorData={allSettledInputs} />);

    const outputBox = screen.getByTestId("combinator-output-box");
    expect(outputBox.textContent).toContain("2 errors collected");
  });

  it("nested combinator cell is expandable with drill-down", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={nestedAllInputs} />);

    const nestedBadge = screen.getByTestId("nested-combinator-badge");
    expect(nestedBadge).toBeDefined();
    fireEvent.click(nestedBadge);
    expect(screen.getByTestId("nested-combinator-expanded")).toBeDefined();
  });

  it("educational annotation renders at bottom with correct text per combinator", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const annotation = screen.getByTestId("combinator-educational");
    expect(annotation.textContent).toContain("Short-circuits on the first Err");
  });

  it("renders combinator header with method, input count, and output track summary", () => {
    render(<CombinatorMatrixView chain={allChain} combinatorData={allInputs} />);

    const header = screen.getByTestId("combinator-header");
    expect(header.textContent).toContain("all");
    expect(header.textContent).toContain("3"); // 3 inputs
    expect(header.textContent).toContain("Err"); // output track
  });
});
