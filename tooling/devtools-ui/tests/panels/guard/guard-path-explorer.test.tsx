/**
 * Unit tests for PolicyPathExplorer component.
 *
 * Spec: 03-views-and-wireframes.md (3.5), 06-path-analysis.md
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PolicyPathExplorer } from "../../../src/panels/guard/policy-path-explorer.js";
import type { GuardPathDescriptor } from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makePath(overrides?: Partial<GuardPathDescriptor>): GuardPathDescriptor {
  return {
    pathId: "path-0",
    descriptorId: "guard:testPort",
    nodeIds: ["node-0"],
    nodeOutcomes: ["allow"],
    finalOutcome: "allow" as const,
    description: "hasRole(admin) \u2192 allow",
    observedCount: 5,
    frequency: 0.8,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PolicyPathExplorer", () => {
  afterEach(cleanup);

  it("renders empty state when no paths", () => {
    render(<PolicyPathExplorer paths={[]} descriptorId="guard:testPort" onPathSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-path-empty")).toBeDefined();
  });

  it("renders path items", () => {
    const paths = [
      makePath({ pathId: "path-0" }),
      makePath({ pathId: "path-1" }),
      makePath({ pathId: "path-2" }),
    ];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const items = screen.getAllByTestId("guard-path-item");
    expect(items.length).toBe(3);
  });

  it("shows coverage percentage", () => {
    const paths = [
      makePath({ pathId: "path-0", observedCount: 3 }),
      makePath({ pathId: "path-1", observedCount: 0 }),
    ];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const coveragePct = screen.getByTestId("guard-path-coverage-pct");
    expect(coveragePct.textContent).toContain("50% coverage");
  });

  it("shows outcome badges", () => {
    const paths = [
      makePath({ pathId: "path-0", finalOutcome: "allow" }),
      makePath({ pathId: "path-1", finalOutcome: "deny", nodeOutcomes: ["deny"] }),
    ];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const items = screen.getAllByTestId("guard-path-item");
    expect(items[0].getAttribute("data-outcome")).toBe("allow");
    expect(items[1].getAttribute("data-outcome")).toBe("deny");
  });

  it("shows path descriptions", () => {
    const paths = [makePath({ pathId: "path-0", description: "hasRole(admin) \u2192 allow" })];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const descriptions = screen.getAllByTestId("guard-path-description");
    expect(descriptions[0].textContent).toBe("hasRole(admin) \u2192 allow");
  });

  it("shows frequency percentages", () => {
    const paths = [makePath({ pathId: "path-0", frequency: 0.75 })];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const frequency = screen.getByTestId("guard-path-frequency");
    expect(frequency.textContent).toContain("75%");
  });

  it("shows observation counts", () => {
    const paths = [makePath({ pathId: "path-0", observedCount: 5 })];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const observedCount = screen.getByTestId("guard-path-observed-count");
    expect(observedCount.textContent).toBe("5x");
  });

  it("calls onPathSelect when path clicked", () => {
    const onPathSelect = vi.fn();
    const paths = [makePath({ pathId: "path-42" })];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={onPathSelect} />
    );

    const item = screen.getByTestId("guard-path-item");
    fireEvent.click(item);

    expect(onPathSelect).toHaveBeenCalledWith("path-42");
  });

  it("marks unobserved paths", () => {
    const paths = [makePath({ pathId: "path-0", observedCount: 0, frequency: undefined })];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const item = screen.getByTestId("guard-path-item");
    expect(item.getAttribute("data-observed")).toBe("false");
  });

  it("shows node count per path", () => {
    const paths = [
      makePath({
        pathId: "path-0",
        nodeIds: ["n-0", "n-1", "n-2"],
        nodeOutcomes: ["allow", "allow", "allow"],
      }),
    ];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const nodeCount = screen.getByTestId("guard-path-node-count");
    expect(nodeCount.textContent).toContain("3 nodes");
  });

  it("computes allow/deny breakdown", () => {
    const paths = [
      makePath({ pathId: "path-0", finalOutcome: "allow", observedCount: 3 }),
      makePath({ pathId: "path-1", finalOutcome: "allow", observedCount: 2 }),
      makePath({
        pathId: "path-2",
        finalOutcome: "deny",
        observedCount: 1,
        nodeOutcomes: ["deny"],
      }),
    ];

    render(
      <PolicyPathExplorer paths={paths} descriptorId="guard:testPort" onPathSelect={vi.fn()} />
    );

    const coverage = screen.getByTestId("guard-path-coverage");
    expect(coverage.textContent).toContain("2 allow");
    expect(coverage.textContent).toContain("1 deny");
  });
});
