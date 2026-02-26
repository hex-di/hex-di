import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function SerializationSlide(): ReactNode {
  return (
    <Section id="serialization" number={23} label="Visibility & Quality" title="Serialization">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Policies are data structures — they serialize to JSON, restore from JSON, and explain
          themselves in plain English. This enables admin UIs, versioning, and debugging workflows.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="Serialize & Persist">
            <span className="syn-keyword">import</span> {"{"}
            {"\n"}
            {"  "}
            <span className="syn-function">serializePolicy</span>,{"\n"}
            {"  "}
            <span className="syn-function">deserializePolicy</span>
            {"\n"}
            {"}"} <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">json</span> ={" "}
            <span className="syn-function">serializePolicy</span>(
            <span className="syn-property">canManageUsers</span>){"\n"}
            <span className="syn-comment">// Store in DB, send to backend,</span>
            {"\n"}
            <span className="syn-comment">// version control</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">restored</span> ={"\n"}
            {"  "}
            <span className="syn-function">deserializePolicy</span>(
            <span className="syn-property">json</span>){"\n"}
            <span className="syn-comment">// Fully functional policy from JSON</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="Explain to Humans">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">explainPolicy</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            {"\n"}
            <span className="syn-function">explainPolicy</span>(
            <span className="syn-property">canManageUsers</span>){"\n"}
            {"\n"}
            <span className="syn-comment">// "Can Manage Users: Allow if ANY of:</span>
            {"\n"}
            <span className="syn-comment">// - Subject has role 'admin'</span>
            {"\n"}
            <span className="syn-comment">// - Subject has role</span>
            {"\n"}
            <span className="syn-comment">// 'global_content_manager'</span>
            {"\n"}
            <span className="syn-comment">// - Subject has role</span>
            {"\n"}
            <span className="syn-comment">// 'local_content_manager'</span>
            {"\n"}
            <span className="syn-comment">// - Subject has role</span>
            {"\n"}
            <span className="syn-comment">// 'cph_content_manager'"</span>
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="pink">
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge">&#8596;</span>
            <span className="font-display font-semibold text-hex-pink text-lg tracking-wide">
              Policies are Data, Not Code
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Policies are data, not code. They can be stored, versioned, explained, and compared —
            enabling admin-facing policy UIs.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
