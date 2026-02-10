/**
 * Interactive type force graph visualization.
 *
 * Renders 18 type nodes as colored circles in a circular layout.
 * On hover, highlights super-effective (green) and weak-to (red)
 * relationships. Clicking a node selects it and triggers the
 * onSelectType callback for detailed analysis.
 *
 * Uses CSS absolute positioning within a relative container.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo } from "react";
import {
  TYPE_POSITIONS,
  GRAPH_RADIUS,
  getTypeColor,
  getOffensiveRelations,
  getDefensiveProfile,
} from "./type-data.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypeForceGraphProps {
  readonly selectedType: string | null;
  readonly onSelectType: (typeName: string) => void;
}

interface EdgeData {
  readonly from: string;
  readonly to: string;
  readonly kind: "super-effective" | "weak-to";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTAINER_SIZE = (GRAPH_RADIUS + 60) * 2;
const NODE_SIZE = 52;
const CENTER = CONTAINER_SIZE / 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodePosition(name: string): { x: number; y: number } {
  const pos = TYPE_POSITIONS.find(p => p.name === name);
  if (pos === undefined) return { x: 0, y: 0 };
  return { x: pos.x + CENTER, y: pos.y + CENTER };
}

/** Build edges for a hovered/selected type. */
function buildEdges(typeName: string): readonly EdgeData[] {
  const offense = getOffensiveRelations(typeName);
  const defense = getDefensiveProfile(typeName);

  const edges: EdgeData[] = [];

  for (const target of offense.superEffective) {
    edges.push({ from: typeName, to: target, kind: "super-effective" });
  }

  for (const attacker of defense.weakTo) {
    edges.push({ from: attacker, to: typeName, kind: "weak-to" });
  }

  return edges;
}

// ---------------------------------------------------------------------------
// Edge component (SVG line)
// ---------------------------------------------------------------------------

function EdgeLine({ edge }: { readonly edge: EdgeData }): ReactNode {
  const from = getNodePosition(edge.from);
  const to = getNodePosition(edge.to);

  // Shorten edge so it does not overlap the node circles
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const offset = NODE_SIZE / 2 + 4;
  const ux = dx / len;
  const uy = dy / len;

  const x1 = from.x + ux * offset;
  const y1 = from.y + uy * offset;
  const x2 = to.x - ux * offset;
  const y2 = to.y - uy * offset;

  const color = edge.kind === "super-effective" ? "#22c55e" : "#ef4444";

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={2}
      strokeOpacity={0.6}
      markerEnd={edge.kind === "super-effective" ? "url(#arrow-green)" : "url(#arrow-red)"}
    />
  );
}

// ---------------------------------------------------------------------------
// Node component
// ---------------------------------------------------------------------------

function TypeNode({
  name,
  isSelected,
  isHighlighted,
  isDimmed,
  onSelect,
  onHover,
  onLeave,
}: {
  readonly name: string;
  readonly isSelected: boolean;
  readonly isHighlighted: boolean;
  readonly isDimmed: boolean;
  readonly onSelect: () => void;
  readonly onHover: () => void;
  readonly onLeave: () => void;
}): ReactNode {
  const pos = getNodePosition(name);
  const color = getTypeColor(name);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="absolute flex items-center justify-center rounded-full border-2 text-[10px] font-bold uppercase leading-none text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      style={{
        left: pos.x - NODE_SIZE / 2,
        top: pos.y - NODE_SIZE / 2,
        width: NODE_SIZE,
        height: NODE_SIZE,
        backgroundColor: color,
        borderColor: isSelected ? "#fff" : isHighlighted ? "#fbbf24" : color,
        opacity: isDimmed ? 0.3 : 1,
        transform: isSelected ? "scale(1.2)" : isHighlighted ? "scale(1.1)" : "scale(1)",
        zIndex: isSelected ? 20 : isHighlighted ? 10 : 1,
      }}
    >
      {name.slice(0, 3)}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function TypeForceGraph({ selectedType, onSelectType }: TypeForceGraphProps): ReactNode {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  // The active type for edge display is either hovered or selected
  const activeType = hoveredType ?? selectedType;

  // Compute edges for the active type
  const edges = useMemo(() => {
    if (activeType === null) return [];
    return buildEdges(activeType);
  }, [activeType]);

  // Compute which nodes are related to the active type
  const relatedNodes = useMemo(() => {
    const set = new Set<string>();
    for (const edge of edges) {
      set.add(edge.from);
      set.add(edge.to);
    }
    return set;
  }, [edges]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">Type Synergy Graph</h3>
      <div className="relative mx-auto" style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}>
        {/* SVG layer for edges */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={CONTAINER_SIZE}
          height={CONTAINER_SIZE}
        >
          <defs>
            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
            </marker>
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>
          {edges.map(edge => (
            <EdgeLine key={`${edge.from}-${edge.to}-${edge.kind}`} edge={edge} />
          ))}
        </svg>

        {/* Node layer */}
        {TYPE_POSITIONS.map(pos => {
          const isSelected = pos.name === selectedType;
          const isHighlighted = activeType !== null && relatedNodes.has(pos.name);
          const isDimmed =
            activeType !== null && !isSelected && !isHighlighted && pos.name !== activeType;

          return (
            <TypeNode
              key={pos.name}
              name={pos.name}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              onSelect={() => onSelectType(pos.name)}
              onHover={() => setHoveredType(pos.name)}
              onLeave={() => setHoveredType(null)}
            />
          );
        })}

        {/* Center label */}
        {activeType !== null && (
          <div
            className="pointer-events-none absolute flex flex-col items-center justify-center"
            style={{
              left: CENTER - 50,
              top: CENTER - 20,
              width: 100,
              height: 40,
            }}
          >
            <span
              className="rounded-full px-3 py-1 text-xs font-bold uppercase text-white shadow"
              style={{ backgroundColor: getTypeColor(activeType) }}
            >
              {activeType}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-green-500" />
          Super Effective
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-red-500" />
          Weak To
        </span>
      </div>
    </div>
  );
}

export { TypeForceGraph };
export type { TypeForceGraphProps };
