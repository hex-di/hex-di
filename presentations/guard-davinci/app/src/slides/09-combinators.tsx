import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function CombinatorsSlide(): ReactNode {
  return (
    <Section id="combinators" number={9} label="Guard Primitives" title="Policy Combinators">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          DaVinci's compound permissions become{" "}
          <span className="text-hex-accent">composable policy trees</span>. Each combinator is a
          pure function that returns a policy node — no side effects, no mutation, fully
          serializable.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <CodeBlock title="Composable Policies">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">allOf</span>, <span className="syn-function">anyOf</span>,{" "}
          <span className="syn-function">not</span>, <span className="syn-function">withLabel</span>
          , <span className="syn-function">hasRole</span>,{" "}
          <span className="syn-function">hasPermission</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">"@hex-di/guard"</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">{"// DaVinci: canManageUsers = isAdmin || isManager"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">canManageUsers</span> ={" "}
          <span className="syn-function">withLabel</span>(
          <span className="syn-string">"Can Manage Users"</span>,{"\n"}
          {"  "}
          <span className="syn-function">anyOf</span>({"\n"}
          {"    "}
          <span className="syn-function">hasRole</span>(<span className="syn-string">"admin"</span>
          ),{"\n"}
          {"    "}
          <span className="syn-function">hasRole</span>(
          <span className="syn-string">"global_content_manager"</span>),{"\n"}
          {"    "}
          <span className="syn-function">hasRole</span>(
          <span className="syn-string">"local_content_manager"</span>),{"\n"}
          {"    "}
          <span className="syn-function">hasRole</span>(
          <span className="syn-string">"cph_content_manager"</span>),{"\n"}
          {"  "}){"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">
            {"// DaVinci: canApproveContent = isManager (not admin!)"}
          </span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">canApproveContent</span> ={" "}
          <span className="syn-function">withLabel</span>(
          <span className="syn-string">"Can Approve Content"</span>,{"\n"}
          {"  "}
          <span className="syn-function">allOf</span>({"\n"}
          {"    "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">content</span>.
          <span className="syn-property">approve</span>),{"\n"}
          {"    "}
          <span className="syn-function">not</span>(<span className="syn-function">hasRole</span>(
          <span className="syn-string">"admin"</span>)),{"\n"}
          {"  "}){"\n"}
          {")"}
        </CodeBlock>
      </Animate>

      <Animate variant="fade-in" delay={300}>
        <div className="flex flex-wrap gap-2 my-6">
          <Badge variant="accent">anyOf</Badge>
          <Badge variant="accent">allOf</Badge>
          <Badge variant="accent">not</Badge>
          <Badge variant="green">withLabel</Badge>
        </div>
      </Animate>

      <Animate variant="scale-in" delay={400}>
        <HudCard variant="green">
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Short-circuit evaluation: <code className="text-hex-green">anyOf</code> stops at the
            first <code className="text-hex-accent">allow</code>,{" "}
            <code className="text-hex-green">allOf</code> stops at the first{" "}
            <code className="text-hex-accent">deny</code>. Every combinator is labeled for the
            decision trace.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
