/**
 * ContainerScopeHierarchy React component for visualizing unified container/scope tree.
 *
 * Displays all containers and their scopes in a single hierarchical tree view.
 * Containers are nested according to their parent-child relationships, with
 * each container's scopes shown as children.
 *
 * @packageDocumentation
 */

import React, { useState, type ReactElement, type CSSProperties } from "react";
import type {
  ContainerScopeTreeNode,
  ContainerNode,
  ScopeNode,
} from "../../react/types/container-scope-tree.js";
import { scopeTreeStyles } from "../../react/styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ContainerScopeHierarchy component.
 */
export interface ContainerScopeHierarchyProps {
  /**
   * Currently selected node ID.
   *
   * Format: "container:{id}" for containers, "scope:{containerId}:{scopeId}" for scopes.
   * null means no selection.
   */
  readonly selectedNodeId: string | null;

  /**
   * Callback when a node is selected.
   *
   * @param nodeId - The selected node ID, or null to clear selection
   */
  readonly onNodeSelect: (nodeId: string | null) => void;

  /**
   * Optional tree data passed from parent component.
   *
   * When provided, the component uses this tree instead of fetching its own
   * via useContainerScopeTree(). This allows the parent (e.g., ContainerInspector)
   * to control the refresh cycle, ensuring all containers (root and child)
   * have their scopes refreshed together.
   */
  readonly tree?: readonly ContainerScopeTreeNode[];
}

/**
 * Props for tree node components.
 */
