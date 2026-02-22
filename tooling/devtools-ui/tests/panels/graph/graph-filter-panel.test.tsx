/**
 * Tests for GraphFilterPanel component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphFilterPanel } from "../../../src/panels/graph/components/graph-filter-panel.js";
import type { GraphFilterState } from "../../../src/panels/graph/types.js";
import { DEFAULT_FILTER_STATE } from "../../../src/panels/graph/constants.js";

afterEach(() => {
  cleanup();
});

function renderPanel(
  overrides: {
    filter?: Partial<GraphFilterState>;
    isOpen?: boolean;
    totalNodes?: number;
    matchingNodes?: number;
    availableCategories?: readonly string[];
    availableTags?: readonly string[];
    onFilterChange?: (filter: Partial<GraphFilterState>) => void;
    onReset?: () => void;
    onClose?: () => void;
  } = {}
) {
  const filter: GraphFilterState = { ...DEFAULT_FILTER_STATE, ...overrides.filter };
  return render(
    <GraphFilterPanel
      filter={filter}
      isOpen={overrides.isOpen ?? true}
      totalNodes={overrides.totalNodes ?? 20}
      matchingNodes={overrides.matchingNodes ?? 15}
      availableCategories={overrides.availableCategories ?? []}
      availableTags={overrides.availableTags ?? []}
      onFilterChange={overrides.onFilterChange ?? vi.fn()}
      onReset={overrides.onReset ?? vi.fn()}
      onClose={overrides.onClose ?? vi.fn()}
    />
  );
}

describe("GraphFilterPanel", () => {
  it("renders when isOpen is true", () => {
    renderPanel();
    expect(screen.getByTestId("graph-filter-panel")).toBeDefined();
  });

  it("does not render when isOpen is false", () => {
    renderPanel({ isOpen: false });
    expect(screen.queryByTestId("graph-filter-panel")).toBeNull();
  });

  it("has complementary role", () => {
    renderPanel();
    expect(screen.getByTestId("graph-filter-panel").getAttribute("role")).toBe("complementary");
  });

  it("has aria-label", () => {
    renderPanel();
    expect(screen.getByTestId("graph-filter-panel").getAttribute("aria-label")).toContain("filter");
  });

  it("shows Clear All button", () => {
    const onReset = vi.fn();
    renderPanel({ onReset });
    const clearBtn = screen.getByText("Clear All");
    fireEvent.click(clearBtn);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("shows close button that calls onClose", () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    const closeBtn = screen.getByLabelText("Close filter panel");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders search input", () => {
    renderPanel();
    expect(screen.getByTestId("filter-search")).toBeDefined();
  });

  it("renders lifetime checkboxes", () => {
    renderPanel();
    expect(screen.getByText("singleton")).toBeDefined();
    expect(screen.getByText("scoped")).toBeDefined();
    expect(screen.getByText("transient")).toBeDefined();
  });

  it("renders origin checkboxes", () => {
    renderPanel();
    expect(screen.getByText("own")).toBeDefined();
    expect(screen.getByText("inherited")).toBeDefined();
    expect(screen.getByText("overridden")).toBeDefined();
  });

  it("renders direction radio group", () => {
    renderPanel();
    expect(screen.getByLabelText("Direction filter")).toBeDefined();
  });

  it("renders inheritance mode checkboxes", () => {
    renderPanel();
    expect(screen.getByText("shared")).toBeDefined();
    expect(screen.getByText("forked")).toBeDefined();
    expect(screen.getByText("isolated")).toBeDefined();
  });

  it("renders resolution status radio group", () => {
    renderPanel();
    expect(screen.getByLabelText("Resolution status filter")).toBeDefined();
  });

  it("renders compound mode radio group", () => {
    renderPanel();
    expect(screen.getByLabelText("Compound mode")).toBeDefined();
    expect(screen.getByText("AND")).toBeDefined();
    expect(screen.getByText("OR")).toBeDefined();
  });

  it("shows footer with matching count", () => {
    renderPanel({ totalNodes: 20, matchingNodes: 15 });
    const footer = screen.getByTestId("filter-footer");
    expect(footer.textContent).toContain("15");
    expect(footer.textContent).toContain("20");
  });

  it("shows categories when available", () => {
    renderPanel({ availableCategories: ["persistence", "domain"] });
    const text = screen.getByTestId("graph-filter-panel").textContent ?? "";
    expect(text).toContain("persistence");
    expect(text).toContain("domain");
  });

  it("shows tag chips when available", () => {
    renderPanel({ availableTags: ["api", "core"] });
    expect(screen.getByText("api")).toBeDefined();
    expect(screen.getByText("core")).toBeDefined();
  });

  it("calls onFilterChange when tag is clicked", () => {
    const onFilterChange = vi.fn();
    renderPanel({ availableTags: ["api", "core"], onFilterChange });
    fireEvent.click(screen.getByText("api"));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ["api"] }));
  });
});
