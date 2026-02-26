import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function FieldVisibilitySlide(): ReactNode {
  return (
    <Section id="field-visibility" number={12} label="Composition" title="Field Visibility">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Different DaVinci roles see different data. Field-level policies let you{" "}
          <span className="text-hex-accent">compute visibility maps</span> from the same policy
          primitives used for route and action guards.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <CodeBlock title="Field-Level Policies">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">computeFieldVisibility</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">"@hex-di/guard"</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">fieldPolicies</span> = {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">userName</span>:{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">user</span>.<span className="syn-property">read</span>),
          {"\n"}
          {"  "}
          <span className="syn-property">userEmail</span>:{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">user</span>.<span className="syn-property">read</span>),
          {"\n"}
          {"  "}
          <span className="syn-property">userRoles</span>:{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">user</span>.<span className="syn-property">manage</span>),
          {"\n"}
          {"  "}
          <span className="syn-property">brandDelete</span>:{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">brand</span>.<span className="syn-property">delete</span>),
          {"\n"}
          {"  "}
          <span className="syn-property">promoSync</span>:{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">brand</span>.<span className="syn-property">sync</span>),
          {"\n"}
          {"  "}
          <span className="syn-property">runHistory</span>:{" "}
          <span className="syn-function">hasPermission</span>(
          <span className="syn-property">run</span>.<span className="syn-property">readAll</span>),
          {"\n"}
          {"}"}
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">fields</span> ={" "}
          <span className="syn-function">computeFieldVisibility</span>(
          <span className="syn-property">fieldPolicies</span>, {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-property">localWriter</span>,{"\n"}
          {"  "}
          <span className="syn-property">strategy</span>:{" "}
          <span className="syn-string">"intersection"</span>,{"\n"}
          {"}"}){"\n"}
          <span className="syn-comment">
            {"// -> { userName: true, userEmail: true, userRoles: false,"}
          </span>
          {"\n"}
          <span className="syn-comment">
            {"//     brandDelete: false, promoSync: false, runHistory: false }"}
          </span>
        </CodeBlock>
      </Animate>

      <Animate variant="scale-in" delay={300}>
        <div className="mt-6">
          <HudCard variant="green">
            <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-2">
              Strategies
            </span>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              <code className="text-hex-green">intersection</code> (most restrictive),{" "}
              <code className="text-hex-green">first</code> (first match),{" "}
              <code className="text-hex-green">union</code> (most permissive). Field visibility is
              computed once and cached.
            </p>
          </HudCard>
        </div>
      </Animate>
    </Section>
  );
}