interface TreeNodeProps {
  /** The tree node to render */
  readonly node: ContainerScopeTreeNode;
  /** Current depth for indentation */
  readonly depth: number;
  /** Currently selected node ID */
  readonly selectedNodeId: string | null;
  /** Selection handler */
  readonly onNodeSelect: (nodeId: string | null) => void;
  /** Parent container ID (for scopes) */
  readonly parentContainerId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique node ID for selection tracking.
 */
function getNodeId(node: ContainerScopeTreeNode, parentContainerId?: string): string {
  if (node.kind === "container") {
    return `container:${node.id}`;
  }
  // For scopes, include parent container ID to ensure uniqueness
  return `scope:${parentContainerId ?? "unknown"}:${node.id}`;
}

/**
 * Check if a node has children (containers or scopes).
 */
function hasChildren(node: ContainerScopeTreeNode): boolean {
  return node.children.length > 0;
}

// =============================================================================
// Container Node Component
// =============================================================================

/**
 * Renders a container node with its children.
 */
function ContainerNodeComponent({
  node,
  depth,
  selectedNodeId,
  onNodeSelect,
}: Omit<TreeNodeProps, "parentContainerId"> & { node: ContainerNode }): ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);

  const nodeId = getNodeId(node);
  const isSelected = selectedNodeId === nodeId;
  const nodeHasChildren = hasChildren(node);

  const handleToggleExpand = (e: React.MouseEvent | React.KeyboardEvent): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNodeSelect(nodeId);
    } else if (e.key === "ArrowRight" && nodeHasChildren && !isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      setIsExpanded(false);
    }
  };

  const nodeContentStyle: CSSProperties = {
    ...scopeTreeStyles.nodeContent,
    ...(isSelected ? scopeTreeStyles.nodeSelected : {}),
    paddingLeft: `${12 + depth * 24}px`,
  };

  const statusStyle: CSSProperties = {
    ...scopeTreeStyles.nodeStatus,
    ...(node.status === "active"
      ? scopeTreeStyles.nodeStatusActive
      : scopeTreeStyles.nodeStatusDisposed),
  };

  return (
    <div style={scopeTreeStyles.node} data-testid={`container-node-${node.id}`}>
      <div
        style={nodeContentStyle}
        onClick={() => onNodeSelect(nodeId)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={nodeHasChildren ? isExpanded : undefined}
      >
        {nodeHasChildren && (
          <button
            style={scopeTreeStyles.expandButton}
            onClick={handleToggleExpand}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleExpand(e);
              }
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            {isExpanded ? "[-]" : "[+]"}
          </button>
        )}
        {!nodeHasChildren && <span style={{ width: "16px", marginRight: "4px" }} />}

        <span style={{ ...scopeTreeStyles.nodeIcon, ...scopeTreeStyles.nodeIconContainer }}>C</span>

        <span style={scopeTreeStyles.nodeName}>{node.label}</span>

        <span style={scopeTreeStyles.nodeInfo}>
          {node.resolvedCount}/{node.totalCount} resolved
          {node.resolvedPorts.length > 0 && (
            <span style={{ marginLeft: "4px", opacity: 0.7 }}>
              ({node.resolvedPorts.join(", ")})
            </span>
          )}
        </span>

        <span style={statusStyle} data-testid={`container-node-${node.id}-status`}>
          {node.status === "active" ? "Active" : "Disposed"}
        </span>
      </div>

      {nodeHasChildren && isExpanded && (
        <div style={scopeTreeStyles.childrenContainer}>
          {node.children.map(child => (
            <TreeNode
              key={child.kind === "container" ? `c-${child.id}` : `s-${child.id}`}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              parentContainerId={node.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Scope Node Component
// =============================================================================

/**
 * Renders a scope node with its children.
 */
function ScopeNodeComponent({
  node,
  depth,
  selectedNodeId,
  onNodeSelect,
  parentContainerId,
}: TreeNodeProps & { node: ScopeNode }): ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);

  const nodeId = getNodeId(node, parentContainerId);
  const isSelected = selectedNodeId === nodeId;
  const nodeHasChildren = hasChildren(node);

  const handleToggleExpand = (e: React.MouseEvent | React.KeyboardEvent): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNodeSelect(nodeId);
    } else if (e.key === "ArrowRight" && nodeHasChildren && !isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      setIsExpanded(false);
    }
  };

  const nodeContentStyle: CSSProperties = {
    ...scopeTreeStyles.nodeContent,
    ...(isSelected ? scopeTreeStyles.nodeSelected : {}),
    paddingLeft: `${12 + depth * 24}px`,
  };

  const statusStyle: CSSProperties = {
    ...scopeTreeStyles.nodeStatus,
    ...(node.status === "active"
      ? scopeTreeStyles.nodeStatusActive
      : scopeTreeStyles.nodeStatusDisposed),
  };

  return (
    <div style={scopeTreeStyles.node} data-testid={`scope-node-${node.id}`}>
      <div
        style={nodeContentStyle}
        onClick={() => onNodeSelect(nodeId)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={nodeHasChildren ? isExpanded : undefined}
      >
        {nodeHasChildren && (
          <button
            style={scopeTreeStyles.expandButton}
            onClick={handleToggleExpand}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleExpand(e);
              }
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            {isExpanded ? "[-]" : "[+]"}
          </button>
        )}
        {!nodeHasChildren && <span style={{ width: "16px", marginRight: "4px" }} />}

        <span style={{ ...scopeTreeStyles.nodeIcon, ...scopeTreeStyles.nodeIconScope }}>S</span>

        <span style={scopeTreeStyles.nodeName}>Scope {node.id}</span>

        <span style={scopeTreeStyles.nodeInfo}>
          {node.resolvedCount}/{node.totalCount} resolved
          {node.resolvedPorts.length > 0 && (
            <span style={{ marginLeft: "4px", opacity: 0.7 }}>
              ({node.resolvedPorts.join(", ")})
            </span>
          )}
        </span>

        <span style={statusStyle} data-testid={`scope-node-${node.id}-status`}>
          {node.status === "active" ? "Active" : "Disposed"}
        </span>
      </div>

      {nodeHasChildren && isExpanded && (
        <div style={scopeTreeStyles.childrenContainer}>
          {node.children.map(child => (
            <ScopeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              parentContainerId={parentContainerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tree Node Component (Dispatcher)
// =============================================================================

/**
 * Dispatches to the appropriate node component based on node kind.
 */
function TreeNode(props: TreeNodeProps): ReactElement {
  const { node } = props;

  if (node.kind === "container") {
    return <ContainerNodeComponent {...props} node={node} />;
  }

  return <ScopeNodeComponent {...props} node={node} />;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ContainerScopeHierarchy component for visualizing all containers and scopes.
 *
 * Features:
 * - Tree visualization with expand/collapse
 * - [C] icon for containers, [S] for scopes
 * - Inheritance mode badges (shared/forked/isolated)
 * - Status badges (Active/Disposed)
 * - Instance counts (resolved/total)
 * - Click to select node
 * - Keyboard navigation support
 *
 * @param props - The component props
 * @returns A React element containing the container/scope hierarchy tree
 *
 * @example
 * ```tsx
 * const [selectedNode, setSelectedNode] = useState<string | null>(null);
 *
 * <ContainerScopeHierarchy
 *   selectedNodeId={selectedNode}
 *   onNodeSelect={setSelectedNode}
 * />
 * ```
 */
export function ContainerScopeHierarchy({
  selectedNodeId,
  onNodeSelect,
  tree: treeProp,
}: ContainerScopeHierarchyProps): ReactElement {
  // Tree must be provided via props - container discovery is handled by parent
  // The tree prop is required for multi-container support via ContainerTreeMachine
  const tree = treeProp ?? [];
  const isAvailable = treeProp !== undefined && treeProp.length > 0;

  if (!isAvailable) {
    return (
      <div style={{ color: "var(--hex-devtools-text-muted, #a6adc8)", padding: "12px" }}>
        Container registry not available. Wrap your app with ContainerRegistryProvider.
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div style={{ color: "var(--hex-devtools-text-muted, #a6adc8)", padding: "12px" }}>
        No containers registered.
      </div>
    );
  }

  return (
    <div data-testid="container-scope-hierarchy" style={scopeTreeStyles.container}>
      {tree.map(node => (
        <TreeNode
          key={node.kind === "container" ? `c-${node.id}` : `s-${node.id}`}
          node={node}
          depth={0}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
        />
      ))}
    </div>
  );
}
