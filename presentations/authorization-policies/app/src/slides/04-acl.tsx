import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";

export function AclSlide(): ReactNode {
  return (
    <Section id="acl" number={4} label="Traditional Models" title="Access Control Lists (ACL)">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          A list of permissions attached directly to a resource, specifying which subjects can
          perform which actions. The simplest and oldest access control model.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="slide-left" delay={200}>
          <CodeBlock title="acl-structure">
            <span className="syn-comment">{"// Resource: /documents/report.pdf"}</span>
            {"\n"}
            <span className="syn-type">ACL</span> <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-string">&quot;alice&quot;</span>:{" "}
            <span className="syn-bracket">[</span>
            <span className="syn-string">&quot;read&quot;</span>,{" "}
            <span className="syn-string">&quot;write&quot;</span>
            <span className="syn-bracket">]</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;bob&quot;</span>:{" "}
            <span className="syn-bracket">[</span>
            <span className="syn-string">&quot;read&quot;</span>
            <span className="syn-bracket">]</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;editors&quot;</span>:{" "}
            <span className="syn-bracket">[</span>
            <span className="syn-string">&quot;read&quot;</span>,{" "}
            <span className="syn-string">&quot;write&quot;</span>,{" "}
            <span className="syn-string">&quot;delete&quot;</span>
            <span className="syn-bracket">]</span>
            {"\n"}
            <span className="syn-bracket">{"}"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-right" delay={300}>
          <HudCard variant="accent">
            <h3 className="font-display font-semibold text-lg text-auth-accent mb-3">
              Real-World Examples
            </h3>
            <ul className="space-y-2 text-sm text-auth-text/70">
              <li>
                <span className="text-auth-accent font-mono">UNIX</span> — rwxr-xr-- file
                permissions
              </li>
              <li>
                <span className="text-auth-accent font-mono">AWS S3</span> — Bucket ACLs per account
              </li>
              <li>
                <span className="text-auth-accent font-mono">Network</span> — Firewall allow/deny
                rules
              </li>
              <li>
                <span className="text-auth-accent font-mono">NTFS</span> — Per-file ACL with
                inheritance
              </li>
            </ul>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={400}>
        <ModelCard
          name="ACL"
          icon="&#128220;"
          variant="accent"
          strengths={[
            "Simple to understand and implement",
            "Direct resource-to-permission mapping",
            "Well-suited for file systems and network rules",
            "Mature tooling (decades of OS support)",
          ]}
          weaknesses={[
            "Doesn't scale: N resources x M users",
            "Permissions scattered per resource",
            "Difficult to audit across many resources",
            "No dynamic or contextual decisions",
          ]}
        />
      </Animate>
    </Section>
  );
}
