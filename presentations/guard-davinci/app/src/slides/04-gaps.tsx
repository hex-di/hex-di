import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";

interface GapCardProps {
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly detail: string;
  readonly delay: number;
}

function GapCard({ number, title, description, detail, delay }: GapCardProps): ReactNode {
  return (
    <Animate variant="fade-up" delay={delay}>
      <HudCard variant="accent">
        <div className="flex items-center gap-3 mb-3">
          <span className="num-badge-accent">{number}</span>
          <span className="font-display font-semibold text-hex-accent text-lg tracking-wide">
            {title}
          </span>
        </div>
        <p className="font-mono text-base text-hex-muted leading-relaxed mb-2">{description}</p>
        <p className="font-mono text-sm text-hex-muted/60 leading-relaxed italic">{detail}</p>
      </HudCard>
    </Animate>
  );
}

export function GapsSlide(): ReactNode {
  return (
    <Section id="gaps" number={4} label="The Problem" title="Five Authorization Gaps">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          The current approach has five fundamental gaps that cannot be solved by adding more
          boolean flags to the store. Each gap compounds the others, creating an authorization
          system that is{" "}
          <span className="text-hex-accent">invisible, untestable, and unauditable</span>.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <GapCard
          number={1}
          title="No Route Guards"
          description="/settings/user-management is accessible to everyone via URL. Only UI hiding, no enforcement."
          detail="Any user who knows the URL can reach admin pages. Permission checks only hide buttons."
          delay={0}
        />
        <GapCard
          number={2}
          title="Client-Side Only"
          description="DevTools can bypass all permission checks. useUserStore.setState({ canDeleteBrand: true })"
          detail="A single DevTools command grants any permission. There is zero server-side enforcement."
          delay={100}
        />
        <GapCard
          number={3}
          title="No Audit Trail"
          description="No record of who accessed what. Impossible to answer: 'Who deleted Brand X?'"
          detail="Compliance requires knowing who did what and when. The current system records nothing."
          delay={200}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GapCard
          number={4}
          title="No Type Safety"
          description="Permissions are plain booleans. canDeleteBrand and canManageBrands are indistinguishable at the type level."
          detail="A typo in a permission name compiles fine. Refactoring is a grep-and-pray exercise."
          delay={300}
        />
        <GapCard
          number={5}
          title="No Brand Scoping Enforcement"
          description="allowedBrandIds is checked ad-hoc per component. Easy to forget."
          detail="Each component must remember to filter by brand IDs. Missing a check means data leakage across brands."
          delay={400}
        />
      </div>
    </Section>
  );
}
