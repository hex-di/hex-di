import type { ReactNode } from "react";
import { HudCard } from "./hud-card";
import { Badge } from "./badge";

type BadgeVariant = "primary" | "accent" | "green" | "pink" | "teal" | "blue" | "red" | "muted";

interface LibraryCardProps {
  readonly name: string;
  readonly stars: string;
  readonly language: string;
  readonly models: readonly { readonly label: string; readonly variant: BadgeVariant }[];
  readonly description: string;
  readonly highlight?: string;
}

export function LibraryCard({
  name,
  stars,
  language,
  models,
  description,
  highlight,
}: LibraryCardProps): ReactNode {
  return (
    <HudCard>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display font-bold text-lg text-auth-text">{name}</h3>
        <span className="font-mono text-xs text-auth-accent flex items-center gap-1">
          <span>&#9733;</span> {stars}
        </span>
      </div>
      <div className="font-mono text-xs text-auth-muted mb-3">{language}</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {models.map(m => (
          <Badge key={m.label} variant={m.variant}>
            {m.label}
          </Badge>
        ))}
      </div>
      <p className="text-sm text-auth-text/70 leading-relaxed">{description}</p>
      {highlight && (
        <div className="mt-3 text-xs font-mono text-auth-primary/80 border-t border-auth-primary/10 pt-2">
          {highlight}
        </div>
      )}
    </HudCard>
  );
}
