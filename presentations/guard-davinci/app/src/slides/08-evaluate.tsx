import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { ComparisonCard } from "../components/comparison-card";

export function EvaluateSlide(): ReactNode {
  return (
    <Section id="evaluate" number={8} label="Guard Primitives" title="The Evaluator">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          The <code className="text-hex-primary font-mono text-base">evaluate()</code> function
          takes a policy and a context, walks the policy tree, and returns a{" "}
          <span className="text-hex-accent">
            Result{"<"}Decision, EvaluationError{">"}
          </span>
          . Every evaluation includes timing, a full trace tree, and denial reasons.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="Evaluate a policy">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">hasPermission</span>,{" "}
            <span className="syn-function">hasRole</span>,{" "}
            <span className="syn-function">evaluate</span> {"}"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">canDeletePolicy</span> ={" "}
            <span className="syn-function">hasPermission</span>(
            <span className="syn-property">brand</span>.<span className="syn-property">delete</span>
            ){"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">mustBeAdmin</span> ={" "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"admin"</span>){"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">result</span>{" "}
            = <span className="syn-function">evaluate</span>(
            <span className="syn-property">canDeletePolicy</span>, {"{"}{" "}
            <span className="syn-property">subject</span> {"}"}){"\n"}
            {"\n"}
            <span className="syn-keyword">if</span> (<span className="syn-property">result</span>.
            <span className="syn-function">isOk</span>()) {"{"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">decision</span> ={" "}
            <span className="syn-property">result</span>.<span className="syn-property">value</span>
            {"\n"}
            {"  "}
            <span className="syn-comment">// decision.kind {"\u2192"} "allow" | "deny"</span>
            {"\n"}
            {"  "}
            <span className="syn-comment">// decision.durationMs {"\u2192"} 0.042</span>
            {"\n"}
            {"  "}
            <span className="syn-comment">// decision.trace {"\u2192"} full evaluation tree</span>
            {"\n"}
            {"}"}
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <ComparisonCard
            beforeTitle="DaVinci Today"
            afterTitle="With Guard"
            before={
              <pre className="terminal-body whitespace-pre overflow-x-auto font-mono text-sm">
                <code>
                  <span className="syn-keyword">if</span> (
                  <span className="syn-property">canDeleteBrand</span>) {"{"}
                  {"\n"}
                  {"  "}
                  <span className="syn-comment">{"// show delete button"}</span>
                  {"\n"}
                  {"  "}
                  <span className="syn-comment">{"// no trace, no reason"}</span>
                  {"\n"}
                  {"  "}
                  <span className="syn-comment">{"// no timing data"}</span>
                  {"\n"}
                  {"}"}
                </code>
              </pre>
            }
            after={
              <pre className="terminal-body whitespace-pre overflow-x-auto font-mono text-sm">
                <code>
                  <span className="syn-keyword">const</span>{" "}
                  <span className="syn-property">result</span> ={" "}
                  <span className="syn-function">evaluate</span>({"\n"}
                  {"  "}
                  <span className="syn-property">policies</span>.
                  <span className="syn-property">canDeleteBrand</span>,{"\n"}
                  {"  "}
                  {"{"} <span className="syn-property">subject</span> {"}"}
                  {"\n"}){"\n"}
                  {"\n"}
                  <span className="syn-property">result</span>.
                  <span className="syn-property">value</span>.
                  <span className="syn-property">kind</span>{" "}
                  <span className="syn-comment">{'// "allow" | "deny"'}</span>
                  {"\n"}
                  <span className="syn-property">result</span>.
                  <span className="syn-property">value</span>.
                  <span className="syn-property">trace</span>{" "}
                  <span className="syn-comment">{"// full tree"}</span>
                </code>
              </pre>
            }
          />
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="accent">
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge-accent">!</span>
            <span className="font-display font-semibold text-hex-accent text-lg tracking-wide">
              Result-Based, Never Throws
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Every evaluation returns a{" "}
            <code className="text-hex-accent">
              Result{"<"}Decision, EvaluationError{">"}
            </code>{" "}
            with timing, trace, and reason. Never throws. The trace tree records every policy node
            visited, enabling full audit logging and performance profiling out of the box.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
