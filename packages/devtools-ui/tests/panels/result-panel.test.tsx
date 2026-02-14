/**
 * Tests for the top-level ResultPanel (PanelProps-compatible shell).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ResultPanel } from "../../src/panels/result-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import {
  createMockDataSource,
  createWrapper,
  setupTestEnvironment,
  baseResultStats,
} from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("ResultPanel", () => {
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

  it("shows placeholder content for non-overview, non-railway views", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // Switch to Log (still a placeholder)
    fireEvent.click(screen.getByRole("tab", { name: "Log" }));

    expect(screen.getByTestId("result-view-log")).toBeDefined();
  });

  it("shows guidance empty state when stats map has size 0", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(new Map());
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    expect(screen.getByTestId("result-overview-content")).toBeDefined();
    expect(screen.getByText("Awaiting Result data")).toBeDefined();
  });

  it("shows domain-specific placeholder for Railway view when stats are empty", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(new Map());
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    expect(screen.getByText("No Result chain data yet")).toBeDefined();
  });

  it("shows domain-specific placeholder for Log view", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Log" }));

    expect(screen.getByText("No Result operations recorded yet")).toBeDefined();
  });

  it("Railway tab renders RailwayPipelineView when stats exist", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    expect(screen.getByTestId("railway-pipeline-view")).toBeDefined();
    expect(screen.getByTestId("railway-content")).toBeDefined();
  });

  it("Railway tab renders chain summary showing chain count and operation count", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    const summary = screen.getByTestId("chain-summary");
    expect(summary).toBeDefined();
    // Should show the number of chains and ops
    expect(summary.textContent).toContain("chain");
    expect(summary.textContent).toContain("op");
  });

  it("play button auto-advances step counter over time", () => {
    vi.useFakeTimers();
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Step counter starts at 1/N
    const stepCounter = screen.getByTestId("step-counter");
    const initial = stepCounter.textContent;
    expect(initial).toMatch(/^1\//);

    // Click play button
    fireEvent.click(screen.getByTestId("play-button"));

    // Advance timers enough for at least one step advance (200ms per step at 1x)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Step should have advanced — text should no longer start with "1/"
    expect(stepCounter.textContent).not.toMatch(/^1\//);

    vi.useRealTimers();
  });

  it("pause button stops auto-advance", () => {
    vi.useFakeTimers();
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Start playing
    fireEvent.click(screen.getByTestId("play-button"));

    // Advance 1 step
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const stepCounter = screen.getByTestId("step-counter");
    const afterOneStep = stepCounter.textContent;

    // Click pause (play button is now a pause button)
    fireEvent.click(screen.getByTestId("pause-button"));

    // Advance more time — step should NOT change
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(stepCounter.textContent).toBe(afterOneStep);

    vi.useRealTimers();
  });

  it("skip-to-start resets step to 0 and skip-to-end goes to last step", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    const stepCounter = screen.getByTestId("step-counter");

    // Advance a few steps
    fireEvent.click(screen.getByTestId("step-next-button"));
    fireEvent.click(screen.getByTestId("step-next-button"));
    expect(stepCounter.textContent).toMatch(/^3\//);

    // Skip to start
    fireEvent.click(screen.getByTestId("skip-to-start-button"));
    expect(stepCounter.textContent).toMatch(/^1\//);

    // Skip to end
    fireEvent.click(screen.getByTestId("skip-to-end-button"));
    expect(stepCounter.textContent).toMatch(/^3\//);
  });

  it("Log tab renders OperationLogView when execution data exists", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // Emit a result:ok event so the hook builds an execution
    act(() => {
      ds.emit({ type: "result:ok", portName: "Logger", timestamp: 1000 });
    });

    // Switch to Log tab
    fireEvent.click(screen.getByRole("tab", { name: "Log" }));

    // Should render the OperationLogView, NOT the placeholder
    expect(screen.getByTestId("operation-log-view")).toBeDefined();
    expect(screen.getByTestId("log-step-list")).toBeDefined();
    expect(screen.queryByText("No Result operations recorded yet")).toBeNull();
  });

  it("Cases tab renders CaseExplorerView when chain data exists", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    // Provide chain with switch-capable operations so computePaths produces paths
    const chains = new Map([
      [
        "chain:1",
        {
          chainId: "chain:1",
          label: "validateUser",
          portName: undefined,
          operations: [
            {
              index: 0,
              method: "ok" as const,
              label: "ok(42)",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 1,
              method: "andThen" as const,
              label: "validate",
              inputTrack: "ok" as const,
              outputTracks: ["ok", "err"] as const,
              canSwitch: true,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 2,
              method: "match" as const,
              label: "extract",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: true,
              callbackLocation: undefined,
            },
          ],
          isAsync: false,
          sourceLocation: undefined,
        },
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn(() => []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    // Switch to Cases tab
    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));

    // Should render the CaseExplorerView, NOT the placeholder
    expect(screen.getByTestId("case-explorer-view")).toBeDefined();
    expect(screen.queryByText("No case analysis data yet")).toBeNull();
  });

  it("Cases tab computes paths per-chain (not on merged chain) so coverage works with multiple chains", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    // Two independent chains, each with 1 switch point → 2 paths each = 4 total
    // (NOT 2^2=4 cross-chain paths from merging)
    const makeOp = (
      idx: number,
      method: string,
      label: string,
      canSwitch: boolean,
      isTerminal = false
    ) => ({
      index: idx,
      method,
      label,
      inputTrack: canSwitch ? ("ok" as const) : ("both" as const),
      outputTracks: canSwitch ? (["ok", "err"] as const) : (["ok"] as const),
      canSwitch,
      isTerminal,
      callbackLocation: undefined,
    });

    const chains = new Map([
      [
        "chain:A",
        {
          chainId: "chain:A",
          label: "fromNullable",
          portName: undefined,
          operations: [
            makeOp(0, "fromNullable", "fromNullable()", true),
            makeOp(1, "match", "extract", false, true),
          ],
          isAsync: false,
          sourceLocation: undefined,
        },
      ],
      [
        "chain:B",
        {
          chainId: "chain:B",
          label: "tryCatch",
          portName: undefined,
          operations: [
            makeOp(0, "tryCatch", "tryCatch()", true),
            makeOp(1, "match", "extract", false, true),
          ],
          isAsync: false,
          sourceLocation: undefined,
        },
      ],
    ]);

    // Each chain has one execution (both took the ok path)
    const executions = new Map([
      [
        "chain:A",
        [
          {
            executionId: "exec:A",
            chainId: "chain:A",
            entryMethod: "fromNullable" as const,
            entryTrack: "ok" as const,
            entryValue: { data: "Alice", typeName: "string", truncated: false },
            steps: [
              {
                operationIndex: 0,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 0,
                callbackThrew: false,
                timestamp: 1000,
              },
              {
                operationIndex: 1,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 5,
                callbackThrew: false,
                timestamp: 1001,
              },
            ],
            finalTrack: "ok" as const,
            finalValue: { data: "Alice", typeName: "string", truncated: false },
            totalDurationMicros: 5,
            startTimestamp: 1000,
            scopeId: undefined,
          },
        ],
      ],
      [
        "chain:B",
        [
          {
            executionId: "exec:B",
            chainId: "chain:B",
            entryMethod: "tryCatch" as const,
            entryTrack: "ok" as const,
            entryValue: { data: "parsed", typeName: "string", truncated: false },
            steps: [
              {
                operationIndex: 0,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 0,
                callbackThrew: false,
                timestamp: 2000,
              },
              {
                operationIndex: 1,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 5,
                callbackThrew: false,
                timestamp: 2001,
              },
            ],
            finalTrack: "ok" as const,
            finalValue: { data: "parsed", typeName: "string", truncated: false },
            totalDurationMicros: 5,
            startTimestamp: 2000,
            scopeId: undefined,
          },
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));

    // Should have 4 paths (2 per chain), not 4 cross-chain combos from merging
    const header = screen.getByTestId("case-summary-header");
    expect(header.textContent).toContain("4"); // 4 total paths (2+2)

    // 2 observed (one from each chain took the ok path)
    const observedIcons = screen.getAllByTestId("path-observed-icon");
    const observed = observedIcons.filter(i => i.dataset["observed"] === "true");
    expect(observed.length).toBe(2);

    // Coverage should be 50% (2 of 4 paths observed)
    expect(header.textContent).toContain("50%");
  });

  it("Sankey tab renders SankeyStatisticsView when chain data with executions exists", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      [
        "chain:1",
        {
          chainId: "chain:1",
          label: "validateUser",
          portName: "UserPort",
          operations: [
            {
              index: 0,
              method: "ok" as const,
              label: "ok(42)",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 1,
              method: "andThen" as const,
              label: "validate",
              inputTrack: "ok" as const,
              outputTracks: ["ok", "err"] as const,
              canSwitch: true,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 2,
              method: "match" as const,
              label: "extract",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: true,
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
            entryMethod: "ok" as const,
            entryTrack: "ok" as const,
            entryValue: { data: 42, typeName: "number", truncated: false },
            steps: [
              {
                operationIndex: 0,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 0,
                callbackThrew: false,
                timestamp: 1000,
              },
              {
                operationIndex: 1,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 5,
                callbackThrew: false,
                timestamp: 1001,
              },
              {
                operationIndex: 2,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 5,
                callbackThrew: false,
                timestamp: 1002,
              },
            ],
            finalTrack: "ok" as const,
            finalValue: { data: "valid", typeName: "string", truncated: false },
            totalDurationMicros: 10,
            startTimestamp: 1000,
            scopeId: undefined,
          },
          {
            executionId: "exec:2",
            chainId: "chain:1",
            entryMethod: "ok" as const,
            entryTrack: "ok" as const,
            entryValue: { data: 99, typeName: "number", truncated: false },
            steps: [
              {
                operationIndex: 0,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 0,
                callbackThrew: false,
                timestamp: 2000,
              },
              {
                operationIndex: 1,
                inputTrack: "ok" as const,
                outputTrack: "err" as const,
                switched: true,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 5,
                callbackThrew: false,
                timestamp: 2001,
              },
              {
                operationIndex: 2,
                inputTrack: "err" as const,
                outputTrack: "err" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 5,
                callbackThrew: false,
                timestamp: 2002,
              },
            ],
            finalTrack: "err" as const,
            finalValue: { data: "error", typeName: "string", truncated: false },
            totalDurationMicros: 10,
            startTimestamp: 2000,
            scopeId: undefined,
          },
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Sankey" }));

    // Should render the SankeyStatisticsView, NOT the placeholder
    expect(screen.getByTestId("sankey-statistics-view")).toBeDefined();
    expect(screen.queryByText("No flow data yet")).toBeNull();

    // Should have columns for the 3 operations
    const columns = screen.getAllByTestId("sankey-column");
    expect(columns).toHaveLength(3);

    // Should have links derived from executions
    const links = screen.getAllByTestId("sankey-link");
    expect(links.length).toBeGreaterThan(0);
  });

  it("Waterfall tab renders AsyncWaterfallView when async chain data with executions exists", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      [
        "chain:async",
        {
          chainId: "chain:async",
          label: "fetchAndProcess",
          portName: "ApiPort",
          operations: [
            {
              index: 0,
              method: "fromPromise" as const,
              label: "fetch",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 1,
              method: "andThen" as const,
              label: "parse",
              inputTrack: "ok" as const,
              outputTracks: ["ok", "err"] as const,
              canSwitch: true,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 2,
              method: "match" as const,
              label: "extract",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: true,
              callbackLocation: undefined,
            },
          ],
          isAsync: true,
          sourceLocation: undefined,
        },
      ],
    ]);

    const executions = new Map([
      [
        "chain:async",
        [
          {
            executionId: "exec:w1",
            chainId: "chain:async",
            entryMethod: "fromPromise" as const,
            entryTrack: "ok" as const,
            entryValue: undefined,
            steps: [
              {
                operationIndex: 0,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 145_000,
                callbackThrew: false,
                timestamp: 0,
              },
              {
                operationIndex: 1,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 42_000,
                callbackThrew: false,
                timestamp: 145_000,
              },
              {
                operationIndex: 2,
                inputTrack: "ok" as const,
                outputTrack: "ok" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 1_000,
                callbackThrew: false,
                timestamp: 187_000,
              },
            ],
            finalTrack: "ok" as const,
            finalValue: undefined,
            totalDurationMicros: 188_000,
            startTimestamp: 1000,
            scopeId: undefined,
          },
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Waterfall" }));

    // Should render the AsyncWaterfallView, NOT the placeholder
    expect(screen.getByTestId("async-waterfall-view")).toBeDefined();
    expect(screen.queryByText("No async timing data yet")).toBeNull();

    // Should have waterfall bars for the 3 operations
    const bars = screen.getAllByTestId("waterfall-bar");
    expect(bars).toHaveLength(3);

    // Should have a summary
    expect(screen.getByTestId("waterfall-summary")).toBeDefined();
  });

  it("Combinator tab renders CombinatorMatrixView when chain has combinator operations with executions", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      [
        "chain:comb",
        {
          chainId: "chain:comb",
          label: "fetchAllData",
          portName: "ApiPort",
          operations: [
            {
              index: 0,
              method: "all" as const,
              label: "fetchAll",
              inputTrack: "both" as const,
              outputTracks: ["ok", "err"] as const,
              canSwitch: false,
              isTerminal: false,
              callbackLocation: undefined,
            },
            {
              index: 1,
              method: "match" as const,
              label: "extract",
              inputTrack: "both" as const,
              outputTracks: ["ok"] as const,
              canSwitch: false,
              isTerminal: true,
              callbackLocation: undefined,
            },
          ],
          isAsync: true,
          sourceLocation: undefined,
        },
      ],
    ]);

    const executions = new Map([
      [
        "chain:comb",
        [
          {
            executionId: "exec:c1",
            chainId: "chain:comb",
            entryMethod: "all" as const,
            entryTrack: "ok" as const,
            entryValue: undefined,
            steps: [
              {
                operationIndex: 0,
                inputTrack: "ok" as const,
                outputTrack: "err" as const,
                switched: true,
                inputValue: {
                  data: [
                    { index: 0, sourceLabel: "fetchUser", track: "ok", valuePreview: "{ id: 1 }" },
                    { index: 1, sourceLabel: "fetchPosts", track: "ok", valuePreview: "[...3]" },
                    { index: 2, sourceLabel: "fetchTags", track: "err", valuePreview: "Timeout" },
                  ],
                  typeName: "CombinatorInputs",
                  truncated: false,
                },
                outputValue: { data: "Timeout", typeName: "Error", truncated: false },
                durationMicros: 200_000,
                callbackThrew: false,
                timestamp: 0,
              },
              {
                operationIndex: 1,
                inputTrack: "err" as const,
                outputTrack: "err" as const,
                switched: false,
                inputValue: undefined,
                outputValue: undefined,
                durationMicros: 1_000,
                callbackThrew: false,
                timestamp: 200_000,
              },
            ],
            finalTrack: "err" as const,
            finalValue: { data: "Timeout", typeName: "Error", truncated: false },
            totalDurationMicros: 201_000,
            startTimestamp: 1000,
            scopeId: undefined,
          },
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Combinator" }));

    // Should render CombinatorMatrixView with data, NOT the placeholder
    expect(screen.getByTestId("combinator-matrix-view")).toBeDefined();
    expect(screen.queryByText("No combinator operations recorded yet")).toBeNull();

    // Should have input cells derived from execution data
    const inputs = screen.getAllByTestId("combinator-input-cell");
    expect(inputs).toHaveLength(3);
  });

  it("Combinator tab shows a list of ALL combinator chains, not just the first", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeCombinatorChain = (id: string, method: string) => ({
      chainId: id,
      label: `${method}()`,
      portName: undefined,
      operations: [
        {
          index: 0,
          method,
          label: `${method}()`,
          inputTrack: "both" as const,
          outputTracks: ["ok", "err"] as const,
          canSwitch: true,
          isTerminal: false,
          callbackLocation: undefined,
        },
      ],
      isAsync: false,
      sourceLocation: undefined,
    });

    const makeCombinatorExec = (
      id: string,
      chainId: string,
      track: "ok" | "err",
      inputs: Array<{ index: number; track: string; sourceLabel: string }>
    ) => ({
      executionId: id,
      chainId,
      entryMethod: "all" as const,
      entryTrack: "ok" as const,
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok" as const,
          outputTrack: track,
          switched: track === "err",
          inputValue: { data: inputs, typeName: "Array", truncated: false },
          outputValue: {
            data: track === "ok" ? [1, 2] : "error",
            typeName: "String",
            truncated: false,
          },
          durationMicros: 100,
          callbackThrew: false,
          timestamp: 0,
        },
      ],
      finalTrack: track,
      finalValue: { data: track === "ok" ? [1, 2] : "error", typeName: "String", truncated: false },
      totalDurationMicros: 100,
      startTimestamp: 1000,
      scopeId: undefined,
    });

    const chains = new Map([
      ["chain:1", makeCombinatorChain("chain:1", "all")],
      ["chain:2", makeCombinatorChain("chain:2", "allSettled")],
      ["chain:3", makeCombinatorChain("chain:3", "collect")],
    ]);

    const executions = new Map([
      [
        "chain:1",
        [
          makeCombinatorExec("exec:1", "chain:1", "ok", [
            { index: 0, track: "ok", sourceLabel: "input-0" },
            { index: 1, track: "ok", sourceLabel: "input-1" },
          ]),
        ],
      ],
      [
        "chain:2",
        [
          makeCombinatorExec("exec:2", "chain:2", "err", [
            { index: 0, track: "ok", sourceLabel: "input-0" },
            { index: 1, track: "err", sourceLabel: "input-1" },
          ]),
        ],
      ],
      [
        "chain:3",
        [
          makeCombinatorExec("exec:3", "chain:3", "ok", [
            { index: 0, track: "ok", sourceLabel: "name" },
            { index: 1, track: "ok", sourceLabel: "email" },
          ]),
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Combinator" }));

    // Should render a list of ALL 3 combinator chains
    const chainItems = screen.getAllByTestId("combinator-chain-item");
    expect(chainItems).toHaveLength(3);

    // Each item should show its method name
    expect(chainItems[0].textContent).toContain("all");
    expect(chainItems[1].textContent).toContain("allSettled");
    expect(chainItems[2].textContent).toContain("collect");
  });

  it("Combinator tab: clicking a chain item selects it and shows its detail", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeCombinatorChain = (id: string, method: string) => ({
      chainId: id,
      label: `${method}()`,
      portName: undefined,
      operations: [
        {
          index: 0,
          method,
          label: `${method}()`,
          inputTrack: "both" as const,
          outputTracks: ["ok", "err"] as const,
          canSwitch: true,
          isTerminal: false,
          callbackLocation: undefined,
        },
      ],
      isAsync: false,
      sourceLocation: undefined,
    });

    const makeCombinatorExec = (
      id: string,
      chainId: string,
      track: "ok" | "err",
      inputs: Array<{ index: number; track: string; sourceLabel: string }>
    ) => ({
      executionId: id,
      chainId,
      entryMethod: "all" as const,
      entryTrack: "ok" as const,
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok" as const,
          outputTrack: track,
          switched: track === "err",
          inputValue: { data: inputs, typeName: "Array", truncated: false },
          outputValue: {
            data: track === "ok" ? [1, 2] : "error",
            typeName: "String",
            truncated: false,
          },
          durationMicros: 100,
          callbackThrew: false,
          timestamp: 0,
        },
      ],
      finalTrack: track,
      finalValue: { data: track === "ok" ? [1, 2] : "error", typeName: "String", truncated: false },
      totalDurationMicros: 100,
      startTimestamp: 1000,
      scopeId: undefined,
    });

    const chains = new Map([
      ["chain:1", makeCombinatorChain("chain:1", "all")],
      ["chain:2", makeCombinatorChain("chain:2", "any")],
    ]);

    const executions = new Map([
      [
        "chain:1",
        [
          makeCombinatorExec("exec:1", "chain:1", "ok", [
            { index: 0, track: "ok", sourceLabel: "input-0" },
            { index: 1, track: "ok", sourceLabel: "input-1" },
          ]),
        ],
      ],
      [
        "chain:2",
        [
          makeCombinatorExec("exec:2", "chain:2", "err", [
            { index: 0, track: "err", sourceLabel: "cache" },
            { index: 1, track: "err", sourceLabel: "env" },
            { index: 2, track: "err", sourceLabel: "default" },
          ]),
        ],
      ],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Combinator" }));

    // Default: first chain selected — 2 inputs
    const inputCells = screen.getAllByTestId("combinator-input-cell");
    expect(inputCells).toHaveLength(2);

    // Click the second chain item (any with 3 inputs)
    const chainItems = screen.getAllByTestId("combinator-chain-item");
    fireEvent.click(chainItems[1]);

    // Now should show 3 inputs from the "any" chain
    const updatedInputCells = screen.getAllByTestId("combinator-input-cell");
    expect(updatedInputCells).toHaveLength(3);
  });

  it("Combinator tab: method filter badges filter the chain list", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeCombinatorChain = (id: string, method: string) => ({
      chainId: id,
      label: `${method}()`,
      portName: undefined,
      operations: [
        {
          index: 0,
          method,
          label: `${method}()`,
          inputTrack: "both" as const,
          outputTracks: ["ok", "err"] as const,
          canSwitch: true,
          isTerminal: false,
          callbackLocation: undefined,
        },
      ],
      isAsync: false,
      sourceLocation: undefined,
    });

    const makeExec = (id: string, chainId: string) => ({
      executionId: id,
      chainId,
      entryMethod: "all" as const,
      entryTrack: "ok" as const,
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok" as const,
          outputTrack: "ok" as const,
          switched: false,
          inputValue: {
            data: [{ index: 0, track: "ok", sourceLabel: "a" }],
            typeName: "Array",
            truncated: false,
          },
          outputValue: { data: 1, typeName: "Number", truncated: false },
          durationMicros: 100,
          callbackThrew: false,
          timestamp: 0,
        },
      ],
      finalTrack: "ok" as const,
      finalValue: { data: 1, typeName: "Number", truncated: false },
      totalDurationMicros: 100,
      startTimestamp: 1000,
      scopeId: undefined,
    });

    const chains = new Map([
      ["chain:1", makeCombinatorChain("chain:1", "all")],
      ["chain:2", makeCombinatorChain("chain:2", "all")],
      ["chain:3", makeCombinatorChain("chain:3", "any")],
      ["chain:4", makeCombinatorChain("chain:4", "collect")],
    ]);

    const executions = new Map([
      ["chain:1", [makeExec("exec:1", "chain:1")]],
      ["chain:2", [makeExec("exec:2", "chain:2")]],
      ["chain:3", [makeExec("exec:3", "chain:3")]],
      ["chain:4", [makeExec("exec:4", "chain:4")]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Combinator" }));

    // All 4 chains visible
    expect(screen.getAllByTestId("combinator-chain-item")).toHaveLength(4);

    // Click the "all" filter badge
    const filterBadges = screen.getAllByTestId("combinator-method-filter");
    const allBadge = filterBadges.find(b => b.textContent?.includes("all"));
    expect(allBadge).toBeDefined();
    fireEvent.click(allBadge!);

    // Now only the 2 "all" chains should be visible
    expect(screen.getAllByTestId("combinator-chain-item")).toHaveLength(2);

    // Click again to deselect (show all)
    fireEvent.click(allBadge!);
    expect(screen.getAllByTestId("combinator-chain-item")).toHaveLength(4);
  });

  it("Combinator tab: aggregate stats header shows total calls, ok/err breakdown", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeCombinatorChain = (id: string, method: string) => ({
      chainId: id,
      label: `${method}()`,
      portName: undefined,
      operations: [
        {
          index: 0,
          method,
          label: `${method}()`,
          inputTrack: "both" as const,
          outputTracks: ["ok", "err"] as const,
          canSwitch: true,
          isTerminal: false,
          callbackLocation: undefined,
        },
      ],
      isAsync: false,
      sourceLocation: undefined,
    });

    const makeExec = (id: string, chainId: string, track: "ok" | "err") => ({
      executionId: id,
      chainId,
      entryMethod: "all" as const,
      entryTrack: "ok" as const,
      entryValue: undefined,
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok" as const,
          outputTrack: track,
          switched: track === "err",
          inputValue: {
            data: [{ index: 0, track: "ok", sourceLabel: "a" }],
            typeName: "Array",
            truncated: false,
          },
          outputValue: { data: 1, typeName: "Number", truncated: false },
          durationMicros: 100,
          callbackThrew: false,
          timestamp: 0,
        },
      ],
      finalTrack: track,
      finalValue: { data: 1, typeName: "Number", truncated: false },
      totalDurationMicros: 100,
      startTimestamp: 1000,
      scopeId: undefined,
    });

    const chains = new Map([
      ["chain:1", makeCombinatorChain("chain:1", "all")],
      ["chain:2", makeCombinatorChain("chain:2", "all")],
      ["chain:3", makeCombinatorChain("chain:3", "any")],
    ]);

    const executions = new Map([
      ["chain:1", [makeExec("exec:1", "chain:1", "ok")]],
      ["chain:2", [makeExec("exec:2", "chain:2", "err")]],
      ["chain:3", [makeExec("exec:3", "chain:3", "ok")]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Combinator" }));

    // Aggregate stats header should show total, ok, err counts
    const statsHeader = screen.getByTestId("combinator-stats-header");
    expect(statsHeader.textContent).toContain("3"); // total calls
    expect(statsHeader.textContent).toContain("2"); // 2 ok
    expect(statsHeader.textContent).toContain("1"); // 1 err
  });

  it("step-next button advances the pipeline node to active state", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Initially step counter shows 1/N
    const stepCounter = screen.getByTestId("step-counter");
    expect(stepCounter.textContent).toContain("1/");

    // Click step-next — should advance to step 2 and set status to paused
    fireEvent.click(screen.getByTestId("step-next-button"));

    // Step counter should now show 2/N
    expect(stepCounter.textContent).toContain("2/");

    // The pipeline node at index 1 should now be "active"
    const nodes = screen.getAllByTestId("railway-node");
    expect(nodes[1].dataset["state"]).toBe("active");
  });
});
