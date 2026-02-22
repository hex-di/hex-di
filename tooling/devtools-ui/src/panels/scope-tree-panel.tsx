/**
 * ScopeTreePanel — scope hierarchy with expansion state.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";
import type { ScopeTree } from "@hex-di/core";
import type { PanelProps } from "./types.js";
import { useDataSourceScopeTree } from "../hooks/use-data-source-scope-tree.js";
import { EmptyState } from "../components/empty-state.js";
import { SectionHeader } from "../components/section-header.js";
import { StatusBadge } from "../components/status-badge.js";
import { TreeRenderer } from "../visualization/tree/tree-renderer.js";

/**
 * Renders a single scope tree node.
 */
function renderScopeNode(scope: ScopeTree): React.ReactNode {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--hex-space-sm)",
        padding: "var(--hex-space-xxs) 0",
      }}
    >
      <span
        style={{
          fontFamily: "var(--hex-font-mono)",
          fontSize: "var(--hex-font-size-sm)",
          fontWeight: "var(--hex-font-weight-medium)",
        }}
      >
        {scope.id}
      </span>
      <StatusBadge
        variant={scope.status === "active" ? "resolved" : "disposed"}
        label={scope.status}
      />
      <span
        style={{
          fontSize: "var(--hex-font-size-xs)",
          color: "var(--hex-text-muted)",
          fontFamily: "var(--hex-font-mono)",
        }}
      >
        {scope.resolvedCount}/{scope.totalCount}
      </span>
    </span>
  );
}

/**
 * Detail pane for a selected scope.
 */
function ScopeDetail({ scope }: { readonly scope: ScopeTree }): React.ReactElement {
  return (
    <div>
      <SectionHeader title={scope.id} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--hex-space-sm)",
          marginBottom: "var(--hex-space-lg)",
        }}
      >
        <div
          style={{
            padding: "var(--hex-space-md)",
            backgroundColor: "var(--hex-bg-secondary)",
            borderRadius: "var(--hex-radius-md)",
            border: "1px solid var(--hex-border)",
          }}
        >
          <div
            style={{
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--hex-space-xxs)",
            }}
          >
            Status
          </div>
          <StatusBadge
            variant={scope.status === "active" ? "resolved" : "disposed"}
            label={scope.status}
          />
        </div>
        <div
          style={{
            padding: "var(--hex-space-md)",
            backgroundColor: "var(--hex-bg-secondary)",
            borderRadius: "var(--hex-radius-md)",
            border: "1px solid var(--hex-border)",
          }}
        >
          <div
            style={{
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--hex-space-xxs)",
            }}
          >
            Resolved
          </div>
          <span
            style={{
              fontSize: "var(--hex-font-size-lg)",
              fontWeight: "var(--hex-font-weight-semibold)",
              fontFamily: "var(--hex-font-mono)",
              color: "var(--hex-text-primary)",
            }}
          >
            {scope.resolvedCount}
            <span style={{ color: "var(--hex-text-muted)" }}>
              {" / "}
              {scope.totalCount}
            </span>
          </span>
        </div>
      </div>

      {scope.resolvedPorts.length > 0 && (
        <div>
          <SectionHeader title="Resolved Ports" count={scope.resolvedPorts.length} level={3} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hex-space-xxs)",
            }}
          >
            {scope.resolvedPorts.map(port => (
              <div
                key={port}
                style={{
                  padding: "var(--hex-space-xs) var(--hex-space-md)",
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                  color: "var(--hex-text-primary)",
                  backgroundColor: "var(--hex-bg-secondary)",
                  borderRadius: "var(--hex-radius-sm)",
                  border: "1px solid var(--hex-border)",
                }}
              >
                {port}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ScopeTreePanel displays the scope hierarchy with a detail sidebar.
 */
function ScopeTreePanel(_props: PanelProps): React.ReactElement {
  const scopeTree = useDataSourceScopeTree();
  const [selectedScopeId, setSelectedScopeId] = useState<string | undefined>(undefined);

  const getChildren = useCallback((scope: ScopeTree) => scope.children, []);

  const getKey = useCallback((scope: ScopeTree) => scope.id, []);

  const renderNode = useCallback((scope: ScopeTree) => renderScopeNode(scope), []);

  const findScope = useCallback((root: ScopeTree, id: string): ScopeTree | undefined => {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findScope(child, id);
      if (found) return found;
    }
    return undefined;
  }, []);

  if (!scopeTree) {
    return (
      <EmptyState
        icon={"\uD83C\uDF33"}
        message="No scope data available"
        description="Run your code to see the scope tree. Scopes are created when using child containers or scoped lifetimes."
      />
    );
  }

  const selectedScope = selectedScopeId ? findScope(scopeTree, selectedScopeId) : undefined;

  return (
    <div
      data-testid="scope-tree-panel"
      role="region"
      aria-label="Scope Tree Panel"
      style={{
        display: "flex",
        height: "100%",
      }}
    >
      <div
        style={{
          flex: "0 0 280px",
          minWidth: "200px",
          maxWidth: "400px",
          overflow: "auto",
          borderRight: "1px solid var(--hex-border)",
          padding: "var(--hex-space-md)",
          backgroundColor: "var(--hex-bg-secondary)",
        }}
      >
        <TreeRenderer
          root={scopeTree}
          getChildren={getChildren}
          getKey={getKey}
          renderNode={renderNode}
          onSelect={setSelectedScopeId}
          selectedKey={selectedScopeId}
        />
      </div>
      <div
        style={{
          flex: 1,
          padding: "var(--hex-space-xl)",
          overflow: "auto",
        }}
      >
        {selectedScope ? (
          <ScopeDetail scope={selectedScope} />
        ) : (
          <EmptyState
            icon={"\uD83D\uDC48"}
            message="Select a scope to see details"
            description="Click on a scope in the tree to view its resolved ports and status."
          />
        )}
      </div>
    </div>
  );
}

export { ScopeTreePanel };
