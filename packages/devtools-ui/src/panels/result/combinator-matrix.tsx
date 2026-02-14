/**
 * CombinatorMatrixView — Grid visualization for Result combinators.
 *
 * Spec: 09-combinator-matrix.md (9.1-9.14), 10-visual-encoding.md (10.11)
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";
import type { ResultChainDescriptor } from "./types.js";
import { TRACK_COLORS } from "./visual-encoding.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface CombinatorInput {
  readonly index: number;
  readonly name?: string;
  readonly sourceLabel: string;
  readonly track: "ok" | "err";
  readonly valuePreview: string;
  readonly isShortCircuitCause: boolean;
  readonly isSkipped: boolean;
}

interface CombinatorOutput {
  readonly track: "ok" | "err";
  readonly valuePreview: string;
  readonly sourceNote: string;
}

interface CombinatorData {
  readonly combinatorMethod: "all" | "allSettled" | "any" | "collect";
  readonly inputs: readonly CombinatorInput[];
  readonly output: CombinatorOutput;
  readonly nestedCombinator?: { readonly index: number; readonly method: string };
}

// ── Props ───────────────────────────────────────────────────────────────────

interface CombinatorMatrixViewProps {
  readonly chain: ResultChainDescriptor;
  readonly combinatorData: CombinatorData | undefined;
}

// ── Educational annotations ─────────────────────────────────────────────────

const EDUCATIONAL_ANNOTATIONS: Record<string, string> = {
  all: "all: Short-circuits on the first Err. Like Promise.all — if one fails, the whole thing fails. Use allSettled to collect all errors.",
  allSettled:
    "allSettled: Evaluates every input regardless of failures. Collects all errors. Like Promise.allSettled.",
  any: "any: Short-circuits on the first Ok. Like Promise.any — succeeds as soon as one succeeds. Fails only if ALL inputs fail.",
  collect:
    "collect: Like all, but inputs are a named record. The output preserves field names. Short-circuits on first Err.",
};

// ── Method icons ─────────────────────────────────────────────────────────────

const METHOD_ICONS: Record<string, string> = {
  all: "\u2200", // ∀
  allSettled: "\u2261", // ≡
  any: "\u2203", // ∃
  collect: "\u007B\u007D", // {}
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function hasCombinatorOp(chain: ResultChainDescriptor): boolean {
  return chain.operations.some(
    op =>
      op.method === "all" ||
      op.method === "allSettled" ||
      op.method === "any" ||
      op.method === "collect"
  );
}

function getTrackColor(track: "ok" | "err"): string {
  return track === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeaderStat({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly color?: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        minWidth: 80,
      }}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: color ?? "#e2e8f0",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: 2,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

function CombinatorMatrixView({
  chain,
  combinatorData,
}: CombinatorMatrixViewProps): React.ReactElement {
  const [expandedNested, setExpandedNested] = useState(false);

  // No combinator guard
  if (!hasCombinatorOp(chain) || !combinatorData) {
    return (
      <div
        data-testid="combinator-matrix-view"
        style={{
          padding: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        <div
          data-testid="no-combinator-message"
          style={{
            color: "#94a3b8",
            fontSize: 14,
            textAlign: "center",
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          This chain has no combinator operations. The Combinator Matrix is available for chains
          using all, allSettled, any, or collect.
        </div>
      </div>
    );
  }

  const okCount = combinatorData.inputs.filter(i => i.track === "ok").length;
  const errCount = combinatorData.inputs.filter(i => i.track === "err").length;
  const methodIcon = METHOD_ICONS[combinatorData.combinatorMethod] ?? "";

  const toggleNested = useCallback(() => {
    setExpandedNested(prev => !prev);
  }, []);

  return (
    <div
      data-testid="combinator-matrix-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        data-testid="combinator-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          backgroundColor: "rgba(30, 41, 59, 0.6)",
          borderRadius: 12,
          border: `1px solid ${getTrackColor(combinatorData.output.track)}33`,
        }}
      >
        {/* Method badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: `${getTrackColor(combinatorData.output.track)}15`,
            border: `2px solid ${getTrackColor(combinatorData.output.track)}44`,
            fontSize: 20,
            fontWeight: 700,
            color: getTrackColor(combinatorData.output.track),
          }}
        >
          {methodIcon}
        </div>

        {/* Title / method name */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#e2e8f0",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {combinatorData.combinatorMethod}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginTop: 2,
            }}
          >
            {chain.label ? `${chain.label} \u2022 ` : ""}
            {chain.portName ?? ""}
          </div>
        </div>

        {/* Stat pills */}
        <HeaderStat label="Inputs" value={combinatorData.inputs.length} />
        <HeaderStat label="Ok" value={okCount} color={TRACK_COLORS.ok} />
        <HeaderStat label="Err" value={errCount} color={TRACK_COLORS.err} />
        <HeaderStat
          label="Result"
          value={combinatorData.output.track === "ok" ? "Ok" : "Err"}
          color={getTrackColor(combinatorData.output.track)}
        />
      </div>

      {/* ── Matrix visualization ──────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 0,
          alignItems: "center",
        }}
      >
        {/* Left column: Input cells */}
        <div
          data-testid="combinator-inputs"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {combinatorData.inputs.map(input => (
            <div
              key={input.name ?? input.index}
              data-testid="combinator-input-cell"
              data-track={input.track}
              data-skipped={input.isSkipped ? "true" : "false"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                backgroundColor: input.isSkipped
                  ? "rgba(30, 41, 59, 0.2)"
                  : "rgba(30, 41, 59, 0.5)",
                borderRadius: 8,
                borderLeft: `3px solid ${getTrackColor(input.track)}`,
                opacity: input.isSkipped ? 0.4 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* Index / name badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: `${getTrackColor(input.track)}18`,
                  color: getTrackColor(input.track),
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                {combinatorData.combinatorMethod === "collect" && input.name
                  ? input.name
                  : `#${input.index + 1}`}
              </span>

              {/* Source label */}
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#e2e8f0",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {input.sourceLabel}
              </span>

              {/* Track badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 4,
                  backgroundColor: `${getTrackColor(input.track)}18`,
                  color: getTrackColor(input.track),
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {input.track === "ok" ? "\u25CF Ok" : "\u25CB Err"}
              </span>

              {/* Value preview */}
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontFamily: "'JetBrains Mono', monospace",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {input.valuePreview}
              </span>

              {/* Short-circuit label */}
              {input.isShortCircuitCause && (
                <span
                  data-testid="short-circuit-label"
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: `${TRACK_COLORS.err}25`,
                    color: TRACK_COLORS.err,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                >
                  SHORT-CIRCUIT
                </span>
              )}

              {/* Nested combinator badge */}
              {combinatorData.nestedCombinator &&
                combinatorData.nestedCombinator.index === input.index && (
                  <span
                    data-testid="nested-combinator-badge"
                    onClick={toggleNested}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      backgroundColor: "#818cf820",
                      color: "#818cf8",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px dashed #818cf844",
                    }}
                  >
                    {combinatorData.nestedCombinator.method}(...)
                  </span>
                )}
            </div>
          ))}
        </div>

        {/* Center column: Connector lines + Combinator box */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 24px",
            position: "relative",
          }}
        >
          {/* Connectors */}
          <div
            data-testid="combinator-connectors"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
            }}
          >
            {combinatorData.inputs.map(input => (
              <div
                key={input.name ?? input.index}
                data-testid="combinator-connector"
                data-track={input.track}
                data-skipped={input.isSkipped ? "true" : "false"}
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: input.isSkipped
                    ? "#47556930"
                    : `${getTrackColor(input.track)}66`,
                }}
              />
            ))}
          </div>

          {/* Combinator box */}
          <div
            data-testid="combinator-box"
            data-output-track={combinatorData.output.track}
            style={{
              marginTop: 16,
              padding: "16px 20px",
              borderRadius: 12,
              backgroundColor: `${getTrackColor(combinatorData.output.track)}10`,
              border: `2px solid ${getTrackColor(combinatorData.output.track)}55`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              minWidth: 100,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: getTrackColor(combinatorData.output.track),
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {combinatorData.combinatorMethod}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              Inputs: {combinatorData.inputs.length}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: TRACK_COLORS.ok,
                  fontWeight: 600,
                }}
              >
                Ok: {okCount}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: TRACK_COLORS.err,
                  fontWeight: 600,
                }}
              >
                Err: {errCount}
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Output box */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: "center",
          }}
        >
          <div
            data-testid="combinator-output-box"
            data-track={combinatorData.output.track}
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              backgroundColor: `${getTrackColor(combinatorData.output.track)}10`,
              border: `2px solid ${getTrackColor(combinatorData.output.track)}44`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Track badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 6,
                  backgroundColor: `${getTrackColor(combinatorData.output.track)}20`,
                  color: getTrackColor(combinatorData.output.track),
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {combinatorData.output.track === "ok" ? "\u25CF Ok" : "\u25CB Err"}
              </span>
            </div>

            {/* Value preview */}
            <div
              style={{
                fontSize: 12,
                color: "#cbd5e1",
                fontFamily: "'JetBrains Mono', monospace",
                padding: "6px 10px",
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                borderRadius: 6,
                wordBreak: "break-all",
              }}
            >
              {combinatorData.output.valuePreview}
            </div>

            {/* Source note */}
            <span
              data-testid="combinator-source-note"
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              {combinatorData.output.sourceNote}
            </span>
          </div>
        </div>
      </div>

      {/* ── Nested combinator expanded view ────────────────────────── */}
      {expandedNested && combinatorData.nestedCombinator && (
        <div
          data-testid="nested-combinator-expanded"
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            backgroundColor: "#818cf810",
            border: "1px dashed #818cf833",
            color: "#c4b5fd",
            fontSize: 12,
          }}
        >
          Nested {combinatorData.nestedCombinator.method} at input #
          {combinatorData.nestedCombinator.index + 1}
        </div>
      )}

      {/* ── Educational annotation ─────────────────────────────────── */}
      <div
        data-testid="combinator-educational"
        style={{
          padding: "12px 16px",
          borderRadius: 8,
          backgroundColor: "rgba(30, 41, 59, 0.4)",
          border: "1px solid rgba(100, 116, 139, 0.15)",
          color: "#94a3b8",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        <span
          style={{
            color: "#cbd5e1",
            fontWeight: 600,
            marginRight: 4,
          }}
        >
          {"\u{1F4D6}"}
        </span>
        {EDUCATIONAL_ANNOTATIONS[combinatorData.combinatorMethod]}
      </div>
    </div>
  );
}

export { CombinatorMatrixView };
export type { CombinatorMatrixViewProps, CombinatorData, CombinatorInput, CombinatorOutput };
