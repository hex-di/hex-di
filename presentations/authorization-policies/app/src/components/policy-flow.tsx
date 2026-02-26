import type { ReactNode } from "react";
import { Animate } from "./animate";

interface FlowStep {
  readonly label: string;
  readonly sublabel?: string;
  readonly color: string;
}

interface PolicyFlowProps {
  readonly steps: readonly FlowStep[];
}

export function PolicyFlow({ steps }: PolicyFlowProps): ReactNode {
  return (
    <Animate variant="fade-up">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className="border px-4 py-3 rounded-sm text-center min-w-[100px]"
              style={{
                borderColor: `${step.color}66`,
                background: `${step.color}11`,
              }}
            >
              <div className="font-mono text-sm font-medium" style={{ color: step.color }}>
                {step.label}
              </div>
              {step.sublabel && <div className="text-xs text-auth-muted mt-1">{step.sublabel}</div>}
            </div>
            {i < steps.length - 1 && (
              <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
                <path
                  d="M0 8h18M14 3l5 5-5 5"
                  stroke="#6B6085"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </Animate>
  );
}
