/**
 * GraphAnalysisSidebar — right slide-in with graph health analysis.
 *
 * @packageDocumentation
 */

import type { GraphAnalysisState, GraphSuggestion } from "../types.js";
import { COMPLEXITY_SAFE_MAX, COMPLEXITY_MONITOR_MAX } from "../constants.js";

interface GraphAnalysisSidebarProps {
  readonly analysis: GraphAnalysisState;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuggestionClick?: (suggestion: GraphSuggestion) => void;
  readonly onPortClick?: (portName: string) => void;
}

function getScoreColor(score: number): string {
  if (score <= COMPLEXITY_SAFE_MAX) return "var(--hex-success)";
  if (score <= COMPLEXITY_MONITOR_MAX) return "var(--hex-warning)";
  return "var(--hex-error)";
}

function getRecommendationLabel(rec: "safe" | "monitor" | "consider-splitting"): string {
  switch (rec) {
    case "safe":
      return "Safe";
    case "monitor":
      return "Monitor";
    case "consider-splitting":
      return "Consider Splitting";
  }
}

function GraphAnalysisSidebar({
  analysis,
  isOpen,
  onClose,
  onSuggestionClick,
  onPortClick,
}: GraphAnalysisSidebarProps): React.ReactElement | null {
  if (!isOpen) return null;

  const scoreColor = getScoreColor(analysis.complexityScore);

  return (
    <div
      data-testid="graph-analysis-sidebar"
      style={{
        width: 320,
        height: "100%",
        overflow: "auto",
        backgroundColor: "var(--hex-bg-secondary)",
        borderLeft: "1px solid var(--hex-border)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
      }}
      role="complementary"
      aria-label="Graph analysis"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--hex-space-sm)",
          borderBottom: "1px solid var(--hex-border)",
        }}
      >
        <span style={{ fontWeight: "var(--hex-font-weight-medium)" }}>Graph Analysis</span>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "none",
            color: "var(--hex-text-muted)",
            cursor: "pointer",
          }}
          aria-label="Close analysis sidebar"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Complexity Score Card */}
      <div
        data-testid="complexity-score"
        style={{
          padding: "var(--hex-space-sm)",
          borderBottom: "1px solid var(--hex-border)",
        }}
      >
        <div
          style={{
            color: "var(--hex-text-muted)",
            fontSize: "var(--hex-font-size-xs)",
            marginBottom: 4,
          }}
        >
          Complexity Score
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Gauge */}
          <svg width={60} height={60} viewBox="0 0 60 60">
            <circle cx={30} cy={30} r={25} fill="none" stroke="var(--hex-border)" strokeWidth={4} />
            <circle
              cx={30}
              cy={30}
              r={25}
              fill="none"
              stroke={scoreColor}
              strokeWidth={4}
              strokeDasharray={`${Math.min(analysis.complexityScore / 150, 1) * 157} 157`}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
            />
            <text
              x={30}
              y={32}
              textAnchor="middle"
              fill={scoreColor}
              fontSize="14"
              fontWeight="bold"
            >
              {analysis.complexityScore}
            </text>
          </svg>
          <div>
            <div
              style={{
                fontWeight: "var(--hex-font-weight-medium)",
                color: scoreColor,
              }}
            >
              {getRecommendationLabel(analysis.recommendation)}
            </div>
            <div style={{ color: "var(--hex-text-muted)", fontSize: "var(--hex-font-size-xs)" }}>
              Depth: {analysis.maxChainDepth} &middot;{" "}
              {analysis.isComplete ? "Complete" : "Incomplete"}
            </div>
          </div>
        </div>
      </div>

      {/* Direction Summary */}
      <div
        data-testid="direction-summary"
        style={{
          padding: "var(--hex-space-sm)",
          borderBottom: "1px solid var(--hex-border)",
        }}
      >
        <div
          style={{
            color: "var(--hex-text-muted)",
            fontSize: "var(--hex-font-size-xs)",
            marginBottom: 4,
          }}
        >
          Direction Summary
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <span>
            Inbound: <strong>{analysis.directionSummary.inbound}</strong>
          </span>
          <span>
            Outbound: <strong>{analysis.directionSummary.outbound}</strong>
          </span>
        </div>
      </div>

      {/* Completeness */}
      {!analysis.isComplete && (
        <div
          data-testid="completeness-card"
          style={{
            padding: "var(--hex-space-sm)",
            borderBottom: "1px solid var(--hex-border)",
          }}
        >
          <div
            style={{
              color: "var(--hex-warning)",
              fontSize: "var(--hex-font-size-xs)",
              marginBottom: 4,
            }}
          >
            Unsatisfied Requirements ({analysis.unsatisfiedRequirements.length})
          </div>
          {analysis.unsatisfiedRequirements.map(req => (
            <div
              key={req}
              style={{
                fontFamily: "var(--hex-font-mono)",
                color: "var(--hex-warning)",
                padding: "1px 0",
              }}
            >
              {req}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div
          data-testid="suggestions-list"
          style={{
            padding: "var(--hex-space-sm)",
            borderBottom: "1px solid var(--hex-border)",
          }}
        >
          <div
            style={{
              color: "var(--hex-text-muted)",
              fontSize: "var(--hex-font-size-xs)",
              marginBottom: 4,
            }}
          >
            Suggestions ({analysis.suggestions.length})
          </div>
          {analysis.suggestions.map((suggestion, i) => (
            <button
              key={`${suggestion.portName}-${i}`}
              onClick={() => onSuggestionClick?.(suggestion)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "var(--hex-space-xs)",
                marginBottom: 4,
                border: "1px solid var(--hex-border)",
                borderRadius: "var(--hex-radius-sm)",
                backgroundColor: "var(--hex-bg-primary)",
                cursor: "pointer",
                fontFamily: "var(--hex-font-sans)",
                fontSize: "var(--hex-font-size-xs)",
              }}
            >
              <div style={{ fontWeight: "var(--hex-font-weight-medium)" as string }}>
                [{suggestion.type}] {suggestion.portName}
              </div>
              <div style={{ color: "var(--hex-text-secondary)", marginTop: 2 }}>
                {suggestion.message}
              </div>
              <div style={{ color: "var(--hex-accent)", marginTop: 2 }}>{suggestion.action}</div>
            </button>
          ))}
        </div>
      )}

      {/* Orphan Ports */}
      {analysis.orphanPorts.length > 0 && (
        <PortList
          title="Orphan Ports"
          testId="orphan-ports"
          ports={analysis.orphanPorts}
          onPortClick={onPortClick}
        />
      )}

      {/* Captive Dependencies */}
      {analysis.captiveDependencies.length > 0 && (
        <div
          data-testid="captive-deps"
          style={{
            padding: "var(--hex-space-sm)",
            borderBottom: "1px solid var(--hex-border)",
          }}
        >
          <div
            style={{
              color: "var(--hex-error)",
              fontSize: "var(--hex-font-size-xs)",
              marginBottom: 4,
            }}
          >
            Captive Dependencies ({analysis.captiveDependencies.length})
          </div>
          {analysis.captiveDependencies.map((c, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--hex-font-mono)",
                fontSize: "var(--hex-font-size-xs)",
                color: "var(--hex-error)",
                padding: "1px 0",
              }}
            >
              {c.dependentPort} captures {c.captivePort}
            </div>
          ))}
        </div>
      )}

      {/* Disposal Warnings */}
      {analysis.disposalWarnings.length > 0 && (
        <PortList
          title="Disposal Warnings"
          testId="disposal-warnings"
          ports={analysis.disposalWarnings}
          color="var(--hex-warning)"
        />
      )}

      {/* Unnecessary Lazy */}
      {analysis.unnecessaryLazyPorts.length > 0 && (
        <PortList
          title="Unnecessary Lazy Ports"
          testId="unnecessary-lazy"
          ports={analysis.unnecessaryLazyPorts}
          onPortClick={onPortClick}
        />
      )}

      {/* Depth Warning */}
      {analysis.depthWarning !== undefined && (
        <div
          data-testid="depth-warning"
          style={{
            padding: "var(--hex-space-sm)",
            borderBottom: "1px solid var(--hex-border)",
            color: "var(--hex-warning)",
            fontSize: "var(--hex-font-size-xs)",
          }}
        >
          {analysis.depthWarning}
        </div>
      )}

      {/* Correlation ID */}
      {analysis.correlationId !== "" && (
        <div
          data-testid="correlation-id"
          style={{
            padding: "var(--hex-space-sm)",
            fontSize: "var(--hex-font-size-xs)",
            color: "var(--hex-text-muted)",
          }}
        >
          Correlation ID: <code>{analysis.correlationId}</code>
        </div>
      )}

      {/* Actor */}
      {analysis.actor !== undefined && (
        <div
          data-testid="analysis-actor"
          style={{
            padding: "var(--hex-space-sm)",
            fontSize: "var(--hex-font-size-xs)",
            color: "var(--hex-text-muted)",
          }}
        >
          Actor: {analysis.actor.name ?? analysis.actor.id} ({analysis.actor.type})
        </div>
      )}
    </div>
  );
}

