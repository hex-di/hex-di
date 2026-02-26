import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { PolicyFlow } from "../components/policy-flow";
import { colors } from "../theme/colors";

function CaseStudy({
  name,
  badges,
  description,
  children,
}: {
  readonly name: string;
  readonly badges: readonly {
    readonly label: string;
    readonly variant: "primary" | "accent" | "green" | "pink" | "teal" | "blue" | "red" | "muted";
  }[];
  readonly description: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <HudCard>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-display font-bold text-lg text-auth-text">{name}</h3>
        <div className="flex gap-1.5">
          {badges.map(b => (
            <Badge key={b.label} variant={b.variant}>
              {b.label}
            </Badge>
          ))}
        </div>
      </div>
      <p className="text-sm text-auth-muted mb-4">{description}</p>
      {children}
    </HudCard>
  );
}

export function HybridSlide(): ReactNode {
  return (
    <Section id="hybrid" number={15} label="Comparison & Tools" title="Hybrid Approaches">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          No single model solves everything. Production systems layer 2-4 models, each handling what
          it does best. Here are real-world case studies.
        </p>
      </Animate>

      <div className="space-y-5">
        <Animate variant="fade-up" delay={200}>
          <CaseStudy
            name="GitHub"
            badges={[
              { label: "RBAC", variant: "primary" },
              { label: "ReBAC", variant: "teal" },
              { label: "PBAC", variant: "blue" },
            ]}
            description="Organization roles (RBAC) → Team-to-repo relationships (ReBAC) → Branch protection rules (PBAC)"
          >
            <div className="font-mono text-xs text-auth-text/60 space-y-1">
              <div>
                Organization <span className="text-auth-primary">[RBAC: owner, member]</span>
              </div>
              <div className="pl-4">
                &rarr; Team <span className="text-auth-teal">[ReBAC: team &rarr; repo]</span>
              </div>
              <div className="pl-8">
                &rarr; Repository{" "}
                <span className="text-auth-blue">[PBAC: branch protection, CODEOWNERS]</span>
              </div>
            </div>
          </CaseStudy>
        </Animate>

        <Animate variant="fade-up" delay={300}>
          <CaseStudy
            name="AWS IAM"
            badges={[
              { label: "RBAC", variant: "primary" },
              { label: "ABAC", variant: "green" },
              { label: "PBAC", variant: "blue" },
              { label: "MAC", variant: "red" },
            ]}
            description="IAM roles (RBAC) → JSON policy documents (PBAC) → Tag conditions (ABAC) → Service Control Policies (MAC)"
          >
            <div className="font-mono text-xs text-auth-text/60 space-y-1">
              <div>
                <span className="syn-string">&quot;Effect&quot;</span>:{" "}
                <span className="syn-string">&quot;Allow&quot;</span>{" "}
                <span className="text-auth-blue">(PBAC)</span>
              </div>
              <div>
                <span className="syn-string">&quot;Action&quot;</span>:{" "}
                <span className="syn-string">&quot;s3:GetObject&quot;</span>{" "}
                <span className="text-auth-primary">(RBAC-style)</span>
              </div>
              <div>
                <span className="syn-string">&quot;Condition.StringEquals&quot;</span>:{" "}
                <span className="text-auth-green">(ABAC — tag matching)</span>
              </div>
              <div>
                <span className="syn-string">&quot;Condition.IpAddress&quot;</span>:{" "}
                <span className="text-auth-accent">(Context-based)</span>
              </div>
            </div>
          </CaseStudy>
        </Animate>

        <Animate variant="fade-up" delay={400}>
          <CaseStudy
            name="Google Workspace"
            badges={[
              { label: "RBAC", variant: "primary" },
              { label: "ReBAC", variant: "teal" },
              { label: "CBAC", variant: "pink" },
              { label: "Context", variant: "accent" },
            ]}
            description="Org roles (RBAC) → Sharing graph (ReBAC/Zanzibar) → OAuth2 identity (CBAC) → BeyondCorp (Context)"
          >
            <PolicyFlow
              steps={[
                { label: "Identity", sublabel: "OAuth2/OIDC", color: colors.pink },
                { label: "Org Role", sublabel: "RBAC", color: colors.primary },
                { label: "Share Graph", sublabel: "Zanzibar", color: colors.teal },
                { label: "Context", sublabel: "BeyondCorp", color: colors.accent },
                { label: "Decision", color: colors.green },
              ]}
            />
          </CaseStudy>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={500}>
        <HudCard variant="pink" className="mt-6">
          <h3 className="font-display font-semibold text-lg text-auth-pink mb-3">
            Layered Authorization Pattern
          </h3>
          <PolicyFlow
            steps={[
              { label: "RBAC", sublabel: "Fast gate", color: colors.primary },
              { label: "ABAC", sublabel: "Precise", color: colors.green },
              { label: "Context", sublabel: "Secure", color: colors.teal },
              { label: "Risk", sublabel: "Adaptive", color: colors.accent },
              { label: "Decision", color: colors.text },
            ]}
          />
        </HudCard>
      </Animate>
    </Section>
  );
}
