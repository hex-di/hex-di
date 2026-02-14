/**
 * RailwayDetailSidebar -- slide-in detail panel for a selected railway node.
 *
 * Shows node identity, track flow, timing, input/output values, and
 * aggregate stats when an execution is available.
 *
 * Spec: 04-railway-pipeline.md (detail sidebar)
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { JsonTree } from "../../visualization/json-tree/json-tree.js";
import { SectionHeader } from "../../components/section-header.js";
import { formatDuration, getCategoryColor, getCategoryIcon } from "./visual-encoding.js";
import { getMethodCategory } from "./railway-node.js";
import type { ResultChainExecution, ResultOperationDescriptor, ResultStepTrace } from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface RailwayDetailSidebarProps {
  readonly operation: ResultOperationDescriptor;
  readonly step: ResultStepTrace | undefined;
  readonly execution: ResultChainExecution | undefined;
  readonly onClose: () => void;
  readonly visible: boolean;
}

// ── Aggregate Stats ─────────────────────────────────────────────────────────

interface AggregateStats {
  readonly okToOk: number;
  readonly okToErr: number;
  readonly errToOk: number;
  readonly errToErr: number;
  readonly bypassed: number;
}

function computeAggregateStats(
  execution: ResultChainExecution,
  operationIndex: number
): AggregateStats {
  let okToOk = 0;
  let okToErr = 0;
  let errToOk = 0;
  let errToErr = 0;
  let bypassed = 0;

  for (const s of execution.steps) {
    if (s.operationIndex !== operationIndex) continue;

    if (s.inputTrack === "ok" && s.outputTrack === "ok") okToOk++;
    else if (s.inputTrack === "ok" && s.outputTrack === "err") okToErr++;
    else if (s.inputTrack === "err" && s.outputTrack === "ok") errToOk++;
    else if (s.inputTrack === "err" && s.outputTrack === "err") errToErr++;
  }

  // In a single execution, the step array usually has one entry per operation index.
  // A step is "bypassed" when the operation's expected input track doesn't match the
  // step's actual input track, but for aggregate counting we detect no matching step.
  const stepsForOp = execution.steps.filter(s => s.operationIndex === operationIndex);
  if (stepsForOp.length === 0) {
    bypassed = 1;
  }

  return { okToOk, okToErr, errToOk, errToErr, bypassed };
}

// ── Track Badge ─────────────────────────────────────────────────────────────

function TrackBadge({ track }: { readonly track: "ok" | "err" }): React.ReactElement {
  const isOk = track === "ok";
  return (
    <span
      data-testid={`track-badge-${track}`}
      style={{
        display: "inline-block",
        padding: "1px 8px",
        borderRadius: "var(--hex-radius-pill, 9999px)",
        fontSize: "var(--hex-font-size-xs, 11px)",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontWeight: 600,
        color: "#fff",
        backgroundColor: isOk ? "var(--hex-success, #4ade80)" : "var(--hex-error, #f87171)",
      }}
    >
      {isOk ? "Ok" : "Err"}
    </span>
  );
}

// ── Value Section ───────────────────────────────────────────────────────────

function ValueSection({
  label,
  track,
  value,
  testId,
}: {
  readonly label: string;
  readonly track: "ok" | "err";
  readonly value: unknown;
  readonly testId: string;
}): React.ReactElement {
  return (
    <div
      data-testid={testId}
      style={{
        padding: "var(--hex-space-sm, 8px) 0",
        borderBottom: "1px solid var(--hex-border, #424260)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--hex-space-xs, 4px)",
          marginBottom: "var(--hex-space-xs, 4px)",
        }}
      >
        <span
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            fontWeight: 600,
            color: "var(--hex-text-secondary, #a0a0b8)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        <TrackBadge track={track} />
      </div>
      <div
        style={{
          maxHeight: 160,
          overflow: "auto",
          fontSize: "var(--hex-font-size-sm, 12px)",
        }}
      >
        <JsonTree data={value} defaultExpandDepth={2} />
      </div>
    </div>
  );
}

// ── Stat Row ────────────────────────────────────────────────────────────────

function StatRow({
  label,
  count,
  testId,
}: {
  readonly label: string;
  readonly count: number;
  readonly testId: string;
}): React.ReactElement {
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2px 0",
        fontSize: "var(--hex-font-size-xs, 11px)",
      }}
    >
      <span style={{ color: "var(--hex-text-secondary, #a0a0b8)" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontWeight: 600,
          color: "var(--hex-text-primary, #e4e4f0)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

function RailwayDetailSidebar({
  operation,
  step,
  execution,
  onClose,
  visible,
}: RailwayDetailSidebarProps): React.ReactElement {
  const category = getMethodCategory(operation.method);
  const categoryIcon = getCategoryIcon(category);
  const categoryColor = getCategoryColor(category);

  // Compute timing percentage
  const durationPercent = useMemo(() => {
    if (!step || !execution || execution.totalDurationMicros === 0) {
      return undefined;
    }
    return (step.durationMicros / execution.totalDurationMicros) * 100;
  }, [step, execution]);

  // Compute aggregate stats
  const aggregateStats = useMemo(() => {
    if (!execution) return undefined;
    return computeAggregateStats(execution, operation.index);
  }, [execution, operation.index]);

  return (
    <div
      data-testid="railway-detail-sidebar"
      role="complementary"
      aria-label={`Details for ${operation.method}`}
      style={{
        width: 280,
        height: "100%",
        overflow: "auto",
        backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
        borderLeft: "1px solid var(--hex-border, #424260)",
        fontFamily: "var(--hex-font-sans, sans-serif)",
        fontSize: "var(--hex-font-size-sm, 12px)",
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 200ms ease-out",
        zIndex: 20,
      }}
    >
      {/* Header with close button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--hex-space-sm, 8px)",
          borderBottom: "1px solid var(--hex-border, #424260)",
        }}
      >
        <span
          style={{
            fontWeight: "var(--hex-font-weight-medium, 500)",
            color: "var(--hex-text-primary, #e4e4f0)",
          }}
        >
          Node Detail
        </span>
        <button
          data-testid="sidebar-close-button"
          onClick={onClose}
          aria-label="Close detail sidebar"
          style={{
            border: "none",
            background: "none",
            color: "var(--hex-text-muted, #6b6b80)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 4,
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Section 1: Node Identity */}
      <div
        data-testid="node-identity-section"
        style={{
          padding: "var(--hex-space-sm, 8px)",
          borderBottom: "1px solid var(--hex-border, #424260)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--hex-space-sm, 8px)",
            marginBottom: "var(--hex-space-xs, 4px)",
          }}
        >
          <span
            data-testid="detail-category-icon"
            style={{
              color: categoryColor,
              fontSize: "var(--hex-font-size-xl, 18px)",
              lineHeight: 1,
            }}
          >
            {categoryIcon}
          </span>
          <div>
            <div
              data-testid="detail-method-name"
              style={{
                fontFamily: "var(--hex-font-mono, monospace)",
                fontWeight: 600,
                color: "var(--hex-text-primary, #e4e4f0)",
                fontSize: "var(--hex-font-size-md, 13px)",
              }}
            >
              {operation.method}
            </div>
            <div
              data-testid="detail-label"
              style={{
                color: "var(--hex-text-muted, #6b6b80)",
                fontSize: "var(--hex-font-size-xs, 11px)",
              }}
            >
              {operation.label}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Category: <span style={{ color: categoryColor }}>{category}</span>
          {" | "}Index: {operation.index}
        </div>
      </div>

      {/* Section 2: Track Flow */}
      {step !== undefined && (
        <div
          data-testid="track-flow-section"
          style={{
            padding: "var(--hex-space-sm, 8px)",
            borderBottom: "1px solid var(--hex-border, #424260)",
          }}
        >
          <SectionHeader title="Track Flow" level={3} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--hex-space-sm, 8px)",
              justifyContent: "center",
            }}
          >
            <TrackBadge track={step.inputTrack} />
            <span
              style={{
                color: step.switched
                  ? "var(--hex-warning, #fbbf24)"
                  : "var(--hex-text-muted, #6b6b80)",
                fontSize: 16,
              }}
            >
              {step.switched ? "\u26A1\u2192" : "\u2192"}
            </span>
            <TrackBadge track={step.outputTrack} />
          </div>
          {step.switched && (
            <div
              data-testid="switch-indicator"
              style={{
                textAlign: "center",
                marginTop: "var(--hex-space-xs, 4px)",
                fontSize: "var(--hex-font-size-xs, 11px)",
                color: "var(--hex-warning, #fbbf24)",
                fontWeight: 600,
              }}
            >
              Track switched
            </div>
          )}
        </div>
      )}

      {/* Section 3: Timing */}
      {step !== undefined && (
        <div
          data-testid="timing-section"
          style={{
            padding: "var(--hex-space-sm, 8px)",
            borderBottom: "1px solid var(--hex-border, #424260)",
          }}
        >
          <SectionHeader title="Timing" level={3} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ color: "var(--hex-text-secondary, #a0a0b8)" }}>Duration</span>
            <span
              data-testid="detail-duration"
              style={{
                fontFamily: "var(--hex-font-mono, monospace)",
                fontWeight: 600,
                color: "var(--hex-text-primary, #e4e4f0)",
              }}
            >
              {formatDuration(step.durationMicros)}
            </span>
          </div>
          {durationPercent !== undefined && (
            <div
              style={{
                marginTop: "var(--hex-space-xs, 4px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    color: "var(--hex-text-secondary, #a0a0b8)",
                    fontSize: "var(--hex-font-size-xs, 11px)",
                  }}
                >
                  % of chain
                </span>
                <span
                  data-testid="detail-duration-percent"
                  style={{
                    fontFamily: "var(--hex-font-mono, monospace)",
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    color: "var(--hex-text-primary, #e4e4f0)",
                  }}
                >
                  {durationPercent.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "var(--hex-border, #424260)",
                  overflow: "hidden",
                }}
              >
                <div
                  data-testid="duration-bar"
                  style={{
                    height: "100%",
                    width: `${Math.min(durationPercent, 100)}%`,
                    backgroundColor: "var(--hex-accent, #818cf8)",
                    borderRadius: 2,
                    transition: "width 200ms ease-out",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 4: Input Value */}
      {step?.inputValue !== undefined && (
        <div style={{ padding: "0 var(--hex-space-sm, 8px)" }}>
          <ValueSection
            label="Input"
            track={step.inputTrack}
            value={step.inputValue.data}
            testId="input-value-section"
          />
        </div>
      )}

      {/* Section 5: Output Value */}
      {step?.outputValue !== undefined && (
        <div style={{ padding: "0 var(--hex-space-sm, 8px)" }}>
          <ValueSection
            label="Output"
            track={step.outputTrack}
            value={step.outputValue.data}
            testId="output-value-section"
          />
        </div>
      )}

      {/* Section 6: Aggregate Stats */}
      {aggregateStats !== undefined && execution !== undefined && (
        <div
          data-testid="aggregate-stats-section"
          style={{
            padding: "var(--hex-space-sm, 8px)",
            borderBottom: "1px solid var(--hex-border, #424260)",
          }}
        >
          <SectionHeader title="Aggregate Stats" level={3} />
          <StatRow label="Ok \u2192 Ok" count={aggregateStats.okToOk} testId="stat-ok-to-ok" />
          <StatRow label="Ok \u2192 Err" count={aggregateStats.okToErr} testId="stat-ok-to-err" />
          <StatRow label="Err \u2192 Ok" count={aggregateStats.errToOk} testId="stat-err-to-ok" />
          <StatRow
            label="Err \u2192 Err"
            count={aggregateStats.errToErr}
            testId="stat-err-to-err"
          />
          {aggregateStats.bypassed > 0 && (
            <StatRow label="Bypassed" count={aggregateStats.bypassed} testId="stat-bypassed" />
          )}
        </div>
      )}

      {/* Operation metadata */}
      <div
        data-testid="operation-metadata-section"
        style={{
          padding: "var(--hex-space-sm, 8px)",
        }}
      >
        <SectionHeader title="Properties" level={3} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: "var(--hex-font-size-xs, 11px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>Input Track</span>
            <span
              style={{
                fontFamily: "var(--hex-font-mono, monospace)",
                color: "var(--hex-text-primary, #e4e4f0)",
              }}
            >
              {operation.inputTrack}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>Output Tracks</span>
            <span
              style={{
                fontFamily: "var(--hex-font-mono, monospace)",
                color: "var(--hex-text-primary, #e4e4f0)",
              }}
            >
              {operation.outputTracks.join(", ")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>Can Switch</span>
            <span
              style={{
                fontFamily: "var(--hex-font-mono, monospace)",
                color: operation.canSwitch
                  ? "var(--hex-warning, #fbbf24)"
                  : "var(--hex-text-primary, #e4e4f0)",
              }}
            >
              {operation.canSwitch ? "yes" : "no"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>Terminal</span>
            <span
              style={{
                fontFamily: "var(--hex-font-mono, monospace)",
                color: "var(--hex-text-primary, #e4e4f0)",
              }}
            >
              {operation.isTerminal ? "yes" : "no"}
            </span>
          </div>
          {operation.callbackLocation !== undefined && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>Source</span>
              <span
                data-testid="callback-location"
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: "var(--hex-accent, #818cf8)",
                  fontSize: "var(--hex-font-size-xs, 11px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
                title={operation.callbackLocation}
              >
                {operation.callbackLocation}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { RailwayDetailSidebar };
export type { RailwayDetailSidebarProps };
