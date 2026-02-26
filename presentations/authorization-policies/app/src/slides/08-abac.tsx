import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { PolicyFlow } from "../components/policy-flow";
import { Badge } from "../components/badge";
import { colors } from "../theme/colors";

export function AbacSlide(): ReactNode {
  return (
    <Section
      id="abac"
      number={8}
      label="Role & Attribute"
      title="Attribute-Based Access Control (ABAC)"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-4 max-w-3xl">
          Access decisions based on attributes of the subject, resource, action, and environment.
          Policies evaluate combinations at runtime.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="primary">Subject Attrs</Badge>
          <Badge variant="green">Resource Attrs</Badge>
          <Badge variant="accent">Action Attrs</Badge>
          <Badge variant="teal">Environment</Badge>
        </div>
      </Animate>

      <Animate variant="fade-up" delay={300}>
        <div className="mb-6">
          <p className="font-mono text-xs text-auth-muted uppercase tracking-wider mb-3">
            XACML Architecture
          </p>
          <PolicyFlow
            steps={[
              { label: "Request", color: colors.text },
              { label: "PEP", sublabel: "Enforcement", color: colors.primary },
              { label: "PDP", sublabel: "Decision", color: colors.accent },
              { label: "PIP", sublabel: "Info Point", color: colors.green },
              { label: "Decision", color: colors.teal },
            ]}
          />
        </div>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <CodeBlock title="abac-policy.ts">
          <span className="syn-comment">
            {'// "Dept editors can edit their dept\'s docs during business hours"'}
          </span>
          {"\n\n"}
          <span className="syn-keyword">const</span> <span className="syn-property">policy</span>:{" "}
          <span className="syn-type">Policy</span> = <span className="syn-bracket">(</span>
          <span className="syn-param">attrs</span>
          <span className="syn-bracket">)</span> <span className="syn-operator">=&gt;</span>{" "}
          <span className="syn-bracket">{"{"}</span>
          {"\n"}
          {"  "}
          <span className="syn-keyword">if</span> <span className="syn-bracket">(</span>
          <span className="syn-param">attrs</span>.<span className="syn-property">action</span> !=={" "}
          <span className="syn-string">&quot;edit&quot;</span>
          <span className="syn-bracket">)</span> <span className="syn-keyword">return</span>{" "}
          <span className="syn-string">&quot;not-applicable&quot;</span>;{"\n"}
          {"  "}
          <span className="syn-keyword">if</span> <span className="syn-bracket">(</span>
          <span className="syn-param">attrs</span>.<span className="syn-property">subject</span>.
          <span className="syn-property">role</span> !=={" "}
          <span className="syn-string">&quot;editor&quot;</span>
          <span className="syn-bracket">)</span> <span className="syn-keyword">return</span>{" "}
          <span className="syn-string">&quot;deny&quot;</span>;{"\n"}
          {"  "}
          <span className="syn-keyword">if</span> <span className="syn-bracket">(</span>
          <span className="syn-param">attrs</span>.<span className="syn-property">subject</span>.
          <span className="syn-property">dept</span> !== <span className="syn-param">attrs</span>.
          <span className="syn-property">resource</span>.<span className="syn-property">dept</span>
          <span className="syn-bracket">)</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">return</span>{" "}
          <span className="syn-string">&quot;deny&quot;</span>;{"\n"}
          {"  "}
          <span className="syn-keyword">const</span> <span className="syn-property">hour</span> ={" "}
          <span className="syn-keyword">new</span> <span className="syn-type">Date</span>
          <span className="syn-bracket">()</span>.<span className="syn-function">getHours</span>
          <span className="syn-bracket">()</span>;{"\n"}
          {"  "}
          <span className="syn-keyword">if</span> <span className="syn-bracket">(</span>
          <span className="syn-property">hour</span> {"<"} <span className="syn-number">9</span> ||{" "}
          <span className="syn-property">hour</span> {">"} <span className="syn-number">18</span>
          <span className="syn-bracket">)</span> <span className="syn-keyword">return</span>{" "}
          <span className="syn-string">&quot;deny&quot;</span>;{"\n"}
          {"  "}
          <span className="syn-keyword">return</span>{" "}
          <span className="syn-string">&quot;permit&quot;</span>;{"\n"}
          <span className="syn-bracket">{"}"}</span>;
        </CodeBlock>
      </Animate>

      <Animate variant="fade-up" delay={500}>
        <div className="mt-6">
          <ModelCard
            name="ABAC"
            icon="&#128200;"
            variant="green"
            strengths={[
              "Fine-grained: any attribute combination",
              "Eliminates role explosion",
              "Dynamic: evaluates at runtime",
              "Standardized (XACML)",
            ]}
            weaknesses={[
              "Complex policy authoring and debugging",
              "Performance: attribute fetching at request time",
              "Difficult reverse queries",
              "XACML is notoriously verbose",
            ]}
          />
        </div>
      </Animate>
    </Section>
  );
}
