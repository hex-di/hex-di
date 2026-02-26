import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { ComparisonCard } from "../components/comparison-card";
import { Animate } from "../components/animate";

export function PolicyRegistrySlide(): ReactNode {
  return (
    <Section
      id="policy-registry"
      number={17}
      label="DaVinci Migration"
      title="Centralized Policies"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Replace the imperative <code className="text-hex-accent">derivePermissions()</code>{" "}
          function with a declarative policy registry. Each policy is a named, labeled tree.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <div className="mb-6">
          <ComparisonCard
            beforeTitle="Before: derivePermissions()"
            afterTitle="After: davinci/policies.ts"
            before={
              <CodeBlock>
                <span className="syn-property">canManageUsers</span>:{" "}
                <span className="syn-property">isAdmin</span> ||{" "}
                <span className="syn-property">isManager</span>,{"\n"}
                <span className="syn-property">canDeleteBrand</span>:{" "}
                <span className="syn-property">isAdmin</span>,{"\n"}
                <span className="syn-property">canSyncPromoMats</span>:{" "}
                <span className="syn-property">isAdmin</span>,{"\n"}
                <span className="syn-property">canManageMemoryItems</span>:{"\n"}
                {"  "}
                <span className="syn-property">isAdmin</span> ||{" "}
                <span className="syn-property">isManager</span>,{"\n"}
                <span className="syn-property">canViewAllRuns</span>:{" "}
                <span className="syn-property">isAdmin</span>,{"\n"}
                <span className="syn-property">canViewStatus</span>:{"\n"}
                {"  "}
                <span className="syn-property">isAdmin</span> ||{" "}
                <span className="syn-property">isManager</span>,{"\n"}
                <span className="syn-property">canAddBrand</span>:{" "}
                <span className="syn-property">isAdmin</span>,{"\n"}
                <span className="syn-property">canApproveGlobalContent</span>:{"\n"}
                {"  "}
                <span className="syn-property">isAdmin</span> ||{" "}
                <span className="syn-property">isManager</span>,
              </CodeBlock>
            }
            after={
              <CodeBlock>
                <span className="syn-keyword">export const</span>{" "}
                <span className="syn-property">canManageUsers</span> ={"\n"}
                {"  "}
                <span className="syn-function">withLabel</span>(
                <span className="syn-string">"Can Manage Users"</span>,{"\n"}
                {"    "}
                <span className="syn-function">anyOf</span>(
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"admin"</span>),{"\n"}
                {"          "}
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"global_content_manager"</span>),{"\n"}
                {"          "}
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"local_content_manager"</span>),{"\n"}
                {"          "}
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"cph_content_manager"</span>)))
                {"\n"}
                {"\n"}
                <span className="syn-keyword">export const</span>{" "}
                <span className="syn-property">canDeleteBrand</span> ={"\n"}
                {"  "}
                <span className="syn-function">withLabel</span>(
                <span className="syn-string">"Can Delete Brand"</span>,{"\n"}
                {"    "}
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"admin"</span>))
                {"\n"}
                {"\n"}
                <span className="syn-keyword">export const</span>{" "}
                <span className="syn-property">canSyncPromoMats</span> ={"\n"}
                {"  "}
                <span className="syn-function">withLabel</span>(
                <span className="syn-string">"Can Sync PromoMats"</span>,{"\n"}
                {"    "}
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"admin"</span>))
              </CodeBlock>
            }
          />
        </div>
      </Animate>

      <Animate variant="scale-in" delay={300}>
        <HudCard variant="amber">
          <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-2">
            One File, All Policies
          </span>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            One file, all policies, composable and testable. Each policy is a named, labeled tree
            that produces traced decisions.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
