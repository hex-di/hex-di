import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function SerializationSlide(): ReactNode {
  return (
    <Section id="serialization" number={12} label="Enforcement" title="Serialization & Explanation">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        Policies are data structures, so they serialize to JSON and back.{" "}
        <code className="text-hex-primary font-mono text-base">explainPolicy()</code> produces
        human-readable descriptions for debugging, docs, and admin UIs.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <CodeBlock title="serializePolicy()">
          <span className="syn-keyword">const</span> <span className="syn-property">json</span> ={" "}
          <span className="syn-function">serializePolicy</span>({"\n"}
          {"  "}
          <span className="syn-property">canManageUsersPolicy</span>
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Result:</span>
          {"\n"}
          <span className="syn-comment">{"// {"}</span>
          {"\n"}
          <span className="syn-comment">{"//   type: 'labeled',"}</span>
          {"\n"}
          <span className="syn-comment">{"//   label: 'canManageUsers',"}</span>
          {"\n"}
          <span className="syn-comment">{"//   child: {"}</span>
          {"\n"}
          <span className="syn-comment">{"//     type: 'anyOf',"}</span>
          {"\n"}
          <span className="syn-comment">{"//     children: ["}</span>
          {"\n"}
          <span className="syn-comment">{"//       { type: 'hasRole',"}</span>
          {"\n"}
          <span className="syn-comment">{"//         role: 'admin' },"}</span>
          {"\n"}
          <span className="syn-comment">{"//       { type: 'hasPermission',"}</span>
          {"\n"}
          <span className="syn-comment">{"//         permission:"}</span>
          {"\n"}
          <span className="syn-comment">{"//           'user:manage' }"}</span>
          {"\n"}
          <span className="syn-comment">{"//     ]"}</span>
          {"\n"}
          <span className="syn-comment">{"//   }"}</span>
          {"\n"}
          <span className="syn-comment">{"// }"}</span>
        </CodeBlock>

        <CodeBlock title="deserializePolicy()">
          <span className="syn-comment">// Round-trip from JSON</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">policy</span> =
          {"\n"}
          {"  "}
          <span className="syn-function">deserializePolicy</span>(
          <span className="syn-property">json</span>){"\n"}
          {"\n"}
          <span className="syn-comment">// policy is identical to the</span>
          {"\n"}
          <span className="syn-comment">// original canManageUsersPolicy</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Use case: store policies in DB,</span>
          {"\n"}
          <span className="syn-comment">// load at runtime for dynamic</span>
          {"\n"}
          <span className="syn-comment">// authorization rules</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">result</span> ={" "}
          <span className="syn-function">evaluate</span>({"\n"}
          {"  "}
          <span className="syn-property">policy</span>,{"\n"}
          {"  "}
          {"{"} <span className="syn-property">subject</span> {"}"}
          {"\n"}
          {")"}
        </CodeBlock>

        <CodeBlock title="explainPolicy()">
          <span className="syn-keyword">const</span> <span className="syn-property">desc</span> ={" "}
          <span className="syn-function">explainPolicy</span>({"\n"}
          {"  "}
          <span className="syn-property">canManageUsersPolicy</span>
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// "canManageUsers:</span>
          {"\n"}
          <span className="syn-comment">// ANY of:</span>
          {"\n"}
          <span className="syn-comment">// - has role 'admin'</span>
          {"\n"}
          <span className="syn-comment">// - has permission</span>
          {"\n"}
          <span className="syn-comment">// 'user:manage'"</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Perfect for:</span>
          {"\n"}
          <span className="syn-comment">// - Admin dashboards</span>
          {"\n"}
          <span className="syn-comment">// - Audit reports</span>
          {"\n"}
          <span className="syn-comment">// - Debugging access issues</span>
          {"\n"}
          <span className="syn-comment">// - Documentation generation</span>
        </CodeBlock>
      </div>

      <HudCard>
        <div className="flex items-center gap-3">
          <span className="num-badge">&#8596;</span>
          <span className="font-display font-semibold text-hex-primary text-lg tracking-wide">
            Policies are Data, Not Code
          </span>
        </div>
        <p className="font-mono text-base text-hex-muted leading-relaxed mt-2">
          Because policies are plain data structures (no closures or callbacks), they can be stored
          in databases, transmitted over APIs, diffed between versions, and displayed in admin UIs.
          This is fundamental to the Guard design — authorization rules are{" "}
          <span className="text-hex-primary">inspectable</span> and{" "}
          <span className="text-hex-primary">portable</span>.
        </p>
      </HudCard>
    </Section>
  );
}
