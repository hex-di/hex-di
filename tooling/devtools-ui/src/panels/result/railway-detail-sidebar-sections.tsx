/**
 * Sub-sections for RailwayDetailSidebar: Timing and Properties.
 *
 * @packageDocumentation
 */

import { SectionHeader } from "../../components/section-header.js";
import { formatDuration } from "./visual-encoding.js";
import type { ResultOperationDescriptor, ResultStepTrace } from "./types.js";

// ── Timing Section ─────────────────────────────────────────────────────────

export function SidebarTimingSection({
  step,
  durationPercent,
}: {
  readonly step: ResultStepTrace;
  readonly durationPercent: number | undefined;
}): React.ReactElement {
  return (
    <div
      data-testid="timing-section"
      style={{
        padding: "var(--hex-space-sm, 8px)",
        borderBottom: "1px solid var(--hex-border, #424260)",
      }}
    >
      <SectionHeader title="Timing" level={3} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
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
        <div style={{ marginTop: "var(--hex-space-xs, 4px)" }}>
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
  );
}

// ── Properties Section ─────────────────────────────────────────────────────

export function SidebarPropertiesSection({
  operation,
}: {
  readonly operation: ResultOperationDescriptor;
}): React.ReactElement {
  return (
    <div data-testid="operation-metadata-section" style={{ padding: "var(--hex-space-sm, 8px)" }}>
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
  );
}
