import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function PermissionsSlide(): ReactNode {
  return (
    <Section id="permissions" number={3} label="Foundations" title="Permission Tokens">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Permissions are <span className="text-hex-primary">branded nominal types</span>, not
          strings. The{" "}
          <code className="text-hex-accent font-mono text-base">Permission&lt;R, A&gt;</code> type
          carries the resource and action at the type level, making typos a compile error.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="creating permissions">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createPermission</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">'@hex-di/guard'</span>
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Each permission is a branded token</span>
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">readDoc</span>{" "}
            = <span className="syn-function">createPermission</span>({"\n"}
            {"  "}
            <span className="syn-property">resource</span>:{" "}
            <span className="syn-string">'document'</span>,{"\n"}
            {"  "}
            <span className="syn-property">action</span>: <span className="syn-string">'read'</span>
            {"\n"}
            {")"}
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">writeDoc</span> ={" "}
            <span className="syn-function">createPermission</span>({"\n"}
            {"  "}
            <span className="syn-property">resource</span>:{" "}
            <span className="syn-string">'document'</span>,{"\n"}
            {"  "}
            <span className="syn-property">action</span>:{" "}
            <span className="syn-string">'write'</span>
            {"\n"}
            {")"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Type: Permission&lt;'document', 'read'&gt;</span>
            {"\n"}
            <span className="syn-comment">// Runtime: "document:read" (branded string)</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="type safety">
            <span className="syn-comment">// Compile-time safety: cannot mix permissions</span>
            {"\n"}
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">checkRead</span>({"\n"}
            {"  "}
            <span className="syn-param">perm</span>: <span className="syn-type">Permission</span>
            {"<"}
            <span className="syn-string">'document'</span>,{" "}
            <span className="syn-string">'read'</span>
            {">"}
            {"\n"}
            {")"} {"{"}
            {"\n"}
            {"  "}
            <span className="syn-comment">// Only accepts read permissions</span>
            {"\n"}
            {"}"}
            {"\n"}
            {"\n"}
            <span className="syn-function">checkRead</span>(
            <span className="syn-property">readDoc</span>){" "}
            <span className="syn-comment">// OK</span>
            {"\n"}
            <span className="syn-function">checkRead</span>(
            <span className="syn-property">writeDoc</span>){" "}
            <span className="syn-comment">// Type Error!</span>
            {"\n"}
            {"\n"}
            <span className="syn-comment">// String assignability blocked:</span>
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">fake</span> ={" "}
            <span className="syn-string">"document:read"</span>
            {"\n"}
            <span className="syn-function">checkRead</span>(
            <span className="syn-property">fake</span>){" "}
            <span className="syn-comment">// Type Error!</span>
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard>
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge">i</span>
            <span className="font-display font-semibold text-hex-primary text-lg tracking-wide">
              Why branded types?
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-base text-hex-muted">
            <div>
              <span className="text-hex-primary block mb-1">Nominal Safety</span>
              Plain strings are structurally compatible. Branded types ensure{" "}
              <code className="text-hex-accent">Permission&lt;'doc','read'&gt;</code> and{" "}
              <code className="text-hex-accent">Permission&lt;'doc','write'&gt;</code> are
              incompatible at compile time.
            </div>
            <div>
              <span className="text-hex-primary block mb-1">Zero Runtime Cost</span>
              At runtime, a permission is just a string like{" "}
              <code className="text-hex-accent">"document:read"</code>. The brand exists only in the
              type system.
            </div>
            <div>
              <span className="text-hex-primary block mb-1">Serializable</span>
              Because the runtime representation is a string, permissions serialize naturally to
              JSON, JWT claims, and database columns.
            </div>
          </div>
        </HudCard>
      </Animate>
    </Section>
  );
}
