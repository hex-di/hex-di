import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";

export function TestingSlide(): ReactNode {
  return (
    <Section id="testing" number={19} label="Production & Beyond" title="Testing Toolkit">
      <p className="text-hex-muted text-lg leading-relaxed mb-4 max-w-4xl">
        Guard ships with testing utilities designed for exhaustive policy verification. The{" "}
        <code className="text-hex-primary font-mono text-base">testPolicy()</code> helper, Vitest
        matchers, and conformance suites ensure your authorization logic is correct.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="green">testPolicy()</Badge>
        <Badge variant="green">Vitest matchers</Badge>
        <Badge variant="green">Conformance suites</Badge>
        <Badge variant="green">IQ/OQ/PQ runners</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="testPolicy() helper">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">testPolicy</span> {"}"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard/testing'</span>
          {"\n"}
          {"\n"}
          <span className="syn-function">describe</span>(
          <span className="syn-string">'canDeleteBrand'</span>, () ={">"} {"{"}
          {"\n"}
          {"  "}
          <span className="syn-function">testPolicy</span>(
          <span className="syn-property">canDeleteBrandPolicy</span>, {"{"}
          {"\n"}
          {"    "}
          <span className="syn-property">allow</span>: [{"\n"}
          {"      "}
          {"{"}
          {"\n"}
          {"        "}
          <span className="syn-property">name</span>:{" "}
          <span className="syn-string">'admin can delete'</span>,{"\n"}
          {"        "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-function">subjectWith</span>({"\n"}
          {"          "}
          <span className="syn-property">Admin</span>
          {"\n"}
          {"        "}),{"\n"}
          {"      "}
          {"}"},{"\n"}
          {"    "}],{"\n"}
          {"    "}
          <span className="syn-property">deny</span>: [{"\n"}
          {"      "}
          {"{"}
          {"\n"}
          {"        "}
          <span className="syn-property">name</span>:{" "}
          <span className="syn-string">'manager cannot'</span>,{"\n"}
          {"        "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-function">subjectWith</span>({"\n"}
          {"          "}
          <span className="syn-property">GlobalManager</span>
          {"\n"}
          {"        "}),{"\n"}
          {"      "}
          {"}"},{"\n"}
          {"      "}
          {"{"}
          {"\n"}
          {"        "}
          <span className="syn-property">name</span>:{" "}
          <span className="syn-string">'writer cannot'</span>,{"\n"}
          {"        "}
          <span className="syn-property">subject</span>:{" "}
          <span className="syn-function">subjectWith</span>({"\n"}
          {"          "}
          <span className="syn-property">GlobalWriter</span>
          {"\n"}
          {"        "}),{"\n"}
          {"      "}
          {"}"},{"\n"}
          {"    "}],{"\n"}
          {"  "}
          {"}"}){"\n"}
          {"}"})
        </CodeBlock>

        <CodeBlock title="Vitest custom matchers">
          <span className="syn-comment">// Guard extends Vitest matchers</span>
          {"\n"}
          {"\n"}
          <span className="syn-function">expect</span>(
          <span className="syn-property">decision</span>){"\n"}
          {"  "}.<span className="syn-function">toAllow</span>(){"\n"}
          {"\n"}
          <span className="syn-function">expect</span>(
          <span className="syn-property">decision</span>){"\n"}
          {"  "}.<span className="syn-function">toDeny</span>(){"\n"}
          {"\n"}
          <span className="syn-function">expect</span>(
          <span className="syn-property">decision</span>){"\n"}
          {"  "}.<span className="syn-function">toDenyWithReason</span>(
          <span className="syn-string">'missing permission'</span>){"\n"}
          {"\n"}
          <span className="syn-function">expect</span>(<span className="syn-property">trace</span>)
          {"\n"}
          {"  "}.<span className="syn-function">toHaveEvaluated</span>(
          <span className="syn-string">'canManageUsers'</span>){"\n"}
          {"\n"}
          <span className="syn-function">expect</span>(<span className="syn-property">trace</span>)
          {"\n"}
          {"  "}.<span className="syn-function">toHaveDuration</span>({"\n"}
          {"    "}
          <span className="syn-function">lessThan</span>(<span className="syn-number">1000</span>)
          {"\n"}
          {"  "}){"\n"}
          {"\n"}
          <span className="syn-comment">// Conformance suite — test all roles</span>
          {"\n"}
          <span className="syn-comment">// against all policies automatically</span>
          {"\n"}
          <span className="syn-function">runConformanceSuite</span>({"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">policies</span>:{" "}
          <span className="syn-property">allPolicies</span>,{"\n"}
          {"  "}
          <span className="syn-property">roles</span>:{" "}
          <span className="syn-property">allRoles</span>,{"\n"}
          {"  "}
          <span className="syn-property">matrix</span>:{" "}
          <span className="syn-property">expectedMatrix</span>,{"\n"}
          {"}"})
        </CodeBlock>
      </div>

      <HudCard variant="green">
        <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-3">
          GxP Qualification Runners
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-base text-hex-muted">
          <div>
            <span className="text-hex-green block mb-1">IQ — Installation</span>
            Verifies Guard is installed correctly, all exports resolve, and the policy engine
            initializes without errors.
          </div>
          <div>
            <span className="text-hex-green block mb-1">OQ — Operational</span>
            Runs the conformance suite across all roles and policies. Verifies audit trail writes,
            hash chain integrity, and signature freshness.
          </div>
          <div>
            <span className="text-hex-green block mb-1">PQ — Performance</span>
            Benchmarks policy evaluation under load. Measures p50/p95/p99 latencies and verifies
            they stay within configured thresholds.
          </div>
        </div>
      </HudCard>
    </Section>
  );
}
