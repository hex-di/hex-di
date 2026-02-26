import type { ReactNode } from "react";

type BadgeVariant = "primary" | "accent" | "green" | "pink" | "teal" | "blue" | "red" | "muted";

interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly children: ReactNode;
}

const styles: Record<BadgeVariant, string> = {
  primary: "border-auth-primary/30 bg-auth-primary/8 text-auth-primary",
  accent: "border-auth-accent/30 bg-auth-accent/8 text-auth-accent",
  green: "border-auth-green/30 bg-auth-green/8 text-auth-green",
  pink: "border-auth-pink/30 bg-auth-pink/8 text-auth-pink",
  teal: "border-auth-teal/30 bg-auth-teal/8 text-auth-teal",
  blue: "border-auth-blue/30 bg-auth-blue/8 text-auth-blue",
  red: "border-auth-red/30 bg-auth-red/8 text-auth-red",
  muted: "border-auth-muted/30 bg-auth-muted/8 text-auth-muted",
};

export function Badge({ variant = "primary", children }: BadgeProps): ReactNode {
  return <span className={`badge ${styles[variant]}`}>{children}</span>;
}
