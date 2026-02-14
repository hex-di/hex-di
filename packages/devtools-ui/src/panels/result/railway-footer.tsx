/**
 * RailwayFooter -- footer bar for the Railway Pipeline View.
 *
 * Contains a minimap with colored operation dots, chain info label,
 * zoom percentage display, and step indicator.
 *
 * Spec: 04-railway-pipeline.md (4.6, 4.10)
 *
 * @packageDocumentation
 */

import { useCallback, useRef } from "react";
import { getMethodCategory } from "./railway-node.js";
import type { ResultChainDescriptor, ResultChainExecution, ResultCategoryName } from "./types.js";

// ── Category Dot Colors ─────────────────────────────────────────────────────

const CATEGORY_DOT_COLORS: Record<ResultCategoryName, string> = {
  constructor: "#6366f1",
  transformation: "#3b82f6",
  chaining: "#8b5cf6",
  recovery: "#22c55e",
  observation: "#64748b",
  extraction: "#f59e0b",
  conversion: "#06b6d4",
  combinator: "#ec4899",
  generator: "#f97316",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface RailwayFooterProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution | undefined;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly zoom: number;
  readonly panX: number;
  readonly canvasWidth: number;
  readonly onPanTo: (normalizedX: number) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function RailwayFooter({
  chain,
  execution: _execution,
  currentStep,
  totalSteps,
  zoom,
  panX,
  canvasWidth,
  onPanTo,
}: RailwayFooterProps): React.ReactElement {
  const minimapRef = useRef<HTMLDivElement>(null);

  // ── Minimap click handler ───────────────────────────────────────────────

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const normalizedX = (e.clientX - rect.left) / rect.width;
      onPanTo(Math.max(0, Math.min(1, normalizedX)));
    },
    [onPanTo]
  );

  // ── Viewport rectangle position ────────────────────────────────────────

  const viewportWidth = canvasWidth > 0 ? Math.max(10, Math.min(100, 100 / zoom)) : 100;

  const totalContentWidth = canvasWidth * zoom;
  const viewportLeft =
    totalContentWidth > 0
      ? Math.max(0, Math.min(100 - viewportWidth, (-panX / totalContentWidth) * 100))
      : 0;

  // ── Zoom display ───────────────────────────────────────────────────────

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      data-testid="railway-footer"
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr auto auto",
        alignItems: "center",
        height: 32,
        gap: "var(--hex-space-sm, 8px)",
        padding: "0 var(--hex-space-sm, 8px)",
        backgroundColor: "var(--hex-bg-tertiary, #383852)",
        borderTop: "1px solid var(--hex-border, #424260)",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: "var(--hex-font-size-sm, 12px)",
      }}
    >
      {/* Minimap */}
      <div
        ref={minimapRef}
        data-testid="railway-footer-minimap"
        onClick={handleMinimapClick}
        style={{
          position: "relative",
          width: 200,
          height: 20,
          backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
          borderRadius: "var(--hex-radius-sm, 4px)",
          overflow: "hidden",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-evenly",
          padding: "0 4px",
        }}
      >
        {/* Operation dots */}
        {chain.operations.map(op => {
          const category = getMethodCategory(op.method);
          const color = CATEGORY_DOT_COLORS[category];
          return (
            <span
              key={op.index}
              data-testid="minimap-dot"
              data-operation-index={op.index}
              data-category={category}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
          );
        })}

        {/* Viewport rectangle */}
        <div
          data-testid="minimap-viewport-rect"
          style={{
            position: "absolute",
            top: 1,
            bottom: 1,
            left: `${viewportLeft}%`,
            width: `${viewportWidth}%`,
            backgroundColor: "var(--hex-accent-muted, rgba(129,140,248,0.15))",
            border: "1px solid var(--hex-accent, #818cf8)",
            borderRadius: "var(--hex-radius-sm, 4px)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Chain info */}
      <span
        data-testid="railway-footer-chain-info"
        style={{
          color: "var(--hex-text-muted, #6b6b80)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {chain.label}
      </span>

      {/* Zoom percentage */}
      <span
        data-testid="railway-footer-zoom"
        style={{
          color: "var(--hex-text-muted, #6b6b80)",
          whiteSpace: "nowrap",
        }}
      >
        {zoomPercent}%
      </span>

      {/* Step indicator */}
      <span
        data-testid="railway-footer-step"
        style={{
          color: "var(--hex-text-muted, #6b6b80)",
          whiteSpace: "nowrap",
        }}
      >
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  );
}

export { RailwayFooter };
export type { RailwayFooterProps };
