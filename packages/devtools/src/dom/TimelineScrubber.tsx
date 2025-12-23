/**
 * TimelineScrubber - DOM implementation for time-travel navigation.
 *
 * Renders a horizontal timeline with snapshots and allows scrubbing
 * through history with mouse interaction.
 *
 * @packageDocumentation
 */

import React, { useCallback, useState } from "react";
import type { TimelineScrubberProps } from "../ports/render-primitives.port.js";

/**
 * Format timestamp for display.
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * TimelineScrubber primitive component for DOM.
 *
 * Displays a horizontal timeline with snapshot markers that can be
 * clicked or dragged to navigate through time-travel history.
 */
export function TimelineScrubber({
  snapshots,
  currentIndex,
  onNavigate,
  onCapture,
}: TimelineScrubberProps): React.ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleSnapshotClick = useCallback(
    (index: number) => {
      onNavigate(index);
    },
    [onNavigate]
  );

  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const handleCaptureClick = useCallback(() => {
    onCapture?.();
  }, [onCapture]);

  if (snapshots.length === 0) {
    return (
      <div
        className="hex-timeline-scrubber hex-timeline-scrubber--empty"
        data-testid="timeline-scrubber"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
          borderTop: "1px solid var(--hex-devtools-border)",
          backgroundColor: "var(--hex-devtools-background)",
        }}
      >
        <span style={{ color: "var(--hex-devtools-muted)", fontSize: "12px" }}>
          No snapshots yet
        </span>
        {onCapture && (
          <button
            onClick={handleCaptureClick}
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px solid var(--hex-devtools-border)",
              borderRadius: "4px",
              backgroundColor: "var(--hex-devtools-background)",
              color: "var(--hex-devtools-primary)",
              cursor: "pointer",
            }}
          >
            Capture Snapshot
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="hex-timeline-scrubber"
      data-testid="timeline-scrubber"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        borderTop: "1px solid var(--hex-devtools-border)",
        backgroundColor: "var(--hex-devtools-background)",
        gap: "4px",
      }}
    >
      {/* Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: "2px 8px",
              fontSize: "12px",
              border: "1px solid var(--hex-devtools-border)",
              borderRadius: "4px",
              backgroundColor: "var(--hex-devtools-background)",
              color:
                currentIndex === 0 ? "var(--hex-devtools-muted)" : "var(--hex-devtools-foreground)",
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            }}
          >
            ‹ Prev
          </button>
          <span style={{ fontSize: "12px", color: "var(--hex-devtools-muted)" }}>
            {currentIndex + 1} / {snapshots.length}
          </span>
          <button
            onClick={() => onNavigate(Math.min(snapshots.length - 1, currentIndex + 1))}
            disabled={currentIndex === snapshots.length - 1}
            style={{
              padding: "2px 8px",
              fontSize: "12px",
              border: "1px solid var(--hex-devtools-border)",
              borderRadius: "4px",
              backgroundColor: "var(--hex-devtools-background)",
              color:
                currentIndex === snapshots.length - 1
                  ? "var(--hex-devtools-muted)"
                  : "var(--hex-devtools-foreground)",
              cursor: currentIndex === snapshots.length - 1 ? "not-allowed" : "pointer",
            }}
          >
            Next ›
          </button>
        </div>
        {onCapture && (
          <button
            onClick={handleCaptureClick}
            style={{
              padding: "2px 8px",
              fontSize: "12px",
              border: "1px solid var(--hex-devtools-primary)",
              borderRadius: "4px",
              backgroundColor: "var(--hex-devtools-background)",
              color: "var(--hex-devtools-primary)",
              cursor: "pointer",
            }}
          >
            Capture
          </button>
        )}
      </div>

      {/* Timeline Track */}
      <div
        style={{
          position: "relative",
          height: "32px",
          backgroundColor: "var(--hex-devtools-background)",
          borderRadius: "4px",
          border: "1px solid var(--hex-devtools-border)",
        }}
      >
        {/* Timeline Line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "8px",
            right: "8px",
            height: "2px",
            backgroundColor: "var(--hex-devtools-border)",
            transform: "translateY(-50%)",
          }}
        />

        {/* Snapshot Markers */}
        {snapshots.map((snapshot, index) => {
          const position = snapshots.length === 1 ? 50 : (index / (snapshots.length - 1)) * 100;
          const isCurrent = index === currentIndex;
          const isHovered = index === hoveredIndex;

          return (
            <div
              key={snapshot.id}
              onClick={() => handleSnapshotClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
              data-testid={`snapshot-marker-${index}`}
              style={{
                position: "absolute",
                left: `calc(${position}% - 6px)`,
                top: "50%",
                transform: "translateY(-50%)",
                width: isCurrent ? "16px" : "12px",
                height: isCurrent ? "16px" : "12px",
                borderRadius: "50%",
                backgroundColor: isCurrent
                  ? "var(--hex-devtools-primary)"
                  : isHovered
                    ? "var(--hex-devtools-accent)"
                    : "var(--hex-devtools-border)",
                border: `2px solid ${isCurrent ? "var(--hex-devtools-background)" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
                zIndex: isCurrent ? 2 : isHovered ? 1 : 0,
              }}
              title={`${snapshot.label}\n${formatTime(snapshot.timestamp)}\n${snapshot.serviceCount} services`}
            />
          );
        })}
      </div>

      {/* Current Snapshot Info */}
      {(() => {
        const currentSnapshot = snapshots[currentIndex];
        if (currentSnapshot === undefined) return null;
        return (
          <div
            style={{
              fontSize: "11px",
              color: "var(--hex-devtools-muted)",
              textAlign: "center",
            }}
          >
            {currentSnapshot.label} - {formatTime(currentSnapshot.timestamp)}
          </div>
        );
      })()}
    </div>
  );
}
