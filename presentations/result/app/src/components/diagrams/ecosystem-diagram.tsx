import { useState, useCallback } from "react";
import styles from "./ecosystem-diagram.module.css";

interface PackageNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly x: number;
  readonly y: number;
  readonly layer: "core" | "structure" | "runtime" | "behavior";
  readonly resultConnection?: string;
}

const CX = 400;
const CY = 230;

const PACKAGES: readonly PackageNode[] = [
  {
    id: "core",
    label: "@hex-di/core",
    description: "Ports, adapters, and type-level primitives",
    x: CX,
    y: CY,
    layer: "core",
  },
  {
    id: "graph",
    label: "@hex-di/graph",
    description: "Compile-time dependency graph builder",
    x: CX - 180,
    y: CY - 140,
    layer: "structure",
    resultConnection: "Graph validation errors",
  },
  {
    id: "runtime",
    label: "@hex-di/runtime",
    description: "Container: resolve, scope, lifecycle",
    x: CX + 180,
    y: CY - 140,
    layer: "runtime",
    resultConnection: "Container resolution",
  },
  {
    id: "result",
    label: "@hex-di/result",
    description: "Result<T, E> -- typed error handling",
    x: CX,
    y: CY - 160,
    layer: "core",
    resultConnection: "This library",
  },
  {
    id: "flow",
    label: "@hex-di/flow",
    description: "State machines with typed effects",
    x: CX - 260,
    y: CY + 40,
    layer: "behavior",
    resultConnection: "Flow effect execution",
  },
  {
    id: "store",
    label: "@hex-di/store",
    description: "Immutable state management",
    x: CX - 150,
    y: CY + 130,
    layer: "behavior",
    resultConnection: "Store async derived",
  },
  {
    id: "query",
    label: "@hex-di/query",
    description: "Async data fetching and caching",
    x: CX + 150,
    y: CY + 130,
    layer: "behavior",
    resultConnection: "Query fetch results",
  },
  {
    id: "saga",
    label: "@hex-di/saga",
    description: "Long-running compensatable workflows",
    x: CX + 260,
    y: CY + 40,
    layer: "behavior",
    resultConnection: "Saga step execution",
  },
  {
    id: "tracing",
    label: "@hex-di/tracing",
    description: "Distributed tracing instrumentation",
    x: CX + 80,
    y: CY + 60,
    layer: "runtime",
    resultConnection: "Span creation results",
  },
  {
    id: "logger",
    label: "@hex-di/logger",
    description: "Structured logging port",
    x: CX - 80,
    y: CY + 60,
    layer: "runtime",
  },
];

const LAYER_COLORS: Record<string, string> = {
  core: "#7a00e6",
  structure: "#1570ef",
  runtime: "#079455",
  behavior: "#ee7404",
};

const LAYER_LABELS: Record<string, string> = {
  core: "Core",
  structure: "Structure",
  runtime: "Runtime",
  behavior: "Behavior",
};

export function EcosystemDiagram(): React.JSX.Element {
  const [hovered, setHovered] = useState<string | null>(null);

  const handleEnter = useCallback((id: string) => {
    setHovered(id);
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(null);
  }, []);

  const isResultHovered = hovered === "result";
  const resultNode = PACKAGES.find(p => p.id === "result");

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 800 460" className={styles.svgArea}>
        {/* Connection lines from core to all packages */}
        {PACKAGES.filter(p => p.id !== "core").map(pkg => {
          const isHighlighted = isResultHovered && pkg.resultConnection !== undefined;
          const isNodeHovered = hovered === pkg.id;

          return (
            <line
              key={`line-${pkg.id}`}
              x1={CX}
              y1={CY}
              x2={pkg.x}
              y2={pkg.y}
              stroke={isHighlighted || isNodeHovered ? LAYER_COLORS[pkg.layer] : "#c9c9c9"}
              strokeWidth={isHighlighted || isNodeHovered ? 2.5 : 1}
              opacity={isHighlighted || isNodeHovered ? 1 : 0.3}
              strokeDasharray={pkg.layer === "behavior" ? "6 3" : "none"}
            />
          );
        })}

        {/* Result connection labels when result is hovered */}
        {isResultHovered &&
          resultNode &&
          PACKAGES.filter(p => p.resultConnection && p.id !== "result").map(pkg => {
            const midX = (resultNode.x + pkg.x) / 2;
            const midY = (resultNode.y + pkg.y) / 2;

            return (
              <text
                key={`label-${pkg.id}`}
                x={midX}
                y={midY - 8}
                textAnchor="middle"
                fill={LAYER_COLORS[pkg.layer]}
                fontSize="10"
                fontWeight="600"
                fontFamily="Work Sans, sans-serif"
              >
                {pkg.resultConnection}
              </text>
            );
          })}

        {/* Package nodes */}
        {PACKAGES.map(pkg => {
          const isActive = hovered === pkg.id;
          const color = LAYER_COLORS[pkg.layer];
          const r = pkg.id === "core" ? 44 : 36;

          return (
            <g
              key={pkg.id}
              onMouseEnter={() => handleEnter(pkg.id)}
              onMouseLeave={handleLeave}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={pkg.x}
                cy={pkg.y}
                r={r}
                fill={isActive ? color : `${color}18`}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <text
                x={pkg.x}
                y={pkg.y - 4}
                textAnchor="middle"
                fill={isActive ? "#fff" : color}
                fontSize={pkg.id === "core" ? "11" : "10"}
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {pkg.label.replace("@hex-di/", "")}
              </text>
              <text
                x={pkg.x}
                y={pkg.y + 10}
                textAnchor="middle"
                fill={isActive ? "#fff" : "#757575"}
                fontSize="8"
                fontFamily="Work Sans, sans-serif"
              >
                {LAYER_LABELS[pkg.layer]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className={styles.tooltip} style={{ left: "50%", bottom: 24 }}>
          {PACKAGES.find(p => p.id === hovered)?.description}
        </div>
      )}
    </div>
  );
}
