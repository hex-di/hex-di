import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function ClosingSlide(): ReactNode {
  return (
    <Section id="closing" number={25} label="Visibility & Quality" title="Authorization, Visible.">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          A side-by-side summary of what changes when DaVinci adopts{" "}
          <code className="text-hex-primary font-mono text-base">@hex-di/guard</code>.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <Animate variant="fade-up">
          <HudCard variant="accent">
            <span className="font-display font-semibold text-hex-accent text-lg tracking-wide block mb-4">
              Before
            </span>
            <div className="space-y-3 font-mono text-base">
              {[
                "40+ scattered useUserStore checks",
                "No audit trail",
                "No type safety — plain booleans",
                "No route guards — URL bypass",
                "Ad-hoc brand scoping",
                "No testing infrastructure",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-red-500/70 shrink-0">&#9656;</span>
                  <span className="text-hex-muted">{item}</span>
                </div>
              ))}
            </div>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={100}>
          <HudCard>
            <span className="font-display font-semibold text-hex-primary text-lg tracking-wide block mb-4">
              After
            </span>
            <div className="space-y-3 font-mono text-base">
              {[
                "Centralized policy registry",
                "Full audit trail with hash chain",
                "Branded permission types",
                "Route-level GuardedRoute",
                "Declarative brand policies",
                "Property-based policy testing",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-hex-green shrink-0">&#9656;</span>
                  <span className="text-hex-muted">{item}</span>
                </div>
              ))}
            </div>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="fade-in" delay={200}>
        <CodeBlock title="Get Started">
          <span className="syn-function">pnpm</span> <span className="syn-keyword">add</span>{" "}
          <span className="syn-string">@hex-di/guard</span>
        </CodeBlock>
      </Animate>

      <Animate variant="scale-in" delay={400}>
        <div className="text-center pt-12 pb-16">
          <p className="font-display text-4xl font-bold tracking-wide">
            <span className="text-hex-text">Authorization, </span>
            <span className="text-hex-primary text-glow-cyan">visible.</span>
          </p>
        </div>
      </Animate>
    </Section>
  );
}
