/**
 * ResultPanel -- top-level PanelProps-compatible shell for the Result Panel.
 *
 * Bridges the InspectorDataSource interface to the Result Panel views.
 * Uses getAllResultStatistics() for Level 0 data (overview dashboard).
 * The Railway view uses real TracedResult data (Level 1) when available,
 * falling back to synthesized chain data from stats.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PanelProps } from "./types.js";
import type { ResultStatistics } from "@hex-di/core";
import type { InspectorDataSource } from "../data/inspector-data-source.js";
import { StatCard } from "../components/stat-card.js";
import { SectionHeader } from "../components/section-header.js";
import { EmptyState } from "../components/empty-state.js";
import { RailwayPipelineView } from "./result/railway-pipeline.js";
import { RailwayToolbar } from "./result/railway-toolbar.js";
import { RailwayDetailSidebar } from "./result/railway-detail-sidebar.js";
import { RailwayFooter } from "./result/railway-footer.js";
import { OperationLogView } from "./result/operation-log.js";
import { CaseExplorerView } from "./result/case-explorer.js";
import { SankeyStatisticsView } from "./result/sankey-statistics.js";
import { AsyncWaterfallView } from "./result/async-waterfall.js";
import { CombinatorMatrixView } from "./result/combinator-matrix.js";
import type {
  CombinatorData,
  CombinatorInput,
  CombinatorOutput,
} from "./result/combinator-matrix.js";
import type { FlowData } from "./result/sankey-statistics.js";
import { computePaths } from "./result/path-analysis.js";
import { useResultChainData } from "../hooks/use-result-chain-data.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultPathDescriptor,
  ResultPortStatistics,
} from "./result/types.js";
import { buildOverviewFromChains } from "./result-data-adapter.js";
import type { ChainOverview } from "./result-data-adapter.js";

// ── View registry ────────────────────────────────────────────────────────────

type ResultViewId =
  | "overview"
  | "railway"
  | "log"
  | "cases"
  | "sankey"
  | "waterfall"
  | "combinator";

interface ViewDef {
  readonly id: ResultViewId;
  readonly label: string;
}

const VIEWS: readonly ViewDef[] = [
  { id: "overview", label: "Overview" },
  { id: "railway", label: "Railway" },
  { id: "log", label: "Log" },
  { id: "cases", label: "Cases" },
  { id: "sankey", label: "Sankey" },
  { id: "waterfall", label: "Waterfall" },
  { id: "combinator", label: "Combinator" },
];

// ── Zoom constants ──────────────────────────────────────────────────────────

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.15;
const DEFAULT_ZOOM = 1.0;

// ── Overview content ─────────────────────────────────────────────────────────

interface OverviewContentProps {
  readonly stats: ReadonlyMap<string, ResultStatistics>;
  readonly chainOverview: ChainOverview | undefined;
}

function OverviewContent({ stats, chainOverview }: OverviewContentProps): React.ReactElement {
  // If we have chain data but no DI stats, render chain-based overview
  if (stats.size === 0 && chainOverview !== undefined && chainOverview.chainCount > 0) {
    return <ChainOverviewContent overview={chainOverview} />;
  }

  if (stats.size === 0) {
    return (
      <div data-testid="result-overview-content">
        <EmptyState
          icon={"\u23F3"}
          message="Awaiting Result data"
          description="Run your code. Result<T, E> statistics will appear here after methods return ok() or err() values."
        />
      </div>
    );
  }

  const entries = [...stats.values()];
  const totalCalls = entries.reduce((sum, s) => sum + s.totalCalls, 0);
  const totalOk = entries.reduce((sum, s) => sum + s.okCount, 0);
  const totalErr = entries.reduce((sum, s) => sum + s.errCount, 0);
  const okRate = totalCalls > 0 ? totalOk / totalCalls : 1;
  const errorPorts = entries.filter(s => s.errorRate > 0).length;

  return (
    <div data-testid="result-overview-content">
      <SectionHeader title="Result Statistics" subtitle="Aggregate Result<T, E> port metrics" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "var(--hex-space-md)",
          marginBottom: "var(--hex-space-xl)",
        }}
      >
        <StatCard label="Total Calls" value={totalCalls} />
        <StatCard
          label="Ok Rate"
          value={`${Math.round(okRate * 1000) / 10}%`}
          variant={okRate < 0.95 ? "warning" : "neutral"}
        />
        <StatCard label="Ports" value={stats.size} />
        <StatCard
          label="Error Ports"
          value={errorPorts}
          variant={errorPorts > 0 ? "error" : "neutral"}
        />
      </div>

      {totalErr > 0 && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--hex-border)",
              marginBottom: "var(--hex-space-xl)",
            }}
          />
          <SectionHeader title="Port Breakdown" count={stats.size} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hex-space-sm)",
            }}
          >
            {entries.map(stat => (
              <div
                key={stat.portName}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--hex-space-sm) var(--hex-space-md)",
                  backgroundColor:
                    stat.errorRate > 0 ? "var(--hex-error-muted)" : "var(--hex-bg-secondary)",
                  borderRadius: "var(--hex-radius-md)",
                  borderLeft:
                    stat.errorRate > 0
                      ? "3px solid var(--hex-error)"
                      : "3px solid var(--hex-success)",
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                }}
              >
                <span style={{ color: "var(--hex-text-primary)" }}>{stat.portName}</span>
                <span style={{ color: "var(--hex-text-muted)" }}>
                  {stat.okCount}ok / {stat.errCount}err
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Chain-based overview (when DI stats are absent but chain data exists) ────

function ChainOverviewContent({
  overview,
}: {
  readonly overview: ChainOverview;
}): React.ReactElement {
  const okRate = overview.totalExecutions > 0 ? overview.okCount / overview.totalExecutions : 1;

  return (
    <div data-testid="result-overview-content">
      <SectionHeader
        title="Result Chain Statistics"
        subtitle="Derived from traced Result operations"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "var(--hex-space-md)",
          marginBottom: "var(--hex-space-xl)",
        }}
      >
        <StatCard label="Total Executions" value={overview.totalExecutions} />
        <StatCard
          label="Ok Rate"
          value={`${Math.round(okRate * 1000) / 10}%`}
          variant={okRate < 0.95 ? "warning" : "neutral"}
        />
        <StatCard label="Chains" value={overview.chainCount} />
        <StatCard
          label="Error Chains"
          value={overview.chainsWithErrors}
          variant={overview.chainsWithErrors > 0 ? "error" : "neutral"}
        />
      </div>

      {overview.perChain.length > 0 && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--hex-border)",
              marginBottom: "var(--hex-space-xl)",
            }}
          />
          <SectionHeader title="Chain Breakdown" count={overview.perChain.length} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hex-space-sm)",
            }}
          >
            {overview.perChain.map(entry => (
              <div
                key={entry.chainId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--hex-space-sm) var(--hex-space-md)",
                  backgroundColor:
                    entry.errCount > 0 ? "var(--hex-error-muted)" : "var(--hex-bg-secondary)",
                  borderRadius: "var(--hex-radius-md)",
                  borderLeft:
                    entry.errCount > 0
                      ? "3px solid var(--hex-error)"
                      : "3px solid var(--hex-success)",
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                }}
              >
                <span style={{ color: "var(--hex-text-primary)" }}>{entry.label}</span>
                <span style={{ color: "var(--hex-text-muted)" }}>
                  {entry.okCount}ok / {entry.errCount}err
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── View placeholder ─────────────────────────────────────────────────────────

function ViewPlaceholder({ viewId }: { readonly viewId: ResultViewId }): React.ReactElement {
  const messages: Record<ResultViewId, { message: string; description: string }> = {
    overview: { message: "", description: "" },
    railway: {
      message: "No Result chain data yet",
      description: "Run code that returns ok()/err() to see the railway visualization.",
    },
    log: {
      message: "No Result operations recorded yet",
      description: "Execute code to see the operation log.",
    },
    cases: {
      message: "No case analysis data yet",
      description: "Run code with branching Result logic to see case breakdown.",
    },
    sankey: {
      message: "No flow data yet",
      description: "Run code to see how ok/err results flow through your ports.",
    },
    waterfall: {
      message: "No async timing data yet",
      description: "Run code with async Result operations to see the waterfall.",
    },
    combinator: {
      message: "No combinator operations recorded yet",
      description:
        "Run the Result: Combinators example — uses all(), allSettled(), any(), collect().",
    },
  };

  const entry = messages[viewId];

  return (
    <div data-testid={`result-view-${viewId}`} style={{ padding: "var(--hex-space-xl)" }}>
      <EmptyState message={entry.message} description={entry.description} />
    </div>
  );
}

// ── Railway content ──────────────────────────────────────────────────────────

interface RailwayContentProps {
  readonly mergedChain: ResultChainDescriptor | undefined;
  readonly mergedExecution: ResultChainExecution | undefined;
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly isRealData: boolean;
}

function RailwayContent({
  mergedChain,
  mergedExecution,
  chains,
  isRealData,
}: RailwayContentProps): React.ReactElement {
  const execution = mergedExecution;

  // ── Zoom / Pan state ─────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Selected node state ──────────────────────────────────────────────────
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | undefined>(undefined);

  // ── Playback state ───────────────────────────────────────────────────────
  const [playbackStatus, setPlaybackStatus] = useState<"idle" | "playing" | "paused" | "complete">(
    "idle"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(1);

  const totalSteps = mergedChain ? mergedChain.operations.length : 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  // Defined before useEffect so the keyboard handler can reference them.

  const handleZoomIn = useCallback((): void => {
    setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback((): void => {
    setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleFit = useCallback((): void => {
    setZoom(DEFAULT_ZOOM);
    setPanX(0);
    setPanY(0);
  }, []);

  const handleZoomChange = useCallback((newZoom: number): void => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
  }, []);

  const handlePanChange = useCallback((newPanX: number, newPanY: number): void => {
    setPanX(newPanX);
    setPanY(newPanY);
  }, []);

  const handleNodeSelect = useCallback((opIndex: number): void => {
    setSelectedNodeIndex(prev => (prev === opIndex ? undefined : opIndex));
  }, []);

  const handlePlay = useCallback((): void => {
    setPlaybackStatus(prev => {
      if (prev === "complete") {
        setCurrentStep(0);
      }
      return "playing";
    });
  }, []);

  const handlePause = useCallback((): void => {
    setPlaybackStatus("paused");
  }, []);

  const handleStepPrev = useCallback((): void => {
    setCurrentStep(s => Math.max(0, s - 1));
    setPlaybackStatus("paused");
  }, []);

  const handleStepNext = useCallback((): void => {
    setCurrentStep(s => {
      const next = Math.min(totalSteps - 1, s + 1);
      if (next >= totalSteps - 1) {
        setPlaybackStatus("complete");
      } else {
        setPlaybackStatus("paused");
      }
      return next;
    });
  }, [totalSteps]);

  const handleSkipToStart = useCallback((): void => {
    setCurrentStep(0);
    setPlaybackStatus("paused");
  }, []);

  const handleSkipToEnd = useCallback((): void => {
    setCurrentStep(Math.max(0, totalSteps - 1));
    setPlaybackStatus("complete");
  }, [totalSteps]);

  const handlePanTo = useCallback(
    (normalizedX: number): void => {
      if (!canvasRef.current) return;
      const containerWidth = canvasRef.current.clientWidth;
      const totalWidth = containerWidth * zoom;
      setPanX(-normalizedX * totalWidth + containerWidth / 2);
    },
    [zoom]
  );

  const handleCloseSidebar = useCallback((): void => {
    setSelectedNodeIndex(undefined);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      // Ignore when inside input/select elements
      const tag = e.target instanceof HTMLElement ? e.target.tagName : "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (playbackStatus === "playing") {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleStepPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleStepNext();
          break;
        case "Home":
          e.preventDefault();
          handleSkipToStart();
          break;
        case "End":
          e.preventDefault();
          handleSkipToEnd();
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          handleFit();
          break;
        case "Escape":
          e.preventDefault();
          handleCloseSidebar();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [
    playbackStatus,
    handlePause,
    handlePlay,
    handleStepPrev,
    handleStepNext,
    handleSkipToStart,
    handleSkipToEnd,
    handleZoomIn,
    handleZoomOut,
    handleFit,
    handleCloseSidebar,
  ]);

  // ── Auto-play timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (playbackStatus !== "playing") return;

    const intervalMs = 200 / speed;
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= totalSteps) {
          setPlaybackStatus("complete");
          return totalSteps - 1;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [playbackStatus, speed, totalSteps]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!mergedChain || mergedChain.operations.length === 0) {
    return (
      <div
        data-testid="result-view-railway"
        style={{ padding: "var(--hex-space-xl)", height: "100%" }}
      >
        <EmptyState
          icon={"\u{1F6E4}"}
          message="No Result chain data yet"
          description="Run code that returns ok()/err() to see the railway visualization. All Result operations will appear here in a unified timeline."
        />
      </div>
    );
  }

  // ── Sidebar data ─────────────────────────────────────────────────────────

  const selectedOperation =
    selectedNodeIndex !== undefined && mergedChain
      ? mergedChain.operations[selectedNodeIndex]
      : undefined;

  const selectedStep =
    selectedNodeIndex !== undefined && execution ? execution.steps[selectedNodeIndex] : undefined;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="railway-content"
      style={{
        display: "grid",
        gridTemplateRows: "40px 1fr 32px",
        gridTemplateColumns: "1fr",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <RailwayToolbar
        chains={chains}
        playbackStatus={playbackStatus}
        currentStep={currentStep}
        totalSteps={totalSteps}
        speed={speed}
        onPlay={handlePlay}
        onPause={handlePause}
        onStepPrev={handleStepPrev}
        onStepNext={handleStepNext}
        onSkipToStart={handleSkipToStart}
        onSkipToEnd={handleSkipToEnd}
        onSetSpeed={setSpeed}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        isRealData={isRealData}
      />

      {/* Canvas + Sidebar */}
      <div
        ref={canvasRef}
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <RailwayPipelineView
          chain={mergedChain}
          execution={execution}
          selectedNodeIndex={selectedNodeIndex}
          onNodeSelect={handleNodeSelect}
          onFit={handleFit}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          panX={panX}
          panY={panY}
          onPanChange={handlePanChange}
          playbackStatus={playbackStatus}
          currentStep={currentStep}
          speed={speed}
        />

        {/* Detail Sidebar */}
        {selectedOperation && (
          <RailwayDetailSidebar
            operation={selectedOperation}
            step={selectedStep}
            execution={execution}
            onClose={handleCloseSidebar}
            visible={selectedNodeIndex !== undefined}
          />
        )}
      </div>

      {/* Footer */}
      <RailwayFooter
        chain={mergedChain}
        execution={execution}
        currentStep={currentStep + 1}
        totalSteps={totalSteps}
        zoom={zoom}
        panX={panX}
        canvasWidth={canvasRef.current?.clientWidth ?? 0}
        onPanTo={handlePanTo}
      />
    </div>
  );
}

