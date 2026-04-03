/**
 * Main matrix layout when combinator data is present.
 *
 * @packageDocumentation
 */

import type { ResultChainDescriptor } from "../types.js";
import { TRACK_COLORS } from "../visual-encoding.js";
import { EDUCATIONAL_ANNOTATIONS, METHOD_ICONS } from "../combinator-matrix-constants.js";
import { getTrackColor } from "../helpers/combinator-matrix-helpers.js";
import type { CombinatorData } from "../combinator-matrix-types.js";
import { CombinatorMatrixHeaderStat } from "./combinator-matrix-header-stat.js";
import { CombinatorMatrixInputCell } from "./combinator-matrix-input-cell.js";

export function CombinatorMatrixFilled({
  chain,
  combinatorData,
  expandedNested,
  toggleNested,
}: {
  readonly chain: ResultChainDescriptor;
  readonly combinatorData: CombinatorData;
  readonly expandedNested: boolean;
  readonly toggleNested: () => void;
}): React.ReactElement {
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

        <CombinatorMatrixHeaderStat label="Inputs" value={combinatorData.inputs.length} />
        <CombinatorMatrixHeaderStat label="Ok" value={okCount} color={TRACK_COLORS.ok} />
        <CombinatorMatrixHeaderStat label="Err" value={errCount} color={TRACK_COLORS.err} />
        <CombinatorMatrixHeaderStat
          label="Result"
          value={combinatorData.output.track === "ok" ? "Ok" : "Err"}
          color={getTrackColor(combinatorData.output.track)}
        />
      </div>

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
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {combinatorData.inputs.map(input => (
            <CombinatorMatrixInputCell
              key={input.name ?? input.index}
              input={input}
              combinatorData={combinatorData}
              toggleNested={toggleNested}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 24px",
            position: "relative",
          }}
        >
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
