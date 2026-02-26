import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function DevtoolsSlide(): ReactNode {
  return (
    <Section id="devtools" number={24} label="Visibility & Quality" title="DevTools Integration">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          The Guard Inspector plugs into{" "}
          <code className="text-hex-primary font-mono text-base">@hex-di/devtools</code> — giving
          developers real-time visibility into every authorization decision during development.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-up" delay={0}>
          <HudCard variant="pink">
            <span className="font-display font-semibold text-hex-pink text-lg tracking-wide block mb-3">
              Policy Tree
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              Real-time evaluation tree showing allow/deny at each node. Expand combinators to see
              which branch matched.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={100}>
          <HudCard variant="pink">
            <span className="font-display font-semibold text-hex-pink text-lg tracking-wide block mb-3">
              Port Stats
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              Per-port allow/deny/error counts. Spot misconfigured policies instantly. Latency
              percentiles.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={200}>
          <HudCard variant="pink">
            <span className="font-display font-semibold text-hex-pink text-lg tracking-wide block mb-3">
              Role Hierarchy
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              Interactive DAG visualization. See inherited permissions. Detect unintended escalation
              paths.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={300}>
          <HudCard variant="pink">
            <span className="font-display font-semibold text-hex-pink text-lg tracking-wide block mb-3">
              Decision Trace
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              Step-by-step evaluation replay. See exactly why a decision was made. Export traces for
              debugging.
            </p>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={400}>
        <HudCard>
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge">D</span>
            <span className="font-display font-semibold text-hex-primary text-lg tracking-wide">
              Unified Observability
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            The Guard Inspector plugs into{" "}
            <span className="text-hex-primary">@hex-di/devtools</span> — the same panel you use for
            DI graph inspection, flow state machines, and saga orchestration.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
