/**
 * AsyncWaterfallView — Jaeger-inspired temporal visualization for ResultAsync chains.
 *
 * Spec: 08-async-waterfall.md (8.1-8.9), 10-visual-encoding.md (10.10)
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import { formatDuration, TRACK_COLORS } from "./visual-encoding.js";
import type { ResultChainDescriptor, ResultChainExecution } from "./types.js";
import { computeRows, computeCriticalPath, computeDeltas } from "./async-waterfall-helpers.js";
import type { ConcurrentInput } from "./async-waterfall-helpers.js";
import { WaterfallCanvas } from "./async-waterfall-canvas.js";
import {
  HeaderStat,
  LegendDot,
  DurationBreakdown,
  CriticalPathPanel,
  ComparisonPanel,
} from "./async-waterfall-panels.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface AsyncWaterfallViewProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution | undefined;
  readonly comparisonExecution?: ResultChainExecution | undefined;
  readonly concurrentInputs?: readonly ConcurrentInput[];
  readonly p50?: number;
  readonly p90?: number;
}

// ── Component ───────────────────────────────────────────────────────────────

function AsyncWaterfallView({
  chain,
  execution,
  comparisonExecution,
  concurrentInputs,
  p50 = 50_000,
  p90 = 200_000,
}: AsyncWaterfallViewProps): React.ReactElement {
  const [scale, setScale] = useState("auto");

  // ── Sync chain guard ─────────────────────────────────────────────────

  if (!chain.isAsync) {
    return (
      <div
        data-testid="async-waterfall-view"
        style={{
          fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div
          data-testid="sync-chain-message"
          style={{
            color: "var(--hex-text-muted, #94a3b8)",
            fontSize: "14px",
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--hex-border, #334155)",
          }}
        >
          This chain is synchronous. Async Waterfall is available for ResultAsync chains.
        </div>
      </div>
    );
  }

  // ── No execution guard ───────────────────────────────────────────────

  if (!execution) {
    return (
      <div
        data-testid="async-waterfall-view"
        style={{
          fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div
          data-testid="no-execution-message"
          style={{
            color: "var(--hex-text-muted, #94a3b8)",
            fontSize: "14px",
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--hex-border, #334155)",
          }}
        >
          Select an execution to view the async waterfall.
        </div>
      </div>
    );
  }

  return (
    <AsyncWaterfallContent
      chain={chain}
      execution={execution}
      comparisonExecution={comparisonExecution}
      concurrentInputs={concurrentInputs}
      p50={p50}
      p90={p90}
      scale={scale}
      onScaleChange={setScale}
    />
  );
}

// Split out to avoid hooks-after-return issues
interface AsyncWaterfallContentProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution;
  readonly comparisonExecution?: ResultChainExecution | undefined;
  readonly concurrentInputs?: readonly ConcurrentInput[];
  readonly p50: number;
  readonly p90: number;
  readonly scale: string;
  readonly onScaleChange: (scale: string) => void;
}

function AsyncWaterfallContent({
  chain,
  execution,
  comparisonExecution,
  concurrentInputs,
  p50,
  p90,
  scale,
  onScaleChange,
}: AsyncWaterfallContentProps): React.ReactElement {
  const [zoomLevel, setZoomLevel] = useState(1);

  const rows = useMemo(() => computeRows(chain, execution), [chain, execution]);
  const criticalPath = useMemo(() => computeCriticalPath(chain, execution), [chain, execution]);

  const deltas = useMemo(() => {
    if (!comparisonExecution) return [];
    return computeDeltas(execution, comparisonExecution);
  }, [execution, comparisonExecution]);

  const handleScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onScaleChange(e.target.value);
    },
    [onScaleChange]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev * 1.2, 10));
    } else {
      setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
    }
  }, []);

  return (
    <div
      data-testid="async-waterfall-view"
      style={{
        fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
        fontSize: "13px",
        color: "var(--hex-text-primary, #e2e8f0)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Execution Summary Header */}
      <WaterfallHeader chain={chain} execution={execution} criticalPath={criticalPath} />

      {/* Scale Controls */}
      <ScaleControls scale={scale} zoomLevel={zoomLevel} onScaleChange={handleScaleChange} />

      {/* Waterfall Canvas */}
      <WaterfallCanvas
        rows={rows}
        execution={execution}
        concurrentInputs={concurrentInputs}
        p50={p50}
        p90={p90}
        zoomLevel={zoomLevel}
        onWheel={handleWheel}
      />

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <DurationBreakdown execution={execution} rows={rows} />
        <CriticalPathPanel criticalPath={criticalPath} />
      </div>

      {comparisonExecution && (
        <ComparisonPanel
          execution={execution}
          comparisonExecution={comparisonExecution}
          deltas={deltas}
        />
      )}
    </div>
  );
}

