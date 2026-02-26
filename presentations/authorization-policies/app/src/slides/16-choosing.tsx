import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { ComparisonTable } from "../components/comparison-table";

const guideHeaders = ["Primary Model", "Add If Needed"];

const guideRows = [
  {
    label: "Internal admin tool",
    cells: [
      { value: "RBAC", level: "high" as const },
      { value: "—", level: "none" as const },
    ],
  },
  {
    label: "SaaS multi-tenant",
    cells: [
      { value: "ReBAC", level: "high" as const },
      { value: "RBAC for org roles", level: "medium" as const },
    ],
  },
  {
    label: "Healthcare system",
    cells: [
      { value: "ABAC", level: "high" as const },
      { value: "MAC for classification", level: "medium" as const },
    ],
  },
  {
    label: "Microservices gateway",
    cells: [
      { value: "PBAC", level: "high" as const },
      { value: "RBAC for service identity", level: "medium" as const },
    ],
  },
  {
    label: "Collaborative docs",
    cells: [
      { value: "ReBAC", level: "high" as const },
      { value: "DAC for owner controls", level: "medium" as const },
    ],
  },
  {
    label: "Financial trading",
    cells: [
      { value: "ABAC + Context", level: "high" as const },
      { value: "Risk-Based for adaptive", level: "medium" as const },
    ],
  },
  {
    label: "Government/military",
    cells: [
      { value: "MAC", level: "high" as const },
      { value: "RBAC for roles", level: "medium" as const },
    ],
  },
  {
    label: "B2B API platform",
    cells: [
      { value: "CBAC", level: "high" as const },
      { value: "PBAC for rate limits", level: "medium" as const },
    ],
  },
];

const antiPatterns = [
  { title: "Using RBAC for everything", desc: "Leads to role explosion" },
  { title: "Hardcoding authorization", desc: "Impossible to audit or change" },
  { title: "Ignoring context", desc: "Same access from office and coffee shop WiFi" },
  { title: "Over-engineering", desc: "ABAC for a 3-role internal tool" },
  { title: "Mixing authN and authZ", desc: "Keep identity and access decisions separate" },
];

export function ChoosingSlide(): ReactNode {
  return (
    <Section id="choosing" number={16} label="Practical Guide" title="Choosing the Right Model">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          A practical guide for selecting the right authorization model based on your system&apos;s
          requirements.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <HudCard variant="blue" className="mb-6 overflow-hidden">
          <h3 className="font-display font-semibold text-lg text-auth-blue mb-4">
            Quick Selection Guide
          </h3>
          <ComparisonTable headers={guideHeaders} rows={guideRows} />
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <HudCard variant="red">
          <h3 className="font-display font-semibold text-lg text-auth-red mb-4">
            Anti-Patterns to Avoid
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {antiPatterns.map((ap, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-auth-red font-mono text-sm mt-0.5 shrink-0">{i + 1}.</span>
                <div>
                  <p className="text-sm font-medium text-auth-text">{ap.title}</p>
                  <p className="text-xs text-auth-muted">{ap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </HudCard>
      </Animate>
    </Section>
  );
}
