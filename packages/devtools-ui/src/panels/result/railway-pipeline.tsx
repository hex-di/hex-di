/**
 * RailwayPipelineView — SVG-based two-track railroad diagram for Result chains.
 *
 * Renders an SVG canvas with two horizontal tracks (Ok and Err), operation nodes
 * as foreignObject cards, switch connectors as bezier curves, and particle
 * animation for playback. Supports zoom, pan, and node selection.
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { RailwayNode } from "./railway-node.js";
import type { ResultChainDescriptor, ResultChainExecution, ResultStepTrace } from "./types.js";

// ── Constants ───────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.1;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 88;
const NODE_GAP = 48;
const TRACK_OFFSET_Y = 60;
const CANVAS_PADDING = 60;

// ── Props ───────────────────────────────────────────────────────────────────

interface RailwayPipelineViewProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution | undefined;
  readonly selectedNodeIndex: number | undefined;
  readonly onNodeSelect?: (operationIndex: number) => void;
  readonly onFit?: () => void;
  readonly zoom: number;
  readonly onZoomChange: (zoom: number) => void;
  readonly panX: number;
  readonly panY: number;
  readonly onPanChange: (panX: number, panY: number) => void;
  readonly playbackStatus?: PlaybackStatus;
  readonly currentStep?: number;
  readonly speed?: number;
}

// ── Playback State ──────────────────────────────────────────────────────────

type PlaybackStatus = "idle" | "playing" | "paused" | "complete";

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeNodeX(index: number): number {
  return CANVAS_PADDING + index * (NODE_WIDTH + NODE_GAP);
}

function computeCanvasWidth(operationCount: number): number {
  if (operationCount === 0) return 400;
  return CANVAS_PADDING * 2 + operationCount * NODE_WIDTH + (operationCount - 1) * NODE_GAP;
}

function computeCanvasHeight(): number {
  return TRACK_OFFSET_Y * 2 + NODE_HEIGHT + 40;
}

function findSwitchPoints(execution: ResultChainExecution | undefined): number[] {
  if (!execution) return [];
  return execution.steps.filter(s => s.switched).map(s => s.operationIndex);
}

function isOperationBypassed(
  op: { readonly inputTrack: string },
  step: ResultStepTrace | undefined
): boolean {
  if (!step) return false;
  if (op.inputTrack === "ok" && step.inputTrack === "err") return true;
  if (op.inputTrack === "err" && step.inputTrack === "ok") return true;
  return false;
}

function getTrackColor(track: "ok" | "err"): string {
  return track === "ok" ? "var(--hex-success, #4ade80)" : "var(--hex-error, #f87171)";
}

// ── SVG Defs ────────────────────────────────────────────────────────────────

function SvgDefs(): React.ReactElement {
  return (
    <defs>
      <filter id="ok-glow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
        <feFlood floodColor="#4ade80" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="err-glow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
        <feFlood floodColor="#f87171" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="particle-glow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
        <feFlood floodColor="currentColor" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <marker
        id="arrow-ok"
        viewBox="0 0 10 6"
        refX="10"
        refY="3"
        markerWidth="10"
        markerHeight="6"
        orient="auto"
      >
        <path d="M0,0 L10,3 L0,6" fill="#4ade80" />
      </marker>
      <marker
        id="arrow-err"
        viewBox="0 0 10 6"
        refX="10"
        refY="3"
        markerWidth="10"
        markerHeight="6"
        orient="auto"
      >
        <path d="M0,0 L10,3 L0,6" fill="#f87171" />
      </marker>
    </defs>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

function RailwayPipelineView({
  chain,
  execution,
  selectedNodeIndex,
  onNodeSelect,
  onFit: _onFit,
  zoom,
  onZoomChange,
  panX,
  panY,
  onPanChange,
  playbackStatus = "idle",
  currentStep = 0,
  speed: _speed = 1,
}: RailwayPipelineViewProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ── Reduced Motion ──────────────────────────────────────────────────────

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Track data ──────────────────────────────────────────────────────────

  const switchPoints = useMemo(() => findSwitchPoints(execution), [execution]);

  // ── Canvas dimensions ───────────────────────────────────────────────────

  const canvasWidth = computeCanvasWidth(chain.operations.length);
  const canvasHeight = computeCanvasHeight();
  const centerY = canvasHeight / 2;
  const okTrackY = centerY - TRACK_OFFSET_Y;
  const errTrackY = centerY + TRACK_OFFSET_Y;
  const nodeY = centerY - NODE_HEIGHT / 2;

  // ── Zoom handler ──────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      onZoomChange(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta)));
    },
    [zoom, onZoomChange]
  );

  // ── Pan handlers ──────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
    },
    [panX, panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      onPanChange(dragStart.current.panX + dx, dragStart.current.panY + dy);
    },
    [dragging, onPanChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // ── Node state ────────────────────────────────────────────────────────

  function getNodeState(
    opIndex: number
  ): "default" | "bypassed" | "active" | "hovered" | "selected" {
    if (opIndex === selectedNodeIndex) return "selected";
    if (playbackStatus === "playing" || playbackStatus === "paused") {
      if (opIndex === currentStep) return "active";
    }
    if (execution) {
      const step = execution.steps[opIndex];
      const op = chain.operations[opIndex];
      if (step && op && isOperationBypassed(op, step)) {
        return "bypassed";
      }
    }
    return "default";
  }

  // ── Track rendering ───────────────────────────────────────────────────

  function renderTracks(): React.ReactElement[] {
    const elements: React.ReactElement[] = [];
    const opCount = chain.operations.length;
    if (opCount === 0) return elements;

    const firstX = computeNodeX(0);
    const lastX = computeNodeX(opCount - 1) + NODE_WIDTH;

    // Determine track activity per segment
    for (let track of ["ok", "err"] as const) {
      const y = track === "ok" ? okTrackY : errTrackY;

      if (!execution) {
        // Static mode: single line for each track
        elements.push(
          <line
            key={`track-${track}`}
            x1={firstX}
            y1={y}
            x2={lastX}
            y2={y}
            stroke={getTrackColor(track)}
            strokeWidth={track === "ok" ? 3 : 1.5}
            strokeDasharray={track === "err" ? "6 4" : undefined}
            opacity={track === "ok" ? 0.6 : 0.2}
          />
        );
      } else {
        // Dynamic mode: segments with varying activity
        for (let i = 0; i < opCount - 1; i++) {
          const step = execution.steps[i];
          const isActive = step ? step.outputTrack === track : false;
          const x1 = computeNodeX(i) + NODE_WIDTH;
          const x2 = computeNodeX(i + 1);

          elements.push(
            <line
              key={`seg-${track}-${i}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={getTrackColor(track)}
              strokeWidth={isActive ? 4 : 1.5}
              strokeDasharray={isActive ? undefined : "6 4"}
              opacity={isActive ? 1 : 0.2}
              filter={isActive ? `url(#${track}-glow)` : undefined}
            />
          );
        }
      }
    }

    return elements;
  }

  // ── Switch connectors ────────────────────────────────────────────────

  function renderSwitchConnectors(): React.ReactElement[] {
    return switchPoints
      .map(opIdx => {
        const step = execution?.steps[opIdx];
        if (!step) return null;

        const x = computeNodeX(opIdx) + NODE_WIDTH / 2;
        const fromY = step.inputTrack === "ok" ? okTrackY : errTrackY;
        const toY = step.outputTrack === "ok" ? okTrackY : errTrackY;

        const midX = x;
        const cpOffset = Math.abs(toY - fromY) * 0.4;

        return (
          <g key={`switch-${opIdx}`}>
            <path
              d={`M${x},${fromY} C${midX - cpOffset},${fromY} ${midX + cpOffset},${toY} ${x},${toY}`}
              fill="none"
              stroke="var(--hex-warning, #fbbf24)"
              strokeWidth={2}
              strokeDasharray="4 2"
              opacity={0.7}
            />
            <text
              x={x}
              y={(fromY + toY) / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fill="var(--hex-warning, #fbbf24)"
            >
              ⚡
            </text>
          </g>
        );
      })
      .filter((el): el is React.ReactElement => el !== null);
  }

  // ── Particle animation ────────────────────────────────────────────────

  function renderParticle(): React.ReactElement | null {
    if (playbackStatus !== "playing" && playbackStatus !== "paused") return null;
    if (prefersReducedMotion) return null;

    const stepIndex = currentStep;
    const step = execution?.steps[stepIndex];
    const track = step?.outputTrack ?? "ok";
    const x = computeNodeX(stepIndex) + NODE_WIDTH / 2;
    const y = track === "ok" ? okTrackY : errTrackY;
    const color = getTrackColor(track);

    return (
      <g data-testid="playback-particle" data-step={stepIndex}>
        {/* Trail circles */}
        {[3, 2, 1].map(offset => {
          const trailIdx = stepIndex - offset;
          if (trailIdx < 0) return null;
          const trailStep = execution?.steps[trailIdx];
          const trailTrack = trailStep?.outputTrack ?? "ok";
          const trailX = computeNodeX(trailIdx) + NODE_WIDTH / 2;
          const trailY = trailTrack === "ok" ? okTrackY : errTrackY;
          return (
            <circle
              key={`trail-${offset}`}
              cx={trailX}
              cy={trailY}
              r={3 - offset * 0.5}
              fill={getTrackColor(trailTrack)}
              opacity={0.3 - offset * 0.08}
            />
          );
        })}
        {/* Main particle */}
        <circle
          cx={x}
          cy={y}
          r={6}
          fill={color}
          filter="url(#particle-glow)"
          style={{
            transition: prefersReducedMotion ? "none" : "cx 150ms ease-out, cy 150ms ease-out",
          }}
        />
      </g>
    );
  }

  // ── Terminal burst ─────────────────────────────────────────────────────

  function renderTerminalBurst(): React.ReactElement | null {
    if (playbackStatus !== "complete") return null;
    if (prefersReducedMotion) return null;

    const lastIdx = chain.operations.length - 1;
    const track = execution?.finalTrack ?? "ok";
    const x = computeNodeX(lastIdx) + NODE_WIDTH / 2;
    const y = track === "ok" ? okTrackY : errTrackY;

    return (
      <circle
        data-testid="playback-complete"
        cx={x}
        cy={y}
        r={20}
        fill="none"
        stroke={getTrackColor(track)}
        strokeWidth={2}
        opacity={0.4}
      >
        <animate attributeName="r" values="6;30" dur="0.6s" fill="freeze" />
        <animate attributeName="opacity" values="0.6;0" dur="0.6s" fill="freeze" />
      </circle>
    );
  }

  // ── Chain boundary detection ──────────────────────────────────────────

  function renderChainBoundaries(): React.ReactElement[] {
    const elements: React.ReactElement[] = [];
    const ops = chain.operations;

    for (let i = 1; i < ops.length; i++) {
      const prevLabel = ops[i - 1].chainLabel;
      const currLabel = ops[i].chainLabel;

      // Only render boundary when chainLabel changes (different original chain)
      if (prevLabel !== undefined && currLabel !== undefined && prevLabel !== currLabel) {
        const prevRight = computeNodeX(i - 1) + NODE_WIDTH;
        const currLeft = computeNodeX(i);
        const midX = (prevRight + currLeft) / 2;

        // Vertical dashed separator line
        elements.push(
          <line
            key={`boundary-line-${i}`}
            x1={midX}
            y1={okTrackY - 20}
            x2={midX}
            y2={errTrackY + 20}
            stroke="var(--hex-border, #424260)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
        );

        // Chain label above the separator
        elements.push(
          <text
            key={`boundary-label-${i}`}
            x={midX}
            y={okTrackY - 28}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--hex-font-mono, monospace)"
            fill="var(--hex-text-muted, #6b6b80)"
            opacity={0.6}
          >
            {currLabel.length > 20 ? currLabel.slice(0, 20) + "…" : currLabel}
          </text>
        );
      }
    }

    // Also render the first chain's label above the first node
    if (ops.length > 0 && ops[0].chainLabel !== undefined) {
      const firstX = computeNodeX(0) + NODE_WIDTH / 2;
      elements.push(
        <text
          key="boundary-label-first"
          x={firstX}
          y={okTrackY - 28}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--hex-font-mono, monospace)"
          fill="var(--hex-text-muted, #6b6b80)"
          opacity={0.6}
        >
          {ops[0].chainLabel.length > 20 ? ops[0].chainLabel.slice(0, 20) + "…" : ops[0].chainLabel}
        </text>
      );
    }

    return elements;
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="railway-pipeline-view"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
        borderRadius: "var(--hex-radius-lg, 8px)",
        cursor: dragging ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        data-testid="railway-canvas"
        data-zoom={zoom}
        data-pan-x={panX}
        data-pan-y={panY}
        data-reduced-motion={prefersReducedMotion ? "true" : "false"}
        width="100%"
        height="100%"
        style={{ display: "block" }}
      >
        <SvgDefs />

        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Track lines */}
          {renderTracks()}

          {/* Chain boundary separators */}
          {renderChainBoundaries()}

          {/* Switch connectors */}
          {renderSwitchConnectors()}

          {/* Operation nodes */}
          {chain.operations.map((op, idx) => (
            <foreignObject
              key={op.index}
              x={computeNodeX(idx)}
              y={nodeY}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              style={{ overflow: "visible" }}
            >
              <RailwayNode
                operation={op}
                step={execution?.steps[idx]}
                state={getNodeState(idx)}
                onClick={() => onNodeSelect?.(idx)}
              />
            </foreignObject>
          ))}

          {/* Particle animation */}
          {renderParticle()}

          {/* Terminal burst */}
          {renderTerminalBurst()}
        </g>
      </svg>
    </div>
  );
}

export { RailwayPipelineView };
export type { RailwayPipelineViewProps, PlaybackStatus };
