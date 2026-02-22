/**
 * MetadataInspectorPanel — right slide-in with 4 collapsible sections.
 *
 * @packageDocumentation
 */

import { useState, useCallback } from "react";
import type { EnrichedGraphNode, MetadataSection } from "../types.js";
import { JsonTree } from "../../../visualization/json-tree/json-tree.js";

interface MetadataInspectorPanelProps {
  readonly node: EnrichedGraphNode | undefined;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

function MetadataInspectorPanel({
  node,
  isOpen,
  onClose,
}: MetadataInspectorPanelProps): React.ReactElement | null {
  if (!isOpen || node === undefined) return null;

  const [expanded, setExpanded] = useState<ReadonlySet<MetadataSection>>(
    new Set(["port", "adapter"])
  );

  const toggleSection = useCallback((section: MetadataSection) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const adapter = node.adapter;
  const metadata = adapter.metadata;

  // Extract library-specific metadata
  const libraryMeta: Record<string, unknown> = {};
  const customMeta: Record<string, unknown> = {};
  if (metadata !== undefined) {
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith("__hex_")) {
        libraryMeta[key] = value;
      } else {
        customMeta[key] = value;
      }
    }
  }

  return (
    <div
      data-testid="metadata-inspector"
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
      aria-label="Metadata inspector"
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
        <span style={{ fontWeight: "var(--hex-font-weight-medium)" }}>{adapter.portName}</span>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "none",
            color: "var(--hex-text-muted)",
            cursor: "pointer",
          }}
          aria-label="Close metadata inspector"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Port Section */}
      <CollapsibleSection
        title="Port Information"
        section="port"
        isExpanded={expanded.has("port")}
        onToggle={toggleSection}
      >
        <MetaRow label="Port Name" value={adapter.portName} />
        <MetaRow label="Lifetime" value={adapter.lifetime} />
        <MetaRow label="Factory Kind" value={adapter.factoryKind} />
        <MetaRow label="Origin" value={adapter.origin} />
        {adapter.inheritanceMode !== undefined && (
          <MetaRow label="Inheritance Mode" value={adapter.inheritanceMode} />
        )}
        {node.direction !== undefined && <MetaRow label="Direction" value={node.direction} />}
        {node.category !== undefined && <MetaRow label="Category" value={node.category} />}
        {node.description !== undefined && <MetaRow label="Description" value={node.description} />}
      </CollapsibleSection>

      {/* Adapter Section */}
      <CollapsibleSection
        title="Adapter Details"
        section="adapter"
        isExpanded={expanded.has("adapter")}
        onToggle={toggleSection}
      >
        <MetaRow
          label="Dependencies"
          value={adapter.dependencyNames.length > 0 ? adapter.dependencyNames.join(", ") : "None"}
        />
        <MetaRow label="Dependents" value={String(node.dependentCount)} />
        <MetaRow label="Is Override" value={String(adapter.isOverride ?? false)} />
        <MetaRow label="Resolved" value={String(node.isResolved)} />
        {node.errorRate !== undefined && (
          <>
            <MetaRow label="Error Rate" value={`${Math.round(node.errorRate * 100)}%`} />
            <MetaRow label="Total Calls" value={String(node.totalCalls)} />
            <MetaRow label="OK Count" value={String(node.okCount)} />
            <MetaRow label="Error Count" value={String(node.errCount)} />
          </>
        )}
      </CollapsibleSection>

      {/* Library-specific Section */}
      {Object.keys(libraryMeta).length > 0 && (
        <CollapsibleSection
          title="Library Metadata"
          section="library"
          isExpanded={expanded.has("library")}
          onToggle={toggleSection}
        >
          <div style={{ padding: "4px 0" }}>
            <JsonTree data={libraryMeta} />
          </div>
        </CollapsibleSection>
      )}

      {/* Custom Metadata Section */}
      {Object.keys(customMeta).length > 0 && (
        <CollapsibleSection
          title="Custom Metadata"
          section="custom"
          isExpanded={expanded.has("custom")}
          onToggle={toggleSection}
        >
          <div style={{ padding: "4px 0" }}>
            <JsonTree data={customMeta} />
          </div>
        </CollapsibleSection>
      )}

      {/* Tags */}
      {node.tags.length > 0 && (
        <div style={{ padding: "var(--hex-space-sm)" }}>
          <div
            style={{
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              marginBottom: 4,
            }}
          >
            Tags
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {node.tags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: "1px 6px",
                  borderRadius: 10,
                  border: "1px solid var(--hex-border)",
                  backgroundColor: "var(--hex-bg-primary)",
                  fontSize: "var(--hex-font-size-xs)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  section,
  isExpanded,
  onToggle,
  children,
}: {
  readonly title: string;
  readonly section: MetadataSection;
  readonly isExpanded: boolean;
  readonly onToggle: (section: MetadataSection) => void;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ borderBottom: "1px solid var(--hex-border)" }}>
      <button
        onClick={() => onToggle(section)}
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--hex-space-xs) var(--hex-space-sm)",
          border: "none",
          backgroundColor: "transparent",
          color: "var(--hex-text-primary)",
          cursor: "pointer",
          fontFamily: "var(--hex-font-sans)",
          fontSize: "var(--hex-font-size-sm)",
          fontWeight: "var(--hex-font-weight-medium)" as string,
        }}
        aria-expanded={isExpanded}
      >
        <span>{title}</span>
        <span style={{ color: "var(--hex-text-muted)" }}>{isExpanded ? "\u25BC" : "\u25B6"}</span>
      </button>
      {isExpanded && (
        <div style={{ padding: "0 var(--hex-space-sm) var(--hex-space-xs)" }}>{children}</div>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "1px 0",
      }}
    >
      <span style={{ color: "var(--hex-text-muted)" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--hex-font-mono)",
          color: "var(--hex-text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export { MetadataInspectorPanel };
export type { MetadataInspectorPanelProps };