function PortList({
  title,
  testId,
  ports,
  color,
  onPortClick,
}: {
  readonly title: string;
  readonly testId: string;
  readonly ports: readonly string[];
  readonly color?: string;
  readonly onPortClick?: (portName: string) => void;
}): React.ReactElement {
  return (
    <div
      data-testid={testId}
      style={{
        padding: "var(--hex-space-sm)",
        borderBottom: "1px solid var(--hex-border)",
      }}
    >
      <div
        style={{
          color: color ?? "var(--hex-text-muted)",
          fontSize: "var(--hex-font-size-xs)",
          marginBottom: 4,
        }}
      >
        {title} ({ports.length})
      </div>
      {ports.map(port => (
        <div key={port} style={{ padding: "1px 0" }}>
          {onPortClick !== undefined ? (
            <button
              onClick={() => onPortClick(port)}
              style={{
                border: "none",
                background: "none",
                fontFamily: "var(--hex-font-mono)",
                fontSize: "var(--hex-font-size-xs)",
                color: color ?? "var(--hex-text-secondary)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {port}
            </button>
          ) : (
            <span
              style={{
                fontFamily: "var(--hex-font-mono)",
                fontSize: "var(--hex-font-size-xs)",
                color: color ?? "var(--hex-text-secondary)",
              }}
            >
              {port}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export { GraphAnalysisSidebar };
export type { GraphAnalysisSidebarProps };
