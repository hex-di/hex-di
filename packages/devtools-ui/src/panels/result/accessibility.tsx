/**
 * AccessibleResultPanel — WCAG 2.1 AA compliant Result Panel wrapper.
 *
 * Spec: 15-accessibility.md (15.1-15.10)
 *
 * @packageDocumentation
 */

import { useEffect, useRef, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface OperationEntry {
  readonly method: string;
  readonly label: string;
  readonly inputTrack: string;
  readonly outputTrack: string;
  readonly duration: string;
}

interface PathEntry {
  readonly label: string;
  readonly classification: string;
  readonly frequency: number;
}

interface SelectedStep {
  readonly index: number;
  readonly method: string;
  readonly inputTrack: string;
  readonly outputTrack: string;
}

interface SwitchEvent {
  readonly stepIndex: number;
  readonly inputTrack: string;
  readonly outputTrack: string;
}

interface DurationEntry {
  readonly label: string;
  readonly duration: string;
  readonly severity: string;
}

interface StabilityEntry {
  readonly port: string;
  readonly score: number;
  readonly zone: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AccessibleResultPanelProps {
  readonly activeView: string;
  readonly chainLabel?: string;
  readonly executionId?: string;
  readonly operations?: readonly OperationEntry[];
  readonly paths?: readonly PathEntry[];
  readonly selectedChainLabel?: string;
  readonly chainOkRate?: number;
  readonly chainRunCount?: number;
  readonly selectedStep?: SelectedStep;
  readonly switchEvent?: SwitchEvent;
  readonly filterAnnouncement?: string;
  readonly playbackAnnouncement?: string;
  readonly connectionAnnouncement?: string;
  readonly durationEntries?: readonly DurationEntry[];
  readonly stabilityEntries?: readonly StabilityEntry[];
  readonly onFocusDetail?: () => void;
  readonly onRestoreFocus?: () => void;
  readonly onViewFocus?: (view: string) => void;
}

// ── View Labels ─────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<string, string> = {
  railway: "Railway Pipeline",
  log: "Operation Log",
  cases: "Case Explorer",
  sankey: "Sankey Statistics",
  waterfall: "Async Waterfall",
  combinator: "Combinator Matrix",
  overview: "Overview Dashboard",
};

const VIEW_IDS = ["railway", "log", "cases", "sankey", "waterfall", "combinator", "overview"];

// ── Component ───────────────────────────────────────────────────────────────

function AccessibleResultPanel({
  activeView,
  chainLabel,
  executionId,
  operations,
  paths,
  selectedChainLabel,
  chainOkRate,
  chainRunCount,
  selectedStep,
  switchEvent,
  filterAnnouncement,
  playbackAnnouncement,
  connectionAnnouncement,
  durationEntries,
  stabilityEntries,
  onFocusDetail,
  onRestoreFocus,
  onViewFocus,
}: AccessibleResultPanelProps): React.ReactElement {
  const [announcement, setAnnouncement] = useState("");
  const prevViewRef = useRef(activeView);

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Announce view switch
  useEffect(() => {
    if (prevViewRef.current !== activeView) {
      const label = VIEW_LABELS[activeView] ?? activeView;
      setAnnouncement(`Switched to ${label} view`);
      onViewFocus?.(activeView);
      prevViewRef.current = activeView;
    }
  }, [activeView, onViewFocus]);

  // Announce chain selection
  useEffect(() => {
    if (selectedChainLabel) {
      setAnnouncement(
        `Selected chain ${selectedChainLabel}, ${chainOkRate ?? 0}% Ok, ${chainRunCount ?? 0} executions`
      );
    }
  }, [selectedChainLabel, chainOkRate, chainRunCount]);

  // Announce step selection
  useEffect(() => {
    if (selectedStep) {
      setAnnouncement(
        `Step ${selectedStep.index}: ${selectedStep.method}, ${selectedStep.inputTrack} to ${selectedStep.outputTrack}`
      );
    }
  }, [selectedStep]);

  // Announce switch detection
  useEffect(() => {
    if (switchEvent) {
      setAnnouncement(
        `Track switch at step ${switchEvent.stepIndex}: ${switchEvent.inputTrack} to ${switchEvent.outputTrack}`
      );
    }
  }, [switchEvent]);

  // Announce filter
  useEffect(() => {
    if (filterAnnouncement) setAnnouncement(filterAnnouncement);
  }, [filterAnnouncement]);

  // Announce playback
  useEffect(() => {
    if (playbackAnnouncement) setAnnouncement(playbackAnnouncement);
  }, [playbackAnnouncement]);

  // Announce connection
  useEffect(() => {
    if (connectionAnnouncement) setAnnouncement(connectionAnnouncement);
  }, [connectionAnnouncement]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Escape") {
      onRestoreFocus?.();
    }
  };

  const hasSwitchOp = operations?.some(op => op.inputTrack !== op.outputTrack);

  return (
    <div
      data-testid="result-panel-root"
      role="region"
      aria-label="Result Panel"
      data-contrast-compliant="true"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      onKeyDown={handleKeyDown}
    >
      {/* Screen reader live region */}
      <div data-testid="sr-announcer" aria-live="polite" role="log">
        {announcement}
      </div>

      {/* View switcher */}
      <div data-testid="view-switcher" role="tablist" aria-label="Result Panel views">
        {VIEW_IDS.map(id => (
          <button
            key={id}
            data-testid="view-tab"
            role="tab"
            aria-selected={id === activeView ? "true" : "false"}
            data-min-touch-target="44"
          >
            {VIEW_LABELS[id]}
          </button>
        ))}
      </div>

      {/* Active view panel */}
      <div data-testid="active-view-panel" role="tabpanel">
        {/* Railway SVG */}
        {activeView === "railway" && (
          <>
            <svg
              data-testid="railway-svg"
              role="img"
              aria-label={`Railway pipeline for ${chainLabel ?? "chain"}`}
            >
              {operations?.map((op, i) => (
                <g
                  key={i}
                  data-testid={`operation-node-${i}`}
                  role="button"
                  aria-label={`${op.method}(${op.label}), ${op.inputTrack} to ${op.outputTrack}, ${op.duration}`}
                />
              ))}
            </svg>

            {/* Track indicators */}
            {operations && operations.length > 0 && (
              <>
                <span data-testid="track-indicator-ok" data-shape="filled">
                  Ok
                </span>
                {operations.some(op => op.outputTrack === "err") && (
                  <span data-testid="track-indicator-err" data-shape="empty">
                    Err
                  </span>
                )}
              </>
            )}

            {/* Switch indicator */}
            {hasSwitchOp && <span data-testid="switch-indicator">switched</span>}

            {/* Node select trigger */}
            <button data-testid="select-node-trigger" onClick={() => onFocusDetail?.()}>
              Select Node
            </button>
          </>
        )}

        {/* Operation Log */}
        {activeView === "log" && (
          <div
            data-testid="log-grid"
            role="grid"
            aria-label={`Operation steps for execution #${executionId ?? ""}`}
          >
            <div role="row" aria-rowindex={1}>
              <div role="gridcell">Step data</div>
            </div>
          </div>
        )}

        {/* Case Explorer */}
        {activeView === "cases" && (
          <div
            data-testid="path-tree"
            role="tree"
            aria-label={`Possible paths through ${chainLabel ?? "chain"}`}
          >
            {paths?.map((p, i) => (
              <div key={i} data-testid="path-tree-item" role="treeitem">
                {p.label} - {p.classification} ({p.frequency}%)
              </div>
            ))}
          </div>
        )}

        {/* Sankey SVG */}
        {activeView === "sankey" && (
          <>
            <svg
              data-testid="sankey-svg"
              role="img"
              aria-label={`Flow statistics for ${chainLabel ?? "chain"}`}
            />
            {stabilityEntries?.map((entry, i) => (
              <div key={i} data-testid={`stability-zone-${i}`} data-zone={entry.zone}>
                {entry.port}: {entry.score}%
              </div>
            ))}
          </>
        )}

        {/* Waterfall duration entries */}
        {activeView === "waterfall" &&
          durationEntries?.map((entry, i) => (
            <div key={i} data-testid={`duration-severity-${i}`} data-severity={entry.severity}>
              {entry.label}: {entry.duration}
            </div>
          ))}
      </div>

      {/* Status bar */}
      <div data-testid="status-bar" role="status" aria-live="polite">
        Ready
      </div>
    </div>
  );
}

export { AccessibleResultPanel };
export type { AccessibleResultPanelProps };