// ── Log content ─────────────────────────────────────────────────────────────

interface LogContentProps {
  readonly mergedChain: ResultChainDescriptor | undefined;
  readonly mergedExecution: ResultChainExecution | undefined;
}

function LogContent({ mergedChain, mergedExecution }: LogContentProps): React.ReactElement {
  if (!mergedChain || !mergedExecution || mergedExecution.steps.length === 0) {
    return <ViewPlaceholder viewId="log" />;
  }

  return <OperationLogView chain={mergedChain} execution={mergedExecution} />;
}

// ── Cases content ────────────────────────────────────────────────────────────

interface CasesContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function CasesContent({ chains, getExecutions }: CasesContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="cases" />;
  }

  // Compute paths per individual chain and overlay per-chain executions.
  // This avoids the cross-chain combinatorial explosion from merging.
  const allPaths: ResultPathDescriptor[] = [];
  const allOperations: ResultOperationDescriptor[] = [];

  for (const [chainId, chain] of chains) {
    const staticPaths = computePaths(chain.operations);
    const executions = getExecutions(chainId);

    // Build a frequency map: track-sequence-key → observation count
    const observedCounts = new Map<string, number>();
    for (const exec of executions) {
      if (exec.steps.length === 0) continue;
      const key = exec.steps.map(s => s.outputTrack).join(",");
      observedCounts.set(key, (observedCounts.get(key) ?? 0) + 1);
    }

    const totalExecs = executions.length;

    const overlaid = staticPaths.map(path => {
      const key = path.trackSequence.join(",");
      const count = observedCounts.get(key) ?? 0;
      if (count > 0) {
        return {
          ...path,
          // Prefix pathId with chainId to avoid collisions across chains
          pathId: `${chainId}:${path.pathId}`,
          observed: true,
          observedCount: count,
          frequency: totalExecs > 0 ? count / totalExecs : 0,
        };
      }
      return { ...path, pathId: `${chainId}:${path.pathId}` };
    });

    allPaths.push(...overlaid);

    // Collect operations (re-indexed to global offset)
    const offset = allOperations.length;
    for (const op of chain.operations) {
      allOperations.push({ ...op, index: op.index + offset });
    }
  }

  // Build a synthetic merged chain descriptor for display
  const displayChain: ResultChainDescriptor = {
    chainId: "cases-merged",
    label: chains.size === 1 ? [...chains.values()][0].label : `${chains.size} chains`,
    portName: undefined,
    operations: allOperations,
    isAsync: false,
    sourceLocation: undefined,
  };

  return <CaseExplorerView chain={displayChain} paths={allPaths} />;
}

