import type { ReactNode } from "react";
import { Section } from "../components/section";
import { LayerDiagram } from "../components/layer-diagram";
import { Animate } from "../components/animate";

export function ThreeLayersSlide(): ReactNode {
  return (
    <Section
      id="three-layers"
      number={9}
      label="The Architecture"
      title="Three Layers of Self-Knowledge"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          A self-aware HexDI application maintains a living model of itself across three layers:
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <LayerDiagram />
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <Animate variant="fade-up" delay={400}>
          <div className="p-4 border-l-2 border-hex-green/40 bg-hex-green/5">
            <span className="font-display font-semibold text-hex-green tracking-wide block mb-1">
              Layer 1 — DNA
            </span>
            <p className="font-mono text-xs text-hex-muted leading-relaxed">
              Known at compile time, validated before a line runs.
            </p>
          </div>
        </Animate>

        <Animate variant="fade-up" delay={500}>
          <div className="p-4 border-l-2 border-hex-amber/40 bg-hex-amber/5">
            <span className="font-display font-semibold text-hex-amber tracking-wide block mb-1">
              Layer 2 — Condition
            </span>
            <p className="font-mono text-xs text-hex-muted leading-relaxed">
              Continuously updated as services resolve, scopes are created, state changes.
            </p>
          </div>
        </Animate>

        <Animate variant="fade-up" delay={600}>
          <div className="p-4 border-l-2 border-hex-pink/40 bg-hex-pink/5">
            <span className="font-display font-semibold text-hex-pink tracking-wide block mb-1">
              Layer 3 — Memory
            </span>
            <p className="font-mono text-xs text-hex-muted leading-relaxed">
              The timeline of everything that happened, in what order, how long it took.
            </p>
          </div>
        </Animate>
      </div>

      <Animate variant="fade-in" delay={700}>
        <div className="mt-8 text-center">
          <p className="font-display text-xl text-hex-primary tracking-wide">
            Three layers together form a{" "}
            <span className="text-glow-cyan font-semibold">
              complete, queryable model of the running application
            </span>
            .
          </p>
        </div>
      </Animate>
    </Section>
  );
}
