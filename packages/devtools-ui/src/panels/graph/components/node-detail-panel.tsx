/**
 * NodeDetailPanel — bottom panel showing selected node details.
 *
 * @packageDocumentation
 */

import type { EnrichedGraphNode } from "../types.js";

interface NodeDetailPanelProps {
  readonly node: EnrichedGraphNode | undefined;
  readonly transitiveDeps: readonly string[];
  readonly transitiveDependents: readonly string[];
  readonly onViewMetadata?: (portName: string) => void;
  readonly onNavigateToContainer?: (containerName: string) => void;
  readonly onHighlightChain?: (portName: string) => void;
  readonly onNodeClick?: (portName: string) => void;
}

function NodeDetailPanel({
  node,
  transitiveDeps,
  transitiveDependents,
  onViewMetadata,
  onNavigateToContainer,
  onHighlightChain,
  onNodeClick,
}: NodeDetailPanelProps): React.ReactElement | null {
  if (node === undefined) return null;

  const adapter = node.adapter;

  return (
    <div
      data-testid="node-detail-panel"
      style={{
        padding: "var(--hex-space-sm) var(--hex-space-md)",
        backgroundColor: "var(--hex-bg-secondary)",
        borderTop: "1px solid var(--hex-border)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
        maxHeight: 200,
        overflow: "auto",
      }}
      role="region"
      aria-label={`Details for ${adapter.portName}`}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--hex-space-xs)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--hex-font-mono)",
            fontWeight: "var(--hex-font-weight-medium)",
            color: "var(--hex-text-primary)",
          }}
        >
          {adapter.portName}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {onViewMetadata !== undefined && (
            <button onClick={() => onViewMetadata(adapter.portName)} style={actionButtonStyle}>
              View Metadata
            </button>
          )}
          {onHighlightChain !== undefined && (
            <button onClick={() => onHighlightChain(adapter.portName)} style={actionButtonStyle}>
              Highlight Chain
            </button>
          )}
        </div>
      </div>

      {/* Properties grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto 1fr",
          gap: "2px 12px",
          color: "var(--hex-text-secondary)",
        }}
      >
        <PropLabel>Lifetime</PropLabel>
        <PropValue>{adapter.lifetime}</PropValue>
        <PropLabel>Factory</PropLabel>
        <PropValue>{adapter.factoryKind}</PropValue>

        <PropLabel>Origin</PropLabel>
        <PropValue>{adapter.origin}</PropValue>
        {adapter.inheritanceMode !== undefined && (
          <>
            <PropLabel>Inheritance</PropLabel>
            <PropValue>{adapter.inheritanceMode}</PropValue>
          </>
        )}

        {node.direction !== undefined && (
          <>
            <PropLabel>Direction</PropLabel>
            <PropValue>{node.direction}</PropValue>
          </>
        )}
        {node.category !== undefined && (
          <>
            <PropLabel>Category</PropLabel>
            <PropValue>{node.category}</PropValue>
          </>
        )}

        {node.libraryKind !== undefined && (
          <>
            <PropLabel>Library</PropLabel>
            <PropValue>
              {node.libraryKind.library}/{node.libraryKind.kind}
            </PropValue>
          </>
        )}

        {node.errorRate !== undefined && node.errorRate > 0 && (
          <>
            <PropLabel>Error Rate</PropLabel>
            <PropValue
              style={{
                color: node.hasHighErrorRate ? "var(--hex-error)" : "var(--hex-warning)",
              }}
            >
              {Math.round(node.errorRate * 100)}% ({node.errCount}/{node.totalCalls})
            </PropValue>
          </>
        )}
      </div>

      {/* Tags */}
      {node.tags.length > 0 && (
        <div style={{ marginTop: "var(--hex-space-xs)" }}>
          <PropLabel>Tags: </PropLabel>
          {node.tags.map(tag => (
            <span
              key={tag}
              style={{
                padding: "0 4px",
                borderRadius: 4,
                backgroundColor: "var(--hex-bg-primary)",
                border: "1px solid var(--hex-border)",
                fontSize: "var(--hex-font-size-xs)",
                marginRight: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Dependencies */}
      <div style={{ marginTop: "var(--hex-space-xs)" }}>
        <PropLabel>Dependencies ({adapter.dependencyNames.length}):</PropLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {adapter.dependencyNames.map(dep => (
            <button key={dep} onClick={() => onNodeClick?.(dep)} style={depChipStyle}>
              {dep}
            </button>
          ))}
          {adapter.dependencyNames.length === 0 && (
            <span style={{ color: "var(--hex-text-muted)", fontStyle: "italic" }}>None</span>
          )}
        </div>
      </div>

      {/* Dependents */}
      <div style={{ marginTop: "var(--hex-space-xs)" }}>
        <PropLabel>Dependents ({node.dependentCount}):</PropLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {transitiveDependents.slice(0, 10).map(dep => (
            <button key={dep} onClick={() => onNodeClick?.(dep)} style={depChipStyle}>
              {dep}
            </button>
          ))}
          {transitiveDependents.length > 10 && (
            <span style={{ color: "var(--hex-text-muted)" }}>
              +{transitiveDependents.length - 10} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const actionButtonStyle: React.CSSProperties = {
  padding: "2px 8px",
  border: "1px solid var(--hex-border)",
  borderRadius: "var(--hex-radius-sm)",
  backgroundColor: "var(--hex-bg-primary)",
  color: "var(--hex-text-primary)",
  cursor: "pointer",
  fontSize: "var(--hex-font-size-xs)",
  fontFamily: "var(--hex-font-sans)",
};

const depChipStyle: React.CSSProperties = {
  padding: "1px 6px",
  borderRadius: 4,
  border: "1px solid var(--hex-border)",
  backgroundColor: "var(--hex-bg-primary)",
  color: "var(--hex-text-primary)",
  cursor: "pointer",
  fontFamily: "var(--hex-font-mono)",
  fontSize: "var(--hex-font-size-xs)",
};

function PropLabel({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return (
    <span
      style={{
        color: "var(--hex-text-muted)",
        fontSize: "var(--hex-font-size-xs)",
      }}
    >
      {children}
    </span>
  );
}

function PropValue({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}): React.ReactElement {
  return (
    <span
      style={{
        fontFamily: "var(--hex-font-mono)",
        color: "var(--hex-text-primary)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export { NodeDetailPanel };
export type { NodeDetailPanelProps };
