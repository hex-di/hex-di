import type { CSSProperties, ReactNode } from "react";
import { useInView } from "../hooks/use-in-view";

type Variant = "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-in";

interface AnimateProps {
  readonly variant: Variant;
  readonly delay?: number;
  readonly duration?: number;
  readonly className?: string;
  readonly children: ReactNode;
}

const animationClass: Record<Variant, string> = {
  "fade-up": "animate-fade-up",
  "fade-in": "animate-fade-in",
  "slide-left": "animate-slide-left",
  "slide-right": "animate-slide-right",
  "scale-in": "animate-scale-in",
};

export function Animate({
  variant,
  delay = 0,
  duration = 600,
  className = "",
  children,
}: AnimateProps): ReactNode {
  const { ref, isInView } = useInView();

  const style: CSSProperties = isInView
    ? { animationDelay: `${delay}ms`, animationDuration: `${duration}ms` }
    : {};

  return (
    <div
      ref={ref}
      className={isInView ? `${animationClass[variant]} ${className}` : `opacity-0 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
