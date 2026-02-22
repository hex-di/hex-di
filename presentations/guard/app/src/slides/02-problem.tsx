import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";

function SiloCard({
  title,
  icon,
  items,
  color,
}: {
  readonly title: string;
  readonly icon: string;
  readonly items: readonly string[];
  readonly color: string;
}): ReactNode {
  return (
    <HudCard variant="accent">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-display font-semibold text-lg tracking-wide" style={{ color }}>
          {title}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item} className="font-mono text-base text-hex-muted flex items-start gap-2">
            <span className="text-hex-accent mt-0.5">&#9656;</span>
            {item}
          </li>
        ))}
      </ul>
    </HudCard>
  );
}

export function ProblemSlide(): ReactNode {
  return (
    <Section id="problem" number={2} label="The Problem" title="Authorization is broken">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Most apps scatter authorization across three disconnected silos. Identity lives in the
          auth provider, permissions hide in feature flags and ad-hoc checks, and enforcement is
          copy-pasted through components. When they drift apart, security holes open silently.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Animate variant="fade-up" delay={0}>
          <SiloCard
            title="Identity Silo"
            icon="&#128100;"
            color="#FF5E00"
            items={[
              "JWT claims locked in provider",
              "Roles as opaque strings",
              "No type safety on permissions",
              "Changes require redeploy",
            ]}
          />
        </Animate>
        <Animate variant="fade-up" delay={100}>
          <SiloCard
            title="Permission Silo"
            icon="&#128273;"
            color="#FF5E00"
            items={[
              "Scattered if/else checks",
              "Hardcoded role names",
              "No audit trail",
              "Untestable logic",
            ]}
          />
        </Animate>
        <Animate variant="fade-up" delay={200}>
          <SiloCard
            title="Enforcement Silo"
            icon="&#128737;"
            color="#FF5E00"
            items={[
              "Copy-pasted guards",
              "Component-level spaghetti",
              "Route vs data vs UI drift",
              "Zero observability",
            ]}
          />
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard>
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge">!</span>
            <span className="font-display font-semibold text-hex-primary tracking-wide">
              The Guard Solution
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            <span className="text-hex-primary">@hex-di/guard</span> unifies identity, permissions,
            and enforcement into a single type-safe, testable, auditable system. Permissions are
            branded tokens. Roles form a DAG. Policies compose with combinators. Enforcement happens
            through the DI graph.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
