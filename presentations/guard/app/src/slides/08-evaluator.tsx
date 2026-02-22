import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function EvaluatorSlide(): ReactNode {
  return (
    <Section id="evaluator" number={8} label="Access Model" title="The Evaluator">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        The <code className="text-hex-primary font-mono text-base">evaluate()</code> function takes
        a policy and a context, then walks the policy tree to produce a{" "}
        <span className="text-hex-accent">Decision</span>. Every evaluation produces a full{" "}
        <span className="text-hex-accent">EvaluationTrace</span> — no black boxes.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="evaluate()">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">evaluate</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard'</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">result</span> ={" "}
          <span className="syn-function">evaluate</span>(
          <span className="syn-property">canManageUsersPolicy</span>, {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-property">currentUser</span>
          {"\n"}
          {"})"}
          {"\n"}
          {"\n"}
          <span className="syn-keyword">if</span> (<span className="syn-property">result</span>.
          <span className="syn-function">isErr</span>()) {"{"}
          {"\n"}
          {"  "}
          <span className="syn-comment">// PolicyEvaluationError</span>
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span>{" "}
          <span className="syn-function">handleError</span>(
          <span className="syn-property">result</span>.<span className="syn-property">error</span>)
          {"\n"}
          {"}"}
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">decision</span>{" "}
          = <span className="syn-property">result</span>.<span className="syn-property">value</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">if</span> (<span className="syn-property">decision</span>.
          <span className="syn-property">kind</span> === <span className="syn-string">'allow'</span>
          ) {"{"}
          {"\n"}
          {"  "}
          <span className="syn-comment">// Access granted</span>
          {"\n"}
          {"}"} <span className="syn-keyword">else</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-comment">// decision.kind === 'deny'</span>
          {"\n"}
          {"  "}
          <span className="syn-comment">// decision.reasons — why it was denied</span>
          {"\n"}
          {"}"}
        </CodeBlock>

        <CodeBlock title="Decision type">
          <span className="syn-comment">// The Decision discriminated union</span>
          {"\n"}
          <span className="syn-keyword">type</span> <span className="syn-type">Decision</span> =
          {"\n"}
          {"  "}| {"{"} <span className="syn-property">kind</span>:{" "}
          <span className="syn-string">'allow'</span>; <span className="syn-property">trace</span>:{" "}
          <span className="syn-type">EvaluationTrace</span> {"}"}
          {"\n"}
          {"  "}| {"{"} <span className="syn-property">kind</span>:{" "}
          <span className="syn-string">'deny'</span>; <span className="syn-property">reasons</span>:{" "}
          <span className="syn-type">string</span>[]; <span className="syn-property">trace</span>:{" "}
          <span className="syn-type">EvaluationTrace</span> {"}"}
          {"\n"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// EvaluationTrace — full audit log</span>
          {"\n"}
          <span className="syn-keyword">interface</span>{" "}
          <span className="syn-type">EvaluationTrace</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">policy</span>: <span className="syn-type">string</span>{" "}
          <span className="syn-comment">// policy label/type</span>
          {"\n"}
          {"  "}
          <span className="syn-property">decision</span>:{" "}
          <span className="syn-string">'allow'</span> | <span className="syn-string">'deny'</span>
          {"\n"}
          {"  "}
          <span className="syn-property">duration</span>: <span className="syn-type">number</span>{" "}
          <span className="syn-comment">// microseconds</span>
          {"\n"}
          {"  "}
          <span className="syn-property">children</span>:{" "}
          <span className="syn-type">EvaluationTrace</span>[]{" "}
          <span className="syn-comment">// sub-policy traces</span>
          {"\n"}
          {"  "}
          <span className="syn-property">reason</span>?: <span className="syn-type">string</span>{" "}
          <span className="syn-comment">// denial reason</span>
          {"\n"}
          {"}"}
        </CodeBlock>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CodeBlock title="evaluateAsync() — for ReBAC">
          <span className="syn-comment">// Async evaluation for relationship lookups</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">result</span> ={" "}
          <span className="syn-keyword">await</span>{" "}
          <span className="syn-function">evaluateAsync</span>({"\n"}
          {"  "}
          <span className="syn-property">isOwnerPolicy</span>,{"\n"}
          {"  "}
          {"{"}
          {"\n"}
          {"    "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-property">currentUser</span>,{"\n"}
          {"    "}
          <span className="syn-property">resource</span>: {"{"}{" "}
          <span className="syn-property">id</span>: <span className="syn-string">'doc-123'</span>{" "}
          {"}"},{"\n"}
          {"    "}
          <span className="syn-property">relationshipResolver</span>,{"\n"}
          {"  "}
          {"}"}
          {"\n"}
          {")"}
        </CodeBlock>

        <HudCard variant="accent">
          <span className="font-display font-semibold text-hex-accent text-lg tracking-wide block mb-3">
            Key Properties
          </span>
          <div className="space-y-2 font-mono text-base">
            {[
              ["Pure evaluation", "No side effects — same input always produces same output"],
              ["Full tracing", "Every node in the policy tree produces a trace entry"],
              ["Result-based", "Returns Result<Decision, PolicyEvaluationError>, never throws"],
              ["Microsecond timing", "Each trace node records evaluation duration for profiling"],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2">
                <span className="text-hex-accent shrink-0">&#9656;</span>
                <div>
                  <span className="text-hex-primary">{title}</span>
                  <span className="text-hex-muted"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </HudCard>
      </div>
    </Section>
  );
}
