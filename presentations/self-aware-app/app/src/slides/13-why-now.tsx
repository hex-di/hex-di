import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

const convergences = [
  {
    number: "1",
    title: "Type-Level Dependency Graphs",
    description:
      "You need the graph as a first-class, introspectable data structure — not just implicit wiring. HexDI's compile-time graph validation, built on TypeScript's type system, makes this possible.",
    variant: "green" as const,
  },
  {
    number: "2",
    title: "AI Protocols That Consume Structured Data",
    description:
      "MCP (Anthropic, 2024) and A2A (Google, 2025) define how AI agents discover and interact with external systems. Without standardized protocols, self-knowledge had no consumer. Now it does.",
    variant: "default" as const,
  },
  {
    number: "3",
    title: "Ecosystem-Wide Commitment",
    description:
      "A DI container that knows about services is useful. A DI container where every library reports through the same system is transformative. This requires building the entire ecosystem with introspection as a first-class concern.",
    variant: "pink" as const,
  },
];

export function WhyNowSlide(): ReactNode {
  return (
    <Section id="why-now" number={13} label="The Vision" title="Why This Matters Now">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Three things had to converge for this vision to be achievable.{" "}
          <span className="text-hex-pink font-semibold">They just did.</span>
        </p>
      </Animate>

      <div className="space-y-5">
        {convergences.map((item, i) => (
          <Animate key={item.number} variant="fade-up" delay={200 + i * 150}>
            <HudCard variant={item.variant}>
              <div className="flex items-start gap-4">
                <span className="num-badge shrink-0">{item.number}</span>
                <div>
                  <span className="font-display font-semibold text-xl text-hex-text tracking-wide block mb-2">
                    {item.title}
                  </span>
                  <p className="font-mono text-sm text-hex-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </HudCard>
          </Animate>
        ))}
      </div>
    </Section>
  );
}