// ── Sankey content ───────────────────────────────────────────────────────────

interface SankeyContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function SankeyContent({ chains, getExecutions }: SankeyContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="sankey" />;
  }

  // Aggregate flow data across all chains and their executions.
  // For each operation, count input→output track transitions.
  const flowMap = new Map<
    number,
    { okToOk: number; okToErr: number; errToOk: number; errToErr: number }
  >();
  let totalCalls = 0;
  let okCount = 0;
  let errCount = 0;
  const errorsByCode = new Map<string, number>();
  let lastTimestamp: number | undefined;
  const chainIds: string[] = [];
  let displayChain: ResultChainDescriptor | undefined;

  for (const [chainId, chain] of chains) {
    chainIds.push(chainId);
    if (displayChain === undefined || chain.operations.length > displayChain.operations.length) {
      displayChain = chain;
    }

    const executions = getExecutions(chainId);

    for (const exec of executions) {
      totalCalls++;
      if (exec.finalTrack === "ok") {
        okCount++;
      } else {
        errCount++;
        if (exec.finalValue !== undefined) {
          const code =
            typeof exec.finalValue.data === "string"
              ? exec.finalValue.data
              : exec.finalValue.typeName;
          errorsByCode.set(code, (errorsByCode.get(code) ?? 0) + 1);
        }
      }

      if (lastTimestamp === undefined || exec.startTimestamp > lastTimestamp) {
        lastTimestamp = exec.startTimestamp;
      }

      for (const step of exec.steps) {
        let entry = flowMap.get(step.operationIndex);
        if (entry === undefined) {
          entry = { okToOk: 0, okToErr: 0, errToOk: 0, errToErr: 0 };
          flowMap.set(step.operationIndex, entry);
        }

        if (step.inputTrack === "ok" && step.outputTrack === "ok") {
          entry.okToOk++;
        } else if (step.inputTrack === "ok" && step.outputTrack === "err") {
          entry.okToErr++;
        } else if (step.inputTrack === "err" && step.outputTrack === "ok") {
          entry.errToOk++;
        } else {
          entry.errToErr++;
        }
      }
    }
  }

  if (displayChain === undefined || totalCalls === 0) {
    return <ViewPlaceholder viewId="sankey" />;
  }

  // Build FlowData array sorted by operation index
  const flows: FlowData[] = [...flowMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([operationIndex, counts]) => ({
      operationIndex,
      ...counts,
    }));

  const portStats: ResultPortStatistics = {
    portName: displayChain.portName ?? displayChain.label,
    totalCalls,
    okCount,
    errCount,
    errorRate: totalCalls > 0 ? errCount / totalCalls : 0,
    errorsByCode,
    lastError: undefined,
    stabilityScore: totalCalls > 0 ? okCount / totalCalls : 1,
    chainIds,
    lastExecutionTimestamp: lastTimestamp,
  };

  return (
    <SankeyStatisticsView
      chain={displayChain}
      flows={flows}
      portStats={portStats}
      stabilityHistory={[]}
    />
  );
}

