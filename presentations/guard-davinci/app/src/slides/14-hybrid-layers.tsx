import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function HybridLayersSlide(): ReactNode {
  return (
    <Section id="hybrid-layers" number={14} label="Composition" title="Hybrid Authorization Layers">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Three layers of authorization for DaVinci:{" "}
          <span className="text-hex-primary">L1 RBAC</span>,{" "}
          <span className="text-hex-green">L2 ABAC</span>, and{" "}
          <span className="text-hex-amber">L3 Field masking</span> — composed into a single
          evaluable policy tree.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <CodeBlock title="3-Layer Policy">
          <span className="syn-comment">{"// L1: Role gate -- must be a manager or admin"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">l1_roleGate</span> ={" "}
          <span className="syn-function">anyOf</span>({"\n"}
          {"  "}
          <span className="syn-function">hasRole</span>(<span className="syn-string">"admin"</span>
          ),{"\n"}
          {"  "}
          <span className="syn-function">hasRole</span>(
          <span className="syn-string">"global_content_manager"</span>),{"\n"}
          {"  "}
          <span className="syn-function">hasRole</span>(
          <span className="syn-string">"local_content_manager"</span>),{"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// L2: Attribute check -- scope + brand + MFA"}</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">l2_abac</span> ={" "}
          <span className="syn-function">allOf</span>({"\n"}
          {"  "}
          <span className="syn-function">hasAttribute</span>(
          <span className="syn-string">"scope"</span>, <span className="syn-function">eq</span>(
          <span className="syn-function">literal</span>(<span className="syn-string">"global"</span>
          ))),{"\n"}
          {"  "}
          <span className="syn-function">hasAttribute</span>(
          <span className="syn-string">"mfaVerified"</span>,{" "}
          <span className="syn-function">eq</span>(<span className="syn-function">literal</span>(
          <span className="syn-keyword">true</span>))),{"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// L3: Combined publish policy"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">canPublish</span> ={" "}
          <span className="syn-function">withLabel</span>(
          <span className="syn-string">"Can Publish Content"</span>,{"\n"}
          {"  "}
          <span className="syn-function">allOf</span>(
          <span className="syn-property">l1_roleGate</span>,{" "}
          <span className="syn-property">l2_abac</span>,{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">content</span>.
          <span className="syn-property">publish</span>)){"\n"}
          {")"}
        </CodeBlock>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Animate variant="fade-up" delay={300}>
          <HudCard>
            <span className="font-display font-semibold text-hex-primary text-lg tracking-wide block mb-2">
              L1 RBAC
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              Who are you? Role membership gates initial access.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={400}>
          <HudCard variant="green">
            <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-2">
              L2 ABAC
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              What's the context? Scope, brand, MFA, time-of-day.
            </p>
          </HudCard>
        </Animate>

        <Animate variant="fade-up" delay={500}>
          <HudCard variant="amber">
            <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-2">
              L3 Fields
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              What can you see? Per-field masking on the response.
            </p>
          </HudCard>
        </Animate>
      </div>
    </Section>
  );
}
