import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { RelationshipDiagram } from "../components/relationship-diagram";
import { HudCard } from "../components/hud-card";

const entities = [
  { id: "alice", label: "alice", type: "user" as const },
  { id: "eng", label: "team:engineering", type: "group" as const },
  { id: "folder", label: "folder:eng-docs", type: "resource" as const },
  { id: "doc", label: "doc:budget-2024", type: "resource" as const },
];

const relations = [
  { from: "alice", to: "team:engineering", label: "member" },
  { from: "team:engineering", to: "folder:eng-docs", label: "viewer" },
  { from: "folder:eng-docs", to: "doc:budget-2024", label: "parent" },
];

export function RebacSlide(): ReactNode {
  return (
    <Section
      id="rebac"
      number={10}
      label="Modern Models"
      title="Relationship-Based Access Control (ReBAC)"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Access derived from relationships between entities in a graph. Instead of &quot;Does user
          X have permission Y?&quot;, ReBAC asks &quot;Is there a path from user X to resource
          Z?&quot;
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <HudCard variant="teal" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-display font-semibold text-lg text-auth-teal">Google Zanzibar</h3>
            <span className="font-mono text-xs text-auth-muted">(2019)</span>
          </div>
          <p className="text-sm text-auth-text/70 mb-4">
            Powers Google Drive, YouTube, Maps, and Cloud IAM. Handles 20M+ authorization checks per
            second.
          </p>
          <RelationshipDiagram entities={entities} relations={relations} />
          <p className="text-xs text-auth-teal mt-4 font-mono">
            Can alice view doc:budget-2024? &rarr; alice &rarr; member of team:eng &rarr; viewer of
            folder &rarr; parent of doc &rarr; YES
          </p>
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={300}>
        <CodeBlock title="rebac-authorization-model.dsl">
          <span className="syn-keyword">type</span> <span className="syn-type">user</span>
          {"\n\n"}
          <span className="syn-keyword">type</span> <span className="syn-type">team</span>
          {"\n"}
          {"  "}
          <span className="syn-keyword">relations</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">define</span> <span className="syn-property">member</span>:{" "}
          <span className="syn-bracket">[</span>
          <span className="syn-type">user</span>
          <span className="syn-bracket">]</span>
          {"\n\n"}
          <span className="syn-keyword">type</span> <span className="syn-type">document</span>
          {"\n"}
          {"  "}
          <span className="syn-keyword">relations</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">define</span> <span className="syn-property">parent</span>:{" "}
          <span className="syn-bracket">[</span>
          <span className="syn-type">folder</span>
          <span className="syn-bracket">]</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">define</span> <span className="syn-property">viewer</span>:{" "}
          <span className="syn-function">viewer from parent</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">define</span> <span className="syn-property">owner</span>:{" "}
          <span className="syn-bracket">[</span>
          <span className="syn-type">user</span>
          <span className="syn-bracket">]</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">define</span> <span className="syn-property">can_view</span>
          : <span className="syn-function">viewer</span> <span className="syn-operator">or</span>{" "}
          <span className="syn-function">owner</span>
        </CodeBlock>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <div className="mt-6">
          <ModelCard
            name="ReBAC"
            icon="&#128279;"
            variant="teal"
            strengths={[
              "Natural for hierarchical/collaborative systems",
              "Handles inheritance elegantly",
              "Efficient check operation (graph traversal)",
              "Scales to billions of relationships",
            ]}
            weaknesses={[
              "Complex to model (relationship schema design)",
              "Reverse queries are expensive",
              "Requires dedicated infrastructure",
              "Debugging requires graph tracing",
            ]}
          />
        </div>
      </Animate>
    </Section>
  );
}