// ── Waterfall Header ────────────────────────────────────────────────────────

function WaterfallHeader({
  chain,
  execution,
  criticalPath,
}: {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution;
  readonly criticalPath: { readonly totalMicros: number };
}): React.ReactElement {
  return (
    <div
      data-testid="waterfall-exec-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "24px",
        padding: "14px 20px",
        backgroundColor: "var(--hex-bg-secondary, #1e293b)",
        borderRadius: "8px",
        borderLeft: `4px solid ${execution.finalTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--hex-text-primary, #e2e8f0)",
            marginBottom: "2px",
          }}
        >
          {chain.label}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--hex-text-muted, #94a3b8)",
            fontFamily: "var(--hex-font-mono, monospace)",
          }}
        >
          {execution.executionId}
        </div>
      </div>
      <HeaderStat label="Duration" value={formatDuration(execution.totalDurationMicros)} />
      <HeaderStat label="Steps" value={String(execution.steps.length)} />
      <HeaderStat
        label="Result"
        value={execution.finalTrack === "ok" ? "Ok" : "Err"}
        color={execution.finalTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err}
      />
      <HeaderStat
        label="Critical"
        value={formatDuration(criticalPath.totalMicros)}
        color={TRACK_COLORS.warning}
      />
    </div>
  );
}

// ── Scale Controls ──────────────────────────────────────────────────────────

function ScaleControls({
  scale,
  zoomLevel,
  onScaleChange,
}: {
  readonly scale: string;
  readonly zoomLevel: number;
  readonly onScaleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "6px 12px",
        backgroundColor: "var(--hex-bg-secondary, #1e293b)",
        borderRadius: "6px",
        fontSize: "12px",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--hex-text-muted, #94a3b8)",
        }}
      >
        Scale
        <select
          data-testid="waterfall-scale-selector"
          value={scale}
          onChange={onScaleChange}
          style={{
            backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
            color: "var(--hex-text-primary, #e2e8f0)",
            border: "1px solid var(--hex-border, #334155)",
            borderRadius: "4px",
            padding: "3px 8px",
            fontSize: "12px",
          }}
        >
          <option value="auto">Auto</option>
          <option value="1ms">1ms/px</option>
          <option value="10ms">10ms/px</option>
          <option value="100ms">100ms/px</option>
        </select>
      </label>
      <div
        style={{ fontSize: "11px", color: "var(--hex-text-muted, #94a3b8)", marginLeft: "auto" }}
      >
        Zoom: {Math.round(zoomLevel * 100)}% (scroll to zoom)
      </div>
      <div style={{ display: "flex", gap: "12px", fontSize: "10px" }}>
        <LegendDot color={TRACK_COLORS.ok} label="< p50" />
        <LegendDot color={TRACK_COLORS.warning} label="p50-p90" />
        <LegendDot color={TRACK_COLORS.err} label="> p90 / Err" />
      </div>
    </div>
  );
}

export { AsyncWaterfallView };
export type { AsyncWaterfallViewProps, ConcurrentInput };
