/**
 * Tests for GraphAnalysisSidebar component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphAnalysisSidebar } from "../../../src/panels/graph/components/graph-analysis-sidebar.js";
import type {
  GraphAnalysisState,
  GraphSuggestion,
  CaptiveDependencyResult,
} from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

function createAnalysis(overrides: Partial<GraphAnalysisState> = {}): GraphAnalysisState {
  return {
    isOpen: true,
    complexityScore: 42,
    recommendation: "safe",
    suggestions: [],
    captiveDependencies: [],
    orphanPorts: [],
    disposalWarnings: [],
    unnecessaryLazyPorts: [],
    portsWithFinalizers: [],
    directionSummary: { inbound: 3, outbound: 5 },
    maxChainDepth: 4,
    isComplete: true,
    unsatisfiedRequirements: [],
    correlationId: "",
    depthLimitExceeded: false,
    ...overrides,
  };
}

describe("GraphAnalysisSidebar", () => {
  it("renders nothing when not open", () => {
    render(<GraphAnalysisSidebar analysis={createAnalysis()} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("graph-analysis-sidebar")).toBeNull();
  });

  it("renders when open", () => {
    render(<GraphAnalysisSidebar analysis={createAnalysis()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("graph-analysis-sidebar")).toBeDefined();
  });

  it("has complementary role", () => {
    render(<GraphAnalysisSidebar analysis={createAnalysis()} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("graph-analysis-sidebar").getAttribute("role")).toBe("complementary");
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<GraphAnalysisSidebar analysis={createAnalysis()} isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close analysis sidebar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows complexity score", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ complexityScore: 42 })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("complexity-score").textContent).toContain("42");
  });

  it("shows Safe recommendation for low score", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ complexityScore: 30, recommendation: "safe" })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("complexity-score").textContent).toContain("Safe");
  });

  it("shows Monitor recommendation for medium score", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ complexityScore: 75, recommendation: "monitor" })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("complexity-score").textContent).toContain("Monitor");
  });

  it("shows Consider Splitting for high score", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ complexityScore: 120, recommendation: "consider-splitting" })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("complexity-score").textContent).toContain("Consider Splitting");
  });

  it("shows direction summary", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ directionSummary: { inbound: 3, outbound: 5 } })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    const summary = screen.getByTestId("direction-summary");
    expect(summary.textContent).toContain("3");
    expect(summary.textContent).toContain("5");
  });

  it("shows depth info", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ maxChainDepth: 7 })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("complexity-score").textContent).toContain("7");
  });

  it("shows unsatisfied requirements when incomplete", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({
          isComplete: false,
          unsatisfiedRequirements: ["LogPort", "CachePort"],
        })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    const card = screen.getByTestId("completeness-card");
    expect(card.textContent).toContain("LogPort");
    expect(card.textContent).toContain("CachePort");
  });

  it("does not show completeness card when complete", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ isComplete: true })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId("completeness-card")).toBeNull();
  });

  it("shows suggestions and calls handler on click", () => {
    const suggestion: GraphSuggestion = {
      type: "orphan_port",
      portName: "DbPort",
      message: "Orphan port detected",
      action: "Consider removing or connecting",
    };
    const onSuggestionClick = vi.fn();
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ suggestions: [suggestion] })}
        isOpen={true}
        onClose={vi.fn()}
        onSuggestionClick={onSuggestionClick}
      />
    );
    const list = screen.getByTestId("suggestions-list");
    expect(list.textContent).toContain("DbPort");
    fireEvent.click(list.querySelector("button")!);
    expect(onSuggestionClick).toHaveBeenCalledWith(suggestion);
  });

  it("shows orphan ports", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ orphanPorts: ["OrphanA", "OrphanB"] })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    const section = screen.getByTestId("orphan-ports");
    expect(section.textContent).toContain("OrphanA");
    expect(section.textContent).toContain("OrphanB");
  });

  it("shows captive dependencies", () => {
    const captive: CaptiveDependencyResult = {
      dependentPort: "AppService",
      captivePort: "RequestScope",
      dependentLifetime: "singleton",
      captiveLifetime: "scoped",
    };
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ captiveDependencies: [captive] })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    const section = screen.getByTestId("captive-deps");
    expect(section.textContent).toContain("AppService");
    expect(section.textContent).toContain("RequestScope");
  });

  it("shows disposal warnings", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ disposalWarnings: ["LeakyPort"] })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("disposal-warnings").textContent).toContain("LeakyPort");
  });

  it("shows unnecessary lazy ports", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ unnecessaryLazyPorts: ["LazyPort"] })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("unnecessary-lazy").textContent).toContain("LazyPort");
  });

  it("shows depth warning when present", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ depthWarning: "Depth exceeds 10" })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("depth-warning").textContent).toContain("Depth exceeds 10");
  });

  it("shows correlation ID when present", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ correlationId: "abc-123" })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("correlation-id").textContent).toContain("abc-123");
  });

  it("shows actor when present", () => {
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({
          actor: { type: "user", id: "u1", name: "Admin" },
        })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("analysis-actor").textContent).toContain("Admin");
    expect(screen.getByTestId("analysis-actor").textContent).toContain("user");
  });

  it("clicking orphan port calls onPortClick", () => {
    const onPortClick = vi.fn();
    render(
      <GraphAnalysisSidebar
        analysis={createAnalysis({ orphanPorts: ["OrphanA"] })}
        isOpen={true}
        onClose={vi.fn()}
        onPortClick={onPortClick}
      />
    );
    fireEvent.click(screen.getByText("OrphanA"));
    expect(onPortClick).toHaveBeenCalledWith("OrphanA");
  });
});
