import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function PermissionGroupsSlide(): ReactNode {
  return (
    <Section id="permission-groups" number={4} label="Foundations" title="Permission Groups">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        <code className="text-hex-primary font-mono text-base">createPermissionGroup()</code>{" "}
        generates a typed object of permissions from a resource name and action list. The result is
        a frozen record where each key is a properly branded permission token.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="createPermissionGroup()">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">createPermissionGroup</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard'</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Generates typed permission tokens</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">BrandPerms</span> ={" "}
          <span className="syn-function">createPermissionGroup</span>({"\n"}
          {"  "}
          <span className="syn-string">'brand'</span>,{"\n"}
          {"  "}[<span className="syn-string">'manage'</span>,{" "}
          <span className="syn-string">'delete'</span>, <span className="syn-string">'add'</span>]
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Result type:</span>
          {"\n"}
          <span className="syn-comment">// {"{"}</span>
          {"\n"}
          <span className="syn-comment">// manage: Permission&lt;'brand', 'manage'&gt;</span>
          {"\n"}
          <span className="syn-comment">// delete: Permission&lt;'brand', 'delete'&gt;</span>
          {"\n"}
          <span className="syn-comment">// add: Permission&lt;'brand', 'add'&gt;</span>
          {"\n"}
          <span className="syn-comment">// {"}"}</span>
          {"\n"}
          {"\n"}
          <span className="syn-property">BrandPerms</span>.
          <span className="syn-property">manage</span>{" "}
          <span className="syn-comment">// "brand:manage" (branded)</span>
          {"\n"}
          <span className="syn-property">BrandPerms</span>.
          <span className="syn-property">delete</span>{" "}
          <span className="syn-comment">// "brand:delete" (branded)</span>
          {"\n"}
          <span className="syn-property">BrandPerms</span>.
          <span className="syn-property">oops</span>{" "}
          <span className="syn-comment">// Type Error!</span>
        </CodeBlock>

        <CodeBlock title="real-world permission groups">
          <span className="syn-comment">// From Davinci (genai-front-web)</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">UserPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'user'</span>, [<span className="syn-string">'manage'</span>
          ]){"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">BrandPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'brand'</span>,{"\n"}
          {"    "}[<span className="syn-string">'manage'</span>,{" "}
          <span className="syn-string">'delete'</span>, <span className="syn-string">'add'</span>])
          {"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">ContentPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'content'</span>,{"\n"}
          {"    "}[<span className="syn-string">'approve_global'</span>]){"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">PromoPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'promo'</span>, [<span className="syn-string">'sync'</span>])
          {"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">MemoryPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'memory'</span>, [
          <span className="syn-string">'manage'</span>]){"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">RunPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'run'</span>, [<span className="syn-string">'view_all'</span>
          ]){"\n"}
          {"\n"}
          <span className="syn-keyword">export const</span>{" "}
          <span className="syn-property">StatusPerms</span> ={"\n"}
          {"  "}
          <span className="syn-function">createPermissionGroup</span>(
          <span className="syn-string">'status'</span>, [<span className="syn-string">'view'</span>
          ])
        </CodeBlock>
      </div>

      <HudCard>
        <div className="flex items-center gap-3">
          <span className="num-badge">&#10003;</span>
          <span className="font-display font-semibold text-hex-primary text-lg tracking-wide">
            Mapped Type Generation
          </span>
        </div>
        <p className="font-mono text-base text-hex-muted leading-relaxed mt-2">
          Under the hood, <code className="text-hex-accent">createPermissionGroup</code> uses a
          mapped type:{" "}
          <code className="text-hex-accent">{"{ [A in Actions[number]]: Permission<R, A> }"}</code>.
          The result is <code className="text-hex-accent">Object.freeze()</code>d so no runtime
          mutation is possible. Every action maps to a branded permission token with full
          autocomplete and refactoring support.
        </p>
      </HudCard>
    </Section>
  );
}
