import type { ReactNode } from "react";
import { Section } from "../components/section";
import { ProgressBar } from "../components/progress-bar";
import { Animate } from "../components/animate";

const phases = [
  {
    label: "Phase 1: PLUMBING",
    percentage: 100,
    color: "#A6E22E",
    status: "DONE",
    description:
      "Container wires services. Type-safe. Compile-time validated. Ports, adapters, lifetimes, scopes, error handling.",
  },
  {
    label: "Phase 2: AWARENESS",
    percentage: 100,
    color: "#00F0FF",
    status: "DONE",
    description:
      "Container knows itself. Graph inspection, runtime snapshots, resolution tracing, Inspector API.",
  },
  {
    label: "Phase 3: REPORTING",
    percentage: 90,
    color: "#FFB020",
    status: "IN PROGRESS",
    description:
      "Every library reports what it knows. Store, query, saga, flow, logger, tracing — all feeding back. The critical convergence point.",
  },
  {
    label: "Phase 4: COMMUNICATION",
    percentage: 40,
    color: "#FF5E00",
    status: "IN PROGRESS",
    description:
      "The application speaks to the outside world. MCP server, A2A agent card, OTel export, REST diagnostics, DevTools dashboard.",
  },
  {
    label: "Phase 5: AUTONOMY",
    percentage: 0,
    color: "#F92672",
    status: "PLANNED",
    description:
      "The application acts on its own knowledge. Auto-healing via saga compensations. Auto-optimization from trace data. MAPE-K loop closes.",
  },
];

export function RoadmapSlide(): ReactNode {
  return (
    <Section id="roadmap" number={12} label="The Vision" title="Five Phases to Consciousness">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          From plumbing to autonomy — the roadmap from invisible infrastructure to self-aware
          application.
        </p>
      </Animate>

      <div className="max-w-3xl">
        {phases.map((phase, i) => (
          <Animate key={phase.label} variant="fade-up" delay={200 + i * 100}>
            <ProgressBar
              label={phase.label}
              percentage={phase.percentage}
              color={phase.color}
              status={phase.status}
              description={phase.description}
            />
          </Animate>
        ))}
      </div>

      <Animate variant="fade-in" delay={800}>
        <div className="mt-6 p-5 border-l-2 border-hex-primary/40 bg-hex-primary/5">
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Phases 1 and 2 are{" "}
            <span className="text-hex-green font-semibold">
              fully complete and production-ready
            </span>
            . Phase 3 is 90% complete. Phase 4 has OTel export working, with MCP and A2A coming
            next.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
