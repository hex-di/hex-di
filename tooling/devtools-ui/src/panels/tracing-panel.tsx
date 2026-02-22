/**
 * TracingPanel — resolution timeline with span waterfall.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState } from "react";
import type { InspectorEvent } from "@hex-di/core";
import type { PanelProps } from "./types.js";
import { useDataSourceTracingSummary } from "../hooks/use-data-source-tracing-summary.js";
import { StatCard } from "../components/stat-card.js";
import { SectionHeader } from "../components/section-header.js";
import { EmptyState } from "../components/empty-state.js";
import { TimelineRenderer } from "../visualization/timeline/timeline-renderer.js";
import type { TracingSpan } from "../visualization/timeline/timeline-renderer.js";

const STATS_SECTION_HEIGHT = 140;

/**
 * TracingPanel shows resolution timing data as a horizontal timeline.
 */
function TracingPanel({ dataSource, theme, width, height }: PanelProps): React.ReactElement {
  const summary = useDataSourceTracingSummary();
  const [spans, setSpans] = useState<readonly TracingSpan[]>([]);
  const [selectedSpanId, setSelectedSpanId] = useState<string | undefined>(undefined);

  // Collect resolution events into spans
  useEffect(() => {
    let spanSeq = 0;

    return dataSource.subscribe((event: InspectorEvent) => {
      if (event.type === "resolution") {
        spanSeq += 1;
        const newSpan: TracingSpan = {
          id: `span-${spanSeq}`,
          name: event.portName,
          startTime: 0, // relative
          duration: event.duration,
          status: "ok",
          depth: 0,
        };

        setSpans(prev => {
          // Compute startTime as cumulative
          const lastEnd =
            prev.length > 0 ? prev[prev.length - 1].startTime + prev[prev.length - 1].duration : 0;

          return [...prev, { ...newSpan, startTime: lastEnd }];
        });
      }
    });
  }, [dataSource]);

  const handleSpanSelect = useCallback((id: string) => {
    setSelectedSpanId(id);
  }, []);

  if (!summary && spans.length === 0) {
    return (
      <EmptyState
        icon={"\u23F1\uFE0F"}
        message="No tracing data available"
        description="Register a tracing library inspector to see resolution timelines and performance metrics."
      />
    );
  }

  const timelineHeight = Math.max(height - STATS_SECTION_HEIGHT, 200);

  return (
    <div
      data-testid="tracing-panel"
      role="region"
      aria-label="Tracing Panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {summary && (
        <div
          style={{
            padding: "var(--hex-space-xl)",
            paddingBottom: "var(--hex-space-md)",
            borderBottom: "1px solid var(--hex-border)",
          }}
        >
          <SectionHeader title="Tracing" subtitle="Resolution performance metrics" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "var(--hex-space-md)",
            }}
          >
            <StatCard label="Total Spans" value={summary.totalSpans} />
            <StatCard label="Avg Duration" value={`${summary.averageDuration.toFixed(1)}ms`} />
            <StatCard
              label="Cache Hits"
              value={`${(summary.cacheHitRate * 100).toFixed(0)}%`}
              variant={summary.cacheHitRate > 0.5 ? "success" : "neutral"}
            />
            <StatCard
              label="Errors"
              value={summary.errorCount}
              variant={summary.errorCount > 0 ? "error" : "neutral"}
            />
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden" }}>
        {spans.length > 0 ? (
          <TimelineRenderer
            spans={spans}
            onSpanSelect={handleSpanSelect}
            selectedSpanId={selectedSpanId}
            theme={theme}
            width={width}
            height={summary ? timelineHeight : height}
          />
        ) : (
          <EmptyState
            icon={"\u23F3"}
            message="No resolution spans recorded yet"
            description="Spans appear as ports are resolved in your container."
          />
        )}
      </div>
    </div>
  );
}

export { TracingPanel };
