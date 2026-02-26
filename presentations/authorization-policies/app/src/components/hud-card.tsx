import type { ReactNode } from "react";

type Variant = "default" | "accent" | "green" | "pink" | "teal" | "blue" | "red";

interface HudCardProps {
  readonly variant?: Variant;
  readonly className?: string;
  readonly children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  default: "",
  accent: "hud-card-accent",
  green: "hud-card-green",
  pink: "hud-card-pink",
  teal: "hud-card-teal",
  blue: "hud-card-blue",
  red: "hud-card-red",
};

export function HudCard({
  variant = "default",
  className = "",
  children,
}: HudCardProps): ReactNode {
  return <div className={`hud-card ${variantClass[variant]} p-6 ${className}`}>{children}</div>;
}
