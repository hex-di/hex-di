/**
 * Tests for GraphToolbar component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphToolbar } from "../../../src/panels/graph/components/graph-toolbar.js";

afterEach(() => {
  cleanup();
});

const noop = (): void => {};

function renderToolbar(overrides: Record<string, unknown> = {}): void {
  render(
    <GraphToolbar
      layoutDirection="TB"
      activeFilterCount={0}
      analysisSidebarOpen={false}
      minimapVisible={false}
      onToggleLayout={noop}
      onToggleFilter={noop}
      onToggleAnalysis={noop}
      onToggleMinimap={noop}
      onZoomIn={noop}
      onZoomOut={noop}
      onFitView={noop}
      onExport={noop}
      onCopyLink={noop}
      {...overrides}
    />
  );
}

describe("GraphToolbar", () => {
  it("renders with test id", () => {
    renderToolbar();
    expect(screen.getByTestId("graph-toolbar")).toBeDefined();
  });

  it("has toolbar role", () => {
    renderToolbar();
    expect(screen.getByTestId("graph-toolbar").getAttribute("role")).toBe("toolbar");
  });

  it("shows layout direction TB", () => {
    renderToolbar({ layoutDirection: "TB" });
    expect(screen.getByTestId("graph-toolbar").textContent).toContain("TB");
  });

  it("shows layout direction LR", () => {
    renderToolbar({ layoutDirection: "LR" });
    expect(screen.getByTestId("graph-toolbar").textContent).toContain("LR");
  });

  it("shows filter badge count when active", () => {
    renderToolbar({ activeFilterCount: 3 });
    expect(screen.getByTestId("graph-toolbar").textContent).toContain("3");
  });

  it("calls onToggleLayout when layout button clicked", () => {
    const onToggleLayout = vi.fn();
    renderToolbar({ onToggleLayout });
    const button = screen.getByLabelText(/Layout direction/);
    fireEvent.click(button);
    expect(onToggleLayout).toHaveBeenCalled();
  });

  it("calls onToggleFilter when filter button clicked", () => {
    const onToggleFilter = vi.fn();
    renderToolbar({ onToggleFilter });
    const button = screen.getByLabelText(/Filters/);
    fireEvent.click(button);
    expect(onToggleFilter).toHaveBeenCalled();
  });

  it("calls onZoomIn when zoom in button clicked", () => {
    const onZoomIn = vi.fn();
    renderToolbar({ onZoomIn });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(onZoomIn).toHaveBeenCalled();
  });

  it("shows export dropdown when export button clicked", () => {
    renderToolbar();
    fireEvent.click(screen.getByLabelText("Export graph"));
    expect(screen.getByTestId("export-dropdown")).toBeDefined();
  });

  it("calls onExport with format from dropdown", () => {
    const onExport = vi.fn();
    renderToolbar({ onExport });
    fireEvent.click(screen.getByLabelText("Export graph"));
    fireEvent.click(screen.getByText("DOT (Graphviz)"));
    expect(onExport).toHaveBeenCalledWith("dot");
  });

  it("calls onCopyLink when copy link button clicked", () => {
    const onCopyLink = vi.fn();
    renderToolbar({ onCopyLink });
    fireEvent.click(screen.getByLabelText("Copy link"));
    expect(onCopyLink).toHaveBeenCalled();
  });
});
