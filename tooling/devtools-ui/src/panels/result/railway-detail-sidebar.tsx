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
import { SectionHeader } from "../../components/section-header.js";
import { RailwayDetailStatRow } from "./components/railway-detail-sidebar-stat-row.js";
import { RailwayDetailTrackBadge } from "./components/railway-detail-sidebar-track-badge.js";
import { RailwayDetailValueSection } from "./components/railway-detail-sidebar-value-section.js";
import { computeAggregateStats } from "./helpers/railway-detail-sidebar-stats.js";
import { getCategoryColor, getCategoryIcon } from "./visual-encoding.js";
import { getMethodCategory } from "./railway-node.js";
import {
  SidebarTimingSection,
  SidebarPropertiesSection,
} from "./railway-detail-sidebar-sections.js";
import type { ResultChainExecution, ResultOperationDescriptor, ResultStepTrace } from "./types.js";

interface RailwayDetailSidebarProps {
  readonly operation: ResultOperationDescriptor;
  readonly step: ResultStepTrace | undefined;
  readonly execution: ResultChainExecution | undefined;
  readonly onClose: () => void;
  readonly visible: boolean;
}

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

  const durationPercent = useMemo(() => {
    if (!step || !execution || execution.totalDurationMicros === 0) {
      return undefined;
    }
    return (step.durationMicros / execution.totalDurationMicros) * 100;
  }, [step, execution]);

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
            <RailwayDetailTrackBadge track={step.inputTrack} />
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
            <RailwayDetailTrackBadge track={step.outputTrack} />
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

      {step !== undefined && <SidebarTimingSection step={step} durationPercent={durationPercent} />}

      {step?.inputValue !== undefined && (
        <div style={{ padding: "0 var(--hex-space-sm, 8px)" }}>
          <RailwayDetailValueSection
            label="Input"
            track={step.inputTrack}
            value={step.inputValue.data}
            testId="input-value-section"
          />
        </div>
      )}

      {step?.outputValue !== undefined && (
        <div style={{ padding: "0 var(--hex-space-sm, 8px)" }}>
          <RailwayDetailValueSection
            label="Output"
            track={step.outputTrack}
            value={step.outputValue.data}
            testId="output-value-section"
          />
        </div>
      )}

      {aggregateStats !== undefined && execution !== undefined && (
        <div
          data-testid="aggregate-stats-section"
          style={{
            padding: "var(--hex-space-sm, 8px)",
            borderBottom: "1px solid var(--hex-border, #424260)",
          }}
        >
          <SectionHeader title="Aggregate Stats" level={3} />
          <RailwayDetailStatRow
            label="Ok \u2192 Ok"
            count={aggregateStats.okToOk}
            testId="stat-ok-to-ok"
          />
          <RailwayDetailStatRow
            label="Ok \u2192 Err"
            count={aggregateStats.okToErr}
            testId="stat-ok-to-err"
          />
          <RailwayDetailStatRow
            label="Err \u2192 Ok"
            count={aggregateStats.errToOk}
            testId="stat-err-to-ok"
          />
          <RailwayDetailStatRow
            label="Err \u2192 Err"
            count={aggregateStats.errToErr}
            testId="stat-err-to-err"
          />
          {aggregateStats.bypassed > 0 && (
            <RailwayDetailStatRow
              label="Bypassed"
              count={aggregateStats.bypassed}
              testId="stat-bypassed"
            />
          )}
        </div>
      )}

      <SidebarPropertiesSection operation={operation} />
    </div>
  );
}

export { RailwayDetailSidebar };
export type { RailwayDetailSidebarProps };
