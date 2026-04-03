/**
 * Tests for the top-level ResultPanel (PanelProps-compatible shell).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ResultPanel } from "../../src/panels/result-panel.js";
import { createMockDataSource, createWrapper, setupTestEnvironment } from "./test-helpers.js";

afterEach(() => {
  cleanup();
});

describe("ResultPanel - Views", () => {
  beforeEach(() => {
    setupTestEnvironment();
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
});
