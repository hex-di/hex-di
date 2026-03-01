import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

const packages = [
  {
    name: "graph",
    knows: "Ports, adapters, dependency edges, topology, complexity score",
    variant: "green" as const,
  },
  {
    name: "runtime",
    knows: "Instantiated services, active scopes, scope tree, lifecycle phases",
    variant: "green" as const,
  },
  {
    name: "tracing",
    knows: "Every resolution as a structured span — timing, parent-child, errors",
    variant: "default" as const,
  },
  {
    name: "store",
    knows: "Reactive values, state transitions, subscriber graph",
    variant: "default" as const,
  },
  {
    name: "query",
    knows: "Cache entries, freshness, in-flight requests, deduplication state",
    variant: "default" as const,
  },
  {
    name: "saga",
    knows: "Running workflows, step progress, compensation chains",
    variant: "amber" as const,
  },
  {
    name: "flow",
    knows: "Active state machines, valid transitions, event queues",
    variant: "amber" as const,
  },
  {
    name: "logger",
    knows: "Log entry counts, error rate, active handlers, sampling config",
    variant: "default" as const,
  },
  {
    name: "guard",
    knows: "Active policies, authorization decisions, audit trail",
    variant: "pink" as const,
  },
  {
    name: "agent",
    knows: "Available AI tools, LLM provider config, conversation state",
    variant: "pink" as const,
  },
];

export function EcosystemSlide(): ReactNode {
  return (
    <Section id="ecosystem" number={8} label="The Architecture" title="The Ecosystem">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          HexDI is not a container alone — it&apos;s a{" "}
          <span className="text-hex-green font-semibold">complete ecosystem</span> where every
          library is designed to report its state back to the central system.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map((pkg, i) => (
          <Animate key={pkg.name} variant="fade-up" delay={150 + i * 50}>
            <HudCard variant={pkg.variant} className="h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-hex-muted">@hex-di/</span>
                <span className="font-display font-semibold text-hex-primary text-lg tracking-wide">
                  {pkg.name}
                </span>
              </div>
              <p className="font-mono text-xs text-hex-muted leading-relaxed">{pkg.knows}</p>
            </HudCard>
          </Animate>
        ))}
      </div>

      <Animate variant="fade-in" delay={700}>
        <div className="mt-8 p-5 border-l-2 border-hex-green/40 bg-hex-green/5">
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            All of this converges at the container. No single library has the full picture. The
            container, sitting at the center,{" "}
            <span className="text-hex-green font-semibold">sees everything</span>.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
