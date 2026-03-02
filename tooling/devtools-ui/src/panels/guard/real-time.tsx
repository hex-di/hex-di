/**
 * GuardRealTimeHandler — Live connection indicator with pause/resume controls.
 *
 * Shows the real-time connection status and provides controls to pause
 * and resume the live event stream from the Guard data source.
 *
 * Spec: 11-interactions.md (11.14)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardRealTimeProps {
  readonly connectionStatus: "connected" | "disconnected";
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly paused: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

function GuardRealTime({
  connectionStatus,
  onPause,
  onResume,
  paused,
}: GuardRealTimeProps): React.ReactElement {
  const handleToggle = useCallback(() => {
    if (paused) {
      onResume();
    } else {
      onPause();
    }
  }, [paused, onPause, onResume]);

  const isConnected = connectionStatus === "connected";
  const statusLabel = isConnected ? (paused ? "Paused" : "Live") : "Disconnected";

  return (
    <div
      data-testid="guard-real-time"
      data-connection={connectionStatus}
      data-paused={paused ? "true" : "false"}
      role="status"
      aria-live="polite"
      aria-label={`Real-time status: ${statusLabel}`}
    >
      {/* Connection indicator */}
      <span
        data-testid="guard-real-time-indicator"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          data-testid="guard-real-time-dot"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isConnected
              ? paused
                ? "var(--hex-guard-skip, #f59e0b)"
                : "var(--hex-guard-allow, #4ade80)"
              : "var(--hex-guard-deny, #f87171)",
          }}
        />
        <span
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-secondary, #a0a0b8)",
          }}
        >
          {statusLabel}
        </span>
      </span>

      {/* Pause/Resume toggle */}
      {isConnected && (
        <button
          data-testid="guard-real-time-toggle"
          onClick={handleToggle}
          aria-label={paused ? "Resume live updates" : "Pause live updates"}
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            cursor: "pointer",
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      )}

      {/* Disconnected message */}
      {!isConnected && (
        <span
          data-testid="guard-real-time-disconnected"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-guard-deny, #f87171)",
          }}
        >
          Connection lost. Showing cached data.
        </span>
      )}
    </div>
  );
}

export { GuardRealTime };
export type { GuardRealTimeProps };
