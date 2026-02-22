import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function ReactProviderSlide(): ReactNode {
  return (
    <Section
      id="react-provider"
      number={13}
      label="React Integration"
      title="SubjectProvider & Hooks Factory"
    >
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        <code className="text-hex-pink font-mono text-base">@hex-di/guard-react</code> provides a
        React context layer. The{" "}
        <code className="text-hex-pink font-mono text-base">SubjectProvider</code> makes the current{" "}
        <code className="text-hex-primary font-mono text-base">AuthSubject</code> available to the
        component tree.{" "}
        <code className="text-hex-pink font-mono text-base">createGuardHooks()</code> generates a
        custom hooks set.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="SubjectProvider">
          <span className="syn-keyword">import</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-type">SubjectProvider</span>
          {"\n"}
          {"}"} <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard-react'</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">function</span> <span className="syn-function">App</span>(){" "}
          {"{"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">const</span> <span className="syn-property">subject</span> ={" "}
          <span className="syn-function">useCurrentSubject</span>(){"\n"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span> ({"\n"}
          {"    "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">SubjectProvider</span> <span className="syn-attr">value</span>=
          {"{"}
          <span className="syn-property">subject</span>
          {"}"}
          {">"}
          {"\n"}
          {"      "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">Router</span> /{">"}
          {"\n"}
          {"    "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-type">SubjectProvider</span>
          {">"}
          {"\n"}
          {"  "}){"\n"}
          {"}"}
        </CodeBlock>

        <CodeBlock title="createGuardHooks()">
          <span className="syn-keyword">import</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-function">createGuardHooks</span>
          {"\n"}
          {"}"} <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard-react'</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">// Factory generates typed hooks</span>
          {"\n"}
          <span className="syn-keyword">export const</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-property">useSubject</span>,{"\n"}
          {"  "}
          <span className="syn-property">useCan</span>,{"\n"}
          {"  "}
          <span className="syn-property">usePolicy</span>,{"\n"}
          {"  "}
          <span className="syn-property">usePolicies</span>,{"\n"}
          {"  "}
          <span className="syn-property">useSubjectDeferred</span>,{"\n"}
          {"  "}
          <span className="syn-property">useCanDeferred</span>,{"\n"}
          {"  "}
          <span className="syn-property">usePolicyDeferred</span>,{"\n"}
          {"}"} = <span className="syn-function">createGuardHooks</span>(){"\n"}
          {"\n"}
          <span className="syn-comment">// Deferred variants don't throw on</span>
          {"\n"}
          <span className="syn-comment">// missing provider — return null</span>
        </CodeBlock>
      </div>

      <HudCard variant="pink">
        <span className="font-display font-semibold text-hex-pink text-lg tracking-wide block mb-3">
          Hook API Summary
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-base">
          {[
            ["useSubject()", "Get the current AuthSubject (throws without provider)"],
            ["useCan(policy)", "Returns boolean — is the policy satisfied?"],
            ["usePolicy(name)", "Returns the policy definition by name"],
            ["usePolicies(names)", "Returns multiple policy definitions"],
            ["useSubjectDeferred()", "Returns AuthSubject | null (no throw)"],
            ["useCanDeferred(policy)", "Returns boolean | null (no throw)"],
          ].map(([hook, desc]) => (
            <div key={hook} className="flex items-start gap-2">
              <span className="text-hex-pink shrink-0">&#9656;</span>
              <div>
                <code className="text-hex-primary">{hook}</code>
                <span className="text-hex-muted block">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </HudCard>
    </Section>
  );
}
