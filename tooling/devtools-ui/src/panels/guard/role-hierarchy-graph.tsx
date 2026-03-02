/**
 * RoleHierarchyGraph — DAG visualization of role inheritance.
 *
 * Renders a directed acyclic graph of roles showing inheritance
 * relationships, permission counts, and circular inheritance warnings.
 *
 * Spec: 03-views-and-wireframes.md (3.8), 07-role-hierarchy.md
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import type { SerializedRole } from "./types.js";

// ── Style Constants ─────────────────────────────────────────────────────────

const VIEW_CONTAINER_STYLE: React.CSSProperties = {
  fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
  fontSize: "13px",
  color: "var(--hex-text-primary, #e2e8f0)",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const SVG_CARD_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(8, 16, 28, 0.7)",
  borderRadius: "8px",
  padding: "16px 0",
  overflow: "hidden",
  border: "1px solid rgba(0, 240, 255, 0.08)",
};

const EMPTY_STATE_STYLE: React.CSSProperties = {
  color: "var(--hex-text-muted, #94a3b8)",
  fontSize: "14px",
  backgroundColor: "rgba(8, 16, 28, 0.7)",
  padding: "24px",
  borderRadius: "8px",
  border: "1px solid rgba(0, 240, 255, 0.1)",
  textAlign: "center" as const,
};

// ── Constants ───────────────────────────────────────────────────────────────

const MIN_SVG_WIDTH = 800;
const MIN_SVG_HEIGHT = 400;
const NODE_W = 140;
const NODE_H = 56;
const NODE_RX = 8;
const NODE_GAP_X = 200;
const NODE_GAP_Y = 100;
const MARGIN_LEFT = 80;
const MARGIN_TOP = 50;
const MARGIN_RIGHT = 80;
const MARGIN_BOTTOM = 50;
const BRACKET_LEN = 10;

// ── Layout Helpers ──────────────────────────────────────────────────────────

interface LayoutNode {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly role: SerializedRole;
}

function computeLayout(roles: readonly SerializedRole[]): readonly LayoutNode[] {
  // Simple grid layout based on inheritance depth
  const depthMap = new Map<string, number>();

  function computeDepth(roleName: string, visited: Set<string>): number {
    if (visited.has(roleName)) return 0; // circular
    const cached = depthMap.get(roleName);
    if (cached !== undefined) return cached;

    visited.add(roleName);
    const role = roles.find(r => r.name === roleName);
    if (!role || role.inherits.length === 0) {
      depthMap.set(roleName, 0);
      return 0;
    }

    let maxParentDepth = 0;
    for (const parent of role.inherits) {
      const parentDepth = computeDepth(parent, visited);
      if (parentDepth + 1 > maxParentDepth) maxParentDepth = parentDepth + 1;
    }

    depthMap.set(roleName, maxParentDepth);
    return maxParentDepth;
  }

  for (const role of roles) {
    computeDepth(role.name, new Set());
  }

  // Group by depth
  const byDepth = new Map<number, SerializedRole[]>();
  for (const role of roles) {
    const depth = depthMap.get(role.name) ?? 0;
    const group = byDepth.get(depth) ?? [];
    group.push(role);
    byDepth.set(depth, group);
  }

  const nodes: LayoutNode[] = [];
  for (const [depth, group] of byDepth) {
    for (let i = 0; i < group.length; i++) {
      nodes.push({
        name: group[i].name,
        x: MARGIN_LEFT + depth * NODE_GAP_X,
        y: MARGIN_TOP + i * NODE_GAP_Y,
        role: group[i],
      });
    }
  }

  return nodes;
}

// ── Edge path computation ───────────────────────────────────────────────────

function computeEdgePath(childX: number, childY: number, parentX: number, parentY: number): string {
  // Child (higher depth) is to the RIGHT, parent (lower depth) is to the LEFT.
  // Edge goes: left edge of child → right edge of parent (inherits direction).
  const startX = childX;
  const startY = childY + NODE_H / 2;
  const endX = parentX + NODE_W;
  const endY = parentY + NODE_H / 2;

  const dx = Math.abs(startX - endX);
  const cp = Math.max(dx * 0.45, 40);

  return `M${startX},${startY} C${startX - cp},${startY} ${endX + cp},${endY} ${endX},${endY}`;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface RoleHierarchyGraphProps {
  readonly roles: readonly SerializedRole[];
  readonly selectedRole?: string | undefined;
  readonly onRoleSelect: (roleName: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function RoleHierarchyGraph({
  roles,
  selectedRole,
  onRoleSelect,
}: RoleHierarchyGraphProps): React.ReactElement {
  const [hoveredRole, setHoveredRole] = useState<string | undefined>(undefined);

  const layoutNodes = useMemo(() => computeLayout(roles), [roles]);

  // Compute dynamic viewBox from layout bounds
  const viewBox = useMemo(() => {
    if (layoutNodes.length === 0) {
      return { width: MIN_SVG_WIDTH, height: MIN_SVG_HEIGHT };
    }
    let maxX = 0;
    let maxY = 0;
    for (const node of layoutNodes) {
      const right = node.x + NODE_W;
      const bottom = node.y + NODE_H;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    return {
      width: Math.max(maxX + MARGIN_RIGHT, MIN_SVG_WIDTH),
      height: Math.max(maxY + MARGIN_BOTTOM, MIN_SVG_HEIGHT),
    };
  }, [layoutNodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    for (const node of layoutNodes) {
      map.set(node.name, node);
    }
    return map;
  }, [layoutNodes]);

  const handleNodeClick = useCallback(
    (roleName: string) => {
      onRoleSelect(roleName);
    },
    [onRoleSelect]
  );

  const circularRoles = useMemo(() => roles.filter(r => r.hasCircularInheritance), [roles]);

  // Set of roles connected to the focused (hovered or selected) role
  const focusedRole = hoveredRole ?? selectedRole;
  const connectedRoles = useMemo(() => {
    if (!focusedRole) return undefined;
    const connected = new Set<string>([focusedRole]);
    for (const node of layoutNodes) {
      if (node.name === focusedRole) {
        for (const parent of node.role.inherits) {
          connected.add(parent);
        }
      }
      if (node.role.inherits.includes(focusedRole)) {
        connected.add(node.name);
      }
    }
    return connected;
  }, [focusedRole, layoutNodes]);

  return (
    <div
      data-testid="guard-role-hierarchy"
      role="img"
      aria-label={`Role hierarchy: ${roles.length} roles`}
      style={VIEW_CONTAINER_STYLE}
    >
      {/* Circular inheritance warning */}
      {circularRoles.length > 0 && (
        <div
          data-testid="guard-role-circular-warning"
          role="alert"
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(248, 113, 113, 0.08)",
            border: "1px solid rgba(248, 113, 113, 0.4)",
            borderRadius: "8px",
            color: "var(--hex-guard-error, #f87171)",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          Circular inheritance detected in: {circularRoles.map(r => r.name).join(", ")}
        </div>
      )}

      {/* Summary */}
      <div
        data-testid="guard-role-summary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "16px 20px",
          backgroundColor: "rgba(8, 16, 28, 0.7)",
          borderRadius: "8px",
          borderLeft: "4px solid rgba(0, 240, 255, 0.5)",
          border: "1px solid rgba(0, 240, 255, 0.1)",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--hex-text-primary, #e2e8f0)",
            fontFamily: "var(--hex-font-mono, monospace)",
          }}
        >
          {roles.length} roles
        </span>
      </div>

      {/* SVG DAG */}
      <div style={SVG_CARD_STYLE}>
        <svg
          data-testid="guard-role-hierarchy-svg"
          width="100%"
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          style={{ display: "block" }}
        >
          <defs>
            {/* Grid pattern for canvas background */}
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(0, 240, 255, 0.04)"
                strokeWidth="0.5"
              />
            </pattern>

            {/* Arrow marker — cyan */}
            <marker
              id="arrow-role"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="10"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,3 L0,6" fill="rgba(0, 240, 255, 0.4)" />
            </marker>

            {/* Arrow marker — bright (for focused edges) */}
            <marker
              id="arrow-role-bright"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="10"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,3 L0,6" fill="rgba(0, 240, 255, 0.8)" />
            </marker>

            {/* Glow filter for selected nodes */}
            <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="6"
                floodColor="#00F0FF"
                floodOpacity="0.25"
              />
            </filter>

            {/* Pulsing red glow for circular inheritance */}
            <filter id="glow-error" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="5"
                floodColor="#f87171"
                floodOpacity="0.3"
              />
            </filter>
          </defs>

          {/* Canvas background */}
          <rect width={viewBox.width} height={viewBox.height} fill="#020408" />
          <rect width={viewBox.width} height={viewBox.height} fill="url(#grid-pattern)" />

          {/* Inheritance edges */}
          {layoutNodes.map(node =>
            node.role.inherits.map(parentName => {
              const parent = nodeMap.get(parentName);
              if (!parent) return null;

              const isConnected =
                connectedRoles !== undefined &&
                connectedRoles.has(node.name) &&
                connectedRoles.has(parentName);

              const edgeOpacity = connectedRoles === undefined ? 0.5 : isConnected ? 0.9 : 0.12;

              return (
                <path
                  key={`${node.name}->${parentName}`}
                  data-testid="guard-role-edge"
                  data-from={node.name}
                  data-to={parentName}
                  d={computeEdgePath(node.x, node.y, parent.x, parent.y)}
                  stroke={isConnected ? "rgba(0, 240, 255, 0.6)" : "rgba(0, 240, 255, 0.2)"}
                  strokeWidth={isConnected ? 2 : 1.5}
                  fill="none"
                  markerEnd={isConnected ? "url(#arrow-role-bright)" : "url(#arrow-role)"}
                  opacity={edgeOpacity}
                />
              );
            })
          )}

          {/* Role nodes */}
          {layoutNodes.map(node => {
            const hasCircular = node.role.hasCircularInheritance;
            const isSelected = selectedRole === node.name;
            const isHovered = hoveredRole === node.name;
            const isFocused = isSelected || isHovered;

            // Dimming logic: if something is focused and this node isn't connected
            const isDimmed = connectedRoles !== undefined && !connectedRoles.has(node.name);

            const borderColor = hasCircular
              ? "var(--hex-guard-error, #f87171)"
              : isSelected
                ? "rgba(0, 240, 255, 0.8)"
                : isHovered
                  ? "rgba(0, 240, 255, 0.5)"
                  : "rgba(0, 240, 255, 0.15)";

            const borderWidth = isFocused || hasCircular ? 2 : 1;

            const filterAttr = hasCircular
              ? "url(#glow-error)"
              : isSelected
                ? "url(#glow-cyan)"
                : undefined;

            const nodeOpacity = isDimmed ? 0.4 : 1;

            // Rect top-left corner
            const rx = node.x;
            const ry = node.y;

            return (
              <g
                key={node.name}
                data-testid="guard-role-node"
                data-role={node.name}
                data-circular={hasCircular ? "true" : "false"}
                onClick={() => handleNodeClick(node.name)}
                onMouseEnter={() => setHoveredRole(node.name)}
                onMouseLeave={() => setHoveredRole(undefined)}
                style={{ cursor: "pointer" }}
                opacity={nodeOpacity}
                filter={filterAttr}
              >
                {/* Node rect */}
                <rect
                  x={rx}
                  y={ry}
                  width={NODE_W}
                  height={NODE_H}
                  rx={NODE_RX}
                  ry={NODE_RX}
                  fill="rgba(8, 16, 28, 0.7)"
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                />

                {/* Corner bracket — top-left */}
                <line
                  x1={rx + 4}
                  y1={ry + 2}
                  x2={rx + 4}
                  y2={ry + 2 + BRACKET_LEN}
                  stroke="#00F0FF"
                  strokeWidth={2}
                  opacity={0.5}
                />
                <line
                  x1={rx + 2}
                  y1={ry + 4}
                  x2={rx + 2 + BRACKET_LEN}
                  y2={ry + 4}
                  stroke="#00F0FF"
                  strokeWidth={2}
                  opacity={0.5}
                />

                {/* Corner bracket — bottom-right */}
                <line
                  x1={rx + NODE_W - 4}
                  y1={ry + NODE_H - 2}
                  x2={rx + NODE_W - 4}
                  y2={ry + NODE_H - 2 - BRACKET_LEN}
                  stroke="#00F0FF"
                  strokeWidth={2}
                  opacity={0.5}
                />
                <line
                  x1={rx + NODE_W - 2}
                  y1={ry + NODE_H - 4}
                  x2={rx + NODE_W - 2 - BRACKET_LEN}
                  y2={ry + NODE_H - 4}
                  stroke="#00F0FF"
                  strokeWidth={2}
                  opacity={0.5}
                />

                {/* Role name */}
                <text
                  x={rx + NODE_W / 2}
                  y={ry + NODE_H / 2 - 4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={700}
                  fill="var(--hex-text-primary, #e4e4f0)"
                  fontFamily="var(--hex-font-mono, monospace)"
                >
                  {node.name.length > 14 ? node.name.slice(0, 14) + "\u2026" : node.name}
                </text>

                {/* Permission count badge */}
                <rect
                  x={rx + NODE_W / 2 - 16}
                  y={ry + NODE_H / 2 + 6}
                  width={32}
                  height={16}
                  rx={8}
                  fill="rgba(0, 240, 255, 0.08)"
                  stroke="rgba(0, 240, 255, 0.15)"
                  strokeWidth={0.5}
                />
                <text
                  x={rx + NODE_W / 2}
                  y={ry + NODE_H / 2 + 14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={9}
                  fill="var(--hex-text-muted, #6b6b80)"
                  fontFamily="var(--hex-font-mono, monospace)"
                >
                  {node.role.flattenedPermissions.length}p
                </text>
              </g>
            );
          })}

          {/* Empty state inside SVG */}
          {roles.length === 0 && (
            <text
              x={viewBox.width / 2}
              y={viewBox.height / 2}
              textAnchor="middle"
              fontSize={14}
              fill="var(--hex-text-muted, #6b6b80)"
            >
              No roles defined
            </text>
          )}
        </svg>
      </div>

      {/* HTML empty state */}
      {roles.length === 0 && <div style={EMPTY_STATE_STYLE}>No roles defined</div>}
    </div>
  );
}

export { RoleHierarchyGraph };
export type { RoleHierarchyGraphProps };
