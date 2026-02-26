import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { PolicyFlow } from "../components/policy-flow";
import { Badge } from "../components/badge";
import { colors } from "../theme/colors";

function TrendCard({
  title,
  icon,
  description,
  color,
}: {
  readonly title: string;
  readonly icon: string;
  readonly description: string;
  readonly color: string;
}): ReactNode {
  return (
    <HudCard>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-display font-semibold text-lg" style={{ color }}>
          {title}
        </h3>
      </div>
      <p className="text-sm text-auth-text/70 leading-relaxed">{description}</p>
    </HudCard>
  );
}

export function FutureSlide(): ReactNode {
  return (
    <Section id="future" number={18} label="Practical Guide" title="The Future of Authorization">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Authorization is evolving rapidly. Here are the emerging trends that will shape how we
          control access in the coming years.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Animate variant="fade-up" delay={200}>
          <TrendCard
            title="AI-Powered Policies"
            icon="&#129302;"
            color={colors.primary}
            description="LLMs translating natural language to Cedar/Rego. Anomaly detection for access patterns. Auto-suggested policies based on usage. Risk: hallucinating overly permissive policies."
          />
        </Animate>

        <Animate variant="fade-up" delay={300}>
          <TrendCard
            title="Decentralized Identity"
            icon="&#128279;"
            color={colors.teal}
            description="Self-sovereign identity with W3C verifiable credentials. Users control their own identity and attributes. No central identity provider dependency."
          />
        </Animate>

        <Animate variant="fade-up" delay={400}>
          <TrendCard
            title="Policy Mesh"
            icon="&#127760;"
            color={colors.accent}
            description="Authorization as a distributed system primitive. Policies propagated across service mesh (Istio, Envoy). Consistent enforcement across heterogeneous infrastructure."
          />
        </Animate>

        <Animate variant="fade-up" delay={500}>
          <TrendCard
            title="Formal Verification"
            icon="&#128272;"
            color={colors.green}
            description="Mathematical proof that policies are correct. Cedar already supports formal analysis. Prove absence of privilege escalation. Verify changes don't break access."
          />
        </Animate>
      </div>

      <Animate variant="fade-up" delay={600}>
        <HudCard variant="blue" className="mb-6">
          <h3 className="font-display font-semibold text-lg text-auth-blue mb-4">The Vision</h3>
          <PolicyFlow
            steps={[
              { label: "Natural Language", sublabel: "Intent", color: colors.primary },
              { label: "AI Generator", sublabel: "Cedar/Rego", color: colors.accent },
              { label: "Formal Verify", sublabel: "Proof", color: colors.green },
              { label: "Policy Mesh", sublabel: "Deploy", color: colors.teal },
              { label: "Monitor", sublabel: "Adaptive", color: colors.blue },
            ]}
          />
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={700}>
        <HudCard variant="accent">
          <h3 className="font-display font-semibold text-lg text-auth-accent mb-4">
            Key Takeaways
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="num-badge">1</span>
              <span className="text-sm text-auth-text/80">
                Authorization is a spectrum, not a single solution
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num-badge">2</span>
              <span className="text-sm text-auth-text/80">
                Modern systems layer multiple models
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num-badge">3</span>
              <span className="text-sm text-auth-text/80">
                Policy-as-code is the future direction
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num-badge">4</span>
              <span className="text-sm text-auth-text/80">
                Context and risk make access adaptive
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num-badge">5</span>
              <span className="text-sm text-auth-text/80">
                Choose the simplest model that meets your needs
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge variant="primary">RBAC</Badge>
            <Badge variant="green">ABAC</Badge>
            <Badge variant="teal">ReBAC</Badge>
            <Badge variant="blue">PBAC</Badge>
            <Badge variant="accent">Context</Badge>
            <Badge variant="pink">Risk</Badge>
          </div>
        </HudCard>
      </Animate>
    </Section>
  );
}
