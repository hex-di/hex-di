/**
 * Component tests for the ResultPanel toolbar.
 *
 * Spec: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { ResultPanelToolbar } from "../../../src/panels/result/result-panel-toolbar.js";
import { MockResultDataSource } from "../../../src/panels/result/mock-data-source.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultPortStatistics,
  ResultViewId,
} from "../../../src/panels/result/types.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeChain(overrides?: Partial<ResultChainDescriptor>): ResultChainDescriptor {
  return {
    chainId: "chain-1",
    label: "validateUser",
    portName: "UserPort",
    operations: [],
    isAsync: false,
    sourceLocation: undefined,
    ...overrides,
  };
}

function makePortStats(overrides?: Partial<ResultPortStatistics>): ResultPortStatistics {
  return {
    portName: "UserPort",
    totalCalls: 100,
    okCount: 90,
    errCount: 10,
    errorRate: 0.1,
    errorsByCode: new Map(),
    lastError: undefined,
    stabilityScore: 0.9,
    chainIds: ["chain-1"],
    lastExecutionTimestamp: undefined,
    ...overrides,
  };
}

function makeExecution(overrides?: Partial<ResultChainExecution>): ResultChainExecution {
  return {
    executionId: "exec-1",
    chainId: "chain-1",
    entryMethod: "ok",
    entryTrack: "ok",
    entryValue: { data: 42, typeName: "number", truncated: false },
    steps: [],
    finalTrack: "ok",
    finalValue: { data: 42, typeName: "number", truncated: false },
    totalDurationMicros: 100,
    startTimestamp: 1000,
    scopeId: undefined,
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────

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

describe("ResultPanelToolbar", () => {
  beforeEach(setupEnv);

  it("view switcher renders 7 buttons with correct labels", () => {
    const ds = new MockResultDataSource();
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
    expect(tabs.map(t => t.textContent)).toEqual([
      "Railway",
      "Log",
      "Cases",
      "Sankey",
      "Waterfall",
      "Combinator",
      "Overview",
    ]);
  });

  it("clicking a view button switches the active view", () => {
    const ds = new MockResultDataSource();
    const onViewChange = vi.fn();
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={onViewChange}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const logTab = screen.getByRole("tab", { name: "Log" });
    fireEvent.click(logTab);
    expect(onViewChange).toHaveBeenCalledWith("log");
  });

  it("active view button has accent underline", () => {
    const ds = new MockResultDataSource();
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="log"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const activeTab = screen.getByRole("tab", { selected: true });
    expect(activeTab.textContent).toBe("Log");
    expect(activeTab.dataset["active"]).toBe("true");
  });

  it("chain selector dropdown lists all registered chains", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.registerChain(makeChain({ chainId: "chain-2", label: "fetchData", portName: "DataPort" }));
    ds.setPortStatistics("UserPort", makePortStats());
    ds.setPortStatistics("DataPort", makePortStats({ portName: "DataPort" }));
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const options = screen.getAllByTestId("chain-option");
    expect(options).toHaveLength(2);
  });

  it("chain selector shows label and ok rate", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats());
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const option = screen.getByTestId("chain-option");
    expect(option.textContent).toContain("validateUser");
    expect(option.textContent).toContain("90%");
  });

  it("chain selector search filters by name", async () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.registerChain(makeChain({ chainId: "chain-2", label: "fetchData", portName: "DataPort" }));
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const searchInput = screen.getByTestId("chain-search");
    fireEvent.change(searchInput, { target: { value: "fetch" } });

    // Wait for debounce (150ms)
    await waitFor(() => {
      const options = screen.getAllByTestId("chain-option");
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toContain("fetchData");
    });
  });

  it("execution selector shows recent executions newest first", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.addExecution(makeExecution({ executionId: "exec-1", startTimestamp: 1000 }));
    ds.addExecution(makeExecution({ executionId: "exec-2", startTimestamp: 2000 }));
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId="chain-1"
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const execEntries = screen.getAllByTestId("execution-entry");
    expect(execEntries).toHaveLength(2);
    // Newest first
    expect(execEntries[0].textContent).toContain("exec-2");
  });

  it("execution entry shows execution ID, final track badge, and duration", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.addExecution(
      makeExecution({ executionId: "exec-42", finalTrack: "err", totalDurationMicros: 5000 })
    );
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId="chain-1"
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const entry = screen.getByTestId("execution-entry");
    expect(entry.textContent).toContain("exec-42");
    expect(entry.dataset["finalTrack"]).toBe("err");
  });

  it("prev/next buttons navigate between executions", () => {
    const ds = new MockResultDataSource();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    ds.registerChain(makeChain());
    ds.addExecution(makeExecution({ executionId: "exec-1", startTimestamp: 1000 }));
    ds.addExecution(makeExecution({ executionId: "exec-2", startTimestamp: 2000 }));
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId="chain-1"
        onChainSelect={vi.fn()}
        selectedExecutionId="exec-2"
        onExecutionSelect={vi.fn()}
        onPrevExecution={onPrev}
        onNextExecution={onNext}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    fireEvent.click(screen.getByTestId("exec-prev-btn"));
    expect(onPrev).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId("exec-next-btn"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("[?] button toggles educational sidebar", () => {
    const ds = new MockResultDataSource();
    const onToggle = vi.fn();
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={onToggle}
        connectionStatus="connected"
      />
    );

    fireEvent.click(screen.getByTestId("educational-toggle"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("export dropdown lists chain export formats", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId="chain-1"
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const exportItems = screen.getAllByTestId("export-option");
    expect(exportItems.length).toBeGreaterThanOrEqual(3);
    const labels = exportItems.map(e => e.textContent);
    expect(labels).toContain("JSON");
    expect(labels).toContain("Mermaid");
    expect(labels).toContain("DOT");
  });

  it("live indicator shows green dot when connected", () => {
    const ds = new MockResultDataSource();
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="connected"
      />
    );

    const indicator = screen.getByTestId("live-indicator");
    expect(indicator.dataset["status"]).toBe("connected");
  });

  it("live indicator shows red dot with 'Disconnected' when disconnected", () => {
    const ds = new MockResultDataSource();
    render(
      <ResultPanelToolbar
        dataSource={ds}
        activeView="overview"
        onViewChange={vi.fn()}
        selectedChainId={undefined}
        onChainSelect={vi.fn()}
        selectedExecutionId={undefined}
        onExecutionSelect={vi.fn()}
        onPrevExecution={vi.fn()}
        onNextExecution={vi.fn()}
        educationalSidebarOpen={false}
        onToggleEducational={vi.fn()}
        connectionStatus="disconnected"
      />
    );

    const indicator = screen.getByTestId("live-indicator");
    expect(indicator.dataset["status"]).toBe("disconnected");
    expect(indicator.textContent).toContain("Disconnected");
  });
});
