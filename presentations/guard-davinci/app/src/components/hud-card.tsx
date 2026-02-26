import type { ReactNode } from "react";

type Variant = "default" | "accent" | "green" | "amber" | "pink";

interface HudCardProps {
  readonly variant?: Variant;
  readonly className?: string;
  readonly children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  default: "",
  accent: "hud-card-accent",
  green: "hud-card-green",
  amber: "hud-card-amber",
  pink: "hud-card-pink",
};

export function HudCard({
  variant = "default",
  className = "",
  children,
}: HudCardProps): ReactNode {
  return <div className={`hud-card ${variantClass[variant]} p-6 ${className}`}>{children}</div>;
}
