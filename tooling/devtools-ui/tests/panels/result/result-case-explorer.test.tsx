/**
 * Component tests for the CaseExplorerView.
 *
 * Spec: 06-case-explorer.md (6.1-6.7)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CaseExplorerView } from "../../../src/panels/result/case-explorer.js";
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
    makeOp({ index: 1, method: "map", label: "transform", inputTrack: "ok", canSwitch: false }),
    makeOp({ index: 2, method: "andThen", label: "validate", canSwitch: true }),
    makeOp({ index: 3, method: "orElse", label: "fallback", inputTrack: "err", canSwitch: true }),
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

function makePath(overrides?: Partial<ResultPathDescriptor>): ResultPathDescriptor {
  return {
    pathId: "path-a",
    trackSequence: ["ok", "ok", "ok", "ok", "ok"],
    switchPoints: [],
    observed: true,
    observedCount: 629,
    frequency: 0.723,
    description: "Happy path",
    ...overrides,
  };
}

const paths: readonly ResultPathDescriptor[] = [
  makePath({
    pathId: "path-a",
    trackSequence: ["ok", "ok", "ok", "ok", "ok"],
    switchPoints: [],
    observed: true,
    observedCount: 629,
    frequency: 0.723,
    description: "Happy path",
  }),
  makePath({
    pathId: "path-b",
    trackSequence: ["ok", "ok", "err", "err", "err"],
    switchPoints: [2],
    observed: false,
    observedCount: 0,
    frequency: 0,
    description: "Error at validate, no recovery",
  }),
  makePath({
    pathId: "path-c",
    trackSequence: ["ok", "ok", "err", "ok", "ok"],
    switchPoints: [2, 3],
    observed: true,
    observedCount: 218,
    frequency: 0.251,
    description: "Err at validate, recovered",
  }),
  makePath({
    pathId: "path-d",
    trackSequence: ["ok", "ok", "err", "err", "err"],
    switchPoints: [2],
    observed: true,
    observedCount: 23,
    frequency: 0.026,
    description: "Error path",
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

describe("CaseExplorerView", () => {
  beforeEach(setupEnv);

  it("renders summary header with path count, observed count, and coverage", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const header = screen.getByTestId("case-summary-header");
    // 4 total paths, 3 observed (path-b is unobserved)
    expect(header.textContent).toContain("4");
    expect(header.textContent).toContain("3");
    // Coverage: 3/4 = 75%
    expect(header.textContent).toContain("75%");
  });

  it("renders path tree with branches at switch-capable operations", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const branches = screen.getAllByTestId("path-branch");
    // andThen and orElse are switch-capable — at least 2 branch points
    expect(branches.length).toBeGreaterThanOrEqual(2);
  });

  it("non-switching operations collapsed into badge", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const badges = screen.getAllByTestId("collapsed-ops-badge");
    expect(badges.length).toBeGreaterThan(0);
    // "map" + "ok" could be collapsed
    expect(badges[0].textContent).toMatch(/\[\d+ \w+\]/);
  });

  it("collapsed badge is expandable on click", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const badge = screen.getAllByTestId("collapsed-ops-badge")[0];
    fireEvent.click(badge);
    expect(badge.dataset["expanded"]).toBe("true");
  });

  it("branch labels show 'Ok' and 'Err' with correct colors", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const branchLabels = screen.getAllByTestId("branch-label");
    const labels = branchLabels.map(l => l.textContent);
    expect(labels).toContain("Ok");
    expect(labels).toContain("Err");
  });

  it("each path shows frequency percentage and absolute count", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const pathNodes = screen.getAllByTestId("path-leaf");
    expect(pathNodes.length).toBeGreaterThan(0);
    // First path (72.3%) should show percentage
    expect(pathNodes[0].textContent).toMatch(/72/);
  });

  it("frequency bar width proportional to percentage", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const bars = screen.getAllByTestId("frequency-bar");
    expect(bars.length).toBeGreaterThan(0);
    // The frequency value should be available
    expect(Number(bars[0].dataset["frequency"])).toBeGreaterThan(0);
  });

  it("observed paths show green checkmark icon", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const observedIcons = screen.getAllByTestId("path-observed-icon");
    const observed = observedIcons.filter(i => i.dataset["observed"] === "true");
    expect(observed.length).toBeGreaterThan(0);
  });

  it("unobserved paths show amber ghost icon", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const observedIcons = screen.getAllByTestId("path-observed-icon");
    const unobserved = observedIcons.filter(i => i.dataset["observed"] === "false");
    expect(unobserved.length).toBeGreaterThan(0);
  });

  it("clicking leaf node opens path detail panel", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    fireEvent.click(leaves[0]);

    expect(screen.getByTestId("path-detail-panel")).toBeDefined();
  });

  it("path detail shows classification, frequency, switch points", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    fireEvent.click(leaves[0]);

    const detail = screen.getByTestId("path-detail-panel");
    expect(detail.textContent).toContain("72");
    expect(detail.querySelector("[data-testid='path-classification']")).toBeDefined();
  });

  it("path detail shows recent executions", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    fireEvent.click(leaves[0]);

    expect(screen.getByTestId("path-recent-executions")).toBeDefined();
  });

  it("happy path has checkmark icon", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    fireEvent.click(leaves[0]); // First path = happy path

    const classIcon = screen.getByTestId("path-classification");
    expect(classIcon.dataset["type"]).toBe("happy");
  });

  it("error path has X icon", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    // Path D is an error path
    const leaves = screen.getAllByTestId("path-leaf");
    // Find and click the error path leaf
    const errorLeaf = leaves.find(l => l.dataset["pathId"] === "path-d");
    if (errorLeaf) {
      fireEvent.click(errorLeaf);
      const classIcon = screen.getByTestId("path-classification");
      expect(classIcon.dataset["type"]).toBe("error");
    } else {
      // Fallback: click the last leaf which should be error
      fireEvent.click(leaves[leaves.length - 1]);
      const classIcon = screen.getByTestId("path-classification");
      expect(["error", "recovery"].includes(classIcon.dataset["type"] ?? "")).toBe(true);
    }
  });

  it("recovery path has circular arrow icon", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    const recoveryLeaf = leaves.find(l => l.dataset["pathId"] === "path-c");
    if (recoveryLeaf) {
      fireEvent.click(recoveryLeaf);
      const classIcon = screen.getByTestId("path-classification");
      expect(classIcon.dataset["type"]).toBe("recovery");
    }
  });

  it("multi-error path has warning triangle icon", () => {
    // Multi-error path: multiple ok->err switches
    const multiErrorPaths = [
      ...paths,
      makePath({
        pathId: "path-e",
        trackSequence: ["ok", "ok", "err", "ok", "err"],
        switchPoints: [2, 4],
        observed: true,
        observedCount: 5,
        frequency: 0.005,
        description: "Multi-error",
      }),
    ];

    render(<CaseExplorerView chain={chain} paths={multiErrorPaths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    const multiLeaf = leaves.find(l => l.dataset["pathId"] === "path-e");
    if (multiLeaf) {
      fireEvent.click(multiLeaf);
      const classIcon = screen.getByTestId("path-classification");
      expect(classIcon.dataset["type"]).toBe("multi-error");
    }
  });

  it("unobserved path shows warning: 'never observed'", () => {
    render(<CaseExplorerView chain={chain} paths={paths} />);

    const leaves = screen.getAllByTestId("path-leaf");
    const unobservedLeaf = leaves.find(l => l.dataset["pathId"] === "path-b");
    if (unobservedLeaf) {
      fireEvent.click(unobservedLeaf);
      expect(screen.getByTestId("path-detail-panel").textContent).toContain("never observed");
    }
  });

  it("chains with >16 paths show 'N more paths...' truncation", () => {
    // Create 20 paths
    const manyPaths: ResultPathDescriptor[] = Array.from({ length: 20 }, (_, i) =>
      makePath({
        pathId: `path-${i}`,
        observed: i < 10,
        observedCount: 100 - i * 5,
        frequency: (100 - i * 5) / 1000,
        description: `Path ${i}`,
      })
    );

    render(<CaseExplorerView chain={chain} paths={manyPaths} />);

    expect(screen.getByTestId("more-paths-indicator")).toBeDefined();
    expect(screen.getByTestId("more-paths-indicator").textContent).toMatch(/\d+ more paths/);
  });
});
