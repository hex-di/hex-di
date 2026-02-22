/**
 * CaseExplorerView — path tree visualization with runtime coverage overlay.
 *
 * Spec: 06-case-explorer.md (6.1-6.7)
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import { classifyPath, computePathCoverage } from "./path-analysis.js";
import { TRACK_COLORS } from "./visual-encoding.js";
import type { ResultChainDescriptor, ResultPathDescriptor } from "./types.js";

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_DISPLAYED_PATHS = 16;

const CLASSIFICATION_ICONS: Record<string, string> = {
  happy: "\u2705", // ✅
  error: "\u274C", // ❌
  recovery: "\u21A9", // ↩
  "multi-error": "\u26A0\uFE0F", // ⚠️
  unobserved: "\uD83D\uDC7B", // 👻
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  happy: "Happy Path",
  error: "Error Path",
  recovery: "Recovery Path",
  "multi-error": "Multi-Error",
  unobserved: "Unobserved",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface CaseExplorerViewProps {
  readonly chain: ResultChainDescriptor;
  readonly paths: readonly ResultPathDescriptor[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getPathClassificationType(path: ResultPathDescriptor): string {
  if (!path.observed) return "unobserved";
  return classifyPath(path.trackSequence);
}

interface CollapsedGroup {
  readonly count: number;
  readonly label: string;
  readonly opIndices: number[];
}

function computeCollapsedGroups(chain: ResultChainDescriptor): CollapsedGroup[] {
  const groups: CollapsedGroup[] = [];
  let currentGroup: { method: string; indices: number[] } | undefined;

  for (const op of chain.operations) {
    if (!op.canSwitch && !op.isTerminal && op.method !== "ok" && op.method !== "err") {
      if (currentGroup && currentGroup.method === op.method) {
        currentGroup.indices.push(op.index);
      } else {
        if (currentGroup) {
          groups.push({
            count: currentGroup.indices.length,
            label: `[${currentGroup.indices.length} ${currentGroup.method}${currentGroup.indices.length > 1 ? "s" : ""}]`,
            opIndices: currentGroup.indices,
          });
        }
        currentGroup = { method: op.method, indices: [op.index] };
      }
    } else {
      if (currentGroup) {
        groups.push({
          count: currentGroup.indices.length,
          label: `[${currentGroup.indices.length} ${currentGroup.method}${currentGroup.indices.length > 1 ? "s" : ""}]`,
          opIndices: currentGroup.indices,
        });
        currentGroup = undefined;
      }
    }
  }

  if (currentGroup) {
    groups.push({
      count: currentGroup.indices.length,
      label: `[${currentGroup.indices.length} ${currentGroup.method}${currentGroup.indices.length > 1 ? "s" : ""}]`,
      opIndices: currentGroup.indices,
    });
  }

  return groups;
}

function findSwitchCapableOps(chain: ResultChainDescriptor): number[] {
  return chain.operations.filter(op => op.canSwitch).map(op => op.index);
}

// ── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  fontFamily: "var(--hex-font-sans, sans-serif)",
  fontSize: "var(--hex-font-size-sm, 12px)",
  color: "var(--hex-text-primary, #e4e4f0)",
  gap: "var(--hex-space-md, 12px)",
};

const summaryHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--hex-space-lg, 16px)",
  padding: "var(--hex-space-sm, 8px) var(--hex-space-md, 12px)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  borderRadius: "var(--hex-radius-md, 8px)",
  border: "1px solid var(--hex-border, #424260)",
};

const statBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
};

const statValueStyle: React.CSSProperties = {
  fontSize: "var(--hex-font-size-lg, 18px)",
  fontWeight: 700,
  fontFamily: "var(--hex-font-mono, monospace)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "var(--hex-font-size-xs, 11px)",
  color: "var(--hex-text-muted, #6b6b80)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const contentLayoutStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--hex-space-md, 12px)",
  flex: 1,
  overflow: "hidden",
};

const pathTreePanelStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--hex-space-sm, 8px)",
  overflow: "auto",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "var(--hex-font-size-xs, 11px)",
  color: "var(--hex-text-muted, #6b6b80)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 600,
  marginBottom: "var(--hex-space-xs, 4px)",
};

const branchCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--hex-space-sm, 8px)",
  padding: "var(--hex-space-sm, 8px) var(--hex-space-md, 12px)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  border: "1px solid var(--hex-border, #424260)",
  borderRadius: "var(--hex-radius-sm, 4px)",
  borderLeft: `3px solid ${TRACK_COLORS.warning}`,
};

const branchMethodStyle: React.CSSProperties = {
  fontFamily: "var(--hex-font-mono, monospace)",
  fontWeight: 600,
  fontSize: "var(--hex-font-size-sm, 12px)",
};

const branchLabelTextStyle: React.CSSProperties = {
  fontFamily: "var(--hex-font-mono, monospace)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  color: "var(--hex-text-muted, #6b6b80)",
};

const trackBadgeStyle = (track: "ok" | "err"): React.CSSProperties => ({
  display: "inline-block",
  padding: "1px 8px",
  borderRadius: "var(--hex-radius-pill, 9999px)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  fontFamily: "var(--hex-font-mono, monospace)",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: track === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err,
  lineHeight: 1.4,
});

const collapsedBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "var(--hex-radius-pill, 9999px)",
  fontSize: "var(--hex-font-size-xs, 11px)",
  fontFamily: "var(--hex-font-mono, monospace)",
  color: "var(--hex-text-muted, #6b6b80)",
  backgroundColor: "var(--hex-bg-tertiary, #32324a)",
  border: "1px solid var(--hex-border, #424260)",
  cursor: "pointer",
  userSelect: "none",
};

function getPathLeafStyle(selected: boolean, observed: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--hex-space-sm, 8px)",
    padding: "var(--hex-space-sm, 8px) var(--hex-space-md, 12px)",
    backgroundColor: selected
      ? "var(--hex-bg-active, #2d2d50)"
      : "var(--hex-bg-secondary, #2a2a3e)",
    border: selected
      ? "1px solid var(--hex-accent, #818cf8)"
      : "1px solid var(--hex-border, #424260)",
    borderRadius: "var(--hex-radius-sm, 4px)",
    cursor: "pointer",
    opacity: observed ? 1 : 0.6,
    transition: "background-color 100ms ease, border-color 100ms ease",
  };
}

const frequencyBarContainerStyle: React.CSSProperties = {
  flex: 1,
  height: 6,
  backgroundColor: "var(--hex-bg-tertiary, #32324a)",
  borderRadius: 3,
  overflow: "hidden",
};

const pathDescriptionStyle: React.CSSProperties = {
  fontSize: "var(--hex-font-size-xs, 11px)",
  color: "var(--hex-text-muted, #6b6b80)",
  fontFamily: "var(--hex-font-mono, monospace)",
  flex: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const pathFrequencyStyle: React.CSSProperties = {
  fontSize: "var(--hex-font-size-xs, 11px)",
  fontFamily: "var(--hex-font-mono, monospace)",
  color: "var(--hex-text-secondary, #9ca3af)",
  whiteSpace: "nowrap",
  minWidth: 90,
  textAlign: "right",
};

const detailPanelStyle: React.CSSProperties = {
  width: 280,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--hex-space-md, 12px)",
  padding: "var(--hex-space-md, 12px)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  border: "1px solid var(--hex-border, #424260)",
  borderRadius: "var(--hex-radius-md, 8px)",
  overflow: "auto",
};

const classificationBadgeStyle = (type: string): React.CSSProperties => {
  const colorMap: Record<string, string> = {
    happy: TRACK_COLORS.ok,
    error: TRACK_COLORS.err,
    recovery: TRACK_COLORS.warning,
    "multi-error": TRACK_COLORS.err,
    unobserved: "var(--hex-text-muted, #6b6b80)",
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: "var(--hex-radius-pill, 9999px)",
    fontSize: "var(--hex-font-size-sm, 12px)",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: colorMap[type] ?? "var(--hex-text-muted, #6b6b80)",
  };
};

const detailRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "var(--hex-font-size-xs, 11px)",
  color: "var(--hex-text-muted, #6b6b80)",
};

const detailValueStyle: React.CSSProperties = {
  fontFamily: "var(--hex-font-mono, monospace)",
  color: "var(--hex-text-primary, #e4e4f0)",
  fontWeight: 500,
};

const trackSequenceStyle: React.CSSProperties = {
  display: "flex",
  gap: 2,
  flexWrap: "wrap",
};

const trackDotStyle = (track: "ok" | "err"): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: track === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err,
});

// ── Component ───────────────────────────────────────────────────────────────

function CaseExplorerView({ chain, paths }: CaseExplorerViewProps): React.ReactElement {
  const [selectedPathId, setSelectedPathId] = useState<string | undefined>(undefined);
  const [expandedBadges, setExpandedBadges] = useState<Set<number>>(new Set());

  // ── Computed data ─────────────────────────────────────────────────────

  const switchCapableOps = useMemo(() => findSwitchCapableOps(chain), [chain]);
  const collapsedGroups = useMemo(() => computeCollapsedGroups(chain), [chain]);

  const displayedPaths = useMemo(() => {
    if (paths.length <= MAX_DISPLAYED_PATHS) return { shown: paths, truncated: 0 };
    const sorted = [...paths].sort((a, b) => b.frequency - a.frequency);
    return {
      shown: sorted.slice(0, MAX_DISPLAYED_PATHS),
      truncated: paths.length - MAX_DISPLAYED_PATHS,
    };
  }, [paths]);

  const selectedPath =
    selectedPathId !== undefined ? paths.find(p => p.pathId === selectedPathId) : undefined;

  const observedCount = useMemo(() => paths.filter(p => p.observed).length, [paths]);
  const coverage = useMemo(
    () => computePathCoverage({ totalPaths: paths.length, observedPaths: observedCount }),
    [paths.length, observedCount]
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handlePathClick = useCallback((pathId: string) => {
    setSelectedPathId(pathId);
  }, []);

  const toggleBadge = useCallback((index: number) => {
    setExpandedBadges(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div data-testid="case-explorer-view" style={containerStyle}>
      {/* Summary Header */}
      <div data-testid="case-summary-header" style={summaryHeaderStyle}>
        <div style={statBoxStyle}>
          <span style={statValueStyle}>{paths.length}</span>
          <span style={statLabelStyle}>Paths</span>
        </div>
        <div style={{ width: 1, height: 28, backgroundColor: "var(--hex-border, #424260)" }} />
        <div style={statBoxStyle}>
          <span style={statValueStyle}>{observedCount}</span>
          <span style={statLabelStyle}>Observed</span>
        </div>
        <div style={{ width: 1, height: 28, backgroundColor: "var(--hex-border, #424260)" }} />
        <div style={statBoxStyle}>
          <span
            style={{
              ...statValueStyle,
              color:
                coverage >= 0.8
                  ? TRACK_COLORS.ok
                  : coverage >= 0.5
                    ? TRACK_COLORS.warning
                    : TRACK_COLORS.err,
            }}
          >
            {Math.round(coverage * 100)}%
          </span>
          <span style={statLabelStyle}>Coverage</span>
        </div>
        <div style={{ width: 1, height: 28, backgroundColor: "var(--hex-border, #424260)" }} />
        <div style={statBoxStyle}>
          <span style={statValueStyle}>{switchCapableOps.length}</span>
          <span style={statLabelStyle}>Branch Points</span>
        </div>
      </div>

      {/* Main content: path tree + detail panel */}
      <div style={contentLayoutStyle}>
        <div data-testid="path-tree" style={pathTreePanelStyle}>
          {/* Branch points section */}
          {switchCapableOps.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Branch Points</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--hex-space-xs, 4px)",
                }}
              >
                {switchCapableOps.map(opIdx => {
                  const op = chain.operations[opIdx];
                  return (
                    <div
                      key={opIdx}
                      data-testid="path-branch"
                      data-operation-index={opIdx}
                      style={branchCardStyle}
                    >
                      <span
                        style={{
                          color: "var(--hex-text-muted, #6b6b80)",
                          fontSize: "var(--hex-font-size-xs, 11px)",
                          fontFamily: "var(--hex-font-mono, monospace)",
                          minWidth: 20,
                        }}
                      >
                        #{opIdx}
                      </span>
                      <span style={branchMethodStyle}>{op.method}</span>
                      <span style={branchLabelTextStyle}>({op.label})</span>
                      <span style={{ marginLeft: "auto" }} />
                      <span
                        data-testid="branch-label"
                        data-track="ok"
                        style={trackBadgeStyle("ok")}
                      >
                        Ok
                      </span>
                      <span
                        data-testid="branch-label"
                        data-track="err"
                        style={trackBadgeStyle("err")}
                      >
                        Err
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsed groups */}
          {collapsedGroups.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--hex-space-xs, 4px)" }}>
              {collapsedGroups.map((group, i) => (
                <span
                  key={i}
                  data-testid="collapsed-ops-badge"
                  data-expanded={expandedBadges.has(i) ? "true" : "false"}
                  onClick={() => toggleBadge(i)}
                  style={collapsedBadgeStyle}
                >
                  {group.label}
                </span>
              ))}
            </div>
          )}

          {/* Path leaves section */}
          <div>
            <div style={sectionLabelStyle}>Enumerated Paths</div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "var(--hex-space-xs, 4px)" }}
            >
              {displayedPaths.shown.map(path => {
                const pct = Math.round(path.frequency * 100);
                const classification = getPathClassificationType(path);
                const isSelected = path.pathId === selectedPathId;
                return (
                  <div
                    key={path.pathId}
                    data-testid="path-leaf"
                    data-path-id={path.pathId}
                    onClick={() => handlePathClick(path.pathId)}
                    style={getPathLeafStyle(isSelected, path.observed)}
                  >
                    <span
                      data-testid="path-observed-icon"
                      data-observed={String(path.observed)}
                      style={{ fontSize: 14, flexShrink: 0 }}
                    >
                      {CLASSIFICATION_ICONS[classification] ?? CLASSIFICATION_ICONS.unobserved}
                    </span>
                    <div style={trackSequenceStyle}>
                      {path.trackSequence.map((track, ti) => (
                        <span
                          key={ti}
                          style={trackDotStyle(track)}
                          title={`Step ${ti}: ${track}`}
                        />
                      ))}
                    </div>
                    <span style={pathDescriptionStyle} title={path.description}>
                      {path.description}
                    </span>
                    <span style={pathFrequencyStyle}>
                      {pct}% ({path.observedCount} runs)
                    </span>
                    <div style={frequencyBarContainerStyle}>
                      <span
                        data-testid="frequency-bar"
                        data-frequency={path.frequency}
                        style={{
                          display: "block",
                          width: `${Math.max(pct, 1)}%`,
                          height: "100%",
                          borderRadius: 3,
                          backgroundColor: path.observed
                            ? TRACK_COLORS.ok
                            : "var(--hex-text-muted, #6b6b80)",
                          transition: "width 200ms ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Truncation indicator */}
          {displayedPaths.truncated > 0 && (
            <div
              data-testid="more-paths-indicator"
              style={{
                textAlign: "center",
                padding: "var(--hex-space-sm, 8px)",
                color: "var(--hex-text-muted, #6b6b80)",
                fontSize: "var(--hex-font-size-xs, 11px)",
              }}
            >
              {displayedPaths.truncated} more paths...
            </div>
          )}
        </div>

        {/* Path Detail Panel */}
        {selectedPath && (
          <div data-testid="path-detail-panel" style={detailPanelStyle}>
            <span
              data-testid="path-classification"
              data-type={getPathClassificationType(selectedPath)}
              style={classificationBadgeStyle(getPathClassificationType(selectedPath))}
            >
              {CLASSIFICATION_ICONS[getPathClassificationType(selectedPath)] ?? ""}{" "}
              {CLASSIFICATION_LABELS[getPathClassificationType(selectedPath)] ??
                getPathClassificationType(selectedPath)}
            </span>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "var(--hex-space-sm, 8px)" }}
            >
              <div style={detailRowStyle}>
                <span>Frequency</span>
                <span style={detailValueStyle}>
                  {Math.round(selectedPath.frequency * 100)}% ({selectedPath.observedCount} runs)
                </span>
              </div>

              <div style={detailRowStyle}>
                <span>Switch Points</span>
                <span style={detailValueStyle}>
                  {selectedPath.switchPoints.length > 0
                    ? selectedPath.switchPoints.map(sp => `#${sp}`).join(", ")
                    : "none"}
                </span>
              </div>

              <div>
                <div style={{ ...sectionLabelStyle, marginTop: "var(--hex-space-sm, 8px)" }}>
                  Track Sequence
                </div>
                <div
                  style={{ ...trackSequenceStyle, gap: 3, padding: "var(--hex-space-xs, 4px) 0" }}
                >
                  {selectedPath.trackSequence.map((track, ti) => (
                    <span
                      key={ti}
                      style={{ ...trackDotStyle(track), width: 10, height: 10 }}
                      title={`Step ${ti}: ${track}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={sectionLabelStyle}>Description</div>
                <div
                  style={{
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    fontFamily: "var(--hex-font-mono, monospace)",
                    color: "var(--hex-text-secondary, #9ca3af)",
                  }}
                >
                  {selectedPath.description}
                </div>
              </div>

              {!selectedPath.observed && (
                <div
                  style={{
                    padding: "var(--hex-space-sm, 8px)",
                    backgroundColor: "rgba(251, 191, 36, 0.1)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "var(--hex-radius-sm, 4px)",
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    color: TRACK_COLORS.warning,
                  }}
                >
                  <span>This path was never observed</span>
                </div>
              )}
            </div>

            <div data-testid="path-recent-executions" style={{ marginTop: "auto" }}>
              <div style={sectionLabelStyle}>Recent Executions</div>
              <div
                style={{
                  fontSize: "var(--hex-font-size-xs, 11px)",
                  color: "var(--hex-text-muted, #6b6b80)",
                  fontStyle: "italic",
                }}
              >
                {selectedPath.observed
                  ? `${selectedPath.observedCount} execution${selectedPath.observedCount !== 1 ? "s" : ""} recorded`
                  : "No executions recorded"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { CaseExplorerView };
export type { CaseExplorerViewProps };
