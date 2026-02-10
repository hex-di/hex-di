/**
 * Neural Map panel - Live Dependency Graph visualization.
 *
 * Renders an HTML/CSS node graph showing all registered adapters,
 * their lifetimes (color-coded), and dependency edges. Nodes pulse
 * on resolution events. Click a node for detail sidebar.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback } from "react";
import { useInspector } from "@hex-di/react";
import type { VisualizableAdapter, ContainerGraphData } from "@hex-di/core";
import { useBrainEvents } from "../BrainEventContext.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NodePosition {
  readonly x: number;
  readonly y: number;
}

interface GraphNode {
  readonly adapter: VisualizableAdapter;
  readonly position: NodePosition;
  readonly dependents: readonly string[];
}

interface LifetimeStyle {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly dot: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LIFETIME_COLORS: Record<string, LifetimeStyle> = {
  singleton: {
    bg: "bg-amber-500/20",
    border: "border-amber-500",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  scoped: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  transient: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
};

const DEFAULT_LIFETIME_STYLE: LifetimeStyle = {
  bg: "bg-emerald-500/20",
  border: "border-emerald-500",
  text: "text-emerald-400",
  dot: "bg-emerald-400",
};

function getLifetimeColor(lifetime: string): LifetimeStyle {
  return LIFETIME_COLORS[lifetime] ?? DEFAULT_LIFETIME_STYLE;
}

/**
 * Compute node positions using a simple layered layout.
 * Group by lifetime, then arrange in rows.
 */
function computeLayout(adapters: readonly VisualizableAdapter[]): ReadonlyMap<string, GraphNode> {
  const nodes = new Map<string, GraphNode>();
  const dependentMap = new Map<string, string[]>();

  // Build dependent map (reverse of dependencies)
  for (const adapter of adapters) {
    for (const dep of adapter.dependencyNames) {
      const existing = dependentMap.get(dep);
      if (existing) {
        existing.push(adapter.portName);
      } else {
        dependentMap.set(dep, [adapter.portName]);
      }
    }
  }

  // Group adapters by lifetime for layered layout
  const singletons = adapters.filter(a => a.lifetime === "singleton");
  const scoped = adapters.filter(a => a.lifetime === "scoped");
  const transients = adapters.filter(a => a.lifetime === "transient");

  const groups = [singletons, scoped, transients];
  const nodeWidth = 200;
  const nodeHeight = 60;
  const hGap = 24;
  const vGap = 40;

  for (let groupIdx = 0; groupIdx < groups.length; groupIdx += 1) {
    const group = groups[groupIdx];
    if (group === undefined) continue;
    const cols = Math.max(1, Math.ceil(Math.sqrt(group.length)));

    for (let i = 0; i < group.length; i += 1) {
      const adapter = group[i];
      if (adapter === undefined) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = col * (nodeWidth + hGap);
      const y = groupIdx * (nodeHeight * 3 + vGap) + row * (nodeHeight + vGap);

      nodes.set(adapter.portName, {
        adapter,
        position: { x, y },
        dependents: dependentMap.get(adapter.portName) ?? [],
      });
    }
  }

  return nodes;
}

function computeMetrics(graphData: ContainerGraphData): {
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
} {
  let edgeCount = 0;
  for (const adapter of graphData.adapters) {
    edgeCount += adapter.dependencyNames.length;
  }

  // Compute max dependency chain depth
  const depthCache = new Map<string, number>();
  const adaptersByName = new Map<string, VisualizableAdapter>();
  for (const adapter of graphData.adapters) {
    adaptersByName.set(adapter.portName, adapter);
  }

  function getDepth(name: string, visited: Set<string>): number {
    const cached = depthCache.get(name);
    if (cached !== undefined) return cached;
    if (visited.has(name)) return 0; // Circular dep guard
    visited.add(name);

    const adapter = adaptersByName.get(name);
    if (!adapter || adapter.dependencyNames.length === 0) {
      depthCache.set(name, 0);
      return 0;
    }

    let maxChildDepth = 0;
    for (const dep of adapter.dependencyNames) {
      const childDepth = getDepth(dep, visited);
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth;
      }
    }

    const depth = maxChildDepth + 1;
    depthCache.set(name, depth);
    return depth;
  }

  let maxDepth = 0;
  for (const adapter of graphData.adapters) {
    const depth = getDepth(adapter.portName, new Set<string>());
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }

  return { nodeCount: graphData.adapters.length, edgeCount, maxDepth };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface NodeCardProps {
  readonly node: GraphNode;
  readonly isRecentlyResolved: boolean;
  readonly isSelected: boolean;
  readonly onSelect: (portName: string) => void;
}

