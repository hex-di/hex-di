/**
 * HealthPanel — graph health, blast radius, scope leak detection.
 *
 * @packageDocumentation
 */

import { useState } from "react";
import type { ScopeTree } from "@hex-di/core";
import type { PanelProps } from "./types.js";
import { EmptyState } from "../components/empty-state.js";
import { StatCard } from "../components/stat-card.js";
import { SectionHeader } from "../components/section-header.js";

/**
 * Counts the number of active scopes in a scope tree.
 */
function countActiveScopes(tree: ScopeTree): number {
  let count = tree.status === "active" ? 1 : 0;
  for (const child of tree.children) {
    count += countActiveScopes(child);
  }
  return count;
}

type HealthLevel = "healthy" | "monitor" | "critical";

function getHealthLevel(adapterCount: number): HealthLevel {
  if (adapterCount > 100) return "critical";
  if (adapterCount > 50) return "monitor";
  return "healthy";
}

const healthConfig: Record<
  HealthLevel,
  { label: string; color: string; bgColor: string; description: string }
> = {
  healthy: {
    label: "Healthy",
    color: "var(--hex-success)",
    bgColor: "var(--hex-success-muted)",
    description: "Graph complexity is within safe limits",
  },
  monitor: {
    label: "Monitor",
    color: "var(--hex-warning)",
    bgColor: "var(--hex-warning-muted)",
    description: "Consider splitting into sub-graphs",
  },
  critical: {
    label: "Critical",
    color: "var(--hex-error)",
    bgColor: "var(--hex-error-muted)",
    description: "Graph is too complex, split recommended",
  },
};

function HealthIndicator({ level }: { readonly level: HealthLevel }): React.ReactElement {
  const config = healthConfig[level];

  return (
    <div
      style={{
        padding: "var(--hex-space-lg)",
        backgroundColor: config.bgColor,
        borderRadius: "var(--hex-radius-lg)",
        border: `1px solid ${config.color}`,
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-md)",
        marginBottom: "var(--hex-space-xl)",
      }}
    >
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: config.color,
          flexShrink: 0,
          boxShadow: `0 0 8px ${config.color}`,
        }}
      />
      <div>
        <div
          style={{
            fontFamily: "var(--hex-font-sans)",
            fontSize: "var(--hex-font-size-lg)",
            fontWeight: "var(--hex-font-weight-semibold)",
            color: config.color,
          }}
        >
          {config.label}
        </div>
        <div
          style={{
            fontSize: "var(--hex-font-size-sm)",
            color: "var(--hex-text-secondary)",
            marginTop: "2px",
          }}
        >
          {config.description}
        </div>
      </div>
    </div>
  );
}

interface ErrorHotspotProps {
  readonly portName: string;
  readonly errorRate: number;
  readonly lastErrorCode: string | undefined;
}

function ErrorHotspot({
  portName,
  errorRate,
  lastErrorCode,
}: ErrorHotspotProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? "var(--hex-bg-hover)" : "var(--hex-error-muted)",
        borderRadius: "var(--hex-radius-md)",
        padding: "var(--hex-space-md) var(--hex-space-lg)",
        borderLeft: "3px solid var(--hex-error)",
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-md)",
        transition: "background-color var(--hex-transition-fast)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--hex-font-mono)",
            fontSize: "var(--hex-font-size-sm)",
            fontWeight: "var(--hex-font-weight-semibold)",
            color: "var(--hex-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {portName}
        </div>
        {lastErrorCode !== undefined && (
          <div
            style={{
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              fontFamily: "var(--hex-font-mono)",
              marginTop: "2px",
            }}
          >
            Last: {lastErrorCode}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: "var(--hex-font-size-lg)",
          fontWeight: "var(--hex-font-weight-semibold)",
          color: "var(--hex-error)",
          fontFamily: "var(--hex-font-mono)",
          flexShrink: 0,
        }}
      >
        {(errorRate * 100).toFixed(0)}%
      </div>
    </div>
  );
}

/**
 * HealthPanel aggregates diagnostic signals.
 */
function HealthPanel({ dataSource }: PanelProps): React.ReactElement {
  const graphData = dataSource.getGraphData();
  const scopeTree = dataSource.getScopeTree();
  const resultStats = dataSource.getAllResultStatistics();

  if (!graphData && !scopeTree && !resultStats) {
    return (
      <EmptyState
        icon={"\uD83E\uDE7A"}
        message="No diagnostic data available"
        description="Run your code to see health metrics. Graph complexity, error hotspots, and scope leaks will be reported."
      />
    );
  }

  const adapterCount = graphData?.adapters.length ?? 0;
  const maxFanOut = graphData
    ? Math.max(...graphData.adapters.map(a => a.dependencyNames.length), 0)
    : 0;

  const healthLevel = getHealthLevel(adapterCount);

  const highErrorPorts = resultStats
    ? [...resultStats.values()].filter(s => s.errorRate > 0.05)
    : [];

  const activeScopeCount = scopeTree ? countActiveScopes(scopeTree) : 0;

  return (
    <div
      data-testid="health-panel"
      role="region"
      aria-label="Health Panel"
      style={{
        padding: "var(--hex-space-xl)",
        overflow: "auto",
        height: "100%",
      }}
    >
      <SectionHeader title="Graph Health" subtitle="Complexity analysis and diagnostic signals" />

      <HealthIndicator level={healthLevel} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "var(--hex-space-md)",
          marginBottom: "var(--hex-space-xl)",
        }}
      >
        <StatCard label="Adapters" value={adapterCount} />
        <StatCard
          label="Max Fan-Out"
          value={maxFanOut}
          variant={maxFanOut > 8 ? "warning" : "neutral"}
          description={maxFanOut > 8 ? "Consider splitting" : "Within limits"}
        />
        <StatCard label="Active Scopes" value={activeScopeCount} />
      </div>

      {highErrorPorts.length > 0 && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--hex-border)",
              marginBottom: "var(--hex-space-xl)",
            }}
          />
          <SectionHeader
            title="Error Hotspots"
            count={highErrorPorts.length}
            subtitle="Ports with error rates above 5%"
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hex-space-sm)",
            }}
          >
            {highErrorPorts.map(stat => (
              <ErrorHotspot
                key={stat.portName}
                portName={stat.portName}
                errorRate={stat.errorRate}
                lastErrorCode={stat.lastError?.code}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { HealthPanel };
