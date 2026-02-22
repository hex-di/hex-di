import type { ReactNode } from "react";

type BadgeVariant = "cyan" | "accent" | "green" | "amber" | "pink" | "muted";

interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly children: ReactNode;
}

const styles: Record<BadgeVariant, string> = {
  cyan: "border-hex-primary/30 bg-hex-primary/8 text-hex-primary",
  accent: "border-hex-accent/30 bg-hex-accent/8 text-hex-accent",
  green: "border-hex-green/30 bg-hex-green/8 text-hex-green",
  amber: "border-hex-amber/30 bg-hex-amber/8 text-hex-amber",
  pink: "border-hex-pink/30 bg-hex-pink/8 text-hex-pink",
  muted: "border-hex-muted/30 bg-hex-muted/8 text-hex-muted",
};

export function Badge({ variant = "cyan", children }: BadgeProps): ReactNode {
  return <span className={`badge ${styles[variant]}`}>{children}</span>;
}
