/**
 * RailwayNode — operation node component for the Railway Pipeline View.
 *
 * Spec: 04-railway-pipeline.md (4.3), 10-visual-encoding.md (10.5, 10.6)
 *
 * @packageDocumentation
 */

import { formatDuration, getCategoryIcon } from "./visual-encoding.js";
import type {
  ResultCategoryName,
  ResultMethodName,
  ResultOperationDescriptor,
  ResultStepTrace,
} from "./types.js";

// ── Category Color Fallbacks ──────────────────────────────────────────────
// The --hex-cat-* CSS vars are referenced in visual-encoding.ts but not yet
// defined in the token system. Use inline fallback hex values per spec.

const CATEGORY_FALLBACK_COLORS: Record<ResultCategoryName, string> = {
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

// ── Method → Category Mapping ──────────────────────────────────────────────

const METHOD_CATEGORY_MAP: Record<ResultMethodName, ResultCategoryName> = {
  // Constructors
  ok: "constructor",
  err: "constructor",
  fromThrowable: "constructor",
  fromNullable: "constructor",
  fromPredicate: "constructor",
  tryCatch: "constructor",
  fromPromise: "constructor",
  fromSafePromise: "constructor",
  fromAsyncThrowable: "constructor",
  // Transformations
  map: "transformation",
  mapErr: "transformation",
  mapBoth: "transformation",
  flatten: "transformation",
  flip: "transformation",
  // Chaining
  andThen: "chaining",
  andThrough: "chaining",
  andTee: "chaining",
  orTee: "chaining",
  // Recovery
  orElse: "recovery",
  // Observation
  inspect: "observation",
  inspectErr: "observation",
  // Extraction
  match: "extraction",
  unwrapOr: "extraction",
  unwrapOrElse: "extraction",
  expect: "extraction",
  expectErr: "extraction",
  // Conversion
  toNullable: "conversion",
  toUndefined: "conversion",
  intoTuple: "conversion",
  merge: "conversion",
  toJSON: "conversion",
  toAsync: "conversion",
  // Async bridges
  asyncMap: "transformation",
  asyncAndThen: "chaining",
  // Combinators
  all: "combinator",
  allSettled: "combinator",
  any: "combinator",
  collect: "combinator",
  // Generators
  safeTry: "generator",
};

/** Get the category for a method name. */
export function getMethodCategory(method: ResultMethodName): ResultCategoryName {
  return METHOD_CATEGORY_MAP[method];
}

// ── Props ───────────────────────────────────────────────────────────────────

type NodeState = "default" | "hovered" | "selected" | "active" | "bypassed";

interface RailwayNodeProps {
  readonly operation: ResultOperationDescriptor;
  readonly step: ResultStepTrace | undefined;
  readonly state: NodeState;
  readonly onClick?: () => void;
}

// ── Label Truncation ────────────────────────────────────────────────────────

function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) {
    return label;
  }
  return label.slice(0, maxLen) + "…";
}

// ── Switch Type Detection ───────────────────────────────────────────────────

function getSwitchType(step: ResultStepTrace | undefined): "error" | "recovery" | undefined {
  if (!step || !step.switched) {
    return undefined;
  }
  if (step.outputTrack === "err") {
    return "error";
  }
  return "recovery";
}

// ── Component ───────────────────────────────────────────────────────────────

// ── State-based Style Helpers ──────────────────────────────────────────────

function getContainerStyle(state: NodeState, categoryColor: string): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 140,
    height: 88,
    boxSizing: "border-box",
    padding: "6px 10px",
    borderRadius: "var(--hex-radius-md, 6px)",
    borderLeft: `3px solid ${categoryColor}`,
    backgroundColor: "var(--hex-bg-secondary, #2a2a3e)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    position: "relative",
    cursor: "pointer",
    transition: "var(--hex-transition-fast, 100ms ease)",
    fontFamily: "var(--hex-font-sans, sans-serif)",
    overflow: "hidden",
  };

  switch (state) {
    case "bypassed":
      return {
        ...base,
        opacity: 0.4,
        borderStyle: "dashed",
        borderLeftWidth: 3,
        borderLeftColor: categoryColor,
      };
    case "active":
      return {
        ...base,
        boxShadow: `0 0 8px ${categoryColor}44, 0 0 2px ${categoryColor}88`,
        backgroundColor: "var(--hex-bg-active, #45456a)",
      };
    case "hovered":
      return {
        ...base,
        boxShadow: "var(--hex-shadow-tooltip, 0 2px 10px rgba(0,0,0,0.12))",
        backgroundColor: "var(--hex-bg-hover, #363650)",
      };
    case "selected":
      return {
        ...base,
        outline: "2px solid var(--hex-accent, #818cf8)",
        outlineOffset: 1,
      };
    default:
      return base;
  }
}

function RailwayNode({ operation, step, state, onClick }: RailwayNodeProps): React.ReactElement {
  const category = getMethodCategory(operation.method);
  const icon = getCategoryIcon(category);
  const switchType = getSwitchType(step);
  const label = truncateLabel(operation.label, 12);
  const duration = step ? formatDuration(step.durationMicros) : undefined;
  const categoryColor = CATEGORY_FALLBACK_COLORS[category];

  const inputIsOk = step?.inputTrack === "ok";
  const outputIsOk = step?.outputTrack === "ok";

  return (
    <div
      data-testid="railway-node"
      data-state={state}
      data-switch-type={switchType}
      onClick={onClick}
      style={getContainerStyle(state, categoryColor)}
    >
      {/* Category Icon */}
      <span
        data-testid="node-category-icon"
        data-category={category}
        style={{
          color: categoryColor,
          fontSize: "var(--hex-font-size-lg, 14px)",
          lineHeight: 1,
        }}
      >
        {icon}
      </span>

      {/* Method Name */}
      <span
        data-testid="node-method"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-sm, 12px)",
          fontWeight: 600,
          color: "var(--hex-text-primary, #e4e4f0)",
        }}
      >
        {operation.method}
      </span>

      {/* Label */}
      <span
        data-testid="node-label"
        style={{
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-muted, #6b6b80)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Track Flow */}
      {step && (
        <span
          data-testid="node-track-flow"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: "var(--hex-font-size-xs, 11px)",
            fontFamily: "var(--hex-font-mono, monospace)",
            padding: "1px 6px",
            borderRadius: "var(--hex-radius-pill, 9999px)",
            backgroundColor: "var(--hex-bg-tertiary, #383852)",
          }}
        >
          <span
            style={{
              color: inputIsOk ? "var(--hex-success, #4ade80)" : "var(--hex-error, #f87171)",
            }}
          >
            {inputIsOk ? "Ok" : "Err"}
          </span>
          <span style={{ color: "var(--hex-text-muted, #6b6b80)" }}>→</span>
          <span
            style={{
              color: outputIsOk ? "var(--hex-success, #4ade80)" : "var(--hex-error, #f87171)",
            }}
          >
            {outputIsOk ? "Ok" : "Err"}
          </span>
        </span>
      )}

      {/* Duration */}
      {duration !== undefined && (
        <span
          data-testid="node-duration"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
            fontFamily: "var(--hex-font-mono, monospace)",
            textAlign: "right",
          }}
        >
          {duration}
        </span>
      )}

      {/* Switch Badge */}
      {step?.switched && (
        <span
          data-testid="node-switch-badge"
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            fontSize: 12,
            backgroundColor: "var(--hex-warning, #fbbf24)",
            color: "#1a1a2e",
            borderRadius: "50%",
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ⚡
        </span>
      )}
    </div>
  );
}

export { RailwayNode };
export type { RailwayNodeProps, NodeState };
