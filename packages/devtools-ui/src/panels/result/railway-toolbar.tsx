/**
 * RailwayToolbar -- toolbar strip for the unified Railway Pipeline View.
 *
 * Contains a chain summary, playback controls, speed control, and
 * viewport (zoom/fit) controls. No chain/execution selectors — the
 * Railway now shows all Result operations in a single unified timeline.
 *
 * @packageDocumentation
 */

import type { ResultChainDescriptor } from "./types.js";

// -- Constants ----------------------------------------------------------------

const TOOLBAR_HEIGHT = 40;

const SPEED_OPTIONS: readonly number[] = [1, 2, 4];

// -- Props --------------------------------------------------------------------

interface RailwayToolbarProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly playbackStatus: "idle" | "playing" | "paused" | "complete";
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly speed: number;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStepPrev: () => void;
  readonly onStepNext: () => void;
  readonly onSkipToStart: () => void;
  readonly onSkipToEnd: () => void;
  readonly onSetSpeed: (speed: number) => void;
  readonly zoom: number;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFit: () => void;
  readonly isRealData: boolean;
}

// -- Style helpers ------------------------------------------------------------

const buttonStyle: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--hex-border, #424260)",
  borderRadius: "var(--hex-radius-sm, 4px)",
  backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
  color: "var(--hex-text-primary, #e4e4f0)",
  fontFamily: "var(--hex-font-mono, monospace)",
  fontSize: "var(--hex-font-size-sm, 12px)",
  cursor: "pointer",
  lineHeight: 1,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "var(--hex-accent, #818cf8)",
  color: "var(--hex-bg-primary, #1a1a2e)",
  borderColor: "var(--hex-accent, #818cf8)",
};

const separatorStyle: React.CSSProperties = {
  width: 1,
  height: 20,
  backgroundColor: "var(--hex-border, #424260)",
  flexShrink: 0,
};

const badgeBaseStyle: React.CSSProperties = {
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

// -- Component ----------------------------------------------------------------

function RailwayToolbar({
  chains,
  playbackStatus,
  currentStep,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepPrev,
  onStepNext,
  onSkipToStart,
  onSkipToEnd,
  onSetSpeed,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  isRealData,
}: RailwayToolbarProps): React.ReactElement {
  const zoomPercent = `${Math.round(zoom * 100)}%`;
  const isPlaying = playbackStatus === "playing";
  const canStepPrev = currentStep > 0;
  const canStepNext = currentStep < totalSteps - 1;

  return (
    <div
      data-testid="railway-toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        height: TOOLBAR_HEIGHT,
        gap: "var(--hex-space-sm, 8px)",
        padding: "0 var(--hex-space-sm, 8px)",
        backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
        borderBottom: "1px solid var(--hex-border, #424260)",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: "var(--hex-font-size-sm, 12px)",
        color: "var(--hex-text-primary, #e4e4f0)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Chain summary */}
      <span
        data-testid="chain-summary"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-sm, 12px)",
          color: "var(--hex-text-muted, #6b6b80)",
          whiteSpace: "nowrap",
        }}
      >
        {chains.size} chain{chains.size !== 1 ? "s" : ""} / {totalSteps} op
        {totalSteps !== 1 ? "s" : ""}
      </span>

      {/* Inferred Badge */}
      {!isRealData && (
        <span
          data-testid="inferred-badge"
          style={{
            ...badgeBaseStyle,
            backgroundColor: "var(--hex-warning, #fbbf24)",
            color: "var(--hex-bg-primary, #1a1a2e)",
          }}
        >
          inferred
        </span>
      )}

      {/* Separator */}
      <div style={separatorStyle} />

      {/* Playback Controls */}
      <div
        data-testid="playback-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--hex-space-xs, 4px)",
        }}
      >
        <button
          data-testid="skip-to-start-button"
          onClick={onSkipToStart}
          disabled={!canStepPrev}
          style={{
            ...buttonStyle,
            opacity: canStepPrev ? 1 : 0.4,
          }}
          aria-label="Skip to start"
          title="Skip to start"
        >
          {"\u23EE"}
        </button>

        <button
          data-testid="step-prev-button"
          onClick={onStepPrev}
          disabled={!canStepPrev}
          style={{
            ...buttonStyle,
            opacity: canStepPrev ? 1 : 0.4,
          }}
          aria-label="Step back"
          title="Step back"
        >
          {"\u23EA"}
        </button>

        {isPlaying ? (
          <button
            data-testid="pause-button"
            onClick={onPause}
            style={buttonStyle}
            aria-label="Pause"
            title="Pause"
          >
            {"\u23F8"}
          </button>
        ) : (
          <button
            data-testid="play-button"
            onClick={onPlay}
            style={buttonStyle}
            aria-label="Play"
            title="Play"
          >
            {"\u25B6"}
          </button>
        )}

        <button
          data-testid="step-next-button"
          onClick={onStepNext}
          disabled={!canStepNext}
          style={{
            ...buttonStyle,
            opacity: canStepNext ? 1 : 0.4,
          }}
          aria-label="Step forward"
          title="Step forward"
        >
          {"\u23E9"}
        </button>

        <button
          data-testid="skip-to-end-button"
          onClick={onSkipToEnd}
          disabled={!canStepNext}
          style={{
            ...buttonStyle,
            opacity: canStepNext ? 1 : 0.4,
          }}
          aria-label="Skip to end"
          title="Skip to end"
        >
          {"\u23ED"}
        </button>

        {/* Step Counter */}
        <span
          data-testid="step-counter"
          style={{
            fontFamily: "var(--hex-font-mono, monospace)",
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
            minWidth: 50,
            textAlign: "center",
          }}
        >
          {currentStep + 1}/{totalSteps}
        </span>
      </div>

      {/* Separator */}
      <div style={separatorStyle} />

      {/* Speed Controls */}
      <div
        data-testid="speed-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--hex-space-xs, 4px)",
        }}
      >
        {SPEED_OPTIONS.map(s => (
          <button
            key={s}
            data-testid={`speed-${s}x-button`}
            onClick={() => onSetSpeed(s)}
            style={s === speed ? activeButtonStyle : buttonStyle}
            aria-label={`${s}x speed`}
            aria-pressed={s === speed}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Separator */}
      <div style={separatorStyle} />

      {/* Viewport Controls */}
      <div
        data-testid="viewport-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--hex-space-xs, 4px)",
          marginLeft: "auto",
        }}
      >
        <button
          data-testid="fit-button"
          onClick={onFit}
          style={buttonStyle}
          aria-label="Fit to view"
          title="Fit to view"
        >
          {"\u2922"}
        </button>

        <button
          data-testid="zoom-out-button"
          onClick={onZoomOut}
          style={buttonStyle}
          aria-label="Zoom out"
          title="Zoom out"
        >
          -
        </button>

        <span
          data-testid="zoom-level"
          style={{
            fontFamily: "var(--hex-font-mono, monospace)",
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
            minWidth: 40,
            textAlign: "center",
          }}
        >
          {zoomPercent}
        </span>

        <button
          data-testid="zoom-in-button"
          onClick={onZoomIn}
          style={buttonStyle}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}

export { RailwayToolbar };
export type { RailwayToolbarProps };
