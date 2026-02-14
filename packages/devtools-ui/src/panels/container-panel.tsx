/**
 * ContainerPanel — phase, port counts, singletons, error rates.
 *
 * @packageDocumentation
 */

import { useState } from "react";
import type { PanelProps } from "./types.js";
import { useDataSourceSnapshot } from "../hooks/use-data-source-snapshot.js";
import { StatCard } from "../components/stat-card.js";
import { SectionHeader } from "../components/section-header.js";
import { StatusBadge } from "../components/status-badge.js";
import { EmptyState } from "../components/empty-state.js";

interface AdapterRowProps {
  readonly portName: string;
  readonly lifetime: "singleton" | "scoped" | "transient";
  readonly dependencyNames: readonly string[];
  readonly isEven: boolean;
}

function AdapterRow({
  portName,
  lifetime,
  dependencyNames,
  isEven,
}: AdapterRowProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const bgColor = isHovered
    ? "var(--hex-bg-hover)"
    : isEven
      ? "var(--hex-bg-secondary)"
      : "transparent";

  return (
    <tr
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: bgColor,
        transition: "background-color var(--hex-transition-fast)",
      }}
    >
      <td
        style={{
          padding: "var(--hex-space-sm) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          color: "var(--hex-text-primary)",
          fontWeight: "var(--hex-font-weight-medium)",
        }}
      >
        {portName}
      </td>
      <td
        style={{
          padding: "var(--hex-space-sm) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
        }}
      >
        <StatusBadge variant={lifetime} />
      </td>
      <td
        style={{
          padding: "var(--hex-space-sm) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          color: dependencyNames.length > 0 ? "var(--hex-text-secondary)" : "var(--hex-text-muted)",
        }}
      >
        {dependencyNames.length > 0 ? dependencyNames.join(", ") : "\u2014"}
      </td>
    </tr>
  );
}

/**
 * ContainerPanel displays detailed container state.
 */
function ContainerPanel({ dataSource }: PanelProps): React.ReactElement {
  const snapshot = useDataSourceSnapshot();

  if (!snapshot) {
    return (
      <EmptyState
        icon={"\uD83D\uDCE6"}
        message="Waiting for container data..."
        description="Initialize a container to see its adapters, ports, and resolution state."
      />
    );
  }

  const adapterInfo = dataSource.getAdapterInfo();
  const resultStats = dataSource.getAllResultStatistics();

  const portCount = adapterInfo?.length ?? 0;
  const singletonCount = snapshot.singletons.length;
  const resolvedCount = snapshot.singletons.filter(s => s.isResolved).length;
  const highErrorPorts = resultStats
    ? [...resultStats.values()].filter(s => s.errorRate > 0.05)
    : [];

  return (
    <div
      data-testid="container-panel"
      role="region"
      aria-label="Container Panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "var(--hex-space-xl)", paddingBottom: 0 }}>
        <SectionHeader title={snapshot.containerName} subtitle={`Phase: ${snapshot.phase}`} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "var(--hex-space-md)",
            marginBottom: "var(--hex-space-xl)",
          }}
        >
          <StatCard label="Total Ports" value={portCount} />
          <StatCard
            label="Singletons"
            value={`${resolvedCount} / ${singletonCount}`}
            description="resolved / total"
          />
          <StatCard
            label="Error Ports"
            value={highErrorPorts.length}
            variant={highErrorPorts.length > 0 ? "error" : "neutral"}
          />
        </div>
      </div>

      {adapterInfo && adapterInfo.length > 0 && (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            borderTop: "1px solid var(--hex-border)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--hex-font-mono)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "var(--hex-space-sm) var(--hex-space-md)",
                    borderBottom: "2px solid var(--hex-border-strong)",
                    backgroundColor: "var(--hex-bg-secondary)",
                    color: "var(--hex-text-muted)",
                    fontWeight: "var(--hex-font-weight-semibold)",
                    fontSize: "var(--hex-font-size-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  Port Name
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "var(--hex-space-sm) var(--hex-space-md)",
                    borderBottom: "2px solid var(--hex-border-strong)",
                    backgroundColor: "var(--hex-bg-secondary)",
                    color: "var(--hex-text-muted)",
                    fontWeight: "var(--hex-font-weight-semibold)",
                    fontSize: "var(--hex-font-size-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    width: "120px",
                  }}
                >
                  Lifetime
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "var(--hex-space-sm) var(--hex-space-md)",
                    borderBottom: "2px solid var(--hex-border-strong)",
                    backgroundColor: "var(--hex-bg-secondary)",
                    color: "var(--hex-text-muted)",
                    fontWeight: "var(--hex-font-weight-semibold)",
                    fontSize: "var(--hex-font-size-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  Dependencies
                </th>
              </tr>
            </thead>
            <tbody>
              {adapterInfo.map((adapter, index) => (
                <AdapterRow
                  key={adapter.portName}
                  portName={adapter.portName}
                  lifetime={adapter.lifetime}
                  dependencyNames={adapter.dependencyNames}
                  isEven={index % 2 === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { ContainerPanel };
