import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { CodeBlock } from "../components/code-block";
import { PolicyFlow } from "../components/policy-flow";
import { colors } from "../theme/colors";

export function ImplementationSlide(): ReactNode {
  return (
    <Section
      id="implementation"
      number={17}
      label="Practical Guide"
      title="Implementation Patterns"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Architectural patterns for integrating authorization into microservices, building policy
          pipelines, and implementing Zero Trust.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Animate variant="fade-up" delay={200}>
          <HudCard variant="teal">
            <h3 className="font-display font-semibold text-lg text-auth-teal mb-3">
              Sidecar Pattern
            </h3>
            <div className="font-mono text-xs text-auth-text/60 space-y-1 mb-3">
              <div className="border border-auth-teal/20 p-2 rounded">
                <div className="text-auth-muted mb-1">Service Pod</div>
                <div className="flex gap-2">
                  <span className="text-auth-text">App</span>
                  <span className="text-auth-muted">&rarr;</span>
                  <span className="text-auth-teal">OPA Sidecar</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-auth-muted">
              Policy engine runs alongside each service. No network hop for authz checks.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={300}>
          <HudCard variant="accent">
            <h3 className="font-display font-semibold text-lg text-auth-accent mb-3">
              Gateway Pattern
            </h3>
            <div className="font-mono text-xs text-auth-text/60 space-y-1 mb-3">
              <div>Client</div>
              <div className="text-auth-muted pl-2">&darr;</div>
              <div className="text-auth-accent pl-2">API Gateway (PEP)</div>
              <div className="text-auth-muted pl-4">&darr;</div>
              <div className="text-auth-accent pl-4">Policy Engine (PDP)</div>
              <div className="text-auth-muted pl-6">&darr;</div>
              <div className="pl-6">Microservice</div>
            </div>
            <p className="text-xs text-auth-muted">
              Centralized enforcement at the edge. Single point of policy evaluation.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={400}>
          <HudCard variant="green">
            <h3 className="font-display font-semibold text-lg text-auth-green mb-3">
              Embedded Library
            </h3>
            <div className="font-mono text-xs text-auth-text/60 space-y-1 mb-3">
              <div className="border border-auth-green/20 p-2 rounded">
                <div className="text-auth-green">import {"{ authorize }"}</div>
                <div className="text-auth-muted mt-1">// In-process, fastest</div>
                <div className="text-auth-muted">// No external dependency</div>
              </div>
            </div>
            <p className="text-xs text-auth-muted">
              Policies bundled with application. Fastest evaluation, zero network overhead.
            </p>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={500}>
        <div className="mb-6">
          <p className="font-mono text-xs text-auth-muted uppercase tracking-wider mb-3">
            Policy-as-Code Pipeline
          </p>
          <PolicyFlow
            steps={[
              { label: "Author", sublabel: "Cedar/Rego", color: colors.primary },
              { label: "Git Push", sublabel: "Version", color: colors.text },
              { label: "CI Validate", sublabel: "Lint + Check", color: colors.accent },
              { label: "Test Suite", sublabel: "Unit + Integration", color: colors.green },
              { label: "Deploy PDP", sublabel: "Rolling", color: colors.blue },
            ]}
          />
        </div>
      </Animate>

      <Animate variant="fade-up" delay={600}>
        <CodeBlock title="policy_test.rego">
          <span className="syn-function">test_viewer_can_read</span>{" "}
          <span className="syn-bracket">{"{"}</span>
          {"\n"}
          {"  "}
          <span className="syn-property">allow</span> <span className="syn-keyword">with</span>{" "}
          <span className="syn-property">input</span> <span className="syn-keyword">as</span>{" "}
          <span className="syn-bracket">{"{"}</span>
          {"\n"}
          {"    "}
          <span className="syn-string">&quot;user&quot;</span>:{" "}
          <span className="syn-bracket">{"{"}</span>
          <span className="syn-string">&quot;roles&quot;</span>:{" "}
          <span className="syn-bracket">[</span>
          <span className="syn-string">&quot;viewer&quot;</span>
          <span className="syn-bracket">]</span>
          <span className="syn-bracket">{"}"}</span>,{"\n"}
          {"    "}
          <span className="syn-string">&quot;action&quot;</span>:{" "}
          <span className="syn-string">&quot;read&quot;</span>
          {"\n"}
          {"  "}
          <span className="syn-bracket">{"}"}</span>
          {"\n"}
          <span className="syn-bracket">{"}"}</span>
          {"\n\n"}
          <span className="syn-function">test_viewer_cannot_write</span>{" "}
          <span className="syn-bracket">{"{"}</span>
          {"\n"}
          {"  "}
          <span className="syn-keyword">not</span> <span className="syn-property">allow</span>{" "}
          <span className="syn-keyword">with</span> <span className="syn-property">input</span>{" "}
          <span className="syn-keyword">as</span> <span className="syn-bracket">{"{"}</span>
          {"\n"}
          {"    "}
          <span className="syn-string">&quot;user&quot;</span>:{" "}
          <span className="syn-bracket">{"{"}</span>
          <span className="syn-string">&quot;roles&quot;</span>:{" "}
          <span className="syn-bracket">[</span>
          <span className="syn-string">&quot;viewer&quot;</span>
          <span className="syn-bracket">]</span>
          <span className="syn-bracket">{"}"}</span>,{"\n"}
          {"    "}
          <span className="syn-string">&quot;action&quot;</span>:{" "}
          <span className="syn-string">&quot;write&quot;</span>
          {"\n"}
          {"  "}
          <span className="syn-bracket">{"}"}</span>
          {"\n"}
          <span className="syn-bracket">{"}"}</span>
        </CodeBlock>
      </Animate>

      <Animate variant="fade-up" delay={700}>
        <HudCard variant="blue" className="mt-6">
          <h3 className="font-display font-semibold text-lg text-auth-blue mb-3">
            Zero Trust Checklist
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-auth-text/70">
            <div className="flex items-start gap-2">
              <span className="text-auth-blue">&#10003;</span> Identity everywhere (mTLS, JWT)
            </div>
            <div className="flex items-start gap-2">
              <span className="text-auth-blue">&#10003;</span> Least privilege (default deny)
            </div>
            <div className="flex items-start gap-2">
              <span className="text-auth-blue">&#10003;</span> Continuous verification per-request
            </div>
            <div className="flex items-start gap-2">
              <span className="text-auth-blue">&#10003;</span> Context-aware (device, network)
            </div>
            <div className="flex items-start gap-2">
              <span className="text-auth-blue">&#10003;</span> Micro-segmentation
              (service-to-service)
            </div>
            <div className="flex items-start gap-2">
              <span className="text-auth-blue">&#10003;</span> Assume breach (limit blast radius)
            </div>
          </div>
        </HudCard>
      </Animate>
    </Section>
  );
}