// ── Waterfall content ────────────────────────────────────────────────────────

interface WaterfallContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function WaterfallContent({ chains, getExecutions }: WaterfallContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="waterfall" />;
  }

  // Prefer async chains for the waterfall view; fall back to any chain
  let selectedChain: ResultChainDescriptor | undefined;
  let selectedExecution: ResultChainExecution | undefined;

  for (const [chainId, chain] of chains) {
    const executions = getExecutions(chainId);
    if (chain.isAsync && executions.length > 0) {
      selectedChain = chain;
      selectedExecution = executions[executions.length - 1];
      break;
    }
  }

  // If no async chain with executions, try any chain with executions
  if (selectedChain === undefined) {
    for (const [chainId, chain] of chains) {
      const executions = getExecutions(chainId);
      if (executions.length > 0) {
        selectedChain = chain;
        selectedExecution = executions[executions.length - 1];
        break;
      }
    }
  }

  if (selectedChain === undefined) {
    return <ViewPlaceholder viewId="waterfall" />;
  }

  return <AsyncWaterfallView chain={selectedChain} execution={selectedExecution} />;
}

// ── Combinator content ───────────────────────────────────────────────────────

interface CombinatorContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

const COMBINATOR_METHODS = new Set(["all", "allSettled", "any", "collect"]);

