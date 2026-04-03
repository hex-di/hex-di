/**
 * Individual input cell for the CombinatorMatrixFilled grid.
 *
 * @packageDocumentation
 */

import { TRACK_COLORS } from "../visual-encoding.js";
import { getTrackColor } from "../helpers/combinator-matrix-helpers.js";
import type { CombinatorData, CombinatorInput } from "../combinator-matrix-types.js";

export function CombinatorMatrixInputCell({
  input,
  combinatorData,
  toggleNested,
}: {
  readonly input: CombinatorInput;
  readonly combinatorData: CombinatorData;
  readonly toggleNested: () => void;
}): React.ReactElement {
  return (
    <div
      data-testid="combinator-input-cell"
      data-track={input.track}
      data-skipped={input.isSkipped ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        backgroundColor: input.isSkipped ? "rgba(30, 41, 59, 0.2)" : "rgba(30, 41, 59, 0.5)",
        borderRadius: 8,
        borderLeft: `3px solid ${getTrackColor(input.track)}`,
        opacity: input.isSkipped ? 0.4 : 1,
        transition: "opacity 0.2s",
      }}
    >
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

      {combinatorData.nestedCombinator && combinatorData.nestedCombinator.index === input.index && (
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
  );
}
