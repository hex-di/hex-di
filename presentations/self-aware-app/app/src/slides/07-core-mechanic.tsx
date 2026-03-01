import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { Animate } from "../components/animate";

export function CoreMechanicSlide(): ReactNode {
  return (
    <Section id="core-mechanic" number={7} label="The Architecture" title="The Core Mechanic">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          HexDI is a TypeScript dependency injection framework built on{" "}
          <span className="text-hex-green">ports &amp; adapters</span> (hexagonal architecture). The
          DI container is the{" "}
          <span className="text-hex-primary font-semibold">
            one component that touches everything
          </span>{" "}
          in your application.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <CodeBlock title="port-adapter-graph.ts" fontSize="text-[14px]">
          <span className="syn-comment">{"// 1. Define contracts as typed ports"}</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-function">LoggerPort</span> <span className="syn-operator">=</span>{" "}
          <span className="syn-function">port</span>
          <span className="syn-bracket">{"<"}</span>
          <span className="syn-type">Logger</span>
          <span className="syn-bracket">{">"}</span>
          <span className="syn-bracket">()({"{"}</span> <span className="syn-property">name</span>:{" "}
          <span className="syn-string">&quot;Logger&quot;</span>{" "}
          <span className="syn-bracket">{"}"})</span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-function">DatabasePort</span> <span className="syn-operator">=</span>{" "}
          <span className="syn-function">port</span>
          <span className="syn-bracket">{"<"}</span>
          <span className="syn-type">Database</span>
          <span className="syn-bracket">{">"}</span>
          <span className="syn-bracket">()({"{"}</span> <span className="syn-property">name</span>:{" "}
          <span className="syn-string">&quot;Database&quot;</span>{" "}
          <span className="syn-bracket">{"}"})</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">
            {"// 2. Implement adapters — dependencies declared explicitly"}
          </span>
          {"\n"}
          <span className="syn-keyword">const</span>{" "}
          <span className="syn-property">databaseAdapter</span>{" "}
          <span className="syn-operator">=</span>{" "}
          <span className="syn-function">createAdapter</span>
          <span className="syn-bracket">({"{"}</span>
          {"\n"}
          {"  "}
          <span className="syn-property">provides</span>:{" "}
          <span className="syn-function">DatabasePort</span>,{"\n"}
          {"  "}
          <span className="syn-property">requires</span>: [
          <span className="syn-function">LoggerPort</span>],{" "}
          <span className="syn-comment">{"// ← compile-time dependency graph"}</span>
          {"\n"}
          {"  "}
          <span className="syn-property">lifetime</span>:{" "}
          <span className="syn-string">&quot;singleton&quot;</span>,{"\n"}
          {"  "}
          <span className="syn-property">factory</span>: <span className="syn-bracket">({"{"}</span>{" "}
          <span className="syn-param">Logger</span> <span className="syn-bracket">{"}"})</span>{" "}
          <span className="syn-operator">=&gt;</span> <span className="syn-bracket">({"{"}</span>{" "}
          <span className="syn-comment">{"/* ... */"}</span>{" "}
          <span className="syn-bracket">{"}"})</span>,{"\n"}
          <span className="syn-bracket">{"}"})</span>
          {"\n"}
          {"\n"}
          <span className="syn-comment">
            {"// 3. Build and validate — missing deps are TS errors"}
          </span>
          {"\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">graph</span>{" "}
          <span className="syn-operator">=</span> <span className="syn-type">GraphBuilder</span>.
          <span className="syn-function">create</span>(){"\n"}
          {"  "}.<span className="syn-function">provide</span>(
          <span className="syn-property">loggerAdapter</span>){"\n"}
          {"  "}.<span className="syn-function">provide</span>(
          <span className="syn-property">databaseAdapter</span>){"\n"}
          {"  "}.<span className="syn-function">build</span>(){" "}
          <span className="syn-comment">{"// ← fails at compile time if incomplete"}</span>
        </CodeBlock>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { error: "Missing dependency?", result: "TypeScript error" },
            { error: "Circular dependency?", result: "TypeScript error" },
            { error: "Wrong lifetime?", result: "TypeScript error" },
          ].map(item => (
            <div
              key={item.error}
              className="p-4 border border-hex-green/15 bg-hex-green/5 rounded-sm"
            >
              <span className="font-mono text-sm text-hex-muted block">{item.error}</span>
              <span className="font-display font-semibold text-hex-green text-lg tracking-wide">
                {item.result}
              </span>
              <span className="font-mono text-xs text-hex-muted block mt-1">
                Before the code ships.
              </span>
            </div>
          ))}
        </div>
      </Animate>
    </Section>
  );
}