interface CombinatorChainEntry {
  readonly chain: ResultChainDescriptor;
  readonly opIndex: number;
  readonly method: "all" | "allSettled" | "any" | "collect";
  readonly finalTrack: "ok" | "err" | undefined;
  readonly inputCount: number;
}

const METHOD_ICONS: Record<string, string> = { all: "∀", allSettled: "≡", any: "∃", collect: "{}" };

function collectCombinatorChains(
  chains: ReadonlyMap<string, ResultChainDescriptor>,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): readonly CombinatorChainEntry[] {
  const result: CombinatorChainEntry[] = [];
  for (const [, chain] of chains) {
    const idx = chain.operations.findIndex(op => COMBINATOR_METHODS.has(op.method));
    if (idx < 0) continue;
    const method = chain.operations[idx].method as "all" | "allSettled" | "any" | "collect";
    const execs = getExecutions(chain.chainId);
    const latest = execs.length > 0 ? execs[execs.length - 1] : undefined;
    const step = latest?.steps.find(s => s.operationIndex === idx);
    const inputData = step?.inputValue?.data;
    const inputCount = Array.isArray(inputData) ? inputData.length : 0;
    result.push({
      chain,
      opIndex: idx,
      method,
      finalTrack: latest?.finalTrack,
      inputCount,
    });
  }
  return result;
}

