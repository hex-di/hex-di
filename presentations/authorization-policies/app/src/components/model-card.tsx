import type { ReactNode } from "react";
import { HudCard } from "./hud-card";

type CardVariant = "default" | "accent" | "green" | "pink" | "teal" | "blue" | "red";

interface ModelCardProps {
  readonly name: string;
  readonly icon: string;
  readonly variant?: CardVariant;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
}

export function ModelCard({
  name,
  icon,
  variant = "default",
  strengths,
  weaknesses,
}: ModelCardProps): ReactNode {
  return (
    <HudCard variant={variant}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-display font-bold text-xl text-auth-text">{name}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-mono text-xs tracking-wider uppercase text-auth-green mb-2">
            Strengths
          </h4>
          <ul className="space-y-1">
            {strengths.map(s => (
              <li key={s} className="text-sm text-auth-text/80 flex items-start gap-1.5">
                <span className="text-auth-green mt-0.5 shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs tracking-wider uppercase text-auth-red mb-2">
            Weaknesses
          </h4>
          <ul className="space-y-1">
            {weaknesses.map(w => (
              <li key={w} className="text-sm text-auth-text/80 flex items-start gap-1.5">
                <span className="text-auth-red mt-0.5 shrink-0">-</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HudCard>
  );
}
