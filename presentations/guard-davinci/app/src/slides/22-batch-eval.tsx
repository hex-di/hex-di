import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { ComparisonCard } from "../components/comparison-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function BatchEvalSlide(): ReactNode {
  return (
    <Section id="batch-eval" number={22} label="Visibility & Quality" title="Batch Evaluation">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          DaVinci needs all 8 permission results at login.{" "}
          <code className="text-hex-primary font-mono text-base">evaluateBatch()</code> evaluates
          every policy in a single pass and returns an immutable snapshot for O(1) lookups.
        </p>
      </Animate>

      <Animate variant="fade-in">
        <CodeBlock title="Evaluate all policies at once">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">evaluateBatch</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">"@hex-di/guard"</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">allPolicies</span> = {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">canManageUsers</span>,{"\n"}
          {"  "}
          <span className="syn-property">canDeleteBrand</span>,{"\n"}
          {"  "}
          <span className="syn-property">canSyncPromoMats</span>,{"\n"}
          {"  "}
          <span className="syn-property">canManageMemory</span>,{"\n"}
          {"  "}
          <span className="syn-property">canViewAllRuns</span>,{"\n"}
          {"  "}
          <span className="syn-property">canApproveContent</span>,{"\n"}
          {"  "}
          <span className="syn-property">canAddBrand</span>,{"\n"}
          {"  "}
          <span className="syn-property">canViewStatus</span>,{"\n"}
          {"}"}
          {"\n"}
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">results</span> ={" "}
          <span className="syn-function">evaluateBatch</span>(
          <span className="syn-property">allPolicies</span>, {"{"}{" "}
          <span className="syn-property">subject</span> {"}"}){"\n"}
          {"\n"}
          <span className="syn-comment">// results.canManageUsers.kind</span>
          {"\n"}
          <span className="syn-comment">{"//"} &rarr; "allow" | "deny"</span>
          {"\n"}
          <span className="syn-comment">// results.canDeleteBrand.kind</span>
          {"\n"}
          <span className="syn-comment">{"//"} &rarr; "allow" | "deny"</span>
          {"\n"}
          <span className="syn-comment">// Total: ~0.3ms for all 8 policies</span>
        </CodeBlock>
      </Animate>

      <Animate variant="fade-in" delay={100}>
        <div className="mt-6">
          <ComparisonCard
            beforeTitle="Before"
            afterTitle="After"
            before={
              <p className="font-mono text-base text-hex-muted leading-relaxed">
                Sequential boolean derivation in{" "}
                <span className="text-red-400">derivePermissions()</span> — recomputed on every
                state change
              </p>
            }
            after={
              <p className="font-mono text-base text-hex-muted leading-relaxed">
                Single batch evaluation on login —{" "}
                <span className="text-hex-primary">immutable snapshot</span>, O(1) lookups
                thereafter
              </p>
            }
          />
        </div>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <div className="flex flex-wrap gap-2 mt-6">
          <Badge variant="cyan">8 Policies</Badge>
          <Badge variant="green">~0.3ms Total</Badge>
          <Badge variant="accent">Single Pass</Badge>
        </div>
      </Animate>
    </Section>
  );
}