function buildCombinatorData(
  entry: CombinatorChainEntry,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): CombinatorData | undefined {
  const execs = getExecutions(entry.chain.chainId);
  const latestExec = execs.length > 0 ? execs[execs.length - 1] : undefined;
  if (latestExec === undefined) return undefined;

  const combinatorStep = latestExec.steps.find(s => s.operationIndex === entry.opIndex);
  if (combinatorStep === undefined) return undefined;

  const method = entry.method;
  let inputs: CombinatorInput[] = [];
  const inputData = combinatorStep.inputValue?.data;

  if (Array.isArray(inputData)) {
    inputs = inputData.map((item: Record<string, unknown>, i: number) => ({
      index: typeof item["index"] === "number" ? item["index"] : i,
      name: typeof item["name"] === "string" ? item["name"] : undefined,
      sourceLabel: typeof item["sourceLabel"] === "string" ? item["sourceLabel"] : `input-${i}`,
      track: item["track"] === "err" ? ("err" as const) : ("ok" as const),
      valuePreview: typeof item["valuePreview"] === "string" ? item["valuePreview"] : "—",
      isShortCircuitCause: item["isShortCircuitCause"] === true,
      isSkipped: item["isSkipped"] === true,
    }));
  }

  if ((method === "all" || method === "collect") && combinatorStep.outputTrack === "err") {
    const firstErr = inputs.findIndex(inp => inp.track === "err");
    if (firstErr >= 0) {
      inputs = inputs.map((inp, i) => ({
        ...inp,
        isShortCircuitCause: i === firstErr,
        isSkipped: i > firstErr && inp.track !== "err",
      }));
    }
  }

  const outputValuePreview =
    combinatorStep.outputValue !== undefined
      ? typeof combinatorStep.outputValue.data === "string"
        ? combinatorStep.outputValue.data
        : JSON.stringify(combinatorStep.outputValue.data)
      : "—";

  return {
    combinatorMethod: method,
    inputs,
    output: {
      track: combinatorStep.outputTrack,
      valuePreview: outputValuePreview,
      sourceNote: buildSourceNote(method, inputs, combinatorStep.outputTrack),
    },
  };
}

