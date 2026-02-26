import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function AbacMatchersSlide(): ReactNode {
  return (
    <Section id="abac-matchers" number={10} label="Composition" title="Attribute-Based Access">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Key for DaVinci: <span className="text-hex-accent">brand scoping</span> and{" "}
          <span className="text-hex-accent">scope checks</span> are expressed as attribute matchers.
          Policies compose over runtime context without hard-coding values.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <CodeBlock title="ABAC Matchers">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">hasAttribute</span>,{" "}
          <span className="syn-function">eq</span>, <span className="syn-function">contains</span>,{" "}
          <span className="syn-function">exists</span>,{" "}
          <span className="syn-function">literal</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">"@hex-di/guard"</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// Scope check: is user global?"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">isGlobalScope</span> ={" "}
          <span className="syn-function">hasAttribute</span>(
          <span className="syn-string">"scope"</span>, <span className="syn-function">eq</span>(
          <span className="syn-function">literal</span>(<span className="syn-string">"global"</span>
          )))
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// Brand check: can user access brand-123?"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">canAccessBrand123</span> ={" "}
          <span className="syn-function">hasAttribute</span>({"\n"}
          {"  "}
          <span className="syn-string">"allowedBrandIds"</span>,{"\n"}
          {"  "}
          <span className="syn-function">contains</span>(
          <span className="syn-string">"brand-123"</span>){"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// MFA check: has user completed MFA?"}</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">hasMfa</span> ={" "}
          <span className="syn-function">hasAttribute</span>(
          <span className="syn-string">"mfaVerified"</span>,{" "}
          <span className="syn-function">eq</span>(<span className="syn-function">literal</span>(
          <span className="syn-keyword">true</span>)))
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// Combine: global scope OR specific brand"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">brandPolicy</span> ={" "}
          <span className="syn-function">anyOf</span>({"\n"}
          {"  "}
          <span className="syn-property">isGlobalScope</span>,{"\n"}
          {"  "}
          <span className="syn-property">canAccessBrand123</span>,{"\n"}
          {")"}
        </CodeBlock>
      </Animate>

      <Animate variant="fade-in" delay={300}>
        <div className="flex flex-wrap gap-2 my-6">
          <Badge variant="cyan">eq</Badge>
          <Badge variant="cyan">neq</Badge>
          <Badge variant="cyan">gte</Badge>
          <Badge variant="cyan">lt</Badge>
          <Badge variant="accent">inArray</Badge>
          <Badge variant="accent">contains</Badge>
          <Badge variant="green">exists</Badge>
        </div>
      </Animate>

      <Animate variant="scale-in" delay={400}>
        <HudCard>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            <span className="text-hex-primary">Attributes unlock runtime context:</span> the same
            policy can evaluate differently for different resources without changing the policy
            tree.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