function NodeCard({ node, isRecentlyResolved, isSelected, onSelect }: NodeCardProps): ReactNode {
  const colors = getLifetimeColor(node.adapter.lifetime);
  const handleClick = useCallback(() => {
    onSelect(node.adapter.portName);
  }, [onSelect, node.adapter.portName]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`absolute rounded-lg border px-3 py-2 text-left transition-all duration-200 ${colors.bg} ${colors.border} ${
        isSelected ? "ring-2 ring-pink-400 ring-offset-1 ring-offset-gray-950" : ""
      } ${isRecentlyResolved ? "animate-pulse" : ""} hover:brightness-125`}
      style={{
        left: `${String(node.position.x)}px`,
        top: `${String(node.position.y)}px`,
        minWidth: "180px",
      }}
    >
      <div className={`truncate text-sm font-medium ${colors.text}`}>{node.adapter.portName}</div>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
        <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
        <span>{node.adapter.lifetime}</span>
        <span className="text-gray-600">|</span>
        <span>{node.adapter.factoryKind}</span>
      </div>
    </button>
  );
}

interface DetailSidebarProps {
  readonly node: GraphNode;
  readonly onClose: () => void;
}

function DetailSidebar({ node, onClose }: DetailSidebarProps): ReactNode {
  const colors = getLifetimeColor(node.adapter.lifetime);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-gray-800 bg-gray-900/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Node Detail</h3>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
          x
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-500">Port Name</span>
          <p className={`font-medium ${colors.text}`}>{node.adapter.portName}</p>
        </div>
        <div>
          <span className="text-gray-500">Lifetime</span>
          <p className="flex items-center gap-2 text-white">
            <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
            {node.adapter.lifetime}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Factory Kind</span>
          <p className="text-white">{node.adapter.factoryKind}</p>
        </div>
        <div>
          <span className="text-gray-500">Origin</span>
          <p className="text-white">{node.adapter.origin}</p>
        </div>
        <div>
          <span className="text-gray-500">
            Dependencies ({String(node.adapter.dependencyNames.length)})
          </span>
          {node.adapter.dependencyNames.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {node.adapter.dependencyNames.map(dep => (
                <li key={dep} className="truncate text-blue-400">
                  {dep}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">None</p>
          )}
        </div>
        <div>
          <span className="text-gray-500">Dependents ({String(node.dependents.length)})</span>
          {node.dependents.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {node.dependents.map(dep => (
                <li key={dep} className="truncate text-purple-400">
                  {dep}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">None</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edge SVG Component
// ---------------------------------------------------------------------------

interface EdgesProps {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

function Edges({ nodes, canvasWidth, canvasHeight }: EdgesProps): ReactNode {
  const lines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];

  for (const [, node] of nodes) {
    for (const depName of node.adapter.dependencyNames) {
      const depNode = nodes.get(depName);
      if (depNode) {
        lines.push({
          key: `${node.adapter.portName}->${depName}`,
          x1: node.position.x + 90,
          y1: node.position.y + 24,
          x2: depNode.position.x + 90,
          y2: depNode.position.y + 24,
        });
      }
    }
  }

  if (lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 0 }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#6B7280" />
        </marker>
      </defs>
      {lines.map(line => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#374151"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function NeuralMap(): ReactNode {
  const inspector = useInspector();
  const { resolvedPortNames } = useBrainEvents();
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  const graphData = inspector.getGraphData();
  const nodes = useMemo(() => computeLayout(graphData.adapters), [graphData.adapters]);
  const metrics = useMemo(() => computeMetrics(graphData), [graphData]);

  const selectedNode = selectedPort !== null ? (nodes.get(selectedPort) ?? null) : null;

  const handleSelect = useCallback((portName: string) => {
    setSelectedPort(prev => (prev === portName ? null : portName));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPort(null);
  }, []);

  // Compute canvas size
  let maxX = 600;
  let maxY = 400;
  for (const [, node] of nodes) {
    const right = node.position.x + 200;
    const bottom = node.position.y + 60;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }
  const canvasWidth = maxX + 40;
  const canvasHeight = maxY + 40;

  return (
    <div className="flex h-full">
      {/* Main graph area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Metrics bar */}
        <div className="flex items-center gap-6 border-b border-gray-800 px-4 py-2">
          <span className="text-xs text-gray-500">
            Container: <span className="text-white">{graphData.containerName}</span>
          </span>
          <span className="text-xs text-gray-500">
            Nodes: <span className="text-white">{String(metrics.nodeCount)}</span>
          </span>
          <span className="text-xs text-gray-500">
            Edges: <span className="text-white">{String(metrics.edgeCount)}</span>
          </span>
          <span className="text-xs text-gray-500">
            Max Depth: <span className="text-white">{String(metrics.maxDepth)}</span>
          </span>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              Singleton
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
              Scoped
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Transient
            </span>
          </div>
        </div>

        {/* Scrollable graph canvas */}
        <div className="relative flex-1 overflow-auto p-4">
          <div
            className="relative"
            style={{ width: `${String(canvasWidth)}px`, height: `${String(canvasHeight)}px` }}
          >
            <Edges nodes={nodes} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
            {Array.from(nodes.values()).map(node => (
              <NodeCard
                key={node.adapter.portName}
                node={node}
                isRecentlyResolved={resolvedPortNames.has(node.adapter.portName)}
                isSelected={selectedPort === node.adapter.portName}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail sidebar */}
      {selectedNode !== null && <DetailSidebar node={selectedNode} onClose={handleCloseDetail} />}
    </div>
  );
}

export { NeuralMap };