function CombinatorContent({ chains, getExecutions }: CombinatorContentProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);

  const allEntries = useMemo(
    () => collectCombinatorChains(chains, getExecutions),
    [chains, getExecutions]
  );

  if (allEntries.length === 0) {
    return <ViewPlaceholder viewId="combinator" />;
  }

  const entries =
    methodFilter !== null ? allEntries.filter(e => e.method === methodFilter) : allEntries;

  // Compute unique methods for filter badges
  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of allEntries) {
      counts.set(e.method, (counts.get(e.method) ?? 0) + 1);
    }
    return counts;
  }, [allEntries]);

  if (entries.length === 0) {
    return <ViewPlaceholder viewId="combinator" />;
  }

  // Aggregate stats
  const okCount = allEntries.filter(e => e.finalTrack === "ok").length;
  const errCount = allEntries.filter(e => e.finalTrack === "err").length;

  const safeIndex = selectedIndex < entries.length ? selectedIndex : 0;
  const activeEntry = entries[safeIndex];
  const combinatorData = buildCombinatorData(activeEntry, getExecutions);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Aggregate stats header */}
      <div
        data-testid="combinator-stats-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "var(--hex-space-xs) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          fontSize: 12,
          color: "var(--hex-text-secondary)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--hex-text-primary)" }}>
          {allEntries.length} calls
        </span>
        <span style={{ color: "var(--hex-success, #22c55e)" }}>{okCount} ok</span>
        <span style={{ color: "var(--hex-error, #ef4444)" }}>{errCount} err</span>
      </div>

      {/* Main content (sidebar + detail) */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Chain list sidebar */}
        <div
          data-testid="combinator-chain-list"
          style={{
            width: 220,
            minWidth: 220,
            borderRight: "1px solid var(--hex-border)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Method filter badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "var(--hex-space-xs) var(--hex-space-sm)",
              borderBottom: "1px solid var(--hex-border)",
            }}
          >
            {[...methodCounts.entries()].map(([method, count]) => {
              const isActive = methodFilter === method;
              return (
                <button
                  key={method}
                  data-testid="combinator-method-filter"
                  onClick={() => {
                    setMethodFilter(isActive ? null : method);
                    setSelectedIndex(0);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 12,
                    border: isActive
                      ? "1px solid var(--hex-accent)"
                      : "1px solid var(--hex-border)",
                    background: isActive ? "var(--hex-accent)" : "transparent",
                    color: isActive ? "#fff" : "var(--hex-text-secondary)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <span>{METHOD_ICONS[method] ?? "?"}</span>
                  <span>{method}</span>
                  <span style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Chain items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--hex-space-xs) 0" }}>
            {entries.map((entry, i) => {
              const isActive = i === safeIndex;
              const icon = METHOD_ICONS[entry.method] ?? "?";
              const trackColor =
                entry.finalTrack === "err"
                  ? "var(--hex-error, #ef4444)"
                  : "var(--hex-success, #22c55e)";

              return (
                <button
                  key={entry.chain.chainId}
                  data-testid="combinator-chain-item"
                  onClick={() => setSelectedIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "var(--hex-space-xs) var(--hex-space-sm)",
                    border: "none",
                    background: isActive ? "var(--hex-bg-hover, rgba(0,0,0,0.05))" : "transparent",
                    borderLeft: isActive ? "3px solid var(--hex-accent)" : "3px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--hex-text-primary)",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: "var(--hex-bg-secondary, #f3f4f6)",
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.method}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: trackColor,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {entry.finalTrack === "err" ? "✗" : "✓"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--hex-text-secondary)" }}>
                    {entry.inputCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail view */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <CombinatorMatrixView chain={activeEntry.chain} combinatorData={combinatorData} />
        </div>
      </div>
    </div>
  );
}

function buildSourceNote(
  method: "all" | "allSettled" | "any" | "collect",
  inputs: readonly CombinatorInput[],
  outputTrack: "ok" | "err"
): string {
  const okCount = inputs.filter(i => i.track === "ok").length;
  const errCount = inputs.filter(i => i.track === "err").length;

  if (method === "all" || method === "collect") {
    if (outputTrack === "err") {
      const cause = inputs.find(i => i.isShortCircuitCause);
      const causeLabel = cause !== undefined ? ` (${cause.sourceLabel})` : "";
      return `Failed at input #${(cause?.index ?? 0) + 1}${causeLabel}`;
    }
    return `All ${inputs.length} inputs Ok`;
  }

  if (method === "any") {
    if (outputTrack === "ok") {
      const firstOk = inputs.find(i => i.track === "ok");
      const label = firstOk !== undefined ? ` (${firstOk.sourceLabel})` : "";
      return `First Ok: input #${(firstOk?.index ?? 0) + 1}${label}`;
    }
    return `All ${inputs.length} inputs failed`;
  }

  // allSettled
  return `${okCount} Ok, ${errCount} Err`;
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * ResultPanel displays Result<T, E> statistics and chain visualizations.
 *
 * Implements PanelProps so it can be registered in getBuiltInPanels().
 */
function ResultPanel({ dataSource }: PanelProps): React.ReactElement {
  const [version, setVersion] = useState(0);

  // Subscribe to data source events to trigger re-renders when chain data arrives
  useEffect(() => {
    const unsubscribe = dataSource.subscribe(event => {
      if (
        event.type === "snapshot-changed" ||
        event.type === "chain-registered" ||
        event.type === "execution-added"
      ) {
        setVersion(v => v + 1);
      }
    });
    return unsubscribe;
  }, [dataSource]);

  void version; // used to trigger re-reads of data source
  const stats = dataSource.getAllResultStatistics();

  // Single hook call at panel level — data is shared across all tabs
  const { mergedChain, mergedExecution, chains, getExecutions, isRealData } =
    useResultChainData(dataSource);

  const hasRealChains = chains.size > 0 && isRealData;

  // Compute chain-based overview for when DI stats are absent
  const chainOverview = hasRealChains ? buildOverviewFromChains(chains, getExecutions) : undefined;

  const [activeView, setActiveView] = useState<ResultViewId>("overview");
  const userSwitchedRef = useRef(false);

  const handleViewSwitch = useCallback((viewId: ResultViewId) => {
    userSwitchedRef.current = true;
    setActiveView(viewId);
  }, []);

  // Empty state: no statistics AND no real chain data
  if (stats === undefined && !hasRealChains) {
    return (
      <div
        data-testid="result-panel-shell"
        role="region"
        aria-label="Result Panel"
        style={{
          padding: "var(--hex-space-xl)",
          overflow: "auto",
          height: "100%",
        }}
      >
        <div
          role="tablist"
          aria-label="Result Panel views"
          style={{
            display: "flex",
            gap: "var(--hex-space-xs)",
            marginBottom: "var(--hex-space-lg)",
            borderBottom: "1px solid var(--hex-border)",
            paddingBottom: "var(--hex-space-sm)",
          }}
        >
          {VIEWS.map(v => (
            <button
              key={v.id}
              role="tab"
              aria-selected={v.id === activeView}
              onClick={() => handleViewSwitch(v.id)}
              style={{
                padding: "var(--hex-space-xs) var(--hex-space-md)",
                border: "none",
                borderBottom:
                  v.id === activeView ? "2px solid var(--hex-accent)" : "2px solid transparent",
                backgroundColor: "transparent",
                color: v.id === activeView ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
                fontWeight: v.id === activeView ? 600 : 400,
                fontSize: "var(--hex-font-size-sm)",
                fontFamily: "var(--hex-font-sans)",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <EmptyState
          icon={"\uD83D\uDD0D"}
          message="No Result data"
          description="Run your code to see Result<T, E> statistics and chain visualizations."
        />
      </div>
    );
  }

  // Normal render with data
  return (
    <div
      data-testid="result-panel-shell"
      role="region"
      aria-label="Result Panel"
      style={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* View tab bar */}
      <div
        role="tablist"
        aria-label="Result Panel views"
        style={{
          display: "flex",
          gap: "var(--hex-space-xs)",
          padding: "var(--hex-space-sm) var(--hex-space-xl)",
          borderBottom: "1px solid var(--hex-border)",
          flexShrink: 0,
        }}
      >
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === activeView}
            onClick={() => handleViewSwitch(v.id)}
            style={{
              padding: "var(--hex-space-xs) var(--hex-space-md)",
              border: "none",
              borderBottom:
                v.id === activeView ? "2px solid var(--hex-accent)" : "2px solid transparent",
              backgroundColor: "transparent",
              color: v.id === activeView ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
              fontWeight: v.id === activeView ? 600 : 400,
              fontSize: "var(--hex-font-size-sm)",
              fontFamily: "var(--hex-font-sans)",
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Active view content */}
      <div
        style={{
          flex: 1,
          overflow: activeView === "railway" || activeView === "log" ? "hidden" : "auto",
          padding: activeView === "railway" || activeView === "log" ? 0 : "var(--hex-space-xl)",
        }}
      >
        {activeView === "overview" ? (
          <OverviewContent stats={stats ?? new Map()} chainOverview={chainOverview} />
        ) : activeView === "railway" ? (
          <RailwayContent
            mergedChain={mergedChain}
            mergedExecution={mergedExecution}
            chains={chains}
            isRealData={isRealData}
          />
        ) : activeView === "log" ? (
          <LogContent mergedChain={mergedChain} mergedExecution={mergedExecution} />
        ) : activeView === "cases" ? (
          <CasesContent chains={chains} getExecutions={getExecutions} />
        ) : activeView === "sankey" ? (
          <SankeyContent chains={chains} getExecutions={getExecutions} />
        ) : activeView === "waterfall" ? (
          <WaterfallContent chains={chains} getExecutions={getExecutions} />
        ) : activeView === "combinator" ? (
          <CombinatorContent chains={chains} getExecutions={getExecutions} />
        ) : (
          <ViewPlaceholder viewId={activeView} />
        )}
      </div>
    </div>
  );
}

export { ResultPanel };
