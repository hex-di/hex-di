import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

function MigrationStep({
  step,
  title,
  description,
  delay,
}: {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly delay: number;
}): ReactNode {
  return (
    <Animate variant="fade-up" delay={delay}>
      <HudCard variant="amber">
        <div className="flex items-start gap-4">
          <span className="font-display font-bold text-3xl text-hex-amber/60 shrink-0">
            {step.toString().padStart(2, "0")}
          </span>
          <div>
            <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-1">
              {title}
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">{description}</p>
          </div>
        </div>
      </HudCard>
    </Animate>
  );
}

export function MigrationOverviewSlide(): ReactNode {
  return (
    <Section id="migration-overview" number={15} label="DaVinci Migration" title="Migration Path">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Five steps to migrate DaVinci from Zustand boolean flags to{" "}
          <span className="text-hex-accent">composable, traced policy evaluation</span>.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MigrationStep
          step={1}
          title="Bootstrap Guard"
          description="Install @hex-di/guard and define permission tokens + roles"
          delay={200}
        />
        <MigrationStep
          step={2}
          title="Define Policies"
          description="Create centralized policy file replacing derivePermissions()"
          delay={300}
        />
        <MigrationStep
          step={3}
          title="Create Subject Adapter"
          description="Map /user/me response to createAuthSubject()"
          delay={400}
        />
        <MigrationStep
          step={4}
          title="Replace Hooks"
          description="Swap useUserStore(state => state.canXxx) with useCan(policy)"
          delay={500}
        />
        <MigrationStep
          step={5}
          title="Add Route Guards"
          description="Wrap protected routes with GuardedRoute component"
          delay={600}
        />
      </div>

      <Animate variant="scale-in" delay={700}>
        <HudCard>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            <span className="text-hex-primary">Incremental migration:</span> you can run Guard
            alongside the existing Zustand checks and migrate component by component. No big-bang
            rewrite required.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
