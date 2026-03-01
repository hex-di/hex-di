import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function SoftwareIsBlindSlide(): ReactNode {
  return (
    <Section id="software-is-blind" number={2} label="The Problem" title="Software Is Blind">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Every production application running today contains a wealth of structural knowledge
          scattered across files, configs, runtime memory, and log streams.{" "}
          <span className="text-hex-accent">None of it is cohesive. None of it is queryable.</span>{" "}
          The application itself doesn&apos;t know what it is.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          When something breaks, you reconstruct the picture from artifacts:
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {[
          {
            icon: "\u{1F4C4}",
            label: "Read source files",
            detail: "to understand the architecture",
          },
          { icon: "\u{1F4DC}", label: "Parse logs", detail: "to trace what happened" },
          { icon: "\u{1F9E0}", label: "Inspect memory dumps", detail: "to find the state" },
          { icon: "\u{1F4AC}", label: "Question colleagues", detail: "to understand the intent" },
        ].map(item => (
          <Animate key={item.label} variant="fade-up" delay={300}>
            <HudCard variant="accent">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <span className="font-display font-semibold text-hex-accent text-lg tracking-wide block">
                    {item.label}
                  </span>
                  <span className="font-mono text-sm text-hex-muted">{item.detail}</span>
                </div>
              </div>
            </HudCard>
          </Animate>
        ))}
      </div>

      <Animate variant="fade-in" delay={500}>
        <div className="mt-6 p-5 border-l-2 border-hex-accent/40 bg-hex-accent/5">
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            This isn&apos;t a tooling problem. It&apos;s a{" "}
            <span className="text-hex-accent font-semibold">foundational</span> problem. The
            application is a passive subject being examined from the outside. It was never designed
            to observe itself.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
