import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";

export function ClosingSlide(): ReactNode {
  return (
    <Section id="closing" number={16} label="The Vision" title="The Nervous System">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          The DI container — the one component that touches everything — becomes the nervous system
          that makes the application aware of itself.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <div className="p-6 border border-hex-primary/15 bg-hex-primary/5 rounded-sm mb-8 max-w-4xl">
          <p className="font-mono text-base text-hex-muted leading-relaxed italic">
            &quot;Every library in the ecosystem isn&apos;t just doing its job — it&apos;s also
            reporting what it knows to a central queryable system. The DI container stops being
            plumbing and becomes the application&apos;s nervous system.&quot;
          </p>
        </div>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <div className="space-y-4 max-w-4xl mb-10">
          <p className="text-hex-muted text-lg leading-relaxed">
            Old cars required mechanics who worked from the outside in, reading symptoms and
            guessing at causes.
          </p>
          <p className="text-hex-muted text-lg leading-relaxed">
            New cars have OBD-II ports that report their own state in real time, because
            self-awareness is built into the architecture.
          </p>
        </div>
      </Animate>

      <Animate variant="scale-in" delay={600}>
        <div className="text-center pt-4 pb-16">
          <p className="font-display text-4xl font-bold tracking-wide mb-4">
            <span className="text-hex-primary text-glow-cyan">HexDI</span>
            <span className="text-hex-text"> builds applications like </span>
            <span className="text-hex-accent text-glow-accent">new cars</span>
            <span className="text-hex-text">.</span>
          </p>
          <p className="font-display text-xl text-hex-muted tracking-wide">
            Not instrumented from the outside.{" "}
            <span className="text-hex-pink text-glow-pink">Self-aware from the foundation.</span>
          </p>
        </div>
      </Animate>
    </Section>
  );
}
