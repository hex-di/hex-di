/**
 * OperationLogView — styled step-by-step log of a Result chain execution.
 *
 * Shows a summary bar, filter toolbar, step list with proper visual
 * encoding (category icons, track color badges, duration, chain labels),
 * and a detail inspector panel when a step is selected.
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import {
  formatDuration,
  getCategoryColor,
  getCategoryIcon,
  TRACK_COLORS,
} from "./visual-encoding.js";
import { getMethodCategory } from "./railway-node.js";
import { JsonTree } from "../../visualization/json-tree/json-tree.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultStepTrace,
  ResultViewId,
} from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface OperationLogViewProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution;
  readonly onNavigate?: (view: ResultViewId, context: Record<string, unknown>) => void;
}

// ── Filter state ────────────────────────────────────────────────────────────

type TrackFilter = "all" | "ok" | "err" | "switched";

interface LogFilterState {
  readonly trackFilter: TrackFilter;
  readonly methodFilter: string | undefined;
}

const DEFAULT_FILTERS: LogFilterState = {
  trackFilter: "all",
  methodFilter: undefined,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function isStepBypassed(chain: ResultChainDescriptor, step: ResultStepTrace): boolean {
  const op = chain.operations[step.operationIndex];
  if (!op) return false;
  if (op.inputTrack === "ok" && step.inputTrack === "err") return true;
  if (op.inputTrack === "err" && step.inputTrack === "ok") return true;
  return false;
}

function computeDiff(step: ResultStepTrace): { lines: string[]; switched: boolean } {
  const switched = step.inputTrack !== step.outputTrack;
  const lines: string[] = [];

  if (switched) {
    lines.push(
      `Track: ${step.inputTrack === "ok" ? "Ok" : "Err"} \u2192 ${step.outputTrack === "ok" ? "Ok" : "Err"}  (SWITCHED)`
    );
  }

  if (step.inputValue && step.outputValue) {
    const inputStr = JSON.stringify(step.inputValue.data);
    const outputStr = JSON.stringify(step.outputValue.data);
    if (inputStr !== outputStr) {
      lines.push(`- ${inputStr}`);
      lines.push(`+ ${outputStr}`);
    }
  }

  return { lines, switched };
}

function truncateValue(value: unknown, maxLen: number): string {
  if (value === undefined || value === null) return String(value);
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\u2026";
}

// ── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  fontFamily: "var(--hex-font-sans, sans-serif)",
  fontSize: "var(--hex-font-size-sm, 12px)",
  color: "var(--hex-text-primary, #e4e4f0)",
  overflow: "hidden",
};

const summaryBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--hex-space-md, 12px)",
  padding: "var(--hex-space-sm, 8px) var(--hex-space-md, 12px)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  borderBottom: "1px solid var(--hex-border, #424260)",
  fontFamily: "var(--hex-font-mono, monospace)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  flexShrink: 0,
};

const filterBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--hex-space-xs, 4px)",
  padding: "var(--hex-space-xs, 4px) var(--hex-space-md, 12px)",
  backgroundColor: "var(--hex-bg-primary, #1a1a2e)",
  borderBottom: "1px solid var(--hex-border, #424260)",
  flexShrink: 0,
};

const filterButtonBase: React.CSSProperties = {
  padding: "3px 10px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--hex-border, #424260)",
  borderRadius: "var(--hex-radius-sm, 4px)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  color: "var(--hex-text-muted, #6b6b80)",
  fontFamily: "var(--hex-font-mono, monospace)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  cursor: "pointer",
  lineHeight: 1.4,
};

const filterButtonActive: React.CSSProperties = {
  ...filterButtonBase,
  backgroundColor: "var(--hex-accent, #818cf8)",
  color: "var(--hex-bg-primary, #1a1a2e)",
  borderColor: "var(--hex-accent, #818cf8)",
};

const stepListStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: 0,
};

const headerRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "36px 1fr 120px 80px 70px",
  gap: "var(--hex-space-xs, 4px)",
  alignItems: "center",
  padding: "var(--hex-space-xs, 4px) var(--hex-space-md, 12px)",
  borderBottom: "1px solid var(--hex-border, #424260)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  color: "var(--hex-text-muted, #6b6b80)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

function getRowStyle(selected: boolean, switched: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "36px 1fr 120px 80px 70px",
    gap: "var(--hex-space-xs, 4px)",
    alignItems: "center",
    padding: "var(--hex-space-xs, 4px) var(--hex-space-md, 12px)",
    borderBottom: "1px solid var(--hex-border-subtle, #32324a)",
    backgroundColor: selected ? "var(--hex-bg-active, #2d2d50)" : "transparent",
    cursor: "pointer",
    borderLeft: switched ? `3px solid ${TRACK_COLORS.warning}` : "3px solid transparent",
    transition: "background-color 100ms ease",
  };
}

const trackBadgeStyle = (track: "ok" | "err"): React.CSSProperties => ({
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: "var(--hex-radius-pill, 9999px)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  fontFamily: "var(--hex-font-mono, monospace)",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: track === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err,
  lineHeight: 1.4,
});

const inspectorStyle: React.CSSProperties = {
  flexShrink: 0,
  maxHeight: 280,
  overflow: "auto",
  borderTop: "2px solid var(--hex-accent, #818cf8)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  padding: "var(--hex-space-sm, 8px) var(--hex-space-md, 12px)",
};

const separatorStyle: React.CSSProperties = {
  width: 1,
  height: 16,
  backgroundColor: "var(--hex-border, #424260)",
  flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1px 6px",
  borderRadius: "var(--hex-radius-pill, 9999px)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  fontFamily: "var(--hex-font-mono, monospace)",
  fontWeight: 600,
  lineHeight: 1,
};

// ── Component ───────────────────────────────────────────────────────────────

function OperationLogView({
  chain,
  execution,
  onNavigate,
}: OperationLogViewProps): React.ReactElement {
  const [selectedStep, setSelectedStep] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState<LogFilterState>(DEFAULT_FILTERS);
  const [diffMode, setDiffMode] = useState(false);

  // ── Stats ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let okCount = 0;
    let errCount = 0;
    let switchedCount = 0;

    for (const step of execution.steps) {
      if (step.outputTrack === "ok") okCount++;
      else errCount++;
      if (step.switched) switchedCount++;
    }

    return { total: execution.steps.length, okCount, errCount, switchedCount };
  }, [execution.steps]);

  // ── Filtered steps ──────────────────────────────────────────────────────

  const filteredSteps = useMemo(() => {
    return execution.steps.filter(step => {
      if (filters.trackFilter === "ok" && step.outputTrack !== "ok") return false;
      if (filters.trackFilter === "err" && step.outputTrack !== "err") return false;
      if (filters.trackFilter === "switched" && !step.switched) return false;
      if (filters.methodFilter) {
        const op = chain.operations[step.operationIndex];
        if (op && op.method !== filters.methodFilter) return false;
      }
      return true;
    });
  }, [execution.steps, filters, chain.operations]);

  const isFiltered = filters.trackFilter !== "all" || filters.methodFilter !== undefined;

  // ── Selected step data ──────────────────────────────────────────────────

  const selectedStepData =
    selectedStep !== undefined
      ? execution.steps.find(s => s.operationIndex === selectedStep)
      : undefined;

  const selectedOp = selectedStep !== undefined ? chain.operations[selectedStep] : undefined;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleRowClick = useCallback((opIndex: number) => {
    setSelectedStep(prev => (prev === opIndex ? undefined : opIndex));
  }, []);

  const setTrackFilter = useCallback((filter: TrackFilter) => {
    setFilters(prev => ({
      ...prev,
      trackFilter: prev.trackFilter === filter ? "all" : filter,
    }));
  }, []);

  const setMethodFilter = useCallback((method: string) => {
    setFilters(prev => ({
      ...prev,
      methodFilter: prev.methodFilter === method ? undefined : method,
    }));
  }, []);

  const toggleDiff = useCallback(() => {
    setDiffMode(prev => !prev);
  }, []);

  const handleViewInPipeline = useCallback(() => {
    if (selectedStep !== undefined) {
      onNavigate?.("railway", {
        executionId: execution.executionId,
        stepIndex: selectedStep,
      });
    }
  }, [selectedStep, execution.executionId, onNavigate]);

  // ── Unique methods for filter pills ─────────────────────────────────────

  const uniqueMethods = useMemo(() => {
    const seen = new Set<string>();
    const methods: { method: string; category: string; icon: string; color: string }[] = [];
    for (const op of chain.operations) {
      if (seen.has(op.method)) continue;
      seen.add(op.method);
      const category = getMethodCategory(op.method);
      methods.push({
        method: op.method,
        category,
        icon: getCategoryIcon(category),
        color: getCategoryColor(category),
      });
    }
    return methods;
  }, [chain.operations]);

  // ── Diff data ───────────────────────────────────────────────────────────

  const diffData = selectedStepData ? computeDiff(selectedStepData) : undefined;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div data-testid="operation-log-view" style={containerStyle}>
      {/* Summary Bar */}
      <div data-testid="log-summary" style={summaryBarStyle}>
        <span style={{ color: "var(--hex-text-primary, #e4e4f0)", fontWeight: 600 }}>
          {stats.total} operations
        </span>
        <div style={separatorStyle} />
        <span>
          <span style={{ color: TRACK_COLORS.ok }}>{stats.okCount} ok</span>
          {" \u00B7 "}
          <span style={{ color: TRACK_COLORS.err }}>{stats.errCount} err</span>
        </span>
        {stats.switchedCount > 0 && (
          <>
            <div style={separatorStyle} />
            <span style={{ color: TRACK_COLORS.warning }}>
              {"\u26A1"} {stats.switchedCount} switched
            </span>
          </>
        )}
        {isFiltered && (
          <>
            <div style={separatorStyle} />
            <span
              data-testid="filter-summary"
              style={{
                ...badgeStyle,
                backgroundColor: "var(--hex-accent, #818cf8)",
                color: "#fff",
              }}
            >
              {filteredSteps.length}/{stats.total}
            </span>
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div data-testid="log-filters" style={filterBarStyle}>
        {/* Track filters */}
        <button
          data-testid="filter-all"
          onClick={() => setTrackFilter("all")}
          style={filters.trackFilter === "all" ? filterButtonActive : filterButtonBase}
          aria-pressed={filters.trackFilter === "all"}
        >
          All
        </button>
        <button
          data-testid="filter-ok-only"
          onClick={() => setTrackFilter("ok")}
          style={filters.trackFilter === "ok" ? filterButtonActive : filterButtonBase}
          aria-pressed={filters.trackFilter === "ok"}
        >
          Ok
        </button>
        <button
          data-testid="filter-err-only"
          onClick={() => setTrackFilter("err")}
          style={filters.trackFilter === "err" ? filterButtonActive : filterButtonBase}
          aria-pressed={filters.trackFilter === "err"}
        >
          Err
        </button>
        <button
          data-testid="filter-switch-only"
          onClick={() => setTrackFilter("switched")}
          style={filters.trackFilter === "switched" ? filterButtonActive : filterButtonBase}
          aria-pressed={filters.trackFilter === "switched"}
        >
          {"\u26A1"} Switched
        </button>

        <div style={separatorStyle} />

        {/* Method filters */}
        {uniqueMethods.map(m => (
          <button
            key={m.method}
            data-testid={`filter-method-${m.method}`}
            onClick={() => setMethodFilter(m.method)}
            style={filters.methodFilter === m.method ? filterButtonActive : filterButtonBase}
            aria-pressed={filters.methodFilter === m.method}
          >
            <span style={{ marginRight: 4 }}>{m.icon}</span>
            {m.method}
          </button>
        ))}
      </div>

      {/* Step List */}
      <div data-testid="log-step-list" style={stepListStyle}>
        {/* Header row */}
        <div style={headerRowStyle}>
          <span>#</span>
          <span>Method</span>
          <span>Track</span>
          <span>Value</span>
          <span style={{ textAlign: "right" }}>Duration</span>
        </div>

        {/* Step rows */}
        {filteredSteps.map(step => {
          const op = chain.operations[step.operationIndex];
          if (!op) return null;

          const bypassed = isStepBypassed(chain, step);
          const category = getMethodCategory(op.method);
          const categoryIcon = getCategoryIcon(category);
          const categoryColor = getCategoryColor(category);
          const isSelected = selectedStep === step.operationIndex;

          return (
            <div
              key={step.operationIndex}
              data-testid="log-row"
              data-switched={step.switched ? "true" : "false"}
              data-bypassed={bypassed ? "true" : "false"}
              data-terminal={op.isTerminal ? "true" : "false"}
              data-selected={isSelected ? "true" : "false"}
              onClick={() => handleRowClick(step.operationIndex)}
              style={getRowStyle(isSelected, step.switched)}
            >
              {/* Index */}
              <span
                data-testid="log-cell-index"
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  fontSize: "var(--hex-font-size-xs, 11px)",
                  color: "var(--hex-text-muted, #6b6b80)",
                  textAlign: "center",
                }}
              >
                {step.operationIndex}
              </span>

              {/* Method with category icon and chain label */}
              <span
                data-testid="log-cell-method"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--hex-space-xs, 4px)",
                  overflow: "hidden",
                }}
              >
                <span style={{ color: categoryColor, fontSize: 14, flexShrink: 0 }}>
                  {categoryIcon}
                </span>
                <span
                  style={{
                    fontFamily: "var(--hex-font-mono, monospace)",
                    fontWeight: 600,
                    color: "var(--hex-text-primary, #e4e4f0)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {op.method}
                </span>
                {op.chainLabel && (
                  <span
                    style={{
                      fontSize: "var(--hex-font-size-xs, 11px)",
                      color: "var(--hex-text-muted, #6b6b80)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flexShrink: 1,
                    }}
                  >
                    {op.chainLabel}
                  </span>
                )}
              </span>

              {/* Track flow */}
              <span
                data-testid="log-cell-track"
                data-input-track={step.inputTrack}
                data-output-track={op.isTerminal ? "terminal" : step.outputTrack}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={trackBadgeStyle(step.inputTrack)}>
                  {step.inputTrack === "ok" ? "Ok" : "Err"}
                </span>
                <span
                  style={{
                    color: step.switched ? TRACK_COLORS.warning : "var(--hex-text-muted, #6b6b80)",
                    fontSize: 12,
                  }}
                >
                  {step.switched ? "\u26A1\u2192" : "\u2192"}
                </span>
                {op.isTerminal ? (
                  <span
                    style={{
                      ...badgeStyle,
                      backgroundColor: "var(--hex-text-muted, #6b6b80)",
                      color: "#fff",
                    }}
                  >
                    {"\u25FC"}
                  </span>
                ) : (
                  <span style={trackBadgeStyle(step.outputTrack)}>
                    {step.outputTrack === "ok" ? "Ok" : "Err"}
                  </span>
                )}
              </span>

              {/* Value preview */}
              <span
                data-testid="log-cell-value"
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  fontSize: "var(--hex-font-size-xs, 11px)",
                  color: "var(--hex-text-muted, #6b6b80)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {step.outputValue ? truncateValue(step.outputValue.data, 16) : "\u2014"}
              </span>

              {/* Duration */}
              <span
                data-testid="log-cell-duration"
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  fontSize: "var(--hex-font-size-xs, 11px)",
                  color: "var(--hex-text-secondary, #a0a0b8)",
                  textAlign: "right",
                }}
              >
                {formatDuration(step.durationMicros)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Value Inspector */}
      {selectedStepData && selectedOp && (
        <div data-testid="value-inspector" style={inspectorStyle}>
          {/* Inspector header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--hex-space-sm, 8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--hex-space-sm, 8px)" }}>
              <span
                style={{
                  color: getCategoryColor(getMethodCategory(selectedOp.method)),
                  fontSize: 16,
                }}
              >
                {getCategoryIcon(getMethodCategory(selectedOp.method))}
              </span>
              <span
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  fontWeight: 600,
                  color: "var(--hex-text-primary, #e4e4f0)",
                  fontSize: "var(--hex-font-size-md, 13px)",
                }}
              >
                {selectedOp.method}
              </span>
              <span
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: "var(--hex-text-muted, #6b6b80)",
                  fontSize: "var(--hex-font-size-xs, 11px)",
                }}
              >
                {formatDuration(selectedStepData.durationMicros)}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--hex-space-xs, 4px)" }}>
              <button
                data-testid="diff-toggle"
                onClick={toggleDiff}
                style={diffMode ? filterButtonActive : filterButtonBase}
              >
                {diffMode ? "Values" : "Diff"}
              </button>
              <button
                data-testid="link-view-in-pipeline"
                onClick={handleViewInPipeline}
                style={filterButtonBase}
              >
                View in Pipeline
              </button>
            </div>
          </div>

          {diffMode && diffData ? (
            <div data-testid="diff-view" style={{ fontFamily: "var(--hex-font-mono, monospace)" }}>
              {diffData.switched && (
                <div style={{ color: TRACK_COLORS.warning, marginBottom: 4 }}>
                  {"\u26A1"} TRACK SWITCHED
                </div>
              )}
              {diffData.lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.startsWith("-")
                      ? TRACK_COLORS.err
                      : line.startsWith("+")
                        ? TRACK_COLORS.ok
                        : "var(--hex-text-primary, #e4e4f0)",
                    padding: "1px 0",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--hex-space-md, 12px)",
              }}
            >
              <div data-testid="inspector-input">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 4,
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    fontWeight: 600,
                    color: "var(--hex-text-secondary, #a0a0b8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Input
                  <span style={trackBadgeStyle(selectedStepData.inputTrack)}>
                    {selectedStepData.inputTrack === "ok" ? "Ok" : "Err"}
                  </span>
                </div>
                <div style={{ maxHeight: 120, overflow: "auto" }}>
                  {selectedStepData.inputValue ? (
                    <JsonTree data={selectedStepData.inputValue.data} defaultExpandDepth={2} />
                  ) : (
                    <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>(not captured)</span>
                  )}
                </div>
              </div>
              <div data-testid="inspector-output">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 4,
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    fontWeight: 600,
                    color: "var(--hex-text-secondary, #a0a0b8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Output
                  {selectedOp.isTerminal ? (
                    <span
                      style={{
                        ...badgeStyle,
                        backgroundColor: "var(--hex-text-muted, #6b6b80)",
                        color: "#fff",
                      }}
                    >
                      {"\u25FC"}
                    </span>
                  ) : (
                    <span style={trackBadgeStyle(selectedStepData.outputTrack)}>
                      {selectedStepData.outputTrack === "ok" ? "Ok" : "Err"}
                    </span>
                  )}
                </div>
                <div style={{ maxHeight: 120, overflow: "auto" }}>
                  {selectedStepData.outputValue ? (
                    <JsonTree data={selectedStepData.outputValue.data} defaultExpandDepth={2} />
                  ) : (
                    <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>(not captured)</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { OperationLogView };
export type { OperationLogViewProps };
