/**
 * Tests for GraphContextMenu component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphContextMenu } from "../../../src/panels/graph/components/graph-context-menu.js";

afterEach(() => {
  cleanup();
});

const noop = (): void => {};

function renderMenu(overrides: Record<string, unknown> = {}): void {
  render(
    <GraphContextMenu
      position={{ x: 100, y: 200 }}
      portName="Logger"
      onClose={noop}
      onSelectNode={noop}
      onShowDependencies={noop}
      onShowDependents={noop}
      onFindPath={noop}
      onFindCommon={noop}
      onHighlightChain={noop}
      onViewMetadata={noop}
      onCopyPortName={noop}
      onNavigateToContainer={noop}
      selectedNodes={new Set()}
      {...overrides}
    />
  );
}

describe("GraphContextMenu", () => {
  it("renders when position and portName are set", () => {
    renderMenu();
    expect(screen.getByTestId("graph-context-menu")).toBeDefined();
  });

  it("does not render when position is undefined", () => {
    render(
      <GraphContextMenu
        position={undefined}
        portName="Logger"
        onClose={noop}
        onSelectNode={noop}
        onShowDependencies={noop}
        onShowDependents={noop}
        onFindPath={noop}
        onFindCommon={noop}
        onHighlightChain={noop}
        onViewMetadata={noop}
        onCopyPortName={noop}
        onNavigateToContainer={noop}
        selectedNodes={new Set()}
      />
    );
    expect(screen.queryByTestId("graph-context-menu")).toBeNull();
  });

  it("displays port name in header", () => {
    renderMenu();
    expect(screen.getByTestId("graph-context-menu").textContent).toContain("Logger");
  });

  it("has menu role", () => {
    renderMenu();
    expect(screen.getByTestId("graph-context-menu").getAttribute("role")).toBe("menu");
  });

  it("renders all menu items", () => {
    renderMenu();
    expect(screen.getByText("Select")).toBeDefined();
    expect(screen.getByText("Show Dependencies")).toBeDefined();
    expect(screen.getByText("Show Dependents")).toBeDefined();
    expect(screen.getByText("Highlight Chain")).toBeDefined();
    expect(screen.getByText("View Metadata")).toBeDefined();
    expect(screen.getByText("Copy Port Name")).toBeDefined();
  });

  it("calls onSelectNode and onClose when Select is clicked", () => {
    const onSelectNode = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onSelectNode, onClose });
    fireEvent.click(screen.getByText("Select"));
    expect(onSelectNode).toHaveBeenCalledWith("Logger");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onCopyPortName when Copy Port Name is clicked", () => {
    const onCopyPortName = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onCopyPortName, onClose });
    fireEvent.click(screen.getByText("Copy Port Name"));
    expect(onCopyPortName).toHaveBeenCalledWith("Logger");
  });

  it("calls onViewMetadata when View Metadata is clicked", () => {
    const onViewMetadata = vi.fn();
    renderMenu({ onViewMetadata });
    fireEvent.click(screen.getByText("View Metadata"));
    expect(onViewMetadata).toHaveBeenCalledWith("Logger");
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.click(screen.getByTestId("context-menu-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders aria-label with port name", () => {
    renderMenu();
    expect(screen.getByTestId("graph-context-menu").getAttribute("aria-label")).toContain("Logger");
  });

  it("calls onHighlightChain when Highlight Chain is clicked", () => {
    const onHighlightChain = vi.fn();
    renderMenu({ onHighlightChain });
    fireEvent.click(screen.getByText("Highlight Chain"));
    expect(onHighlightChain).toHaveBeenCalledWith("Logger");
  });
});
