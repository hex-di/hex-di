/**
 * PolicyEvaluationTree — Tree view of a guard policy evaluation descriptor.
 *
 * Renders a recursive tree of policy nodes from the descriptor's rootNode,
 * and overlays evaluation trace data when an execution is provided.
 *
 * Spec: 03-views-and-wireframes.md (3.3), 04-tree-view.md
 *
 * @packageDocumentation
 */

import { useCallback, useMemo } from "react";
import { PolicyTreeNode } from "./policy-tree-node.js";
import type {
  EvaluationNodeTrace,
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  PolicyNodeDescriptor,
} from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface PolicyEvaluationTreeProps {
  readonly descriptorId: string;
  readonly descriptor: GuardEvaluationDescriptor;
  readonly execution: GuardEvaluationExecution | undefined;
  readonly onNodeSelect: (nodeId: string) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildTraceMap(trace: EvaluationNodeTrace): ReadonlyMap<string, EvaluationNodeTrace> {
  const map = new Map<string, EvaluationNodeTrace>();

  function walk(node: EvaluationNodeTrace): void {
    map.set(node.nodeId, node);
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(trace);
  return map;
}

// ── Recursive Tree Renderer ─────────────────────────────────────────────────

interface TreeBranchProps {
  readonly node: PolicyNodeDescriptor;
  readonly traceMap: ReadonlyMap<string, EvaluationNodeTrace>;
  readonly selectedNodeId: string | undefined;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly depth: number;
}

function TreeBranch({
  node,
  traceMap,
  selectedNodeId,
  onNodeSelect,
  depth,
}: TreeBranchProps): React.ReactElement {
  const trace = traceMap.get(node.nodeId);
  const isSelected = selectedNodeId === node.nodeId;

  return (
    <li role="treeitem" aria-expanded={node.children.length > 0 ? true : undefined}>
      <PolicyTreeNode
        node={node}
        trace={trace}
        selected={isSelected}
        onSelect={() => onNodeSelect(node.nodeId)}
      />
      {node.children.length > 0 && (
        <ul role="group" style={{ paddingLeft: 16 * (depth + 1), listStyle: "none", margin: 0 }}>
          {node.children.map(child => (
            <TreeBranch
              key={child.nodeId}
              node={child}
              traceMap={traceMap}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

function PolicyEvaluationTree({
  descriptorId,
  descriptor,
  execution,
  onNodeSelect,
}: PolicyEvaluationTreeProps): React.ReactElement {
  const traceMap = useMemo(
    () => (execution ? buildTraceMap(execution.rootTrace) : new Map<string, EvaluationNodeTrace>()),
    [execution]
  );

  const selectedNodeId = undefined;

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      onNodeSelect(nodeId);
    },
    [onNodeSelect]
  );

  const decisionColor = execution
    ? execution.decision === "allow"
      ? "var(--hex-guard-allow)"
      : "var(--hex-guard-deny)"
    : undefined;

  return (
    <div
      data-testid="guard-policy-tree"
      data-descriptor-id={descriptorId}
      role="tree"
      aria-label={`Policy tree for ${descriptor.label}`}
    >
      {/* Tree header */}
      <div
        data-testid="guard-policy-tree-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--hex-space-sm)",
          padding: "var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          fontSize: "var(--hex-font-size-sm)",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: "var(--hex-text-primary)",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          {descriptor.label}
        </span>
        <span style={{ color: "var(--hex-text-muted)" }}>{descriptor.leafCount} policies</span>
        <span style={{ color: "var(--hex-text-muted)" }}>Depth {descriptor.maxDepth}</span>
        {execution && (
          <span
            data-testid="guard-policy-tree-decision"
            data-decision={execution.decision}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1px 6px",
              borderRadius: "var(--hex-radius-pill)",
              fontSize: "var(--hex-font-size-xs)",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: decisionColor,
              marginLeft: "auto",
            }}
          >
            {execution.decision === "allow" ? "ALLOW" : "DENY"}
          </span>
        )}
      </div>

      {/* Recursive tree */}
      <ul role="group" style={{ listStyle: "none", margin: 0, padding: "var(--hex-space-sm)" }}>
        <TreeBranch
          node={descriptor.rootNode}
          traceMap={traceMap}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          depth={0}
        />
      </ul>
    </div>
  );
}

export { PolicyEvaluationTree };
export type { PolicyEvaluationTreeProps };
