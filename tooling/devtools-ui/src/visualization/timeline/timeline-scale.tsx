/**
 * TimelineScale component for rendering the time axis.
 *
 * @packageDocumentation
 */

interface TimelineScaleProps {
  readonly maxTime: number;
  readonly width: number;
  readonly tickCount?: number;
}

/**
 * TimelineScale renders tick marks and labels along the time axis.
 */
function TimelineScale({ maxTime, width, tickCount = 5 }: TimelineScaleProps): React.ReactElement {
  const ticks: number[] = [];
  const step = maxTime / tickCount;
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(Math.round(step * i * 100) / 100);
  }

  return (
    <div
      data-testid="timeline-scale"
      style={{
        display: "flex",
        justifyContent: "space-between",
        width: `${width}px`,
        padding: "0 var(--hex-space-xs)",
        fontSize: "var(--hex-font-size-xs)",
        fontFamily: "var(--hex-font-mono)",
        color: "var(--hex-text-muted)",
      }}
    >
      {ticks.map(tick => (
        <span key={tick}>{tick}ms</span>
      ))}
    </div>
  );
}

export { TimelineScale };
export type { TimelineScaleProps };
