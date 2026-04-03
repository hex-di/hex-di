import type { ReactElement } from "react";
import type { ChainRowData } from "../helpers/railway-helpers.js";
import {
  CONSTRUCTOR_METHODS,
  formatDuration,
  formatSourceLocation,
  formatValue,
} from "../helpers/railway-helpers.js";

interface RailwayChainRowProps {
  readonly row: ChainRowData;
  readonly hideConstructors: boolean;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

function ChainRowValueBadges({ row }: { readonly row: ChainRowData }): ReactElement {
  return (
    <>
      {row.latestExec?.entryValue !== undefined && (
        <span
          data-testid="railway-chain-entry-value"
          style={{
            fontSize: 10,
            color: "var(--hex-text-muted)",
            maxWidth: 80,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          {formatValue(row.latestExec.entryValue)}
        </span>
      )}
      {row.latestExec?.entryValue !== undefined && row.latestExec.finalValue !== undefined && (
        <span style={{ color: "var(--hex-text-muted)", fontSize: 10 }}>{"\u2192"}</span>
      )}
      {row.latestExec?.finalValue !== undefined && (
        <span
          data-testid="railway-chain-final-value"
          style={{
            fontSize: 10,
            color:
              row.finalTrack === "err"
                ? "var(--hex-error, #ef4444)"
                : "var(--hex-success, #22c55e)",
            maxWidth: 80,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          {formatValue(row.latestExec.finalValue)}
        </span>
      )}
    </>
  );
}

function getStepTrackColor(stepTrack: string | undefined): string {
  if (stepTrack === "err") return "var(--hex-error, #ef4444)";
  if (stepTrack === "ok") return "var(--hex-success, #22c55e)";
  return "var(--hex-text-muted)";
}

export function RailwayChainRow({
  row,
  hideConstructors,
  isExpanded,
  onToggle,
}: RailwayChainRowProps): ReactElement {
  const trackColor =
    row.finalTrack === "err" ? "var(--hex-error, #ef4444)" : "var(--hex-success, #22c55e)";

  return (
    <div>
      <div
        data-testid="railway-chain-row"
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "var(--hex-space-sm) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          borderLeft:
            row.finalTrack === "err"
              ? "3px solid var(--hex-error, #ef4444)"
              : "3px solid transparent",
          cursor: "pointer",
          backgroundColor: isExpanded ? "var(--hex-bg-secondary, #f9fafb)" : undefined,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--hex-text-muted)", width: 12, flexShrink: 0 }}>
          {isExpanded ? "\u25BC" : "\u25B6"}
        </span>

        <span
          data-testid="railway-chain-label"
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--hex-font-mono)",
            color: "var(--hex-text-primary)",
            whiteSpace: "nowrap",
            minWidth: 80,
          }}
        >
          {row.chain.label}
        </span>

        {row.chain.portName !== undefined && (
          <span
            data-testid="railway-chain-port"
            style={{
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 4,
              backgroundColor: "var(--hex-bg-secondary, #f3f4f6)",
              color: "var(--hex-text-muted)",
              fontFamily: "var(--hex-font-mono)",
              whiteSpace: "nowrap",
            }}
          >
            {row.chain.portName}
          </span>
        )}

        {row.chain.isAsync && (
          <span
            data-testid="railway-chain-async"
            style={{
              fontSize: 9,
              padding: "1px 4px",
              borderRadius: 3,
              backgroundColor: "var(--hex-accent-muted, #dbeafe)",
              color: "var(--hex-accent, #3b82f6)",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            async
          </span>
        )}

        {row.chain.sourceLocation !== undefined && (
          <span
            data-testid="railway-chain-source"
            title={row.chain.sourceLocation}
            style={{
              fontSize: 10,
              color: "var(--hex-text-muted)",
              fontFamily: "var(--hex-font-mono)",
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            {formatSourceLocation(row.chain.sourceLocation)}
          </span>
        )}

        <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
          {row.methodSequence
            .filter(method => !hideConstructors || !CONSTRUCTOR_METHODS.has(method))
            .map((method, i) => (
              <span
                key={i}
                data-testid="railway-method-badge"
                style={{
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: "var(--hex-font-mono)",
                  backgroundColor: "var(--hex-bg-secondary, #f3f4f6)",
                  color: "var(--hex-text-secondary)",
                }}
              >
                {method}
              </span>
            ))}
        </div>

        <ChainRowValueBadges row={row} />

        {row.switchCount > 0 && (
          <span
            data-testid="railway-chain-switches"
            title={`${row.switchCount} track switch${row.switchCount > 1 ? "es" : ""}`}
            style={{
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 4,
              backgroundColor: "var(--hex-warning-muted, #fef3c7)",
              color: "var(--hex-warning, #f59e0b)",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {"\u21C5"}
            {row.switchCount}
          </span>
        )}

        <span
          data-testid="railway-chain-ops"
          style={{ fontSize: 11, color: "var(--hex-text-muted)", whiteSpace: "nowrap" }}
        >
          {row.chain.operations.length} ops
        </span>

        <span
          data-testid="railway-chain-duration"
          style={{
            fontSize: 11,
            color: "var(--hex-text-muted)",
            whiteSpace: "nowrap",
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {formatDuration(row.totalDuration)}
        </span>

        <span
          data-testid="railway-chain-outcome"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: trackColor,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {row.finalTrack === "err" ? "\u2717" : "\u2713"}
        </span>
      </div>

      {isExpanded && (
        <div
          data-testid="railway-chain-detail"
          style={{
            borderBottom: "1px solid var(--hex-border)",
            backgroundColor: "var(--hex-bg-secondary, #f9fafb)",
            paddingLeft: "var(--hex-space-xl)",
          }}
        >
          {row.chain.operations.map((op, i) => {
            const step = row.latestExec?.steps[i];
            const stepTrack = step?.outputTrack;
            const stepColor = getStepTrackColor(stepTrack);

            return (
              <div
                key={op.index}
                data-testid="railway-op-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px var(--hex-space-md)",
                  fontSize: 11,
                  fontFamily: "var(--hex-font-mono)",
                  borderLeft: step?.switched
                    ? "2px solid var(--hex-error, #ef4444)"
                    : "2px solid transparent",
                }}
              >
                <span style={{ color: "var(--hex-text-primary)", fontWeight: 500, minWidth: 64 }}>
                  {op.method}
                </span>
                {step?.callbackThrew && (
                  <span
                    data-testid="railway-op-threw"
                    title="Callback threw an exception"
                    style={{
                      color: "var(--hex-warning, #f59e0b)",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {"\u26A0"}
                  </span>
                )}
                <span style={{ color: "var(--hex-text-muted)", flex: 1 }}>{op.label}</span>
                {op.callbackLocation !== undefined && (
                  <span
                    data-testid="railway-op-location"
                    style={{
                      color: "var(--hex-text-muted)",
                      fontSize: 10,
                      fontFamily: "var(--hex-font-mono)",
                      opacity: 0.7,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {op.callbackLocation}
                  </span>
                )}
                {step && (
                  <>
                    {step.inputValue !== undefined && (
                      <span
                        data-testid="railway-op-input"
                        style={{
                          color: "var(--hex-text-muted)",
                          fontSize: 10,
                          maxWidth: 100,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatValue(step.inputValue)}
                      </span>
                    )}
                    {step.inputValue !== undefined && step.outputValue !== undefined && (
                      <span style={{ color: "var(--hex-text-muted)", fontSize: 10 }}>
                        {"\u2192"}
                      </span>
                    )}
                    {step.outputValue !== undefined && (
                      <span
                        data-testid="railway-op-output"
                        style={{
                          color: "var(--hex-text-secondary)",
                          fontSize: 10,
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatValue(step.outputValue)}
                      </span>
                    )}
                    <span style={{ color: stepColor, fontWeight: 600 }}>{stepTrack}</span>
                    <span
                      style={{ color: "var(--hex-text-muted)", minWidth: 40, textAlign: "right" }}
                    >
                      {formatDuration(step.durationMicros)}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
