import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { Animate } from "../components/animate";

export function ConcreteScenarioSlide(): ReactNode {
  return (
    <Section
      id="concrete-scenario"
      number={11}
      label="The Diagnostic Port"
      title="The Concrete Scenario"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          A user reports:{" "}
          <span className="text-hex-amber">&quot;Order placement sometimes fails.&quot;</span>
        </p>
      </Animate>

      <div className="space-y-5">
        <Animate variant="slide-left" delay={200}>
          <CodeBlock title="Step 1: Agent queries the graph for the order flow">
            <span className="syn-function">hexdi://graph/topology</span>
            <span className="syn-bracket">?</span>
            <span className="syn-param">filter</span>
            <span className="syn-operator">=</span>
            <span className="syn-string">category:order</span>
            {"\n"}
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span>{" "}
            <span className="syn-property">OrderService</span> depends on:{" "}
            <span className="syn-type">InventoryPort</span>,{" "}
            <span className="syn-type">PaymentPort</span>,{" "}
            <span className="syn-type">ShippingPort</span>
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span>{" "}
            <span className="syn-property">OrderSaga</span> steps:{" "}
            <span className="syn-string">validate</span> {"\u2192"}{" "}
            <span className="syn-string">reserve</span> {"\u2192"}{" "}
            <span className="syn-string">pay</span> {"\u2192"}{" "}
            <span className="syn-string">ship</span> {"\u2192"}{" "}
            <span className="syn-string">confirm</span>
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span> Compensations:{" "}
            <span className="syn-function">releaseInventory</span>,{" "}
            <span className="syn-function">refundPayment</span>,{" "}
            <span className="syn-function">cancelShipping</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-left" delay={400}>
          <CodeBlock title="Step 2: Agent queries recent failures">
            <span className="syn-function">hexdi://tracing/errors</span>
            <span className="syn-bracket">?</span>
            <span className="syn-param">saga</span>
            <span className="syn-operator">=</span>
            <span className="syn-string">OrderSaga</span>
            <span className="syn-operator">&amp;</span>
            <span className="syn-param">last</span>
            <span className="syn-operator">=</span>
            <span className="syn-string">24h</span>
            {"\n"}
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span> <span className="syn-number">14</span>{" "}
            failures, all at step: <span className="syn-type">processPayment</span>
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span> Error:{" "}
            <span className="syn-type">PaymentGatewayTimeout</span> (
            <span className="syn-operator">&gt;</span>
            <span className="syn-number">5000ms</span>){"\n"}
            <span className="syn-operator">{"\u2192"}</span> Compensation executed correctly:
            inventory released all <span className="syn-number">14</span> times{"\n"}
            <span className="syn-operator">{"\u2192"}</span>{" "}
            <span className="syn-string">No data corruption</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-left" delay={600}>
          <CodeBlock title="Step 3: Agent queries payment performance">
            <span className="syn-function">hexdi://tracing/spans</span>
            <span className="syn-bracket">?</span>
            <span className="syn-param">port</span>
            <span className="syn-operator">=</span>
            <span className="syn-string">PaymentPort</span>
            <span className="syn-operator">&amp;</span>
            <span className="syn-param">last</span>
            <span className="syn-operator">=</span>
            <span className="syn-string">100</span>
            {"\n"}
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span>{" "}
            <span className="syn-property">avg_duration_ms</span>:{" "}
            <span className="syn-number">1,240</span>
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span>{" "}
            <span className="syn-property">p99_duration_ms</span>:{" "}
            <span className="syn-number">5,020</span>
            {"\n"}
            <span className="syn-operator">{"\u2192"}</span>{" "}
            <span className="syn-property">failure_pattern</span>:{" "}
            <span className="syn-string">all timeouts at exactly 5,000ms</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-up" delay={800}>
          <CodeBlock title="Agent Diagnosis">
            <span className="syn-string">
              &quot;PaymentGateway P99 latency has reached your 5,000ms timeout
            </span>
            {"\n"}
            <span className="syn-string">
              {" "}
              boundary. 14% of orders are failing at payment. Inventory is
            </span>
            {"\n"}
            <span className="syn-string">
              {" "}
              released correctly each time, so no data integrity risk.
            </span>
            {"\n"}
            <span className="syn-string">
              {" "}
              Recommend: increase timeout to 8,000ms (immediate relief) and
            </span>
            {"\n"}
            <span className="syn-string"> add retry with exponential backoff.&quot;</span>
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={1000}>
        <div className="mt-8 text-center">
          <p className="font-display text-2xl font-bold tracking-wide">
            <span className="text-hex-text">The agent read </span>
            <span className="text-hex-amber text-glow-amber">zero source files</span>
          </p>
          <p className="font-mono text-sm text-hex-muted mt-2">
            Structured, truthful data from the system itself.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
