import { useState, useCallback } from "react";
import styles from "./railway-diagram.module.css";

interface RailwayStep {
  readonly label: string;
  readonly x: number;
  readonly track: "ok" | "err" | "switch";
}

const STEPS: readonly RailwayStep[] = [
  { label: "ok(5)", x: 60, track: "ok" },
  { label: "map(×2)", x: 210, track: "ok" },
  { label: "andThen", x: 370, track: "switch" },
  { label: "mapErr", x: 530, track: "err" },
  { label: "orElse", x: 690, track: "switch" },
  { label: "result", x: 840, track: "ok" },
];

interface Scenario {
  readonly name: string;
  readonly states: readonly { readonly value: string; readonly isOk: boolean }[];
}

const SCENARIOS: readonly Scenario[] = [
  {
    name: "Happy Path",
    states: [
      { value: "Ok(5)", isOk: true },
      { value: "Ok(10)", isOk: true },
      { value: "Ok(10)", isOk: true },
      { value: "—", isOk: true },
      { value: "—", isOk: true },
      { value: "Ok(10)", isOk: true },
    ],
  },
  {
    name: "Error Recovery",
    states: [
      { value: "Ok(5)", isOk: true },
      { value: "Ok(10)", isOk: true },
      { value: 'Err("Invalid")', isOk: false },
      { value: 'Err("Validation")', isOk: false },
      { value: "Ok(0)", isOk: true },
      { value: "Ok(0)", isOk: true },
    ],
  },
];

const OK_Y = 70;
const ERR_Y = 150;
const TRACK_COLOR_OK = "#079455";
const TRACK_COLOR_ERR = "#d72b3f";

export function RailwayDiagram(): React.JSX.Element {
  const [scenario, setScenario] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const current = SCENARIOS[scenario];

  const handleNext = useCallback(() => {
    setActiveStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
  }, []);

  const handlePrev = useCallback(() => {
    setActiveStep(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
  }, []);

  const toggleScenario = useCallback(() => {
    setScenario(prev => (prev + 1) % SCENARIOS.length);
    setActiveStep(0);
  }, []);

  function getTrackY(step: number): number {
    if (!current.states[step]) return OK_Y;
    return current.states[step].isOk ? OK_Y : ERR_Y;
  }

  const state = current.states[activeStep];

  return (
    <div className={styles.container}>
      <div className={styles.svgArea}>
        <svg viewBox="0 0 900 220" width="100%" height="100%" style={{ maxHeight: 220 }}>
          {/* OK track */}
          <line
            x1="30"
            y1={OK_Y}
            x2="870"
            y2={OK_Y}
            stroke={TRACK_COLOR_OK}
            strokeWidth="3"
            opacity="0.3"
          />
          <text x="12" y={OK_Y + 5} fill={TRACK_COLOR_OK} fontSize="12" fontWeight="700">
            Ok
          </text>

          {/* Err track */}
          <line
            x1="30"
            y1={ERR_Y}
            x2="870"
            y2={ERR_Y}
            stroke={TRACK_COLOR_ERR}
            strokeWidth="3"
            opacity="0.3"
          />
          <text x="10" y={ERR_Y + 5} fill={TRACK_COLOR_ERR} fontSize="12" fontWeight="700">
            Err
          </text>

          {/* Track connections between steps */}
          {STEPS.map((step, i) => {
            if (i === 0) return null;
            const prevX = STEPS[i - 1].x;
            const fromY = i <= activeStep ? getTrackY(i - 1) : OK_Y;
            const toY = i <= activeStep ? getTrackY(i) : OK_Y;
            const isActive = i <= activeStep;
            const color = toY === ERR_Y ? TRACK_COLOR_ERR : TRACK_COLOR_OK;

            return (
              <line
                key={`conn-${i}`}
                x1={prevX + 40}
                y1={fromY}
                x2={step.x - 40}
                y2={toY}
                stroke={color}
                strokeWidth={isActive ? 3 : 2}
                opacity={isActive ? 1 : 0.15}
                strokeDasharray={fromY !== toY ? "6 4" : "none"}
              />
            );
          })}

          {/* Step nodes */}
          {STEPS.map((step, i) => {
            const isActive = i <= activeStep;
            const isCurrent = i === activeStep;
            const y = i <= activeStep ? getTrackY(i) : OK_Y;
            const isOk = i <= activeStep ? current.states[i].isOk : true;
            const color = isOk ? TRACK_COLOR_OK : TRACK_COLOR_ERR;

            return (
              <g key={step.label}>
                <rect
                  x={step.x - 38}
                  y={y - 18}
                  width={76}
                  height={36}
                  rx={6}
                  fill={isCurrent ? color : isActive ? `${color}22` : "#f5f5f5"}
                  stroke={isActive ? color : "#c9c9c9"}
                  strokeWidth={isCurrent ? 2 : 1}
                />
                <text
                  x={step.x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={isCurrent ? "#fff" : isActive ? color : "#757575"}
                  fontSize="13"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={isCurrent ? 700 : 400}
                >
                  {step.label}
                </text>
              </g>
            );
          })}

          {/* Animated value dot */}
          <circle
            cx={STEPS[activeStep].x}
            cy={getTrackY(activeStep)}
            r={8}
            fill={state.isOk ? TRACK_COLOR_OK : TRACK_COLOR_ERR}
            opacity={0.9}
          >
            <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      <div className={state.isOk ? styles.okState : styles.errState}>{state.value}</div>

      <div className={styles.controls}>
        <button className={styles.controlButton} onClick={handlePrev}>
          ← Step
        </button>
        <button className={styles.controlButton} onClick={handleReset}>
          Reset
        </button>
        <button className={styles.controlButton} onClick={handleNext}>
          Step →
        </button>
        <button
          className={scenario === 0 ? styles.controlButtonActive : styles.controlButton}
          onClick={toggleScenario}
        >
          {current.name}
        </button>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDotOk} /> Success track
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotErr} /> Error track
        </span>
      </div>
    </div>
  );
}
