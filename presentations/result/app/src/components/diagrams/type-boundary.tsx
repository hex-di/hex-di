import styles from "./type-boundary.module.css";

interface FlowStep {
  readonly label: string;
  readonly x: number;
  readonly typed: boolean;
}

const STEPS: readonly FlowStep[] = [
  { label: "function", x: 80, typed: true },
  { label: "logic", x: 240, typed: true },
  { label: "throw", x: 400, typed: false },
  { label: "catch", x: 560, typed: false },
  { label: "handler", x: 720, typed: false },
];

const Y = 80;
const COLOR_TYPED = "#079455";
const COLOR_UNTYPED = "#d72b3f";

export function TypeBoundary(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.svgArea}>
        <svg viewBox="0 0 800 160" width="100%" height="100%" style={{ maxHeight: 160 }}>
          {/* Connection lines */}
          {STEPS.map((step, i) => {
            if (i === 0) return null;
            const prev = STEPS[i - 1];
            const isBoundary = prev.typed && !step.typed;
            const color = step.typed ? COLOR_TYPED : COLOR_UNTYPED;

            return (
              <line
                key={`line-${step.label}`}
                x1={prev.x + 50}
                y1={Y}
                x2={step.x - 50}
                y2={Y}
                stroke={color}
                strokeWidth={3}
                strokeDasharray={step.typed ? "none" : "8 5"}
                opacity={isBoundary ? 1 : 0.8}
              />
            );
          })}

          {/* Boundary marker */}
          <line
            x1={320}
            y1={Y - 40}
            x2={320}
            y2={Y + 40}
            stroke={COLOR_UNTYPED}
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.6}
          />
          <text
            x={320}
            y={Y + 58}
            textAnchor="middle"
            fill={COLOR_UNTYPED}
            fontSize="11"
            fontWeight="600"
            fontFamily="Work Sans, sans-serif"
          >
            type boundary
          </text>

          {/* Step nodes */}
          {STEPS.map(step => {
            const color = step.typed ? COLOR_TYPED : COLOR_UNTYPED;
            return (
              <g key={step.label}>
                <rect
                  x={step.x - 44}
                  y={Y - 22}
                  width={88}
                  height={44}
                  rx={8}
                  fill={`${color}15`}
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={step.x}
                  y={Y + 5}
                  textAnchor="middle"
                  fill={color}
                  fontSize="14"
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {step.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: COLOR_TYPED }} />
          Typed — compiler verifies
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendLine}
            style={{
              background: `repeating-linear-gradient(90deg, ${COLOR_UNTYPED} 0 8px, transparent 8px 13px)`,
            }}
          />
          Untyped — type info lost
        </span>
      </div>
    </div>
  );
}
