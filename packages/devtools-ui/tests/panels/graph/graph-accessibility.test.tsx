/**
 * Tests for accessibility features across graph panel components.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { GraphCanvas } from "../../../src/panels/graph/components/graph-canvas.js";
import { GraphToolbar } from "../../../src/panels/graph/components/graph-toolbar.js";
import { GraphFilterPanel } from "../../../src/panels/graph/components/graph-filter-panel.js";
import { GraphAnalysisSidebar } from "../../../src/panels/graph/components/graph-analysis-sidebar.js";
import { MetadataInspectorPanel } from "../../../src/panels/graph/components/metadata-inspector-panel.js";
import { NodeDetailPanel } from "../../../src/panels/graph/components/node-detail-panel.js";
import { GraphMinimap } from "../../../src/panels/graph/components/graph-minimap.js";
import { useGraphAnnouncements } from "../../../src/panels/graph/use-graph-announcements.js";
import { useGraphFocus } from "../../../src/panels/graph/use-graph-focus.js";
import type {
  EnrichedGraphNode,
  GraphViewportState,
  GraphFilterState,
  GraphAnalysisState,
  GraphLayout,
} from "../../../src/panels/graph/types.js";
import { DEFAULT_FILTER_STATE } from "../../../src/panels/graph/constants.js";

afterEach(() => {
  cleanup();
});

function createNode(): EnrichedGraphNode {
  return {
    adapter: {
      portName: "TestPort",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    x: 100,
    y: 100,
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
    dependentCount: 0,
    matchesFilter: true,
  };
}

const defaultViewport: GraphViewportState = { panX: 0, panY: 0, zoom: 1 };

describe("ARIA roles", () => {
  it("GraphCanvas has role=img", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-canvas").getAttribute("role")).toBe("img");
  });

  it("GraphCanvas has aria-label", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    const label = screen.getByTestId("graph-canvas").getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label).toContain("graph");
  });

  it("GraphFilterPanel has role=complementary", () => {
    render(
      <GraphFilterPanel
        filter={DEFAULT_FILTER_STATE}
        isOpen={true}
        totalNodes={10}
        matchingNodes={10}
        availableCategories={[]}
        availableTags={[]}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("graph-filter-panel").getAttribute("role")).toBe("complementary");
  });

  it("GraphMinimap has role=complementary", () => {
    const layout: GraphLayout = { nodes: [], edges: [], width: 400, height: 300 };
    render(
      <GraphMinimap
        nodes={[createNode()]}
        layout={layout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    expect(screen.getByTestId("graph-minimap").getAttribute("role")).toBe("complementary");
  });

  it("NodeDetailPanel has role=region", () => {
    render(<NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={[]} />);
    expect(screen.getByTestId("node-detail-panel").getAttribute("role")).toBe("region");
  });

  it("MetadataInspectorPanel has role=complementary", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("metadata-inspector").getAttribute("role")).toBe("complementary");
  });

  it("GraphAnalysisSidebar has role=complementary", () => {
    const analysis: GraphAnalysisState = {
      isOpen: true,
      complexityScore: 30,
      recommendation: "safe",
      suggestions: [],
      captiveDependencies: [],
      orphanPorts: [],
      disposalWarnings: [],
      unnecessaryLazyPorts: [],
      portsWithFinalizers: [],
      directionSummary: { inbound: 0, outbound: 0 },
      maxChainDepth: 1,
      isComplete: true,
      unsatisfiedRequirements: [],
      correlationId: "",
      depthLimitExceeded: false,
    };
    render(<GraphAnalysisSidebar analysis={analysis} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("graph-analysis-sidebar").getAttribute("role")).toBe("complementary");
  });
});

describe("aria-expanded on collapsible sections", () => {
  it("MetadataInspectorPanel sections have aria-expanded", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    const portBtn = screen.getByText("Port Information").closest("button");
    expect(portBtn?.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("aria-label on close buttons", () => {
  it("filter panel close has aria-label", () => {
    render(
      <GraphFilterPanel
        filter={DEFAULT_FILTER_STATE}
        isOpen={true}
        totalNodes={10}
        matchingNodes={10}
        availableCategories={[]}
        availableTags={[]}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Close filter panel")).toBeDefined();
  });

  it("metadata close has aria-label", () => {
    render(<MetadataInspectorPanel node={createNode()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Close metadata inspector")).toBeDefined();
  });

  it("analysis sidebar close has aria-label", () => {
    const analysis: GraphAnalysisState = {
      isOpen: true,
      complexityScore: 0,
      recommendation: "safe",
      suggestions: [],
      captiveDependencies: [],
      orphanPorts: [],
      disposalWarnings: [],
      unnecessaryLazyPorts: [],
      portsWithFinalizers: [],
      directionSummary: { inbound: 0, outbound: 0 },
      maxChainDepth: 0,
      isComplete: true,
      unsatisfiedRequirements: [],
      correlationId: "",
      depthLimitExceeded: false,
    };
    render(<GraphAnalysisSidebar analysis={analysis} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Close analysis sidebar")).toBeDefined();
  });
});

describe("useGraphAnnouncements", () => {
  it("returns regionRef and announce function", () => {
    const { result } = renderHook(() => useGraphAnnouncements());
    expect(result.current.regionRef).toBeDefined();
    expect(typeof result.current.announce).toBe("function");
  });

  it("announce sets text on region element", async () => {
    const { result } = renderHook(() => useGraphAnnouncements());

    const div = document.createElement("div");
    document.body.appendChild(div);
    result.current.regionRef.current = div;

    act(() => result.current.announce("Node selected"));

    // The announce uses a 50ms setTimeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    expect(div.textContent).toBe("Node selected");
    document.body.removeChild(div);
  });
});

describe("useGraphFocus", () => {
  it("returns focus management refs and functions", () => {
    const { result } = renderHook(() => useGraphFocus());
    expect(result.current.detailPanelRef).toBeDefined();
    expect(result.current.filterInputRef).toBeDefined();
    expect(result.current.sidebarRef).toBeDefined();
    expect(typeof result.current.focusDetailPanel).toBe("function");
    expect(typeof result.current.focusFilterInput).toBe("function");
    expect(typeof result.current.focusSidebar).toBe("function");
    expect(typeof result.current.returnFocus).toBe("function");
  });

  it("focusDetailPanel focuses the detail panel ref", () => {
    const { result } = renderHook(() => useGraphFocus());
    const div = document.createElement("div");
    div.tabIndex = 0;
    document.body.appendChild(div);
    result.current.detailPanelRef.current = div;

    act(() => result.current.focusDetailPanel());
    expect(document.activeElement).toBe(div);
    document.body.removeChild(div);
  });

  it("returnFocus restores previous focus", () => {
    const { result } = renderHook(() => useGraphFocus());
    const origBtn = document.createElement("button");
    const detailDiv = document.createElement("div");
    detailDiv.tabIndex = 0;
    document.body.appendChild(origBtn);
    document.body.appendChild(detailDiv);
    result.current.detailPanelRef.current = detailDiv;

    origBtn.focus();
    act(() => result.current.focusDetailPanel());
    expect(document.activeElement).toBe(detailDiv);

    act(() => result.current.returnFocus());
    expect(document.activeElement).toBe(origBtn);

    document.body.removeChild(origBtn);
    document.body.removeChild(detailDiv);
  });
});
