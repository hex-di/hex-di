/**
 * OverviewPanel — bird's-eye summary of container state and library metrics.
 *
 * @packageDocumentation
 */

import { useState } from "react";
import type { PanelProps } from "./types.js";
import { useDataSourceUnifiedSnapshot } from "../hooks/use-data-source-unified-snapshot.js";
import { StatCard } from "../components/stat-card.js";
import { SectionHeader } from "../components/section-header.js";
import { EmptyState } from "../components/empty-state.js";

interface LibraryCardProps {
  readonly name: string;
  readonly entryCount: number;
}

function LibraryCard({ name, entryCount }: LibraryCardProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-md)",
        padding: "var(--hex-space-md) var(--hex-space-lg)",
        backgroundColor: isHovered ? "var(--hex-bg-tertiary)" : "var(--hex-bg-secondary)",
        borderRadius: "var(--hex-radius-lg)",
        border: "1px solid var(--hex-border)",
        borderLeft: "3px solid var(--hex-accent)",
        boxShadow: isHovered ? "0 4px 14px rgba(0,0,0,0.12)" : "none",
        transition: "all var(--hex-transition-fast)",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "var(--hex-radius-md)",
          backgroundColor: "var(--hex-accent-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
        }}
      >
        {"\uD83D\uDCE6"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--hex-font-mono)",
            fontWeight: "var(--hex-font-weight-semibold)",
            fontSize: "var(--hex-font-size-sm)",
            color: "var(--hex-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: "var(--hex-font-size-xs)",
            color: "var(--hex-text-muted)",
            marginTop: "2px",
          }}
        >
          {entryCount} {entryCount === 1 ? "property" : "properties"}
        </div>
      </div>
    </div>
  );
}

/**
 * OverviewPanel displays container stats and library summaries.
 */
function OverviewPanel({ dataSource }: PanelProps): React.ReactElement {
  const unified = useDataSourceUnifiedSnapshot();

  if (!unified) {
    return (
      <EmptyState
        icon={"\uD83D\uDD0D"}
        message="Waiting for container data..."
        description="Run your code to see an overview of your dependency injection container."
      />
    );
  }

  const container = unified.container;
  const libraryNames = unified.registeredLibraries;

  const adapterInfo = dataSource.getAdapterInfo();
  const portCount = adapterInfo?.length ?? 0;
  const allStats = dataSource.getAllResultStatistics();
  const errorPortCount = allStats ? [...allStats.values()].filter(s => s.errorRate > 0).length : 0;

  return (
    <div
      data-testid="overview-panel"
      role="region"
      aria-label="Overview Panel"
      style={{
        padding: "var(--hex-space-xl)",
        overflow: "auto",
        height: "100%",
      }}
    >
      <SectionHeader title="Container" subtitle="Dependency resolution status" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "var(--hex-space-md)",
          marginBottom: "var(--hex-space-xl)",
        }}
      >
        <StatCard label="Phase" value={container.phase} />
        <StatCard label="Ports" value={portCount} />
        <StatCard label="Singletons" value={container.singletons.length} />
        <StatCard
          label="Error Ports"
          value={errorPortCount}
          variant={errorPortCount > 0 ? "error" : "neutral"}
        />
      </div>

      <div
        style={{
          borderTop: "1px solid var(--hex-border)",
          marginBottom: "var(--hex-space-xl)",
        }}
      />

      <SectionHeader title="Libraries" count={libraryNames.length} />

      {libraryNames.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "var(--hex-space-md)",
          }}
        >
          {libraryNames.map(name => {
            const libData = unified.libraries[name];
            const entryCount = libData ? Object.keys(libData).length : 0;
            return <LibraryCard key={name} name={name} entryCount={entryCount} />;
          })}
        </div>
      ) : (
        <div
          style={{
            padding: "var(--hex-space-lg)",
            textAlign: "center",
            color: "var(--hex-text-muted)",
            fontSize: "var(--hex-font-size-sm)",
            fontFamily: "var(--hex-font-sans)",
            backgroundColor: "var(--hex-bg-secondary)",
            borderRadius: "var(--hex-radius-md)",
            border: "1px solid var(--hex-border)",
          }}
        >
          No libraries registered yet
        </div>
      )}
    </div>
  );
}

export { OverviewPanel };
