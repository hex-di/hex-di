import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { HudCard } from "../components/hud-card";

export function DacSlide(): ReactNode {
  return (
    <Section
      id="dac"
      number={5}
      label="Traditional Models"
      title="Discretionary Access Control (DAC)"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Resource owners have discretion to grant or revoke access to their resources. The owner
          decides who can access what &mdash; no central authority required.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="slide-left" delay={200}>
          <CodeBlock title="dac-delegation.ts">
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">grantAccess</span>
            <span className="syn-bracket">(</span>
            {"\n"}
            {"  "}
            <span className="syn-param">resource</span>: <span className="syn-type">Resource</span>,
            {"\n"}
            {"  "}
            <span className="syn-param">granterId</span>: <span className="syn-type">string</span>,
            {"\n"}
            {"  "}
            <span className="syn-param">targetId</span>: <span className="syn-type">string</span>,
            {"\n"}
            {"  "}
            <span className="syn-param">perms</span>: <span className="syn-type">Permission</span>
            <span className="syn-bracket">[]</span>
            {"\n"}
            <span className="syn-bracket">)</span>: <span className="syn-type">boolean</span>{" "}
            <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-comment">{"// Only owner can grant"}</span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">if</span> <span className="syn-bracket">(</span>
            <span className="syn-property">resource</span>.
            <span className="syn-property">ownerId</span> !=={" "}
            <span className="syn-param">granterId</span>
            <span className="syn-bracket">)</span>
            {"\n"}
            {"    "}
            <span className="syn-keyword">return</span> <span className="syn-number">false</span>;
            {"\n"}
            {"  "}
            <span className="syn-property">resource</span>.<span className="syn-property">acl</span>
            .<span className="syn-function">set</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">targetId</span>, <span className="syn-param">perms</span>
            <span className="syn-bracket">)</span>;{"\n"}
            {"  "}
            <span className="syn-keyword">return</span> <span className="syn-number">true</span>;
            {"\n"}
            <span className="syn-bracket">{"}"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-right" delay={300}>
          <div className="space-y-4">
            <HudCard variant="accent">
              <h3 className="font-display font-semibold text-lg text-auth-accent mb-3">
                Real-World Examples
              </h3>
              <ul className="space-y-2 text-sm text-auth-text/70">
                <li>
                  <span className="text-auth-accent font-mono">Google Drive</span> — Owner shares
                  with specific people
                </li>
                <li>
                  <span className="text-auth-accent font-mono">GitHub</span> — Repo owner manages
                  collaborators
                </li>
                <li>
                  <span className="text-auth-accent font-mono">Social Media</span> — Post visibility
                  settings
                </li>
                <li>
                  <span className="text-auth-accent font-mono">Email</span> — Sender controls
                  forwarding
                </li>
              </ul>
            </HudCard>
          </div>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={400}>
        <ModelCard
          name="DAC"
          icon="&#128100;"
          variant="accent"
          strengths={[
            "Intuitive — matches ownership mental model",
            "Flexible — owners manage their resources",
            "Low administrative overhead",
            "Natural fit for collaborative tools",
          ]}
          weaknesses={[
            "Trojan horse problem (programs inherit user perms)",
            "No central enforcement",
            "Cannot enforce org-wide policies",
            "Uncontrolled delegation chains",
          ]}
        />
      </Animate>
    </Section>
  );
}
