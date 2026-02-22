import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function GuardAdapterSlide(): ReactNode {
  return (
    <Section id="guard-adapter" number={10} label="Enforcement" title="Guard Adapter">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        The <code className="text-hex-primary font-mono text-base">enforcePolicy()</code> function
        evaluates a policy and, if denied, returns an{" "}
        <code className="text-hex-accent font-mono text-base">AccessDeniedError</code>. It also
        writes to the audit trail, creating a permanent record of every access decision.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="enforcePolicy()">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">enforcePolicy</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard'</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">result</span> ={" "}
          <span className="syn-function">enforcePolicy</span>({"\n"}
          {"  "}
          <span className="syn-property">canDeleteBrandPolicy</span>,{"\n"}
          {"  "}
          {"{"}
          {"\n"}
          {"    "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-property">currentUser</span>,{"\n"}
          {"    "}
          <span className="syn-property">auditTrail</span>,{"\n"}
          {"    "}
          <span className="syn-property">resource</span>: {"{"}{" "}
          <span className="syn-property">id</span>: <span className="syn-string">'brand-42'</span>{" "}
          {"}"},{"\n"}
          {"  "}
          {"}"}
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-keyword">if</span> (<span className="syn-property">result</span>.
          <span className="syn-function">isErr</span>()) {"{"}
          {"\n"}
          {"  "}
          <span className="syn-comment">// result.error._tag === 'AccessDeniedError'</span>
          {"\n"}
          {"  "}
          <span className="syn-comment">// result.error.code === 'ACL001'</span>
          {"\n"}
          {"  "}
          <span className="syn-comment">// result.error.reasons: string[]</span>
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span>{" "}
          <span className="syn-function">forbidden</span>(
          <span className="syn-property">result</span>.<span className="syn-property">error</span>)
          {"\n"}
          {"}"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Access granted — proceed</span>
        </CodeBlock>

        <CodeBlock title="AuditEntry schema">
          <span className="syn-keyword">interface</span>{" "}
          <span className="syn-type">AuditEntry</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">timestamp</span>: <span className="syn-type">Date</span>
          {"\n"}
          {"  "}
          <span className="syn-property">subjectId</span>: <span className="syn-type">string</span>
          {"\n"}
          {"  "}
          <span className="syn-property">action</span>: <span className="syn-type">string</span>
          {"\n"}
          {"  "}
          <span className="syn-property">resource</span>?: {"{"}{" "}
          <span className="syn-property">type</span>: <span className="syn-type">string</span>;{" "}
          <span className="syn-property">id</span>: <span className="syn-type">string</span> {"}"}
          {"\n"}
          {"  "}
          <span className="syn-property">decision</span>:{" "}
          <span className="syn-string">'allow'</span> | <span className="syn-string">'deny'</span>
          {"\n"}
          {"  "}
          <span className="syn-property">reasons</span>:{" "}
          <span className="syn-keyword">readonly</span> <span className="syn-type">string</span>[]
          {"\n"}
          {"  "}
          <span className="syn-property">trace</span>:{" "}
          <span className="syn-type">EvaluationTrace</span>
          {"\n"}
          {"  "}
          <span className="syn-property">hash</span>?: <span className="syn-type">string</span>{" "}
          <span className="syn-comment">// SHA-256 chain</span>
          {"\n"}
          {"}"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// AuditTrailPort — pluggable storage</span>
          {"\n"}
          <span className="syn-keyword">interface</span>{" "}
          <span className="syn-type">AuditTrailPort</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-function">write</span>(<span className="syn-param">entry</span>:{" "}
          <span className="syn-type">AuditEntry</span>): <span className="syn-type">Promise</span>
          {"<"}
          <span className="syn-type">Result</span>
          {">"}
          {"\n"}
          {"  "}
          <span className="syn-function">query</span>(<span className="syn-param">filter</span>:{" "}
          <span className="syn-type">AuditFilter</span>):{" "}
          <span className="syn-type">AsyncIterable</span>
          {"\n"}
          {"}"}
        </CodeBlock>
      </div>

      <HudCard>
        <span className="font-display font-semibold text-hex-primary text-lg tracking-wide block mb-3">
          Enforcement Flow
        </span>
        <div className="flex items-center gap-2 flex-wrap font-mono text-base">
          <span className="px-2 py-1 border border-hex-primary/20 bg-hex-primary/5 text-hex-primary">
            Subject
          </span>
          <span className="text-hex-muted">+</span>
          <span className="px-2 py-1 border border-hex-accent/20 bg-hex-accent/5 text-hex-accent">
            Policy
          </span>
          <span className="text-hex-muted">&rarr;</span>
          <span className="px-2 py-1 border border-hex-muted/20 bg-hex-muted/5 text-hex-muted">
            evaluate()
          </span>
          <span className="text-hex-muted">&rarr;</span>
          <span className="px-2 py-1 border border-hex-green/20 bg-hex-green/5 text-hex-green">
            Decision
          </span>
          <span className="text-hex-muted">&rarr;</span>
          <span className="px-2 py-1 border border-hex-amber/20 bg-hex-amber/5 text-hex-amber">
            Audit Trail
          </span>
          <span className="text-hex-muted">&rarr;</span>
          <span className="px-2 py-1 border border-hex-green/20 bg-hex-green/5 text-hex-green">
            Result&lt;void, AccessDeniedError&gt;
          </span>
        </div>
      </HudCard>
    </Section>
  );
}
