import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { HudCard } from "../components/hud-card";

export function RbacSlide(): ReactNode {
  return (
    <Section id="rbac" number={7} label="Role & Attribute" title="Role-Based Access Control (RBAC)">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Users are assigned to roles, and roles carry permissions. Access is determined by role
          membership, not individual identity. The most widely adopted enterprise model.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <HudCard variant="green" className="mb-6">
          <h3 className="font-display font-semibold text-lg text-auth-green mb-3">
            Role Hierarchy
          </h3>
          <div className="font-mono text-sm text-center space-y-1">
            <div className="text-auth-primary">admin</div>
            <div className="text-auth-muted">/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\</div>
            <div className="flex justify-center gap-8">
              <span className="text-auth-accent">manager</span>
              <span className="text-auth-pink">auditor</span>
            </div>
            <div className="text-auth-muted">&nbsp;&nbsp;&nbsp;|</div>
            <div className="text-auth-green">&nbsp;&nbsp;&nbsp;editor</div>
            <div className="text-auth-muted">&nbsp;&nbsp;&nbsp;|</div>
            <div className="text-auth-muted">&nbsp;&nbsp;&nbsp;viewer</div>
          </div>
          <p className="text-xs text-auth-muted text-center mt-3">
            Higher roles inherit all permissions of lower roles
          </p>
        </HudCard>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="slide-left" delay={300}>
          <CodeBlock title="rbac-check.ts">
            <span className="syn-keyword">interface</span> <span className="syn-type">Role</span>{" "}
            <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>: <span className="syn-type">string</span>;
            {"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: <span className="syn-type">Set</span>
            <span className="syn-generic">&lt;string&gt;</span>;{"\n"}
            {"  "}
            <span className="syn-property">parents</span>: <span className="syn-type">Role</span>
            <span className="syn-bracket">[]</span>;{"\n"}
            <span className="syn-bracket">{"}"}</span>
            {"\n\n"}
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">hasPermission</span>
            <span className="syn-bracket">(</span>
            {"\n"}
            {"  "}
            <span className="syn-param">userRoles</span>: <span className="syn-type">Role</span>
            <span className="syn-bracket">[]</span>,{"\n"}
            {"  "}
            <span className="syn-param">action</span>: <span className="syn-type">string</span>
            {"\n"}
            <span className="syn-bracket">)</span>: <span className="syn-type">boolean</span>{" "}
            <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">return</span> <span className="syn-param">userRoles</span>
            .<span className="syn-function">some</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">role</span> <span className="syn-operator">=&gt;</span>
            {"\n"}
            {"    "}
            <span className="syn-function">effective</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">role</span>
            <span className="syn-bracket">)</span>.<span className="syn-function">has</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">action</span>
            <span className="syn-bracket">)</span>
            {"\n"}
            {"  "}
            <span className="syn-bracket">)</span>;{"\n"}
            <span className="syn-bracket">{"}"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-right" delay={400}>
          <HudCard variant="pink" className="h-full">
            <h3 className="font-display font-semibold text-lg text-auth-pink mb-3">
              The Role Explosion Problem
            </h3>
            <div className="space-y-3 text-sm text-auth-text/70">
              <p>
                10 departments &times; 5 seniority levels &times; 8 resource types ={" "}
                <strong className="text-auth-pink">400 roles</strong>
              </p>
              <p>
                Each unique combination needs its own role &mdash; roles become user-specific,
                defeating the purpose.
              </p>
              <p className="text-auth-pink font-medium">
                RBAC alone cannot express: &quot;Editors can edit documents in THEIR
                department&quot;
              </p>
            </div>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={500}>
        <ModelCard
          name="RBAC"
          icon="&#128101;"
          variant="green"
          strengths={[
            "Intuitive and widely understood",
            "Simplifies administration (manage roles, not users)",
            "Good audit trail",
            "NIST standardized",
          ]}
          weaknesses={[
            "Role explosion in complex organizations",
            "Cannot express attribute-based rules",
            "Static — no runtime conditions",
            "Coarse-grained — all-or-nothing per role",
          ]}
        />
      </Animate>
    </Section>
  );
}
