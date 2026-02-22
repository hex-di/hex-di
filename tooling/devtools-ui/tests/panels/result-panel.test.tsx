/**
 * Tests for the top-level ResultPanel (PanelProps-compatible shell).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ResultPanel } from "../../src/panels/result-panel.js";
import { ErrorBoundary } from "../../src/components/error-boundary.js";
import type { ResultChainDescriptor } from "../../src/panels/result/types.js";
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

  it("Railway tab renders chain list when stats-based chains exist", () => {
    const ds = createMockDataSource();
    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Stats-based synthesis produces chains from baseResultStats (Logger port)
    expect(screen.getByTestId("railway-content")).toBeDefined();
    expect(screen.getByTestId("railway-chain-list")).toBeDefined();
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

  it("Railway tab shows chain list with one row per chain, not flat merged timeline", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string, label: string, canSwitch: boolean, isTerminal = false) => ({
      index: idx,
      method,
      label,
      inputTrack: canSwitch ? "ok" as const : "both" as const,
      outputTracks: canSwitch ? ["ok", "err"] as const : ["ok"] as const,
      canSwitch,
      isTerminal,
      callbackLocation: undefined,
    });

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A",
        label: "validateName",
        portName: undefined,
        operations: [
          makeOp(0, "ok", "ok()", false),
          makeOp(1, "andThen", "validate", true),
          makeOp(2, "map", "trim", false),
        ],
        isAsync: false,
        sourceLocation: undefined,
      }],
      ["chain:B", {
        chainId: "chain:B",
        label: "validateEmail",
        portName: undefined,
        operations: [
          makeOp(0, "ok", "ok()", false),
          makeOp(1, "andThen", "checkFormat", true),
        ],
        isAsync: false,
        sourceLocation: undefined,
      }],
      ["chain:C", {
        chainId: "chain:C",
        label: "fetchUser",
        portName: undefined,
        operations: [
          makeOp(0, "ok", "ok()", false),
          makeOp(1, "andThen", "fetch", true),
          makeOp(2, "match", "extract", false, true),
        ],
        isAsync: true,
        sourceLocation: undefined,
      }],
    ]);

    const makeExec = (execId: string, chainId: string, opCount: number, finalTrack: "ok" | "err", durationMicros: number) => ({
      executionId: execId,
      chainId,
      entryMethod: "ok" as const,
      entryTrack: "ok" as const,
      entryValue: undefined,
      steps: Array.from({ length: opCount }, (_, i) => ({
        operationIndex: i,
        inputTrack: "ok" as const,
        outputTrack: (i === opCount - 1 ? finalTrack : "ok") as "ok" | "err",
        switched: i === opCount - 1 && finalTrack === "err",
        inputValue: undefined,
        outputValue: undefined,
        durationMicros: Math.round(durationMicros / opCount),
        callbackThrew: false,
        timestamp: i * 100,
      })),
      finalTrack,
      finalValue: undefined,
      totalDurationMicros: durationMicros,
      startTimestamp: 1000,
      scopeId: undefined,
    });

    const executions = new Map([
      ["chain:A", [makeExec("exec:A", "chain:A", 3, "ok", 50)]],
      ["chain:B", [makeExec("exec:B", "chain:B", 2, "err", 120)]],
      ["chain:C", [makeExec("exec:C", "chain:C", 3, "ok", 5000)]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);

    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Should render a chain list, not the flat merged pipeline
    expect(screen.getByTestId("railway-chain-list")).toBeDefined();

    // Should have 3 chain rows — one per chain
    const rows = screen.getAllByTestId("railway-chain-row");
    expect(rows).toHaveLength(3);
  });

  it("Railway chain rows show chain label, op count, duration, and outcome", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string) => ({
      index: idx,
      method,
      label: method,
      inputTrack: "ok" as const,
      outputTracks: ["ok"] as const,
      canSwitch: false,
      isTerminal: false,
      callbackLocation: undefined,
    });

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A",
        label: "validateName",
        portName: undefined,
        operations: [makeOp(0, "ok"), makeOp(1, "andThen"), makeOp(2, "map")],
        isAsync: false,
        sourceLocation: undefined,
      }],
      ["chain:B", {
        chainId: "chain:B",
        label: "fetchUser",
        portName: undefined,
        operations: [makeOp(0, "ok"), makeOp(1, "andThen")],
        isAsync: true,
        sourceLocation: undefined,
      }],
    ]);

    const makeExec = (execId: string, chainId: string, opCount: number, finalTrack: "ok" | "err", durationMicros: number) => ({
      executionId: execId,
      chainId,
      entryMethod: "ok" as const,
      entryTrack: "ok" as const,
      entryValue: undefined,
      steps: Array.from({ length: opCount }, (_, i) => ({
        operationIndex: i,
        inputTrack: "ok" as const,
        outputTrack: (i === opCount - 1 ? finalTrack : "ok") as "ok" | "err",
        switched: false,
        inputValue: undefined,
        outputValue: undefined,
        durationMicros: Math.round(durationMicros / opCount),
        callbackThrew: false,
        timestamp: i * 100,
      })),
      finalTrack,
      finalValue: undefined,
      totalDurationMicros: durationMicros,
      startTimestamp: 1000,
      scopeId: undefined,
    });

    const executions = new Map([
      ["chain:A", [makeExec("exec:A", "chain:A", 3, "ok", 50)]],
      ["chain:B", [makeExec("exec:B", "chain:B", 2, "err", 5000)]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    const rows = screen.getAllByTestId("railway-chain-row");
    expect(rows).toHaveLength(2);

    // Error chains sort first: row[0] = fetchUser (err), row[1] = validateName (ok)
    const errRow = rows[0];
    expect(errRow.querySelector("[data-testid='railway-chain-label']")?.textContent).toBe("fetchUser");
    expect(errRow.querySelector("[data-testid='railway-chain-ops']")?.textContent).toContain("2");
    expect(errRow.querySelector("[data-testid='railway-chain-outcome']")?.textContent).toBe("\u2717");
    expect(errRow.querySelector("[data-testid='railway-chain-duration']")?.textContent).toBe("5.0ms");

    const okRow = rows[1];
    expect(okRow.querySelector("[data-testid='railway-chain-label']")?.textContent).toBe("validateName");
    expect(okRow.querySelector("[data-testid='railway-chain-ops']")?.textContent).toContain("3");
    expect(okRow.querySelector("[data-testid='railway-chain-outcome']")?.textContent).toBe("\u2713");
  });

  it("Railway shows aggregate stats header with chain count and ok/err breakdown", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string) => ({
      index: idx,
      method,
      label: method,
      inputTrack: "ok" as const,
      outputTracks: ["ok"] as const,
      canSwitch: false,
      isTerminal: false,
      callbackLocation: undefined,
    });

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "a", portName: undefined,
        operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined,
      }],
      ["chain:B", {
        chainId: "chain:B", label: "b", portName: undefined,
        operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined,
      }],
      ["chain:C", {
        chainId: "chain:C", label: "c", portName: undefined,
        operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const makeExec = (chainId: string, finalTrack: "ok" | "err") => ({
      executionId: `exec:${chainId}`, chainId,
      entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: [{ operationIndex: 0, inputTrack: "ok" as const, outputTrack: finalTrack, switched: false,
        inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 0 }],
      finalTrack, finalValue: undefined, totalDurationMicros: 10, startTimestamp: 1000, scopeId: undefined,
    });

    const executions = new Map([
      ["chain:A", [makeExec("chain:A", "ok")]],
      ["chain:B", [makeExec("chain:B", "err")]],
      ["chain:C", [makeExec("chain:C", "ok")]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    const statsHeader = screen.getByTestId("railway-stats-header");
    expect(statsHeader.textContent).toContain("3 chains");
    expect(statsHeader.textContent).toContain("2 ok");
    expect(statsHeader.textContent).toContain("1 err");
  });

  it("Railway sorts error chains to the top", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string) => ({
      index: idx, method, label: method,
      inputTrack: "ok" as const, outputTracks: ["ok"] as const,
      canSwitch: false, isTerminal: false, callbackLocation: undefined,
    });

    // Insert chains in order: A (ok), B (ok), C (err), D (ok)
    const chains = new Map([
      ["chain:A", { chainId: "chain:A", label: "alpha", portName: undefined, operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined }],
      ["chain:B", { chainId: "chain:B", label: "beta", portName: undefined, operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined }],
      ["chain:C", { chainId: "chain:C", label: "gamma", portName: undefined, operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined }],
      ["chain:D", { chainId: "chain:D", label: "delta", portName: undefined, operations: [makeOp(0, "ok")], isAsync: false, sourceLocation: undefined }],
    ]);

    const makeExec = (chainId: string, finalTrack: "ok" | "err") => ({
      executionId: `exec:${chainId}`, chainId,
      entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: [{ operationIndex: 0, inputTrack: "ok" as const, outputTrack: finalTrack, switched: false,
        inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 0 }],
      finalTrack, finalValue: undefined, totalDurationMicros: 10, startTimestamp: 1000, scopeId: undefined,
    });

    const executions = new Map([
      ["chain:A", [makeExec("chain:A", "ok")]],
      ["chain:B", [makeExec("chain:B", "ok")]],
      ["chain:C", [makeExec("chain:C", "err")]],  // Only error chain
      ["chain:D", [makeExec("chain:D", "ok")]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    const labels = screen.getAllByTestId("railway-chain-label").map(el => el.textContent);
    // Error chain "gamma" should be first
    expect(labels[0]).toBe("gamma");
  });

  it("Clicking a chain row expands it to show inline operations", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "validate", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok(input)", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "andThen", label: "checkFormat", inputTrack: "ok" as const, outputTracks: ["ok", "err"] as const, canSwitch: true, isTerminal: false, callbackLocation: undefined },
          { index: 2, method: "map", label: "trim", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 5, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 20, callbackThrew: false, timestamp: 100 },
          { operationIndex: 2, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 3, callbackThrew: false, timestamp: 200 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 28, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Initially no expanded detail
    expect(screen.queryByTestId("railway-chain-detail")).toBeNull();

    // Click the chain row
    fireEvent.click(screen.getByTestId("railway-chain-row"));

    // Should now show expanded detail with operation steps
    const detail = screen.getByTestId("railway-chain-detail");
    expect(detail).toBeDefined();

    // Should show 3 operation rows
    const opRows = detail.querySelectorAll("[data-testid='railway-op-row']");
    expect(opRows).toHaveLength(3);

    // Each op row shows the method and label
    expect(opRows[0].textContent).toContain("ok");
    expect(opRows[1].textContent).toContain("andThen");
    expect(opRows[2].textContent).toContain("map");
  });

  it("Hide constructors toggle removes ok/err/fromThrowable badges from method sequence", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "andThen", label: "validate", inputTrack: "ok" as const, outputTracks: ["ok", "err"] as const, canSwitch: true, isTerminal: false, callbackLocation: undefined },
          { index: 2, method: "map", label: "transform", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 1, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 100 },
          { operationIndex: 2, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 2, callbackThrew: false, timestamp: 200 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 13, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Before toggle: 3 method badges (ok, andThen, map)
    const badgesBefore = screen.getAllByTestId("railway-method-badge").map(b => b.textContent);
    expect(badgesBefore).toHaveLength(3);
    expect(badgesBefore).toContain("ok");

    // Click the hide-constructors toggle
    fireEvent.click(screen.getByTestId("railway-hide-constructors"));

    // After toggle: constructor "ok" should be hidden, leaving 2 badges
    const badgesAfter = screen.getAllByTestId("railway-method-badge").map(b => b.textContent);
    expect(badgesAfter).toHaveLength(2);
    expect(badgesAfter).not.toContain("ok");
    expect(badgesAfter).toContain("andThen");
    expect(badgesAfter).toContain("map");
  });

  it("Expanded op rows show output value preview when outputValue exists", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok(42)", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "andThen", label: "validate", inputTrack: "ok" as const, outputTracks: ["ok", "err"] as const, canSwitch: true, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: undefined,
            outputValue: { data: 42, typeName: "number", truncated: false },
            durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: undefined,
            outputValue: { data: "valid-user", typeName: "string", truncated: false },
            durationMicros: 15, callbackThrew: false, timestamp: 100 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 15, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    fireEvent.click(screen.getByTestId("railway-chain-row"));

    // Expanded op rows should show output value previews
    const outputValues = screen.getAllByTestId("railway-op-output");
    expect(outputValues).toHaveLength(2);
    expect(outputValues[0].textContent).toContain("42");
    expect(outputValues[1].textContent).toContain("valid-user");
  });

  it("Expanded op rows show input value preview when inputValue exists", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok(42)", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "map", label: "double", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: { data: 42, typeName: "number", truncated: false },
            outputValue: { data: 42, typeName: "number", truncated: false },
            durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: { data: 42, typeName: "number", truncated: false },
            outputValue: { data: 84, typeName: "number", truncated: false },
            durationMicros: 5, callbackThrew: false, timestamp: 100 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 5, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    fireEvent.click(screen.getByTestId("railway-chain-row"));

    // Should show input values
    const inputValues = screen.getAllByTestId("railway-op-input");
    expect(inputValues).toHaveLength(2);
    expect(inputValues[1].textContent).toContain("42");

    // Output should show the transformed value
    const outputValues = screen.getAllByTestId("railway-op-output");
    expect(outputValues[1].textContent).toContain("84");
  });

  it("Expanded op rows show warning badge when callbackThrew is true", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "andThen", label: "riskyOp", inputTrack: "ok" as const, outputTracks: ["ok", "err"] as const, canSwitch: true, isTerminal: false, callbackLocation: undefined },
          { index: 2, method: "map", label: "safe", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "err" as const, switched: true,
            inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: true, timestamp: 100 },
          { operationIndex: 2, inputTrack: "err" as const, outputTrack: "err" as const, switched: false,
            inputValue: undefined, outputValue: undefined, durationMicros: 1, callbackThrew: false, timestamp: 200 },
        ],
        finalTrack: "err" as const, finalValue: undefined,
        totalDurationMicros: 11, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    fireEvent.click(screen.getByTestId("railway-chain-row"));

    // Only the second op (andThen) threw — should have exactly 1 threw badge
    const threwBadges = screen.getAllByTestId("railway-op-threw");
    expect(threwBadges).toHaveLength(1);
  });

  it("Expanded op rows show callbackLocation when defined", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "andThen", label: "validate", inputTrack: "ok" as const, outputTracks: ["ok", "err"] as const, canSwitch: true, isTerminal: false, callbackLocation: "src/user.ts:42" },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 100 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 10, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    fireEvent.click(screen.getByTestId("railway-chain-row"));

    // Only the second op has callbackLocation — exactly 1 location element
    const locations = screen.getAllByTestId("railway-op-location");
    expect(locations).toHaveLength(1);
    expect(locations[0].textContent).toContain("src/user.ts:42");
  });

  it("Chain rows show portName and async badge when available", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string) => ({
      index: idx, method, label: method,
      inputTrack: "ok" as const, outputTracks: ["ok"] as const,
      canSwitch: false, isTerminal: false, callbackLocation: undefined,
    });

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "validate", portName: "UserPort",
        operations: [makeOp(0, "ok"), makeOp(1, "map")],
        isAsync: true, sourceLocation: undefined,
      }],
      ["chain:B", {
        chainId: "chain:B", label: "transform", portName: undefined,
        operations: [makeOp(0, "ok")],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const makeExec = (chainId: string) => ({
      executionId: `exec:${chainId}`, chainId,
      entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: [{ operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
        inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 0 }],
      finalTrack: "ok" as const, finalValue: undefined, totalDurationMicros: 10, startTimestamp: 1000, scopeId: undefined,
    });

    const executions = new Map([
      ["chain:A", [makeExec("chain:A")]],
      ["chain:B", [makeExec("chain:B")]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Chain A has portName and isAsync
    const portBadges = screen.getAllByTestId("railway-chain-port");
    expect(portBadges).toHaveLength(1);
    expect(portBadges[0].textContent).toContain("UserPort");

    const asyncBadges = screen.getAllByTestId("railway-chain-async");
    expect(asyncBadges).toHaveLength(1);
  });

  it("Chain rows show sourceLocation when defined", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "validate", portName: undefined,
        operations: [{ index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined }],
        isAsync: false, sourceLocation: "src/services/user.ts:15",
      }],
      ["chain:B", {
        chainId: "chain:B", label: "transform", portName: undefined,
        operations: [{ index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined }],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const makeExec = (chainId: string) => ({
      executionId: `exec:${chainId}`, chainId,
      entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: [{ operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
        inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 0 }],
      finalTrack: "ok" as const, finalValue: undefined, totalDurationMicros: 10, startTimestamp: 1000, scopeId: undefined,
    });

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) =>
      chainId === "chain:A" ? [makeExec("chain:A")] : [makeExec("chain:B")]
    );

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Only chain A has sourceLocation
    const sourceLocs = screen.getAllByTestId("railway-chain-source");
    expect(sourceLocs).toHaveLength(1);
    expect(sourceLocs[0].textContent).toContain("user.ts:15");
  });

  it("Duration shows 'sync' instead of '<1µs' for zero-duration operations", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "map", label: "transform", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: undefined, outputValue: undefined, durationMicros: 500, callbackThrew: false, timestamp: 100 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 0, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Chain total duration is 0 → should show "sync" not "<1µs"
    const chainDuration = screen.getByTestId("railway-chain-duration");
    expect(chainDuration.textContent).toBe("sync");

    // Expand to check op-level durations
    fireEvent.click(screen.getByTestId("railway-chain-row"));
    const opRows = screen.getAllByTestId("railway-op-row");
    // First op: 0 µs → "sync"
    expect(opRows[0].textContent).toContain("sync");
    // Second op: 500 µs → "500µs"
    expect(opRows[1].textContent).toContain("500\u00B5s");
  });

  it("Chain rows show track switch count when switches occurred", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string) => ({
      index: idx, method, label: method,
      inputTrack: "ok" as const, outputTracks: ["ok", "err"] as const,
      canSwitch: true, isTerminal: false, callbackLocation: undefined,
    });

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "switchPipeline", portName: undefined,
        operations: [makeOp(0, "ok"), makeOp(1, "andThen"), makeOp(2, "orElse"), makeOp(3, "map")],
        isAsync: false, sourceLocation: undefined,
      }],
      ["chain:B", {
        chainId: "chain:B", label: "noSwitch", portName: undefined,
        operations: [makeOp(0, "ok"), makeOp(1, "map")],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "err" as const, switched: true, inputValue: undefined, outputValue: undefined, durationMicros: 10, callbackThrew: false, timestamp: 100 },
          { operationIndex: 2, inputTrack: "err" as const, outputTrack: "ok" as const, switched: true, inputValue: undefined, outputValue: undefined, durationMicros: 5, callbackThrew: false, timestamp: 200 },
          { operationIndex: 3, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 2, callbackThrew: false, timestamp: 300 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 17, startTimestamp: 1000, scopeId: undefined,
      }]],
      ["chain:B", [{
        executionId: "exec:B", chainId: "chain:B",
        entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 3, callbackThrew: false, timestamp: 100 },
        ],
        finalTrack: "ok" as const, finalValue: undefined,
        totalDurationMicros: 3, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Only chain A has switches (2 switches) — chain B has 0 and should NOT show badge
    const switchBadges = screen.getAllByTestId("railway-chain-switches");
    expect(switchBadges).toHaveLength(1);
    expect(switchBadges[0].textContent).toContain("2");
  });

  it("Hide-constructors toggle hides entire single-op constructor chains from the list", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const makeOp = (idx: number, method: string) => ({
      index: idx, method, label: `${method}()`,
      inputTrack: "ok" as const, outputTracks: ["ok"] as const,
      canSwitch: false, isTerminal: false, callbackLocation: undefined,
    });

    // 4 chains: 2 are single-op constructor chains (ok, err), 2 are real pipelines
    const chains = new Map([
      ["chain:ok-only", {
        chainId: "chain:ok-only", label: "ok-only", portName: undefined,
        operations: [makeOp(0, "ok")],
        isAsync: false, sourceLocation: undefined,
      }],
      ["chain:err-only", {
        chainId: "chain:err-only", label: "err-only", portName: undefined,
        operations: [makeOp(0, "err")],
        isAsync: false, sourceLocation: undefined,
      }],
      ["chain:real-A", {
        chainId: "chain:real-A", label: "realA", portName: undefined,
        operations: [makeOp(0, "ok"), makeOp(1, "andThen"), makeOp(2, "map")],
        isAsync: false, sourceLocation: undefined,
      }],
      ["chain:real-B", {
        chainId: "chain:real-B", label: "realB", portName: undefined,
        operations: [makeOp(0, "fromThrowable"), makeOp(1, "match")],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const makeExec = (chainId: string, opCount: number) => ({
      executionId: `exec:${chainId}`, chainId,
      entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: Array.from({ length: opCount }, (_, i) => ({
        operationIndex: i, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
        inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: i,
      })),
      finalTrack: "ok" as const, finalValue: undefined, totalDurationMicros: 0, startTimestamp: 1000, scopeId: undefined,
    });

    const executions = new Map([
      ["chain:ok-only", [makeExec("chain:ok-only", 1)]],
      ["chain:err-only", [makeExec("chain:err-only", 1)]],
      ["chain:real-A", [makeExec("chain:real-A", 3)]],
      ["chain:real-B", [makeExec("chain:real-B", 2)]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Before toggle: 4 chain rows
    expect(screen.getAllByTestId("railway-chain-row")).toHaveLength(4);

    // Click hide constructors
    fireEvent.click(screen.getByTestId("railway-hide-constructors"));

    // After toggle: single-op constructor chains (ok-only, err-only) should be hidden → 2 rows
    expect(screen.getAllByTestId("railway-chain-row")).toHaveLength(2);

    // realB starts with fromThrowable (constructor) but has 2 ops — should NOT be hidden
    const labels = screen.getAllByTestId("railway-chain-label").map(el => el.textContent);
    expect(labels).toContain("realA");
    expect(labels).toContain("realB");
  });

  it("Panel renders without crash when both stats AND real chain data coexist (playground scenario)", () => {
    // This test simulates the real playground where ResultStatistics AND
    // TracedResult chain data are both present simultaneously.
    const ds = createMockDataSource();
    // Stats are provided (non-undefined) — as in the real playground
    // Chain data is ALSO provided — as in the real playground

    const chains = new Map([
      ["chain:1", {
        chainId: "chain:1",
        label: "ok → map → match",
        portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "map", label: "map(double)", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 2, method: "match", label: "match()", inputTrack: "both" as const, outputTracks: ["ok", "err"] as const, canSwitch: false, isTerminal: true, callbackLocation: undefined },
        ],
        isAsync: false,
        sourceLocation: undefined,
      }],
    ]);

    // Execution data shaped exactly like TracedResult output, including
    // null values from serializeForTrace(null) and object data
    const executions = new Map([
      ["chain:1", [
        // Initial emission (constructor-only, 1 step)
        {
          executionId: "exec:1a",
          chainId: "chain:1",
          entryMethod: "ok" as const,
          entryTrack: "ok" as const,
          entryValue: { data: 42, typeName: "Number", truncated: false },
          steps: [
            { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
              inputValue: { data: 42, typeName: "Number", truncated: false },
              outputValue: { data: 42, typeName: "Number", truncated: false },
              durationMicros: 0, callbackThrew: false, timestamp: 0 },
          ],
          finalTrack: "ok" as const,
          finalValue: { data: 42, typeName: "Number", truncated: false },
          totalDurationMicros: 0, startTimestamp: 1000, scopeId: undefined,
        },
        // Complete emission (3 steps)
        {
          executionId: "exec:1b",
          chainId: "chain:1",
          entryMethod: "ok" as const,
          entryTrack: "ok" as const,
          entryValue: { data: 42, typeName: "Number", truncated: false },
          steps: [
            { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
              inputValue: { data: 42, typeName: "Number", truncated: false },
              outputValue: { data: 42, typeName: "Number", truncated: false },
              durationMicros: 0, callbackThrew: false, timestamp: 0 },
            { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
              inputValue: { data: 42, typeName: "Number", truncated: false },
              outputValue: { data: 84, typeName: "Number", truncated: false },
              durationMicros: 5, callbackThrew: false, timestamp: 100 },
            { operationIndex: 2, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
              inputValue: { data: 84, typeName: "Number", truncated: false },
              outputValue: { data: 84, typeName: "Number", truncated: false },
              durationMicros: 1, callbackThrew: false, timestamp: 200 },
          ],
          finalTrack: "ok" as const,
          finalValue: { data: 84, typeName: "Number", truncated: false },
          totalDurationMicros: 6, startTimestamp: 1000, scopeId: undefined,
        },
      ]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    // Default view is overview — should render without crash
    expect(screen.getByTestId("result-overview-content")).toBeDefined();

    // Switch to Railway — should render without crash
    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    expect(screen.getByTestId("railway-content")).toBeDefined();

    // Expand the chain row
    fireEvent.click(screen.getByTestId("railway-chain-row"));
    expect(screen.getByTestId("railway-chain-detail")).toBeDefined();

    // Values should be visible
    const entryValues = screen.getAllByTestId("railway-chain-entry-value");
    expect(entryValues).toHaveLength(1);
    expect(entryValues[0].textContent).toContain("42");

    // Switch to all other views — none should crash
    for (const tab of ["Log", "Cases", "Sankey", "Waterfall", "Combinator"]) {
      fireEvent.click(screen.getByRole("tab", { name: tab }));
    }
  });

  it("formatValue handles null data from serializeForTrace(null/undefined)", () => {
    // TracedResult's serializeForTrace(null) returns { data: null, typeName: "null" }
    // and serializeForTrace(undefined) returns { data: null, typeName: "undefined" }
    // formatValue must handle null data without crashing
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:null", {
        chainId: "chain:null", label: "nullPipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:null", [{
        executionId: "exec:null", chainId: "chain:null",
        entryMethod: "ok" as const, entryTrack: "ok" as const,
        // null data — as produced by serializeForTrace(null)
        entryValue: { data: null, typeName: "null", truncated: false },
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: { data: null, typeName: "null", truncated: false },
            outputValue: { data: null, typeName: "undefined", truncated: false },
            durationMicros: 0, callbackThrew: false, timestamp: 0 },
        ],
        finalTrack: "ok" as const,
        finalValue: { data: null, typeName: "null", truncated: false },
        totalDurationMicros: 0, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    expect(screen.getByTestId("railway-content")).toBeDefined();

    // Expand and check it doesn't crash with null values
    fireEvent.click(screen.getByTestId("railway-chain-row"));
    expect(screen.getByTestId("railway-chain-detail")).toBeDefined();

    // Entry value with null data should be rendered
    const entryValues = screen.getAllByTestId("railway-chain-entry-value");
    expect(entryValues).toHaveLength(1);
  });

  it("formatValue handles complex object data from serializeForTrace", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:obj", {
        chainId: "chain:obj", label: "objectPipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:obj", [{
        executionId: "exec:obj", chainId: "chain:obj",
        entryMethod: "ok" as const, entryTrack: "ok" as const,
        // Object data — as produced by serializeForTrace({ name: "Error", message: "oops" })
        entryValue: { data: { name: "Error", message: "oops" }, typeName: "Error", truncated: false },
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
            inputValue: { data: { name: "Error", message: "oops" }, typeName: "Error", truncated: false },
            outputValue: { data: [1, 2, 3], typeName: "Array", truncated: false },
            durationMicros: 0, callbackThrew: false, timestamp: 0 },
        ],
        finalTrack: "ok" as const,
        finalValue: { data: [1, 2, 3], typeName: "Array", truncated: false },
        totalDurationMicros: 0, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));
    fireEvent.click(screen.getByTestId("railway-chain-row"));

    // Entry value should show JSON-stringified object
    const entryValues = screen.getAllByTestId("railway-chain-entry-value");
    expect(entryValues).toHaveLength(1);

    // Final value should show array
    const finalValues = screen.getAllByTestId("railway-chain-final-value");
    expect(finalValues).toHaveLength(1);
  });

  it("Combinator tab does not crash when chains transition from non-combinator to combinator data", () => {
    // Reproduces: "Rendered more hooks than during the previous render"
    // caused by useMemo(methodCounts) placed AFTER an early return in CombinatorContent.
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    // Start with a non-combinator chain (no all/allSettled/any/collect ops)
    const plainChain: ResultChainDescriptor = {
      chainId: "chain:plain", label: "pipeline", portName: undefined,
      operations: [
        { index: 0, method: "ok", label: "ok()", inputTrack: "both", outputTracks: ["ok"], canSwitch: false, isTerminal: false, callbackLocation: undefined },
        { index: 1, method: "map", label: "map()", inputTrack: "ok", outputTracks: ["ok"], canSwitch: false, isTerminal: false, callbackLocation: undefined },
      ],
      isAsync: false, sourceLocation: undefined,
    };
    const nonCombChains = new Map([["chain:plain", plainChain]]);

    const plainExec = {
      executionId: "exec:plain", chainId: "chain:plain",
      entryMethod: "ok" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: [
        { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
        { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 5, callbackThrew: false, timestamp: 100 },
      ],
      finalTrack: "ok" as const, finalValue: undefined,
      totalDurationMicros: 5, startTimestamp: 1000, scopeId: undefined,
    };

    ds.getResultChains = vi.fn().mockReturnValue(nonCombChains);
    ds.getResultExecutions = vi.fn((chainId: string) =>
      chainId === "chain:plain" ? [plainExec] : []
    );

    const Wrapper = createWrapper(ds);
    const { rerender } = render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    // Switch to Combinator tab — no combinator entries → early return (3 hooks)
    fireEvent.click(screen.getByRole("tab", { name: "Combinator" }));
    expect(screen.getByText("No combinator operations recorded yet")).toBeDefined();

    // Now add combinator chain data (simulates data arriving after code runs)
    const combChainEntry: ResultChainDescriptor = {
      chainId: "chain:comb", label: "all()", portName: undefined,
      operations: [
        { index: 0, method: "all", label: "all()", inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false, callbackLocation: undefined },
      ],
      isAsync: false, sourceLocation: undefined,
    };
    const combChains = new Map([
      ["chain:plain", plainChain],
      ["chain:comb", combChainEntry],
    ]);

    const combExec = {
      executionId: "exec:comb", chainId: "chain:comb",
      entryMethod: "all" as const, entryTrack: "ok" as const, entryValue: undefined,
      steps: [
        { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false,
          inputValue: { data: [{ index: 0, track: "ok", sourceLabel: "input-0" }], typeName: "Array", truncated: false },
          outputValue: { data: [1], typeName: "Array", truncated: false },
          durationMicros: 100, callbackThrew: false, timestamp: 0 },
      ],
      finalTrack: "ok" as const,
      finalValue: { data: [1], typeName: "Array", truncated: false },
      totalDurationMicros: 100, startTimestamp: 2000, scopeId: undefined,
    };

    vi.mocked(ds.getResultChains).mockReturnValue(combChains);
    ds.getResultExecutions = vi.fn((chainId: string) =>
      chainId === "chain:plain" ? [plainExec] : chainId === "chain:comb" ? [combExec] : []
    );

    // Emit chain-registered event to trigger hook version bump + re-render
    act(() => {
      ds.emit({ type: "chain-registered", chainId: "chain:comb" });
    });

    // Should now show the combinator view with data — NOT crash with "Rendered more hooks"
    expect(screen.getByTestId("combinator-matrix-view")).toBeDefined();
  });

  it("Collapsed chain rows show entry and final value previews when available", () => {
    const ds = createMockDataSource();
    vi.mocked(ds.getAllResultStatistics).mockReturnValue(undefined);

    const chains = new Map([
      ["chain:A", {
        chainId: "chain:A", label: "pipeline", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
          { index: 1, method: "map", label: "transform", inputTrack: "ok" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
      ["chain:B", {
        chainId: "chain:B", label: "noValues", portName: undefined,
        operations: [
          { index: 0, method: "ok", label: "ok()", inputTrack: "both" as const, outputTracks: ["ok"] as const, canSwitch: false, isTerminal: false, callbackLocation: undefined },
        ],
        isAsync: false, sourceLocation: undefined,
      }],
    ]);

    const executions = new Map([
      ["chain:A", [{
        executionId: "exec:A", chainId: "chain:A",
        entryMethod: "ok" as const, entryTrack: "ok" as const,
        entryValue: { data: "hello", typeName: "string", truncated: false },
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
          { operationIndex: 1, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 5, callbackThrew: false, timestamp: 100 },
        ],
        finalTrack: "ok" as const,
        finalValue: { data: "HELLO", typeName: "string", truncated: false },
        totalDurationMicros: 5, startTimestamp: 1000, scopeId: undefined,
      }]],
      ["chain:B", [{
        executionId: "exec:B", chainId: "chain:B",
        entryMethod: "ok" as const, entryTrack: "ok" as const,
        entryValue: undefined,
        steps: [
          { operationIndex: 0, inputTrack: "ok" as const, outputTrack: "ok" as const, switched: false, inputValue: undefined, outputValue: undefined, durationMicros: 0, callbackThrew: false, timestamp: 0 },
        ],
        finalTrack: "ok" as const,
        finalValue: undefined,
        totalDurationMicros: 0, startTimestamp: 1000, scopeId: undefined,
      }]],
    ]);

    ds.getResultChains = vi.fn().mockReturnValue(chains);
    ds.getResultExecutions = vi.fn((chainId: string) => executions.get(chainId) ?? []);

    const Wrapper = createWrapper(ds);
    render(
      <Wrapper>
        <ResultPanel dataSource={ds} theme="light" width={800} height={600} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Railway" }));

    // Only chain A has entry/final values
    const entryValues = screen.getAllByTestId("railway-chain-entry-value");
    expect(entryValues).toHaveLength(1);
    expect(entryValues[0].textContent).toContain("hello");

    const finalValues = screen.getAllByTestId("railway-chain-final-value");
    expect(finalValues).toHaveLength(1);
    expect(finalValues[0].textContent).toContain("HELLO");
  });

});
