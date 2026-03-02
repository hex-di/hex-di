/**
 * PolicyTreeNode — Individual node in the policy evaluation tree.
 *
 * Displays a policy kind icon, label, and decision badge for a single node
 * in the tree. When trace data is provided, overlays the evaluation result.
 *
 * Spec: 04-tree-view.md (4.3), 10-visual-encoding.md (10.2, 10.5)
 *
 * @packageDocumentation
 */

import {
  getDecisionColor,
  getPolicyKindColor,
  getPolicyKindIcon,
  formatGuardDuration,
} from "./visual-encoding.js";
import type { EvaluationNodeTrace, PolicyNodeDescriptor } from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface PolicyTreeNodeProps {
  readonly node: PolicyNodeDescriptor;
  readonly trace: EvaluationNodeTrace | undefined;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function PolicyTreeNode({
  node,
  trace,
  selected,
  onSelect,
}: PolicyTreeNodeProps): React.ReactElement {
  const kindIcon = getPolicyKindIcon(node.kind);
  const kindColor = getPolicyKindColor(node.kind);
  const isLeaf = node.children.length === 0;
  const label = node.label ?? node.kind;

  const decisionResult = trace?.result;
  const decisionColor = decisionResult ? getDecisionColor(decisionResult) : undefined;
  const wasEvaluated = trace?.evaluated ?? false;
  const wasSkipped = trace !== undefined && !trace.evaluated;
  const duration = trace ? formatGuardDuration(trace.durationMs) : undefined;

  return (
    <div
      data-testid="guard-tree-node"
      data-node-id={node.nodeId}
      data-kind={node.kind}
      data-selected={selected ? "true" : "false"}
      data-evaluated={wasEvaluated ? "true" : "false"}
      data-skipped={wasSkipped ? "true" : "false"}
      data-leaf={isLeaf ? "true" : "false"}
      role="button"
      aria-label={`${node.kind} policy: ${label}${decisionResult ? `, ${decisionResult}` : ""}`}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        cursor: "pointer",
        borderRadius: "var(--hex-radius-sm, 4px)",
        backgroundColor: selected ? "var(--hex-bg-active, #2d2d50)" : "transparent",
        opacity: wasSkipped ? 0.4 : 1,
      }}
    >
      {/* Kind icon */}
      <span
        data-testid="guard-tree-node-icon"
        style={{ color: kindColor, fontSize: 14, flexShrink: 0 }}
      >
        {kindIcon}
      </span>

      {/* Label */}
      <span
        data-testid="guard-tree-node-label"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-sm, 12px)",
          color: "var(--hex-text-primary, #e4e4f0)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
      >
        {label}
      </span>

      {/* Leaf data summary */}
      {node.leafData && (
        <span
          data-testid="guard-tree-node-leaf-data"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
            fontFamily: "var(--hex-font-mono, monospace)",
          }}
        >
          {node.leafData.type === "hasPermission" &&
            `${node.leafData.resource}:${node.leafData.action}`}
          {node.leafData.type === "hasRole" && node.leafData.roleName}
          {node.leafData.type === "hasAttribute" &&
            `${node.leafData.attribute} ${node.leafData.matcher}`}
          {node.leafData.type === "hasResourceAttribute" &&
            `${node.leafData.attribute} ${node.leafData.matcher}`}
          {node.leafData.type === "hasSignature" && node.leafData.meaning}
          {node.leafData.type === "hasRelationship" && node.leafData.relation}
        </span>
      )}

      {/* Field strategy badge for compound nodes */}
      {node.fieldStrategy && (
        <span
          data-testid="guard-tree-node-strategy"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
            padding: "1px 4px",
            borderRadius: "var(--hex-radius-pill, 9999px)",
            backgroundColor: "var(--hex-bg-tertiary, #383852)",
          }}
        >
          {node.fieldStrategy}
        </span>
      )}

      {/* Decision badge */}
      {decisionResult && (
        <span
          data-testid="guard-tree-node-decision"
          data-decision={decisionResult}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1px 6px",
            borderRadius: "var(--hex-radius-pill, 9999px)",
            fontSize: "var(--hex-font-size-xs, 11px)",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: decisionColor,
          }}
        >
          {decisionResult}
        </span>
      )}

      {/* Duration */}
      {duration !== undefined && (
        <span
          data-testid="guard-tree-node-duration"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
            fontFamily: "var(--hex-font-mono, monospace)",
          }}
        >
          {duration}
        </span>
      )}

      {/* Async indicator */}
      {trace?.asyncResolution && (
        <span
          data-testid="guard-tree-node-async"
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          async
        </span>
      )}
    </div>
  );
}

export { PolicyTreeNode };
export type { PolicyTreeNodeProps };
