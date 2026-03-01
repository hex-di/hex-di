import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

const actors = [
  {
    name: "Developer",
    color: "accent" as const,
    knows: ["Architecture", "Intent", "Dependencies", "Design decisions"],
  },
  {
    name: "Ops Platform",
    color: "amber" as const,
    knows: ["CPU & memory", "Network", "Restarts", "Container health"],
  },
  {
    name: "Monitoring",
    color: "green" as const,
    knows: ["Metrics", "Error rates", "Latency percentiles", "Dashboards"],
  },
];

export function ThreeActorsSlide(): ReactNode {
  return (
    <Section id="three-actors" number={3} label="The Problem" title="Three Actors, Zero Awareness">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Three sophisticated actors each hold a fragment of the truth.{" "}
          <span className="text-hex-accent">The application itself holds none of it.</span>
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {actors.map((actor, i) => (
          <Animate key={actor.name} variant="fade-up" delay={200 + i * 100}>
            <HudCard variant={actor.color} className="h-full">
              <span className="font-display font-semibold text-xl tracking-wide block mb-4">
                {actor.name}
              </span>
              <div className="space-y-2">
                {actor.knows.map(item => (
                  <div key={item} className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-hex-primary/50">&#9656;</span>
                    <span className="text-hex-muted">{item}</span>
                  </div>
                ))}
              </div>
            </HudCard>
          </Animate>
        ))}
      </div>

      <Animate variant="scale-in" delay={600}>
        <HudCard variant="pink" className="text-center py-8">
          <span className="font-display font-bold text-3xl tracking-wide text-hex-pink text-glow-pink">
            The Application
          </span>
          <p className="font-mono text-lg text-hex-muted mt-3">
            Knows: <span className="text-hex-pink">nothing about itself</span>
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
