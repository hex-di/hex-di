/**
 * ContainerComparisonView — side-by-side split graphs.
 *
 * @packageDocumentation
 */

import type { ContainerGraphData } from "../types.js";

interface ContainerComparisonViewProps {
  readonly leftContainer: ContainerGraphData;
  readonly rightContainer: ContainerGraphData;
  readonly width: number;
  readonly height: number;
}

/**
 * Renders a side-by-side comparison of two container graphs.
 */
function ContainerComparisonView({
  leftContainer,
  rightContainer,
  width,
  height,
}: ContainerComparisonViewProps): React.ReactElement {
  const halfWidth = Math.floor(width / 2);

  // Find common and unique adapters
  const leftPorts = new Set(leftContainer.adapters.map(a => a.portName));
  const rightPorts = new Set(rightContainer.adapters.map(a => a.portName));

  const commonPorts = [...leftPorts].filter(p => rightPorts.has(p));
  const leftOnlyPorts = [...leftPorts].filter(p => !rightPorts.has(p));
  const rightOnlyPorts = [...rightPorts].filter(p => !leftPorts.has(p));

  return (
    <div
      data-testid="container-comparison"
      style={{
        display: "flex",
        width,
        height,
        fontFamily: "var(--hex-font-sans)",
      }}
    >
      {/* Left pane */}
      <div
        style={{
          width: halfWidth,
          height,
          borderRight: "2px solid var(--hex-border)",
          overflow: "auto",
          padding: "var(--hex-space-sm)",
        }}
      >
        <div
          style={{
            fontWeight: "var(--hex-font-weight-medium)",
            marginBottom: "var(--hex-space-xs)",
            color: "var(--hex-text-primary)",
          }}
        >
          {leftContainer.containerName} ({leftContainer.kind})
        </div>
        <div style={{ fontSize: "var(--hex-font-size-sm)", color: "var(--hex-text-muted)" }}>
          {leftContainer.adapters.length} adapters
        </div>
        {leftOnlyPorts.length > 0 && (
          <div style={{ marginTop: "var(--hex-space-sm)" }}>
            <div
              style={{
                fontSize: "var(--hex-font-size-xs)",
                color: "var(--hex-text-muted)",
                marginBottom: 4,
              }}
            >
              Unique to {leftContainer.containerName}:
            </div>
            {leftOnlyPorts.map(p => (
              <div
                key={p}
                style={{
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                  color: "var(--hex-info)",
                  padding: "1px 0",
                }}
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right pane */}
      <div
        style={{
          width: halfWidth,
          height,
          overflow: "auto",
          padding: "var(--hex-space-sm)",
        }}
      >
        <div
          style={{
            fontWeight: "var(--hex-font-weight-medium)",
            marginBottom: "var(--hex-space-xs)",
            color: "var(--hex-text-primary)",
          }}
        >
          {rightContainer.containerName} ({rightContainer.kind})
        </div>
        <div style={{ fontSize: "var(--hex-font-size-sm)", color: "var(--hex-text-muted)" }}>
          {rightContainer.adapters.length} adapters
        </div>
        {rightOnlyPorts.length > 0 && (
          <div style={{ marginTop: "var(--hex-space-sm)" }}>
            <div
              style={{
                fontSize: "var(--hex-font-size-xs)",
                color: "var(--hex-text-muted)",
                marginBottom: 4,
              }}
            >
              Unique to {rightContainer.containerName}:
            </div>
            {rightOnlyPorts.map(p => (
              <div
                key={p}
                style={{
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                  color: "var(--hex-warning)",
                  padding: "1px 0",
                }}
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend overlay */}
      <div
        data-testid="comparison-legend"
        style={{
          position: "absolute",
          bottom: "var(--hex-space-sm)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "var(--hex-space-md)",
          padding: "var(--hex-space-xs) var(--hex-space-sm)",
          backgroundColor: "var(--hex-bg-secondary)",
          border: "1px solid var(--hex-border)",
          borderRadius: "var(--hex-radius-sm)",
          fontSize: "var(--hex-font-size-xs)",
          color: "var(--hex-text-muted)",
        }}
      >
        <span>Common: {commonPorts.length}</span>
        <span style={{ color: "var(--hex-info)" }}>Left only: {leftOnlyPorts.length}</span>
        <span style={{ color: "var(--hex-warning)" }}>Right only: {rightOnlyPorts.length}</span>
      </div>
    </div>
  );
}

export { ContainerComparisonView };
export type { ContainerComparisonViewProps };
