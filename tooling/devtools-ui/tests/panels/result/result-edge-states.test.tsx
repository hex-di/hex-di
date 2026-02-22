/**
 * Component tests for edge states and error boundaries.
 *
 * Spec: 14-integration.md (14.8, 14.9)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import {
  EdgeStateHandler,
  ViewErrorBoundary,
  ReconnectionManager,
} from "../../../src/panels/result/edge-states.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

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

// ── Edge State Tests ────────────────────────────────────────────────────────

describe("EdgeStateHandler", () => {
  beforeEach(setupEnv);

  it("No chains: 'No Result chains detected' message", () => {
    render(<EdgeStateHandler chains={[]} hasTracing={true} connectionStatus="connected" />);
    expect(screen.getByTestId("empty-chains-message").textContent).toContain(
      "No Result chains detected"
    );
  });

  it("No executions for chain: 'No executions recorded' message", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        executions={[]}
        hasTracing={true}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("empty-executions-message").textContent).toContain(
      "No executions recorded"
    );
  });

  it("Level 0 only (no tracing): Railway/Log views show 'Enable tracing...'", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={false}
        activeView="railway"
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("no-tracing-message").textContent).toContain("Enable tracing");
  });

  it("Disconnected: stale data + 'Disconnected' banner", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        connectionStatus="disconnected"
      />
    );
    expect(screen.getByTestId("disconnected-banner")).toBeDefined();
    expect(screen.getByTestId("disconnected-banner").textContent).toContain("Disconnected");
  });

  it("Reconnected: data refreshes, banner removed", () => {
    const { rerender } = render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        connectionStatus="disconnected"
      />
    );
    expect(screen.getByTestId("disconnected-banner")).toBeDefined();

    rerender(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        connectionStatus="connected"
      />
    );
    expect(screen.queryByTestId("disconnected-banner")).toBeNull();
  });

  it("Empty Sankey (no stats): 'No statistics available'", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        activeView="sankey"
        hasStatistics={false}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("no-statistics-message").textContent).toContain(
      "No statistics available"
    );
  });

  it("Async Waterfall for sync chain: 'This chain is synchronous' message", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        activeView="waterfall"
        isAsync={false}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("sync-chain-message").textContent).toContain("synchronous");
  });

  it("Combinator Matrix for non-combinator chain: 'No combinator operations'", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        activeView="combinator"
        hasCombinator={false}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("no-combinator-message").textContent).toContain(
      "No combinator operations"
    );
  });

  it("Chain with 100+ operations: viewport culling active", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        operationCount={150}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("viewport-culling-indicator").dataset["active"]).toBe("true");
  });

  it("Large chain (50+ paths): path tree paginates", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        pathCount={60}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("path-pagination")).toBeDefined();
    expect(screen.getByTestId("path-pagination").textContent).toContain("more paths");
  });

  it("Value serialization exceeded: '(truncated)' label shown", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        truncatedValues={[{ stepIndex: 2 }]}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("truncated-value-2").textContent).toContain("(truncated)");
  });

  it("Values not captured: '(values not captured)' placeholder", () => {
    render(
      <EdgeStateHandler
        chains={[{ id: "c1", label: "chain1" }]}
        hasTracing={true}
        valuesNotCaptured={true}
        connectionStatus="connected"
      />
    );
    expect(screen.getByTestId("values-not-captured").textContent).toContain(
      "(values not captured)"
    );
  });
});

// ── Error Boundary Tests ────────────────────────────────────────────────────

describe("ViewErrorBoundary", () => {
  beforeEach(setupEnv);

  // Suppress React error boundary console errors in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  function CrashingComponent(): React.ReactElement {
    throw new Error("Test crash");
  }

  it("View crash: ErrorBoundary shows fallback with error message", () => {
    render(
      <ViewErrorBoundary viewName="Railway Pipeline">
        <CrashingComponent />
      </ViewErrorBoundary>
    );
    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    expect(screen.getByTestId("error-boundary-fallback").textContent).toContain("Test crash");
  });

  it("View crash: 'Retry This View' remounts crashed view", () => {
    const onRetry = vi.fn();
    render(
      <ViewErrorBoundary viewName="Railway Pipeline" onRetry={onRetry}>
        <CrashingComponent />
      </ViewErrorBoundary>
    );
    fireEvent.click(screen.getByTestId("retry-view-btn"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("View crash: 'Switch to Overview' navigates to Overview Dashboard", () => {
    const onSwitchToOverview = vi.fn();
    render(
      <ViewErrorBoundary viewName="Railway Pipeline" onSwitchToOverview={onSwitchToOverview}>
        <CrashingComponent />
      </ViewErrorBoundary>
    );
    fireEvent.click(screen.getByTestId("switch-overview-btn"));
    expect(onSwitchToOverview).toHaveBeenCalled();
  });

  it("View crash: 'Copy Error Details' copies error to clipboard", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: { writeText },
    });

    render(
      <ViewErrorBoundary viewName="Railway Pipeline">
        <CrashingComponent />
      </ViewErrorBoundary>
    );
    fireEvent.click(screen.getByTestId("copy-error-btn"));
    expect(writeText).toHaveBeenCalled();
    expect(writeText.mock.calls[0][0]).toContain("Test crash");
  });

  it("View crash: preserved state (chainId, filter) survives crash", () => {
    render(
      <ViewErrorBoundary
        viewName="Railway Pipeline"
        preservedChainId="c1"
        preservedFilter="errOnly"
      >
        <CrashingComponent />
      </ViewErrorBoundary>
    );
    const fallback = screen.getByTestId("error-boundary-fallback");
    expect(fallback.dataset["preservedChain"]).toBe("c1");
    expect(fallback.dataset["preservedFilter"]).toBe("errOnly");
  });

  it("View crash: auto-retry on data source event re-renders view", () => {
    const onAutoRetry = vi.fn();
    render(
      <ViewErrorBoundary viewName="Railway Pipeline" onAutoRetry={onAutoRetry}>
        <CrashingComponent />
      </ViewErrorBoundary>
    );
    // Simulate data source event
    fireEvent.click(screen.getByTestId("simulate-data-event"));
    expect(onAutoRetry).toHaveBeenCalled();
  });
});

// ── Reconnection Tests ──────────────────────────────────────────────────────

describe("ReconnectionManager", () => {
  beforeEach(() => {
    setupEnv();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Disconnected: reconnection retries at exponential backoff (1s, 2s, 4s, 8s, 16s, 30s cap)", () => {
    const onReconnect = vi.fn();
    render(<ReconnectionManager disconnected={true} onReconnect={onReconnect} />);

    // 1s
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(1);

    // +2s = 3s total
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(2);

    // +4s = 7s total
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(3);

    // +8s = 15s total
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(4);

    // +16s = 31s total
    act(() => {
      vi.advanceTimersByTime(16000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(5);

    // +30s = 61s total (cap at 30s)
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(6);
  });

  it("Disconnected: after 5 min shows permanent 'Connection lost' with manual Reconnect", () => {
    const onReconnect = vi.fn();
    render(<ReconnectionManager disconnected={true} onReconnect={onReconnect} />);

    // Advance past 5 minutes
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    expect(screen.getByTestId("permanent-disconnect")).toBeDefined();
    expect(screen.getByTestId("permanent-disconnect").textContent).toContain("Connection lost");
    expect(screen.getByTestId("manual-reconnect-btn")).toBeDefined();
  });

  it("Reconnected: full snapshot fetched and all views re-render", () => {
    const onReconnect = vi.fn();
    const onSnapshotFetch = vi.fn();
    const { rerender } = render(
      <ReconnectionManager
        disconnected={true}
        onReconnect={onReconnect}
        onSnapshotFetch={onSnapshotFetch}
      />
    );

    rerender(
      <ReconnectionManager
        disconnected={false}
        onReconnect={onReconnect}
        onSnapshotFetch={onSnapshotFetch}
      />
    );

    expect(onSnapshotFetch).toHaveBeenCalled();
    expect(screen.queryByTestId("permanent-disconnect")).toBeNull();
  });
});
