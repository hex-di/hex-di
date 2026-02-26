import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { Badge } from "../components/badge";

export function PbacSlide(): ReactNode {
  return (
    <Section id="pbac" number={11} label="Modern Models" title="Policy-Based Access Control (PBAC)">
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-4 max-w-3xl">
          Authorization logic expressed as code &mdash; policies written in a dedicated language,
          versioned, tested, and deployed independently from application code.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="blue">OPA / Rego</Badge>
          <Badge variant="teal">Cedar (AWS)</Badge>
          <Badge variant="accent">Cerbos</Badge>
        </div>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Animate variant="fade-up" delay={300}>
          <CodeBlock title="policy.rego (OPA)">
            <span className="syn-keyword">package</span> <span className="syn-property">authz</span>
            {"\n\n"}
            <span className="syn-keyword">default</span> <span className="syn-property">allow</span>{" "}
            = <span className="syn-number">false</span>
            {"\n\n"}
            <span className="syn-property">allow</span> <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-property">input</span>.<span className="syn-property">method</span>{" "}
            == <span className="syn-string">&quot;GET&quot;</span>
            {"\n"}
            {"  "}
            <span className="syn-property">input</span>.<span className="syn-property">user</span>.
            <span className="syn-property">roles</span>
            <span className="syn-bracket">[</span>
            <span className="syn-property">_</span>
            <span className="syn-bracket">]</span> =={" "}
            <span className="syn-string">&quot;viewer&quot;</span>
            {"\n"}
            <span className="syn-bracket">{"}"}</span>
            {"\n\n"}
            <span className="syn-property">allow</span> <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-property">input</span>.<span className="syn-property">method</span>{" "}
            == <span className="syn-string">&quot;PUT&quot;</span>
            {"\n"}
            {"  "}
            <span className="syn-property">input</span>.<span className="syn-property">user</span>.
            <span className="syn-property">roles</span>
            <span className="syn-bracket">[</span>
            <span className="syn-property">_</span>
            <span className="syn-bracket">]</span> =={" "}
            <span className="syn-string">&quot;editor&quot;</span>
            {"\n"}
            <span className="syn-bracket">{"}"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-up" delay={400}>
          <CodeBlock title="policy.cedar (AWS)">
            <span className="syn-keyword">permit</span>
            <span className="syn-bracket">(</span>
            {"\n"}
            {"  "}
            <span className="syn-property">principal</span> <span className="syn-keyword">in</span>
            {"\n"}
            {"    "}
            <span className="syn-type">Group</span>::
            <span className="syn-string">&quot;editors&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-property">action</span> <span className="syn-keyword">in</span>
            {"\n"}
            {"    "}
            <span className="syn-bracket">[</span>
            <span className="syn-type">Action</span>::
            <span className="syn-string">&quot;edit&quot;</span>
            <span className="syn-bracket">]</span>,{"\n"}
            {"  "}
            <span className="syn-property">resource</span> <span className="syn-keyword">in</span>
            {"\n"}
            {"    "}
            <span className="syn-type">Folder</span>::
            <span className="syn-string">&quot;engineering&quot;</span>
            {"\n"}
            <span className="syn-bracket">)</span> <span className="syn-keyword">when</span>{" "}
            <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-property">context</span>.<span className="syn-property">time</span>
            .<span className="syn-property">hour</span> {">"}= <span className="syn-number">9</span>
            {"\n"}
            <span className="syn-bracket">{"}"}</span>;
          </CodeBlock>
        </Animate>

        <Animate variant="fade-up" delay={500}>
          <CodeBlock title="policy.yaml (Cerbos)">
            <span className="syn-property">apiVersion</span>:{" "}
            <span className="syn-string">api.cerbos.dev/v1</span>
            {"\n"}
            <span className="syn-property">resourcePolicy</span>:{"\n"}
            {"  "}
            <span className="syn-property">resource</span>:{" "}
            <span className="syn-string">document</span>
            {"\n"}
            {"  "}
            <span className="syn-property">rules</span>:{"\n"}
            {"    "}- <span className="syn-property">actions</span>:{" "}
            <span className="syn-bracket">[</span>
            <span className="syn-string">&quot;view&quot;</span>
            <span className="syn-bracket">]</span>
            {"\n"}
            {"      "}
            <span className="syn-property">effect</span>: <span className="syn-string">ALLOW</span>
            {"\n"}
            {"      "}
            <span className="syn-property">roles</span>:{"\n"}
            {"        "}- <span className="syn-string">viewer</span>
            {"\n"}
            {"        "}- <span className="syn-string">editor</span>
            {"\n"}
            {"        "}- <span className="syn-string">admin</span>
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={600}>
        <ModelCard
          name="PBAC"
          icon="&#128196;"
          variant="blue"
          strengths={[
            "Policies are version-controlled and testable",
            "Separation of concerns (policy from app code)",
            "Audit-friendly (changes tracked in git)",
            "Language-specific optimizations (partial eval, formal verification)",
          ]}
          weaknesses={[
            "New language to learn (Rego, Cedar)",
            "Debugging policies can be challenging",
            "Operational overhead (policy server)",
            "Performance depends on policy complexity",
          ]}
        />
      </Animate>
    </Section>
  );
}
