import type { ReactNode } from "react";
import { Animate } from "./animate";

interface TimelineEntry {
  readonly year: string;
  readonly title: string;
  readonly description: string;
  readonly color?: string;
}

interface TimelineProps {
  readonly entries: readonly TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps): ReactNode {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-auth-primary/40 via-auth-accent/30 to-auth-teal/40" />
      {entries.map((entry, i) => (
        <Animate key={entry.year} variant="slide-left" delay={i * 100}>
          <div className="relative mb-8 last:mb-0">
            <div
              className="absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2"
              style={{
                borderColor: entry.color ?? "#A78BFA",
                background: `${entry.color ?? "#A78BFA"}22`,
              }}
            />
            <div
              className="font-mono text-xs tracking-[0.15em] uppercase mb-1"
              style={{ color: entry.color ?? "#A78BFA" }}
            >
              {entry.year}
            </div>
            <div className="font-display font-semibold text-lg text-auth-text">{entry.title}</div>
            <div className="text-sm text-auth-muted mt-1 leading-relaxed">{entry.description}</div>
          </div>
        </Animate>
      ))}
    </div>
  );
}
