/**
 * Tests for MetadataInspectorPanel component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MetadataInspectorPanel } from "../../../src/panels/graph/components/metadata-inspector-panel.js";
import type { EnrichedGraphNode } from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

function createNode(overrides: Partial<EnrichedGraphNode> = {}): EnrichedGraphNode {
  return {
    adapter: {
      portName: "TestPort",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: ["Dep1"],
      origin: "own",
    },
    x: 0,
    y: 0,
    width: 160,
    height: 48,
    isResolved: true,
    errorRate: undefined,
    hasHighErrorRate: false,
    totalCalls: 0,
    okCount: 0,
    errCount: 0,
    errorsByCode: new Map(),
    direction: undefined,
    category: undefined,
    tags: [],
    description: undefined,
    libraryKind: undefined,
    dependentCount: 2,
    matchesFilter: true,
    ...overrides,
  };
}

describe("MetadataInspectorPanel", () => {
  it("renders nothing when not open", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("metadata-inspector")).toBeNull();
  });

  it("renders nothing when no node", () => {
    render(<MetadataInspectorPanel node={undefined} isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByTestId("metadata-inspector")).toBeNull();
  });

  it("renders when open with node", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("metadata-inspector")).toBeDefined();
  });

  it("has complementary role", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("metadata-inspector").getAttribute("role")).toBe("complementary");
  });

  it("shows port name in header", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("metadata-inspector").textContent).toContain("TestPort");
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close metadata inspector"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows Port Information section expanded by default", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    const text = screen.getByTestId("metadata-inspector").textContent ?? "";
    expect(text).toContain("Port Information");
    expect(text).toContain("singleton");
    expect(text).toContain("sync");
  });

  it("shows Adapter Details section expanded by default", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    const text = screen.getByTestId("metadata-inspector").textContent ?? "";
    expect(text).toContain("Adapter Details");
    expect(text).toContain("Dep1");
  });

  it("shows description when present", () => {
    render(
      <MetadataInspectorPanel
        node={createNode({ description: "A test service" })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("metadata-inspector").textContent).toContain("A test service");
  });

  it("shows tags when present", () => {
    render(
      <MetadataInspectorPanel
        node={createNode({ tags: ["api", "v2"] })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    const text = screen.getByTestId("metadata-inspector").textContent ?? "";
    expect(text).toContain("api");
    expect(text).toContain("v2");
  });

  it("shows error rate statistics when present", () => {
    render(
      <MetadataInspectorPanel
        node={createNode({
          errorRate: 0.15,
          totalCalls: 200,
          okCount: 170,
          errCount: 30,
        })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    const text = screen.getByTestId("metadata-inspector").textContent ?? "";
    expect(text).toContain("15%");
    expect(text).toContain("200");
  });

  it("toggles section collapse", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    // Port Information is expanded — click to collapse
    const portBtn = screen.getByText("Port Information");
    expect(portBtn.closest("button")?.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(portBtn);
    expect(portBtn.closest("button")?.getAttribute("aria-expanded")).toBe("false");
  });
});
