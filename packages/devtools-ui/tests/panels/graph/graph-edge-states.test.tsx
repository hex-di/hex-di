/**
 * Tests for GraphEdgeState component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphEdgeState } from "../../../src/panels/graph/components/graph-edge-states.js";
import type { GraphEdgeStateKind } from "../../../src/panels/graph/components/graph-edge-states.js";

afterEach(() => {
  cleanup();
});

const ALL_KINDS: GraphEdgeStateKind[] = [
  "empty",
  "loading",
  "disposed",
  "disconnected",
  "filtered-out",
  "large-graph-warning",
  "single-node",
  "depth-limit",
  "skeleton",
  "disposing",
];

describe("GraphEdgeState", () => {
  for (const kind of ALL_KINDS) {
    it(`renders ${kind} state with correct test id`, () => {
      render(<GraphEdgeState kind={kind} />);
      expect(screen.getByTestId(`graph-edge-state-${kind}`)).toBeDefined();
    });
  }

  it("shows adapter count for large-graph-warning", () => {
    render(<GraphEdgeState kind="large-graph-warning" adapterCount={150} />);
    expect(screen.getByTestId("graph-edge-state-large-graph-warning").textContent).toContain("150");
  });

  it("renders dismiss button when onDismiss is provided", () => {
    const onDismiss = vi.fn();
    render(<GraphEdgeState kind="large-graph-warning" onDismiss={onDismiss} />);
    const button = screen.getByText("Show Anyway");
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders Dismiss label for non-warning states with onDismiss", () => {
    render(<GraphEdgeState kind="disposed" onDismiss={vi.fn()} />);
    expect(screen.getByText("Dismiss")).toBeDefined();
  });
});
