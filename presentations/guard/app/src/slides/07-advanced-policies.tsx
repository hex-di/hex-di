import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function AdvancedPoliciesSlide(): ReactNode {
  return (
    <Section id="advanced-policies" number={7} label="Access Model" title="Advanced Policies">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        Beyond permissions and roles, Guard supports{" "}
        <span className="text-hex-accent">attribute-based</span> (ABAC),{" "}
        <span className="text-hex-accent">relationship-based</span> (ReBAC), and{" "}
        <span className="text-hex-accent">signature-based</span> policies for fine-grained access
        control.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="hasAttribute()">
          <span className="syn-comment">// Check subject attributes (ABAC)</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">isInRegion</span> ={" "}
          <span className="syn-function">hasAttribute</span>({"\n"}
          {"  "}
          <span className="syn-property">key</span>: <span className="syn-string">'region'</span>,
          {"\n"}
          {"  "}
          <span className="syn-property">matcher</span>:{" "}
          <span className="syn-function">equals</span>(<span className="syn-string">'EU'</span>)
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Check resource attributes</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">isDraft</span> ={" "}
          <span className="syn-function">hasResourceAttribute</span>({"\n"}
          {"  "}
          <span className="syn-property">key</span>: <span className="syn-string">'status'</span>,
          {"\n"}
          {"  "}
          <span className="syn-property">matcher</span>:{" "}
          <span className="syn-function">equals</span>(<span className="syn-string">'draft'</span>)
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Compose: region + draft</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">canEditDraft</span> ={" "}
          <span className="syn-function">allOf</span>({"\n"}
          {"  "}
          <span className="syn-property">isInRegion</span>,{"\n"}
          {"  "}
          <span className="syn-property">isDraft</span>,{"\n"}
          {"  "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">DocPerms</span>.<span className="syn-property">write</span>
          ){"\n"}
          {")"}
        </CodeBlock>

        <CodeBlock title="hasRelationship() — ReBAC">
          <span className="syn-comment">// Relationship-based access control</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">isOwner</span> ={" "}
          <span className="syn-function">hasRelationship</span>({"\n"}
          {"  "}
          <span className="syn-property">relation</span>:{" "}
          <span className="syn-string">'owner'</span>,{"\n"}
          {"  "}
          <span className="syn-property">target</span>:{" "}
          <span className="syn-string">'document'</span>
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">isTeamMember</span> ={" "}
          <span className="syn-function">hasRelationship</span>({"\n"}
          {"  "}
          <span className="syn-property">relation</span>:{" "}
          <span className="syn-string">'member'</span>,{"\n"}
          {"  "}
          <span className="syn-property">target</span>: <span className="syn-string">'team'</span>
          {"\n"}
          {")"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Owner OR team member can edit</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">canEdit</span> ={" "}
          <span className="syn-function">anyOf</span>({"\n"}
          {"  "}
          <span className="syn-property">isOwner</span>,{"\n"}
          {"  "}
          <span className="syn-function">allOf</span>(
          <span className="syn-property">isTeamMember</span>,{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">P</span>.<span className="syn-property">write</span>))
          {"\n"}
          {")"}
        </CodeBlock>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CodeBlock title="hasSignature() — GxP">
          <span className="syn-comment">// Electronic signature requirement</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">requiresApproval</span> ={" "}
          <span className="syn-function">allOf</span>({"\n"}
          {"  "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">BatchPerms</span>.
          <span className="syn-property">release</span>),{"\n"}
          {"  "}
          <span className="syn-function">hasSignature</span>({"\n"}
          {"    "}
          <span className="syn-property">meaning</span>:{" "}
          <span className="syn-string">'approval'</span>,{"\n"}
          {"    "}
          <span className="syn-property">freshness</span>:{" "}
          <span className="syn-number">300_000</span>
          {"\n"}
          {"  "}){"\n"}
          {")"}
        </CodeBlock>

        <HudCard variant="green">
          <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-3">
            Policy Types Summary
          </span>
          <div className="space-y-2 font-mono text-base">
            {[
              { type: "HasPermissionPolicy", desc: "RBAC — checks a branded permission token" },
              { type: "HasRolePolicy", desc: "RBAC — checks role assignment" },
              { type: "HasAttributePolicy", desc: "ABAC — checks subject attributes" },
              { type: "HasResourceAttributePolicy", desc: "ABAC — checks resource attributes" },
              { type: "HasRelationshipPolicy", desc: "ReBAC — checks subject-resource relations" },
              { type: "HasSignaturePolicy", desc: "GxP — requires electronic signature" },
            ].map(({ type, desc }) => (
              <div key={type} className="flex items-start gap-2">
                <span className="text-hex-green shrink-0">&#9656;</span>
                <div>
                  <code className="text-hex-primary">{type}</code>
                  <span className="text-hex-muted ml-2">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </HudCard>
      </div>
    </Section>
  );
}
