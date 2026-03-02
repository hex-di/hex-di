/**
 * GuardEdgeStates — Edge state handling for the Guard Panel.
 *
 * Renders appropriate loading, empty, disconnected, and error states
 * based on the current panel state.
 *
 * Spec: 14-integration.md (14.8, 14.9)
 *
 * @packageDocumentation
 */

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardEdgeStatesProps {
  readonly state: "loading" | "empty" | "disconnected" | "error";
  readonly message: string | undefined;
}

// ── State Rendering ─────────────────────────────────────────────────────────

const STATE_ICONS: Readonly<Record<GuardEdgeStatesProps["state"], string>> = {
  loading: "\u231B", // hourglass
  empty: "\uD83D\uDCED", // empty mailbox / open mailbox with lowered flag
  disconnected: "\u26A0", // warning
  error: "\u274C", // cross mark
};

const STATE_LABELS: Readonly<Record<GuardEdgeStatesProps["state"], string>> = {
  loading: "Loading guard data...",
  empty: "No guard policies detected",
  disconnected: "Connection lost",
  error: "An error occurred",
};

// ── Component ───────────────────────────────────────────────────────────────

function GuardEdgeStates({ state, message }: GuardEdgeStatesProps): React.ReactElement {
  const icon = STATE_ICONS[state];
  const label = STATE_LABELS[state];
  const displayMessage = message ?? label;

  return (
    <div
      data-testid="guard-edge-state"
      data-state={state}
      role={state === "error" ? "alert" : "status"}
      aria-live={state === "error" ? "assertive" : "polite"}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--hex-space-md, 12px)",
        padding: "var(--hex-space-lg, 24px)",
        textAlign: "center",
        minHeight: 200,
      }}
    >
      {/* State icon */}
      <span data-testid="guard-edge-state-icon" style={{ fontSize: 32 }} aria-hidden="true">
        {icon}
      </span>

      {/* State label */}
      <span
        data-testid="guard-edge-state-label"
        style={{
          fontSize: "var(--hex-font-size-md, 13px)",
          fontWeight: 600,
          color: "var(--hex-text-primary, #e4e4f0)",
        }}
      >
        {label}
      </span>

      {/* Custom message */}
      {message && (
        <span
          data-testid="guard-edge-state-message"
          style={{
            fontSize: "var(--hex-font-size-sm, 12px)",
            color: "var(--hex-text-muted, #6b6b80)",
            maxWidth: 400,
          }}
        >
          {displayMessage}
        </span>
      )}

      {/* Loading animation */}
      {state === "loading" && (
        <div
          data-testid="guard-edge-state-spinner"
          style={{
            width: 24,
            height: 24,
            border: "2px solid var(--hex-border, #424260)",
            borderTopColor: "var(--hex-accent, #818cf8)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
          aria-label="Loading"
        />
      )}

      {/* Disconnected hint */}
      {state === "disconnected" && (
        <span
          data-testid="guard-edge-state-hint"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Showing cached data. Waiting for reconnection...
        </span>
      )}

      {/* Error hint */}
      {state === "error" && (
        <span
          data-testid="guard-edge-state-hint"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Try switching to the Overview view or refreshing the page.
        </span>
      )}
    </div>
  );
}

export { GuardEdgeStates };
export type { GuardEdgeStatesProps };
