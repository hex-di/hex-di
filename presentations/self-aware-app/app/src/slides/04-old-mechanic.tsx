import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function OldMechanicSlide(): ReactNode {
  return (
    <Section id="old-mechanic" number={4} label="The Insight" title="The Old Mechanic">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Thirty years ago, you bring your car to the mechanic. Something is wrong.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <HudCard variant="accent" className="mb-8">
          <div className="space-y-4">
            {[
              "Opens the hood",
              "Listens to the engine",
              "Wiggles wires",
              "Checks the oil",
              "Pattern-matches symptoms to causes",
              "Makes an educated guess",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3 font-mono text-base">
                <span className="num-badge-accent w-7 h-7 flex items-center justify-center text-xs rounded-sm border border-hex-accent/30 bg-hex-accent/8 text-hex-accent font-mono font-semibold">
                  {i + 1}
                </span>
                <span className="text-hex-muted">{step}</span>
              </div>
            ))}
          </div>
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <p className="text-hex-muted text-lg leading-relaxed mb-4 max-w-4xl">
          Three parts replaced before he finds the real issue.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={500}>
        <div className="p-5 border-l-2 border-hex-primary/40 bg-hex-primary/5">
          <p className="font-display text-xl text-hex-primary tracking-wide">
            The car is passive. It has no opinion about its own condition.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
