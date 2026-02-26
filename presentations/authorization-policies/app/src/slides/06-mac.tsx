import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { HudCard } from "../components/hud-card";

export function MacSlide(): ReactNode {
  return (
    <Section id="mac" number={6} label="Traditional Models" title="Mandatory Access Control (MAC)">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          A central authority assigns classification levels to both subjects and resources. Access
          decisions are mandatory &mdash; no user can override them, not even resource owners.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <HudCard variant="red" className="mb-6">
          <h3 className="font-display font-semibold text-lg text-auth-red mb-3">
            Bell-LaPadula Model
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-mono text-xs text-auth-muted mb-2 uppercase tracking-wider">
                Classification Levels
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-auth-muted">Unclassified</span>
                <span className="text-auth-muted">&rarr;</span>
                <span className="text-auth-accent">Confidential</span>
                <span className="text-auth-muted">&rarr;</span>
                <span className="text-auth-pink">Secret</span>
                <span className="text-auth-muted">&rarr;</span>
                <span className="text-auth-red">Top Secret</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-auth-green">&#10003;</span>
                <span className="text-auth-text/70">
                  <strong className="text-auth-green">No Read Up</strong> — Cannot read above
                  clearance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-auth-green">&#10003;</span>
                <span className="text-auth-text/70">
                  <strong className="text-auth-green">No Write Down</strong> — Cannot write below
                  clearance
                </span>
              </div>
            </div>
          </div>
        </HudCard>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="slide-left" delay={300}>
          <CodeBlock title="mac-bell-lapadula.ts">
            <span className="syn-keyword">const</span> <span className="syn-property">LEVELS</span>{" "}
            = <span className="syn-bracket">[</span>
            {"\n"}
            {"  "}
            <span className="syn-string">&quot;unclassified&quot;</span>,{" "}
            <span className="syn-string">&quot;confidential&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;secret&quot;</span>,{" "}
            <span className="syn-string">&quot;top-secret&quot;</span>
            {"\n"}
            <span className="syn-bracket">]</span> <span className="syn-keyword">as const</span>;
            {"\n\n"}
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">canRead</span>
            <span className="syn-bracket">(</span>
            {"\n"}
            {"  "}
            <span className="syn-param">subject</span>: <span className="syn-type">Level</span>,{" "}
            <span className="syn-param">resource</span>: <span className="syn-type">Level</span>
            {"\n"}
            <span className="syn-bracket">)</span> <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">return</span> <span className="syn-function">rank</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">subject</span>
            <span className="syn-bracket">)</span> {">"}= <span className="syn-function">rank</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">resource</span>
            <span className="syn-bracket">)</span>;{"\n"}
            <span className="syn-bracket">{"}"}</span>
            {"\n\n"}
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">canWrite</span>
            <span className="syn-bracket">(</span>
            {"\n"}
            {"  "}
            <span className="syn-param">subject</span>: <span className="syn-type">Level</span>,{" "}
            <span className="syn-param">resource</span>: <span className="syn-type">Level</span>
            {"\n"}
            <span className="syn-bracket">)</span> <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">return</span> <span className="syn-function">rank</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">subject</span>
            <span className="syn-bracket">)</span> {"<"}= <span className="syn-function">rank</span>
            <span className="syn-bracket">(</span>
            <span className="syn-param">resource</span>
            <span className="syn-bracket">)</span>;{"\n"}
            <span className="syn-bracket">{"}"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-right" delay={400}>
          <HudCard variant="accent">
            <h3 className="font-display font-semibold text-lg text-auth-accent mb-3">
              Real-World Examples
            </h3>
            <ul className="space-y-2 text-sm text-auth-text/70">
              <li>
                <span className="text-auth-accent font-mono">SELinux</span> — Mandatory policies on
                Linux
              </li>
              <li>
                <span className="text-auth-accent font-mono">AppArmor</span> — Application-level MAC
              </li>
              <li>
                <span className="text-auth-accent font-mono">Military</span> — Classified document
                handling
              </li>
              <li>
                <span className="text-auth-accent font-mono">iOS/Android</span> — App sandboxing
              </li>
            </ul>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={500}>
        <ModelCard
          name="MAC"
          icon="&#127973;"
          variant="red"
          strengths={[
            "Strongest security guarantees",
            "Prevents information leakage between levels",
            "Immune to Trojan horse attacks",
            "Central control — no user can bypass",
          ]}
          weaknesses={[
            "Rigid — difficult to adapt to business needs",
            "Complex administration",
            "Poor usability",
            "Overkill for most commercial applications",
          ]}
        />
      </Animate>
    </Section>
  );
}
