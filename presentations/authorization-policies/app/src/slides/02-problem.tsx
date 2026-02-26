import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { CodeBlock } from "../components/code-block";

function ProblemCard({
  title,
  icon,
  items,
  color,
}: {
  readonly title: string;
  readonly icon: string;
  readonly items: readonly string[];
  readonly color: string;
}): ReactNode {
  return (
    <HudCard>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="font-display font-semibold text-lg" style={{ color }}>
          {title}
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item} className="text-sm text-auth-text/70 flex items-start gap-2">
            <span style={{ color }} className="mt-0.5 shrink-0">
              &bull;
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </HudCard>
  );
}

export function ProblemSlide(): ReactNode {
  return (
    <Section id="problem" number={2} label="Foundations" title="The Authorization Problem">
      <Animate variant="fade-up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <HudCard variant="green">
            <h3 className="font-display font-semibold text-lg text-auth-green mb-2">
              Authentication (AuthN)
            </h3>
            <p className="text-sm text-auth-text/70">
              &quot;Who are you?&quot; &mdash; Identity verification via passwords, OAuth,
              biometrics
            </p>
          </HudCard>
          <HudCard variant="accent">
            <h3 className="font-display font-semibold text-lg text-auth-accent mb-2">
              Authorization (AuthZ)
            </h3>
            <p className="text-sm text-auth-text/70">
              &quot;What can you do?&quot; &mdash; Access decisions based on identity, role, context
            </p>
          </HudCard>
        </div>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <CodeBlock title="the-hardcoded-problem.ts">
          <span className="syn-comment">{"// Scattered throughout the codebase..."}</span>
          {"\n"}
          <span className="syn-keyword">if</span> <span className="syn-bracket">(</span>
          <span className="syn-property">user</span>.<span className="syn-property">role</span> ==={" "}
          <span className="syn-string">&quot;admin&quot;</span>{" "}
          <span className="syn-operator">||</span> <span className="syn-bracket">(</span>
          {"\n"}
          {"  "}
          <span className="syn-property">user</span>.<span className="syn-property">role</span> ==={" "}
          <span className="syn-string">&quot;manager&quot;</span>{" "}
          <span className="syn-operator">&amp;&amp;</span>
          {"\n"}
          {"  "}
          <span className="syn-property">user</span>.
          <span className="syn-property">department</span> ==={" "}
          <span className="syn-property">resource</span>.
          <span className="syn-property">department</span>
          <span className="syn-bracket">)</span>
          <span className="syn-bracket">)</span> <span className="syn-bracket">{"{"}</span>
          {"\n"}
          {"  "}
          <span className="syn-comment">{"// allow access... but who audits this?"}</span>
          {"\n"}
          <span className="syn-bracket">{"}"}</span>
        </CodeBlock>
      </Animate>

      <Animate variant="fade-up" delay={300}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <ProblemCard
            title="Role Explosion"
            icon="&#128165;"
            color="#F472B6"
            items={[
              "50 resources x 10 actions = 500 permissions",
              "Fine-grained control = exponential combinations",
              "Roles become user-specific, defeating the purpose",
            ]}
          />
          <ProblemCard
            title="No Auditability"
            icon="&#128269;"
            color="#F59E0B"
            items={[
              "Who granted this access? When? Why?",
              "What can user X access system-wide?",
              "Can we prove compliance to auditors?",
            ]}
          />
          <ProblemCard
            title="The Real Cost"
            icon="&#128176;"
            color="#EF4444"
            items={[
              "Security vulnerabilities from inconsistent checks",
              "Compliance failures (SOC2, HIPAA, GDPR)",
              "Developer productivity loss",
            ]}
          />
        </div>
      </Animate>
    </Section>
  );
}
