import type { ReactNode } from "react";
import { Animate } from "../components/animate";

function ShieldSVG(): ReactNode {
  return (
    <svg
      width="200"
      height="220"
      viewBox="0 0 200 220"
      fill="none"
      className="shield-glow animate-float"
    >
      <path
        d="M100 10L20 55v55c0 52 34.5 100 80 112 45.5-12 80-60 80-112V55L100 10z"
        stroke="#00F0FF"
        strokeWidth="2"
        fill="rgba(0, 240, 255, 0.04)"
      />
      <path
        d="M100 30L35 65v45c0 42 27 82 65 92 38-10 65-50 65-92V65L100 30z"
        stroke="#00F0FF"
        strokeWidth="1"
        fill="rgba(0, 240, 255, 0.06)"
        opacity="0.6"
      />
      {/* Keyhole */}
      <circle
        cx="100"
        cy="95"
        r="16"
        stroke="#00F0FF"
        strokeWidth="2"
        fill="rgba(0, 240, 255, 0.1)"
      />
      <rect
        x="95"
        y="108"
        width="10"
        height="25"
        rx="2"
        fill="rgba(0, 240, 255, 0.2)"
        stroke="#00F0FF"
        strokeWidth="1"
      />
      <circle cx="100" cy="95" r="6" fill="#00F0FF" opacity="0.7" />
      {/* Corner ticks */}
      <line x1="40" y1="50" x2="50" y2="50" stroke="#00F0FF" strokeWidth="1" opacity="0.4" />
      <line x1="40" y1="50" x2="40" y2="60" stroke="#00F0FF" strokeWidth="1" opacity="0.4" />
      <line x1="160" y1="50" x2="150" y2="50" stroke="#00F0FF" strokeWidth="1" opacity="0.4" />
      <line x1="160" y1="50" x2="160" y2="60" stroke="#00F0FF" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export function HeroSlide(): ReactNode {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center relative">
      <div className="text-center">
        <Animate variant="scale-in" duration={800} delay={200}>
          <div className="flex justify-center mb-8">
            <ShieldSVG />
          </div>
        </Animate>

        <Animate variant="fade-up" delay={350}>
          <div className="mb-4">
            <span className="font-mono text-base tracking-[0.3em] uppercase text-hex-primary/60">
              HexDI Framework //
            </span>
          </div>
        </Animate>

        <Animate variant="fade-up" delay={500}>
          <h1 className="font-display font-bold text-7xl tracking-wide mb-3">
            <span className="text-hex-text">@hex-di/</span>
            <span className="text-hex-primary text-glow-cyan">guard</span>
          </h1>
        </Animate>

        <Animate variant="fade-up" delay={650}>
          <p className="font-display text-2xl text-hex-muted tracking-wide mb-8 max-w-2xl mx-auto">
            Type-safe authorization for hexagonal architectures
          </p>
        </Animate>

        <Animate variant="fade-in" delay={800}>
          <div className="flex justify-center gap-4 flex-wrap">
            {[
              "Permission Tokens",
              "Role DAG",
              "Policy Combinators",
              "React Integration",
              "GxP Compliance",
            ].map(tag => (
              <span
                key={tag}
                className="font-mono text-sm tracking-[0.15em] uppercase px-3 py-1 border border-hex-primary/20 bg-hex-primary/5 text-hex-primary/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </Animate>

        <Animate variant="fade-in" delay={1000}>
          <div className="mt-12 font-mono text-sm tracking-[0.2em] uppercase text-hex-muted/50">
            Scroll to explore
          </div>
        </Animate>
      </div>
    </section>
  );
}
