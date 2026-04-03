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
import { HeaderStat, InputCell, ConnectorsAndBox, OutputBox } from "./combinator-matrix-parts.js";

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

// ── Constants ───────────────────────────────────────────────────────────────

const EDUCATIONAL_ANNOTATIONS: Record<string, string> = {
  all: "all: Short-circuits on the first Err. Like Promise.all \u2014 if one fails, the whole thing fails. Use allSettled to collect all errors.",
  allSettled:
    "allSettled: Evaluates every input regardless of failures. Collects all errors. Like Promise.allSettled.",
  any: "any: Short-circuits on the first Ok. Like Promise.any \u2014 succeeds as soon as one succeeds. Fails only if ALL inputs fail.",
  collect:
    "collect: Like all, but inputs are a named record. The output preserves field names. Short-circuits on first Err.",
};

const METHOD_ICONS: Record<string, string> = {
  all: "\u2200",
  allSettled: "\u2261",
  any: "\u2203",
  collect: "\u007B\u007D",
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

// ── Component ───────────────────────────────────────────────────────────────

function CombinatorMatrixView({
  chain,
  combinatorData,
}: CombinatorMatrixViewProps): React.ReactElement {
  const [expandedNested, setExpandedNested] = useState(false);
  const toggleNested = useCallback(() => {
    setExpandedNested(prev => !prev);
  }, []);

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
      {/* Header */}
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
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {chain.label ? `${chain.label} \u2022 ` : ""}
            {chain.portName ?? ""}
          </div>
        </div>
        <HeaderStat label="Inputs" value={combinatorData.inputs.length} />
        <HeaderStat label="Ok" value={okCount} color={TRACK_COLORS.ok} />
        <HeaderStat label="Err" value={errCount} color={TRACK_COLORS.err} />
        <HeaderStat
          label="Result"
          value={combinatorData.output.track === "ok" ? "Ok" : "Err"}
          color={getTrackColor(combinatorData.output.track)}
        />
      </div>

      {/* Matrix */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 0,
          alignItems: "center",
        }}
      >
        <div
          data-testid="combinator-inputs"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {combinatorData.inputs.map(input => (
            <InputCell
              key={input.name ?? input.index}
              input={input}
              combinatorData={combinatorData}
              toggleNested={toggleNested}
            />
          ))}
        </div>
        <ConnectorsAndBox combinatorData={combinatorData} okCount={okCount} errCount={errCount} />
        <OutputBox combinatorData={combinatorData} />
      </div>

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
        <span style={{ color: "#cbd5e1", fontWeight: 600, marginRight: 4 }}>{"\u{1F4D6}"}</span>
        {EDUCATIONAL_ANNOTATIONS[combinatorData.combinatorMethod]}
      </div>
    </div>
  );
}

export { CombinatorMatrixView };
export type { CombinatorMatrixViewProps, CombinatorData, CombinatorInput, CombinatorOutput };
