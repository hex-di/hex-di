import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { ComparisonTable } from "../components/comparison-table";
import { HudCard } from "../components/hud-card";

const headers = ["Granularity", "Scalability", "Complexity", "Auditability", "Dynamic"];

const rows = [
  {
    label: "ACL",
    cells: [
      { value: "Per-resource", level: "low" as const },
      { value: "Low", level: "low" as const },
      { value: "Low", level: "high" as const },
      { value: "Low", level: "low" as const },
      { value: "No", level: "low" as const },
    ],
  },
  {
    label: "DAC",
    cells: [
      { value: "Per-resource", level: "low" as const },
      { value: "Low", level: "low" as const },
      { value: "Low", level: "high" as const },
      { value: "Low", level: "low" as const },
      { value: "No", level: "low" as const },
    ],
  },
  {
    label: "MAC",
    cells: [
      { value: "Per-level", level: "medium" as const },
      { value: "Medium", level: "medium" as const },
      { value: "High", level: "low" as const },
      { value: "High", level: "high" as const },
      { value: "No", level: "low" as const },
    ],
  },
  {
    label: "RBAC",
    cells: [
      { value: "Per-role", level: "medium" as const },
      { value: "Medium", level: "medium" as const },
      { value: "Medium", level: "medium" as const },
      { value: "High", level: "high" as const },
      { value: "No", level: "low" as const },
    ],
  },
  {
    label: "ABAC",
    cells: [
      { value: "Per-attr", level: "high" as const },
      { value: "High", level: "high" as const },
      { value: "High", level: "low" as const },
      { value: "Medium", level: "medium" as const },
      { value: "Yes", level: "high" as const },
    ],
  },
  {
    label: "CBAC",
    cells: [
      { value: "Per-claim", level: "high" as const },
      { value: "High", level: "high" as const },
      { value: "Medium", level: "medium" as const },
      { value: "Medium", level: "medium" as const },
      { value: "Partial", level: "medium" as const },
    ],
  },
  {
    label: "ReBAC",
    cells: [
      { value: "Per-relation", level: "high" as const },
      { value: "Very High", level: "high" as const },
      { value: "High", level: "low" as const },
      { value: "Medium", level: "medium" as const },
      { value: "Yes", level: "high" as const },
    ],
  },
  {
    label: "PBAC",
    cells: [
      { value: "Per-policy", level: "high" as const },
      { value: "Very High", level: "high" as const },
      { value: "High", level: "low" as const },
      { value: "Very High", level: "high" as const },
      { value: "Yes", level: "high" as const },
    ],
  },
  {
    label: "Context",
    cells: [
      { value: "Per-context", level: "high" as const },
      { value: "High", level: "high" as const },
      { value: "Very High", level: "low" as const },
      { value: "High", level: "high" as const },
      { value: "Yes", level: "high" as const },
    ],
  },
  {
    label: "Risk",
    cells: [
      { value: "Per-score", level: "high" as const },
      { value: "High", level: "high" as const },
      { value: "Very High", level: "low" as const },
      { value: "High", level: "high" as const },
      { value: "Yes", level: "high" as const },
    ],
  },
];

export function ComparisonSlide(): ReactNode {
  return (
    <Section id="comparison" number={13} label="Comparison & Tools" title="Deep Comparison Matrix">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          All 10 models compared across key dimensions. Green = strong, amber = moderate, red =
          weak.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <HudCard variant="pink" className="mb-6 overflow-hidden">
          <ComparisonTable headers={headers} rows={rows} />
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <HudCard className="mt-6">
          <h3 className="font-display font-semibold text-lg text-auth-primary mb-3">
            When to Combine Models
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-auth-text/70">
            <div>
              <p className="text-auth-primary font-mono text-xs mb-1">RBAC + ABAC</p>
              <p>Roles for coarse access, attributes for fine-grained</p>
            </div>
            <div>
              <p className="text-auth-teal font-mono text-xs mb-1">ReBAC + PBAC</p>
              <p>Relationships for structure, policies for rules</p>
            </div>
            <div>
              <p className="text-auth-accent font-mono text-xs mb-1">RBAC + Context</p>
              <p>Roles with environmental restrictions</p>
            </div>
          </div>
        </HudCard>
      </Animate>
    </Section>
  );
}
