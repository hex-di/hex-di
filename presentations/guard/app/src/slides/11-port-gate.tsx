import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function PortGateSlide(): ReactNode {
  return (
    <Section id="port-gate" number={11} label="Enforcement" title="Port Gate Hooks">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        Port gates integrate authorization directly into the DI graph.{" "}
        <code className="text-hex-primary font-mono text-base">createPortGateHook()</code> wraps a
        port so every method call is policy-checked before execution.{" "}
        <code className="text-hex-primary font-mono text-base">createRoleGateHook()</code> provides
        coarse-grained role-based gating.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="createPortGateHook()">
          <span className="syn-keyword">import</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-function">createPortGateHook</span>
          {"\n"}
          {"}"} <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard'</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Wrap a port with policy enforcement</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">gateHook</span>{" "}
          = <span className="syn-function">createPortGateHook</span>({"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">port</span>:{" "}
          <span className="syn-property">BrandServicePort</span>,{"\n"}
          {"  "}
          <span className="syn-property">policies</span>: {"{"}
          {"\n"}
          {"    "}
          <span className="syn-property">delete</span>:{" "}
          <span className="syn-property">canDeleteBrandPolicy</span>,{"\n"}
          {"    "}
          <span className="syn-property">create</span>:{" "}
          <span className="syn-property">canAddBrandPolicy</span>,{"\n"}
          {"    "}
          <span className="syn-property">update</span>:{" "}
          <span className="syn-property">canManageBrandsPolicy</span>,{"\n"}
          {"  "}
          {"}"},{"\n"}
          {"  "}
          <span className="syn-property">subjectProvider</span>,{"\n"}
          {"  "}
          <span className="syn-property">auditTrail</span>,{"\n"}
          {"})"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Register in graph</span>
          {"\n"}
          <span className="syn-property">graph</span>.<span className="syn-function">withHook</span>
          (<span className="syn-property">BrandServicePort</span>,{" "}
          <span className="syn-property">gateHook</span>)
        </CodeBlock>

        <CodeBlock title="createRoleGateHook()">
          <span className="syn-keyword">import</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-function">createRoleGateHook</span>
          {"\n"}
          {"}"} <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard'</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Coarse-grained: entire port gated by role</span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">adminGate</span>{" "}
          = <span className="syn-function">createRoleGateHook</span>({"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">roles</span>: [<span className="syn-string">'admin'</span>
          ],{"\n"}
          {"  "}
          <span className="syn-property">subjectProvider</span>,{"\n"}
          {"})"}
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Every method on AdminService now</span>
          {"\n"}
          <span className="syn-comment">// requires the admin role</span>
          {"\n"}
          <span className="syn-property">graph</span>.<span className="syn-function">withHook</span>
          (<span className="syn-property">AdminServicePort</span>,{" "}
          <span className="syn-property">adminGate</span>)
        </CodeBlock>
      </div>

      <HudCard variant="green">
        <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-3">
          DI-Level Enforcement
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-base text-hex-muted">
          <div>
            <span className="text-hex-green block mb-1">Per-Method Policies</span>
            Map individual methods to specific policies. A{" "}
            <code className="text-hex-accent">delete</code> method might require{" "}
            <code className="text-hex-accent">canDeleteBrand</code> while{" "}
            <code className="text-hex-accent">read</code> needs no policy.
          </div>
          <div>
            <span className="text-hex-green block mb-1">Zero Boilerplate</span>
            No manual <code className="text-hex-accent">if (canDo)</code> checks in your service
            code. The gate hook intercepts at the DI resolution boundary, before your code runs.
          </div>
        </div>
      </HudCard>
    </Section>
  );
}
