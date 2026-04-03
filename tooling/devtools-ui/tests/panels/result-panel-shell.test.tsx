/**
 * Tests for the top-level ResultPanel (PanelProps-compatible shell).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ResultPanel } from "../../src/panels/result-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("ResultPanel - Shell", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it("renders with PanelProps and shows role=region root", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("result-panel-shell")).toBeDefined();
    expect(screen.getByRole("region")).toBeDefined();
  });

  it("renders 7 view tabs in the view switcher", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);

    const labels = tabs.map(t => t.textContent);
    expect(labels).toContain("Overview");
    expect(labels).toContain("Railway");
    expect(labels).toContain("Log");
    expect(labels).toContain("Cases");
    expect(labels).toContain("Sankey");
    expect(labels).toContain("Waterfall");
    expect(labels).toContain("Combinator");
  });

  it("defaults to overview view", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    expect(overviewTab.getAttribute("aria-selected")).toBe("true");
  });

  it("shows Overview Dashboard when statistics data is available", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("result-overview-content")).toBeDefined();
    // Should display stat cards derived from ResultStatistics
    expect(screen.getByText("Total Calls")).toBeDefined();
    expect(screen.getByText("Ok Rate")).toBeDefined();
  });

  it("shows empty state when getAllResultStatistics returns undefined and no chains", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByText("No Result data")).toBeDefined();
  });

  it("shows chain-based overview when stats are undefined but chain data exists", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    // Provide real chain data
    const chains = new Map([
      [
        "chain:1",
        {
          chainId: "chain:1",
          label: "fromNullable",
          portName: undefined,
          operations: [
            {
              index: 0,
              method: "fromNullable" as const,
              label: "fromNullable()",
              inputTrack: "both" as const,
              outputTracks: ["ok", "err"] as const,
              canSwitch: true,
              isTerminal: false,
              callbackLocation: undefined,
            },
          ],
          isAsync: false,
          sourceLocation: undefined,
        },
      ],
    ]);

    const executions = new Map([
      [
        "chain:1",
        [
          {
            executionId: "exec:1",
            chainId: "chain:1",
            entryMethod: "fromNullable" as const,
            entryTrack: "ok" as const,
            entryValue: { data: "Alice", typeName: "String", truncated: false },
            steps: [],
            finalTrack: "ok" as const,
            finalValue: { data: "Alice", typeName: "String", truncated: false },
            totalDurationMicros: 100,
            startTimestamp: Date.now(),
            scopeId: undefined,
          },
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId));

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // Should NOT show the empty state
    expect(screen.queryByText("No Result data")).toBeNull();

    // Should show the chain-based overview with stat cards
    expect(screen.getByTestId("result-overview-content")).toBeDefined();
    expect(screen.getByText("Total Executions")).toBeDefined();
    expect(screen.getByText("Ok Rate")).toBeDefined();
    expect(screen.getByText("Chains")).toBeDefined();
  });

  it("switches views when clicking a tab", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // Click Railway tab
    const railwayTab = screen.getByRole("tab", { name: "Railway" });
    fireEvent.click(railwayTab);

    expect(railwayTab.getAttribute("aria-selected")).toBe("true");
    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    expect(overviewTab.getAttribute("aria-selected")).toBe("false");
  });

  it("works with dark theme", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds, "dark");

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="dark" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("result-panel-shell")).toBeDefined();
  });

  it("error boundary isolates errors", () => {
    const originalError = console.error;
    console.error = vi.fn();
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockImplementation(() => {
      throw new Error("Test crash");
    });
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ErrorBoundary>
          <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    console.error = originalError;
  });
});
