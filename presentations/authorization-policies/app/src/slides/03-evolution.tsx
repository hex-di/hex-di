import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { Timeline } from "../components/timeline";
import { colors } from "../theme/colors";

const entries = [
  {
    year: "1970s",
    title: "Access Control Lists (ACL)",
    description:
      "Multics OS introduces per-object permission lists. UNIX file permissions (rwx) become standard.",
    color: colors.muted,
  },
  {
    year: "1973",
    title: "Bell-LaPadula Model (MAC)",
    description:
      'Military-grade classification levels. "No read up, no write down" — formal security model.',
    color: colors.accent,
  },
  {
    year: "1992",
    title: "Role-Based Access Control (RBAC)",
    description:
      "Ferraiolo & Kuhn publish seminal RBAC paper. NIST standardizes in 2004. Becomes dominant enterprise model.",
    color: colors.primary,
  },
  {
    year: "2005",
    title: "Attribute-Based Access Control (ABAC)",
    description:
      "XACML 2.0 specification. Policies based on subject, resource, action, environment attributes.",
    color: colors.green,
  },
  {
    year: "2014",
    title: "Claims-Based Access Control (CBAC)",
    description:
      "OAuth 2.0 and OpenID Connect adoption. JWT tokens carry claims for distributed authorization.",
    color: colors.pink,
  },
  {
    year: "2019",
    title: "Relationship-Based Access Control (ReBAC)",
    description:
      "Google publishes Zanzibar paper. Access derived from entity relationships in a graph.",
    color: colors.teal,
  },
  {
    year: "2020s",
    title: "Policy-as-Code & Zero Trust",
    description:
      "OPA/Rego, Cedar, Cerbos emerge. Context-aware, risk-adaptive authorization becomes mainstream.",
    color: colors.blue,
  },
];

export function EvolutionSlide(): ReactNode {
  return (
    <Section id="evolution" number={3} label="Foundations" title="Evolution of Access Control">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-8 max-w-3xl">
          Five decades of innovation — from simple file permissions to adaptive, context-aware
          policy engines.
        </p>
      </Animate>

      <div className="max-w-2xl">
        <Timeline entries={entries} />
      </div>
    </Section>
  );
}
