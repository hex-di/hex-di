import type { ReactNode } from "react";

interface ProgressBarProps {
  readonly label: string;
  readonly percentage: number;
  readonly color: string;
  readonly status: string;
  readonly description: string;
}

export function ProgressBar({
  label,
  percentage,
  color,
  status,
  description,
}: ProgressBarProps): ReactNode {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-semibold text-lg tracking-wide" style={{ color }}>
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-hex-muted">{percentage}%</span>
          <span
            className="font-mono text-xs tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border"
            style={{
              color,
              borderColor: `${color}40`,
              background: `${color}10`,
            }}
          >
            {status}
          </span>
        </div>
      </div>
      <div className="h-2 bg-hex-surface rounded-sm overflow-hidden mb-1.5">
        <div
          className="h-full rounded-sm transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      <p className="font-mono text-xs text-hex-muted leading-relaxed">{description}</p>
    </div>
  );
}
