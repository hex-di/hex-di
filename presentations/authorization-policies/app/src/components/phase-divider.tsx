import type { CSSProperties, ReactNode } from "react";
import { Animate } from "./animate";

interface PhaseDividerProps {
  readonly label: string;
  readonly color: string;
}

export function PhaseDivider({ label, color }: PhaseDividerProps): ReactNode {
  return (
    <div
      className="flex items-center justify-center min-h-[80vh] w-full"
      style={{ "--phase-color": color } as CSSProperties}
    >
      <Animate variant="fade-in" duration={800}>
        <span
          className="font-mono text-5xl md:text-7xl tracking-[0.3em] uppercase text-center"
          style={{ color }}
        >
          {label}
        </span>
      </Animate>
    </div>
  );
}
