import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { LibraryCard } from "../components/library-card";

const libraries = [
  {
    name: "CASL",
    stars: "6.2k",
    language: "TypeScript / JavaScript",
    models: [
      { label: "ABAC", variant: "green" as const },
      { label: "RBAC", variant: "primary" as const },
    ],
    description:
      "Isomorphic authorization library — same rules on frontend & backend. Define abilities with a fluent API.",
    highlight: "can('read', 'Article', { authorId: user.id })",
  },
  {
    name: "Casbin",
    stars: "19.9k",
    language: "Go, Java, Node, Python, Rust, .NET",
    models: [
      { label: "ACL", variant: "muted" as const },
      { label: "RBAC", variant: "primary" as const },
      { label: "ABAC", variant: "green" as const },
    ],
    description:
      "Multi-language authorization library with configurable policy-model separation. Define models in PERM format.",
    highlight: "Most starred authorization library on GitHub",
  },
  {
    name: "Open Policy Agent (OPA)",
    stars: "11.2k",
    language: "Go (Rego policy language)",
    models: [
      { label: "ABAC", variant: "green" as const },
      { label: "PBAC", variant: "blue" as const },
    ],
    description:
      "General-purpose policy engine. Decoupled from applications, supports partial evaluation for performance.",
    highlight: "CNCF graduated project — Kubernetes native",
  },
  {
    name: "Cedar (AWS)",
    stars: "4.2k",
    language: "Rust",
    models: [
      { label: "ABAC", variant: "green" as const },
      { label: "RBAC", variant: "primary" as const },
    ],
    description:
      "Structured policy language with formal verification. Fast evaluation, automated analysis of policies.",
    highlight: "Powers AWS Verified Permissions",
  },
  {
    name: "OpenFGA",
    stars: "4.8k",
    language: "Go",
    models: [{ label: "ReBAC", variant: "teal" as const }],
    description:
      "Fine-grained authorization as a service, inspired by Google Zanzibar. DSL for relationship types.",
    highlight: "Originally developed at Auth0/Okta",
  },
  {
    name: "SpiceDB",
    stars: "6.4k",
    language: "Go",
    models: [{ label: "ReBAC", variant: "teal" as const }],
    description:
      "Consistent, global permissions database. Zanzibar-inspired with schema language and gRPC API.",
    highlight: "Sub-millisecond check latency at scale",
  },
  {
    name: "Cerbos",
    stars: "4.2k",
    language: "Go",
    models: [
      { label: "ABAC", variant: "green" as const },
      { label: "RBAC", variant: "primary" as const },
      { label: "PBAC", variant: "blue" as const },
    ],
    description:
      "YAML/JSON policy engine with GitOps workflow. Decoupled policy server for microservices.",
    highlight: "Native CI/CD integration for policy testing",
  },
  {
    name: "Ory Keto",
    stars: "5.3k",
    language: "Go",
    models: [{ label: "ReBAC", variant: "teal" as const }],
    description:
      "Zanzibar-inspired access control. Part of the Ory ecosystem (Hydra, Kratos, Oathkeeper).",
    highlight: "Self-hosted, privacy-focused",
  },
];

export function LibrariesSlide(): ReactNode {
  return (
    <Section id="libraries" number={14} label="Comparison & Tools" title="Authorization Libraries">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          The authorization ecosystem — from embedded libraries to standalone policy engines. Star
          counts indicate community adoption.
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {libraries.map((lib, i) => (
          <Animate key={lib.name} variant="fade-up" delay={150 + i * 80}>
            <LibraryCard {...lib} />
          </Animate>
        ))}
      </div>
    </Section>
  );
}
