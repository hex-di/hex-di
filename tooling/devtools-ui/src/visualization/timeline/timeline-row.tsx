/**
 * TimelineRow component for rendering a single span bar.
 *
 * @packageDocumentation
 */

interface TracingSpan {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly parentId?: string;
  readonly status: "ok" | "error";
  readonly depth: number;
}

interface TimelineRowProps {
  readonly span: TracingSpan;
  readonly maxTime: number;
  readonly barWidth: number;
  readonly isSelected: boolean;
  readonly onSelect?: (spanId: string) => void;
}

/**
 * TimelineRow renders a horizontal bar representing a tracing span.
 */
function TimelineRow({
  span,
  maxTime,
  barWidth,
  isSelected,
  onSelect,
}: TimelineRowProps): React.ReactElement {
  const startPercent = maxTime > 0 ? (span.startTime / maxTime) * 100 : 0;
  const widthPercent = maxTime > 0 ? (span.duration / maxTime) * 100 : 0;
  const barColor = span.status === "error" ? "var(--hex-error)" : "var(--hex-accent)";

  return (
    <div
      data-testid={`timeline-row-${span.id}`}
      onClick={() => onSelect?.(span.id)}
      style={{
        display: "flex",
        alignItems: "center",
        paddingLeft: `${span.depth * 16}px`,
        paddingTop: "2px",
        paddingBottom: "2px",
        cursor: "pointer",
        backgroundColor: isSelected ? "var(--hex-bg-active)" : "transparent",
      }}
    >
      <span
        style={{
          width: "120px",
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "var(--hex-font-mono)",
          fontSize: "var(--hex-font-size-sm)",
          color: "var(--hex-text-primary)",
          paddingRight: "var(--hex-space-sm)",
        }}
      >
        {span.name}
      </span>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "16px",
          backgroundColor: "var(--hex-bg-tertiary)",
          borderRadius: "var(--hex-radius-sm)",
        }}
      >
        <div
          data-testid={`timeline-bar-${span.id}`}
          style={{
            position: "absolute",
            left: `${startPercent}%`,
            width: `${Math.max(widthPercent, 0.5)}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: "var(--hex-radius-sm)",
            maxWidth: `${barWidth}px`,
          }}
        />
      </div>
      <span
        style={{
          width: "60px",
          flexShrink: 0,
          textAlign: "right",
          fontFamily: "var(--hex-font-mono)",
          fontSize: "var(--hex-font-size-xs)",
          color: "var(--hex-text-secondary)",
          paddingLeft: "var(--hex-space-xs)",
        }}
      >
        {span.duration.toFixed(1)}ms
      </span>
    </div>
  );
}

export { TimelineRow };
export type { TimelineRowProps, TracingSpan };
