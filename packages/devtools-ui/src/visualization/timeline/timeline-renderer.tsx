/**
 * TimelineRenderer component for visualizing tracing spans.
 *
 * Renders spans as horizontal bars on a time axis with selection support.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import type { ResolvedTheme } from "../../panels/types.js";
import { EmptyState } from "../../components/empty-state.js";
import { TimelineRow } from "./timeline-row.js";
import type { TracingSpan } from "./timeline-row.js";
import { TimelineScale } from "./timeline-scale.js";

interface TimelineRendererProps {
  readonly spans: readonly TracingSpan[];
  readonly onSpanSelect?: (spanId: string) => void;
  readonly selectedSpanId?: string;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}

/**
 * TimelineRenderer displays tracing spans as horizontal bars on a time axis.
 */
function TimelineRenderer({
  spans,
  onSpanSelect,
  selectedSpanId,
  width,
}: TimelineRendererProps): React.ReactElement {
  const maxTime = useMemo(() => {
    if (spans.length === 0) return 0;
    let max = 0;
    for (const span of spans) {
      const end = span.startTime + span.duration;
      if (end > max) max = end;
    }
    return max;
  }, [spans]);

  if (spans.length === 0) {
    return <EmptyState message="No tracing spans available" />;
  }

  const barAreaWidth = Math.max(width - 200, 100);

  return (
    <div
      data-testid="timeline-renderer"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <div
        style={{
          paddingLeft: "120px",
          marginBottom: "var(--hex-space-xs)",
        }}
      >
        <TimelineScale maxTime={maxTime} width={barAreaWidth} />
      </div>
      <div>
        {spans.map(span => (
          <TimelineRow
            key={span.id}
            span={span}
            maxTime={maxTime}
            barWidth={barAreaWidth}
            isSelected={span.id === selectedSpanId}
            onSelect={onSpanSelect}
          />
        ))}
      </div>
    </div>
  );
}

export { TimelineRenderer };
export type { TimelineRendererProps, TracingSpan };
