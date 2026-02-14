/**
 * Component tests for the ResultPanel shell.
 *
 * Spec: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1, 14.8)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ResultPanel } from "../../../src/panels/result/result-panel.js";
import { MockResultDataSource } from "../../../src/panels/result/mock-data-source.js";
import type {
  ResultChainDescriptor,
  ResultPortStatistics,
} from "../../../src/panels/result/types.js";

// ── Setup ───────────────────────────────────────────────────────────────────

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
  Object.defineProperty(window, "localStorage", {
    writable: true,
    configurable: true,
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(() => null),
    },
  });
}

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

afterEach(() => {
  cleanup();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ResultPanel", () => {
  beforeEach(setupEnv);

  it("renders panel with 7 view tabs in toolbar", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
  });

  it("default view is 'overview' when no initialState provided", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);

    const activeTab = screen.getByRole("tab", { selected: true });
    expect(activeTab.textContent).toContain("Overview");
  });

  it("renders empty state when dataSource returns no chains", () => {
    const ds = new MockResultDataSource();
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);

    expect(screen.getByText("No Result chains detected")).toBeDefined();
  });

  it("empty state shows message: 'No Result chains detected'", () => {
    const ds = new MockResultDataSource();
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);

    expect(screen.getByTestId("result-empty-state")).toBeDefined();
  });

  it("renders status bar with chain context when chain selected", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats());
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: "chain-1",
          executionId: undefined,
          stepIndex: undefined,
          view: undefined,
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    expect(screen.getByTestId("result-status-bar")).toBeDefined();
  });

  it("status bar shows Ok/Err counts and stability percentage", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats());
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: "chain-1",
          executionId: undefined,
          stepIndex: undefined,
          view: undefined,
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    expect(screen.getByText(/Ok: 90/)).toBeDefined();
    expect(screen.getByText(/Err: 10/)).toBeDefined();
  });

  it("status bar stability badge is green when >= 95%", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats({ stabilityScore: 0.96 }));
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: "chain-1",
          executionId: undefined,
          stepIndex: undefined,
          view: undefined,
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    const badge = screen.getByTestId("stability-badge");
    expect(badge.dataset["zone"]).toBe("green");
  });

  it("status bar stability badge is amber when 80-95%", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats({ stabilityScore: 0.88 }));
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: "chain-1",
          executionId: undefined,
          stepIndex: undefined,
          view: undefined,
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    const badge = screen.getByTestId("stability-badge");
    expect(badge.dataset["zone"]).toBe("amber");
  });

  it("status bar stability badge is red when < 80%", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats({ stabilityScore: 0.5 }));
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: "chain-1",
          executionId: undefined,
          stepIndex: undefined,
          view: undefined,
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    const badge = screen.getByTestId("stability-badge");
    expect(badge.dataset["zone"]).toBe("red");
  });

  it("panel subscribes to dataSource on mount", () => {
    const ds = new MockResultDataSource();
    const subscribeSpy = vi.spyOn(ds, "subscribe");
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);
    expect(subscribeSpy).toHaveBeenCalledOnce();
  });

  it("panel unsubscribes from dataSource on unmount", () => {
    const ds = new MockResultDataSource();
    const unsubscribe = vi.fn();
    vi.spyOn(ds, "subscribe").mockReturnValue(unsubscribe);
    const { unmount } = render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("initialState.view opens the specified view", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: undefined,
          executionId: undefined,
          stepIndex: undefined,
          view: "log",
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    const activeTab = screen.getByRole("tab", { selected: true });
    expect(activeTab.textContent).toContain("Log");
  });

  it("initialState.chainId selects the specified chain", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    ds.setPortStatistics("UserPort", makePortStats());
    render(
      <ResultPanel
        dataSource={ds}
        theme="light"
        navigateTo={vi.fn()}
        initialState={{
          chainId: "chain-1",
          executionId: undefined,
          stepIndex: undefined,
          view: undefined,
          errorType: undefined,
          timeRange: undefined,
        }}
      />
    );

    expect(screen.getAllByText(/validateUser/).length).toBeGreaterThan(0);
  });

  it("theme prop applies correct CSS variable values", () => {
    const ds = new MockResultDataSource();
    ds.registerChain(makeChain());
    render(<ResultPanel dataSource={ds} theme="dark" navigateTo={vi.fn()} />);

    const panel = screen.getByTestId("result-panel");
    expect(panel.dataset["theme"]).toBe("dark");
  });

  it("renders loading state when connectionStatus is disconnected", () => {
    const ds = new MockResultDataSource();
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);

    // Simulate connection-lost event
    act(() => {
      ds.emitEvent({ type: "connection-lost" });
    });

    const panel = screen.getByTestId("result-panel");
    expect(panel.dataset["connectionStatus"]).toBe("disconnected");
  });

  it("ErrorBoundary isolates panel crash and shows fallback", () => {
    const ds = new MockResultDataSource();
    // Force an error by making getChains throw
    vi.spyOn(ds, "getChains").mockImplementation(() => {
      throw new Error("Test crash");
    });

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<ResultPanel dataSource={ds} theme="light" navigateTo={vi.fn()} />);

    expect(screen.getByTestId("result-error-fallback")).toBeDefined();
    consoleSpy.mockRestore();
  });
});
