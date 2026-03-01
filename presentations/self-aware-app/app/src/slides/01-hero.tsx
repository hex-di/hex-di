import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Badge } from "../components/badge";

function HexagonSVG(): ReactNode {
  return (
    <svg
      width="200"
      height="220"
      viewBox="0 0 200 220"
      fill="none"
      className="hexagon-glow animate-float"
    >
      {/* Outer hexagon */}
      <path
        d="M100 10L180 55V165L100 210L20 165V55L100 10Z"
        stroke="#00F0FF"
        strokeWidth="2"
        fill="rgba(0, 240, 255, 0.04)"
      />
      {/* Inner hexagon */}
      <path
        d="M100 40L155 70V140L100 170L45 140V70L100 40Z"
        stroke="#FF5E00"
        strokeWidth="1"
        fill="rgba(255, 94, 0, 0.03)"
        opacity="0.6"
      />
      {/* Neural network nodes */}
      <circle cx="100" cy="60" r="6" fill="#00F0FF" opacity="0.8" />
      <circle cx="60" cy="100" r="5" fill="#A6E22E" opacity="0.7" />
      <circle cx="140" cy="100" r="5" fill="#A6E22E" opacity="0.7" />
      <circle cx="75" cy="150" r="5" fill="#FFB020" opacity="0.7" />
      <circle cx="125" cy="150" r="5" fill="#FFB020" opacity="0.7" />
      {/* Center hub */}
      <circle
        cx="100"
        cy="110"
        r="10"
        fill="rgba(0, 240, 255, 0.15)"
        stroke="#00F0FF"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="110" r="4" fill="#00F0FF" opacity="0.9" />
      {/* Connection lines */}
      <line x1="100" y1="60" x2="100" y2="100" stroke="#00F0FF" strokeWidth="0.8" opacity="0.4" />
      <line x1="60" y1="100" x2="90" y2="110" stroke="#A6E22E" strokeWidth="0.8" opacity="0.4" />
      <line x1="140" y1="100" x2="110" y2="110" stroke="#A6E22E" strokeWidth="0.8" opacity="0.4" />
      <line x1="75" y1="150" x2="95" y2="115" stroke="#FFB020" strokeWidth="0.8" opacity="0.4" />
      <line x1="125" y1="150" x2="105" y2="115" stroke="#FFB020" strokeWidth="0.8" opacity="0.4" />
      <line x1="60" y1="100" x2="75" y2="150" stroke="#586E85" strokeWidth="0.5" opacity="0.3" />
      <line x1="140" y1="100" x2="125" y2="150" stroke="#586E85" strokeWidth="0.5" opacity="0.3" />
      {/* Corner ticks */}
      <line x1="30" y1="50" x2="40" y2="50" stroke="#00F0FF" strokeWidth="1" opacity="0.3" />
      <line x1="30" y1="50" x2="30" y2="60" stroke="#00F0FF" strokeWidth="1" opacity="0.3" />
      <line x1="170" y1="50" x2="160" y2="50" stroke="#00F0FF" strokeWidth="1" opacity="0.3" />
      <line x1="170" y1="50" x2="170" y2="60" stroke="#00F0FF" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function HeroSlide(): ReactNode {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center relative">
      <div className="text-center">
        <Animate variant="scale-in" duration={800} delay={200}>
          <div className="flex justify-center mb-8">
            <HexagonSVG />
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
            <span className="text-hex-text">The </span>
            <span className="text-hex-primary text-glow-cyan">Self-Aware</span>
            <span className="text-hex-text"> Application</span>
          </h1>
        </Animate>

        <Animate variant="fade-up" delay={650}>
          <p className="font-display text-xl text-hex-muted tracking-wide mb-8 max-w-3xl mx-auto leading-relaxed">
            Your application is sophisticated enough to handle millions of requests
            <span className="text-hex-accent">
              {" "}
              — but it cannot answer a single question about itself.
            </span>
          </p>
        </Animate>

        <Animate variant="fade-in" delay={800}>
          <div className="flex justify-center gap-4 flex-wrap">
            <Badge variant="cyan">10 Packages</Badge>
            <Badge variant="accent">3 Layers</Badge>
            <Badge variant="green">MCP + A2A</Badge>
            <Badge variant="amber">Zero Guessing</Badge>
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
