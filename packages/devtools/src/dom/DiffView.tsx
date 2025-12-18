/**
 * DiffView - DOM implementation for snapshot comparison.
 *
 * Displays side-by-side comparison of two snapshots with color-coded
 * additions, removals, and changes.
 *
 * @packageDocumentation
 */

import React, { useCallback } from "react";
import type { DiffViewProps } from "../ports/render-primitives.port.js";

/**
 * DiffView primitive component for DOM.
 *
 * Shows a detailed comparison between two container snapshots with
 * visual indicators for additions (green), removals (red), and changes (yellow).
 */
export function DiffView({
  viewModel,
  onServiceSelect,
  showAdditions = true,
  showRemovals = true,
  showChanges = true,
}: DiffViewProps): React.ReactElement {
  const handleServiceClick = useCallback(
    (portName: string) => {
      onServiceSelect?.(portName);
    },
    [onServiceSelect]
  );

  if (!viewModel.isActive || viewModel.isEmpty) {
    return (
      <div
        className="hex-diff-view hex-diff-view--empty"
        data-testid="diff-view"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          color: "var(--hex-devtools-muted)",
          fontSize: "14px",
        }}
      >
        {!viewModel.isActive
          ? "Select two snapshots to compare"
          : "No data to compare"}
      </div>
    );
  }

  if (!viewModel.hasChanges) {
    return (
      <div
        className="hex-diff-view hex-diff-view--no-changes"
        data-testid="diff-view"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          color: "var(--hex-devtools-success)",
          fontSize: "14px",
        }}
      >
        ✓ No changes detected
      </div>
    );
  }

  return (
    <div
      className="hex-diff-view"
      data-testid="diff-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "var(--hex-devtools-background)",
      }}
    >
      {/* Summary Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px",
          backgroundColor: "var(--hex-devtools-background)",
          border: "1px solid var(--hex-devtools-border)",
          borderRadius: "4px",
        }}
      >
        <div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "var(--hex-devtools-foreground)" }}>
            {viewModel.leftSnapshot.label}
          </div>
          <div style={{ fontSize: "12px", color: "var(--hex-devtools-muted)" }}>
            {viewModel.leftSnapshot.serviceCount} services
          </div>
        </div>
        <div style={{ fontSize: "20px", color: "var(--hex-devtools-muted)" }}>→</div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "var(--hex-devtools-foreground)" }}>
            {viewModel.rightSnapshot.label}
          </div>
          <div style={{ fontSize: "12px", color: "var(--hex-devtools-muted)" }}>
            {viewModel.rightSnapshot.serviceCount} services
          </div>
        </div>
      </div>

      {/* Added Services */}
      {showAdditions && viewModel.addedServices.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "var(--hex-devtools-success)",
              marginBottom: "8px",
            }}
          >
            ✓ Added ({viewModel.addedServices.length})
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {viewModel.addedServices.map((portName) => (
              <div
                key={portName}
                onClick={() => handleServiceClick(portName)}
                data-testid={`added-service-${portName}`}
                style={{
                  padding: "8px",
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid var(--hex-devtools-success)",
                  borderRadius: "4px",
                  fontSize: "13px",
                  color: "var(--hex-devtools-foreground)",
                  cursor: onServiceSelect ? "pointer" : "default",
                }}
              >
                <span style={{ color: "var(--hex-devtools-success)", marginRight: "8px" }}>+</span>
                {portName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Services */}
      {showRemovals && viewModel.removedServices.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "var(--hex-devtools-error)",
              marginBottom: "8px",
            }}
          >
            ✗ Removed ({viewModel.removedServices.length})
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {viewModel.removedServices.map((portName) => (
              <div
                key={portName}
                onClick={() => handleServiceClick(portName)}
                data-testid={`removed-service-${portName}`}
                style={{
                  padding: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid var(--hex-devtools-error)",
                  borderRadius: "4px",
                  fontSize: "13px",
                  color: "var(--hex-devtools-foreground)",
                  cursor: onServiceSelect ? "pointer" : "default",
                }}
              >
                <span style={{ color: "var(--hex-devtools-error)", marginRight: "8px" }}>-</span>
                {portName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Changed Services */}
      {showChanges && viewModel.changedServices.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "var(--hex-devtools-warning)",
              marginBottom: "8px",
            }}
          >
            ~ Changed ({viewModel.changedServices.length})
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {viewModel.changedServices.map((diff) => (
              <div
                key={diff.portName}
                onClick={() => handleServiceClick(diff.portName)}
                data-testid={`changed-service-${diff.portName}`}
                style={{
                  padding: "8px",
                  backgroundColor: "rgba(251, 191, 36, 0.1)",
                  border: "1px solid var(--hex-devtools-warning)",
                  borderRadius: "4px",
                  fontSize: "13px",
                  color: "var(--hex-devtools-foreground)",
                  cursor: onServiceSelect ? "pointer" : "default",
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  <span style={{ color: "var(--hex-devtools-warning)", marginRight: "8px" }}>~</span>
                  {diff.portName}
                </div>
                <div style={{ fontSize: "11px", color: "var(--hex-devtools-muted)", marginTop: "4px" }}>
                  {diff.changeType === "resolution_count" && diff.countDelta !== undefined && (
                    <span>
                      Resolutions: {diff.leftValue} → {diff.rightValue}
                      <span
                        style={{
                          color: diff.countDelta > 0 ? "var(--hex-devtools-error)" : "var(--hex-devtools-success)",
                          marginLeft: "4px",
                        }}
                      >
                        ({diff.countDelta > 0 ? "+" : ""}
                        {diff.countDelta})
                      </span>
                    </span>
                  )}
                  {diff.timingDeltaMs !== undefined && diff.timingDeltaMs !== null && (
                    <span style={{ marginLeft: diff.countDelta !== undefined ? "8px" : "0" }}>
                      Timing: {diff.leftTimingMs ?? 0}ms → {diff.rightTimingMs ?? 0}ms
                      <span
                        style={{
                          color: diff.timingDeltaMs > 0 ? "var(--hex-devtools-error)" : "var(--hex-devtools-success)",
                          marginLeft: "4px",
                        }}
                      >
                        ({diff.timingDeltaMs > 0 ? "+" : ""}
                        {diff.timingDeltaMs.toFixed(1)}ms)
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
