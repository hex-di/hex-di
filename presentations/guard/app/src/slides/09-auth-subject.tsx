import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function AuthSubjectSlide(): ReactNode {
  return (
    <Section id="auth-subject" number={9} label="Enforcement" title="Auth Subject">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          The <code className="text-hex-primary font-mono text-base">AuthSubject</code> is the
          identity that policies evaluate against. It carries the user's ID, role assignments,
          granted permissions, and arbitrary attributes for ABAC. Created via{" "}
          <code className="text-hex-primary font-mono text-base">createAuthSubject()</code>.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="AuthSubject interface">
            <span className="syn-keyword">interface</span>{" "}
            <span className="syn-type">AuthSubject</span> {"{"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">readonly</span> <span className="syn-property">id</span>:{" "}
            <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">readonly</span>{" "}
            <span className="syn-property">roles</span>:{" "}
            <span className="syn-keyword">readonly</span> <span className="syn-type">string</span>[]
            {"\n"}
            {"  "}
            <span className="syn-keyword">readonly</span>{" "}
            <span className="syn-property">permissions</span>:{" "}
            <span className="syn-type">ReadonlySet</span>
            {"<"}
            <span className="syn-type">string</span>
            {">"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">readonly</span>{" "}
            <span className="syn-property">attributes</span>:{" "}
            <span className="syn-type">Record</span>
            {"<"}
            <span className="syn-type">string</span>, <span className="syn-type">unknown</span>
            {">"}
            {"\n"}
            {"}"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Factory function</span>
            {"\n"}
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">createAuthSubject</span>({"\n"}
            {"  "}
            <span className="syn-param">id</span>: <span className="syn-type">string</span>,{"\n"}
            {"  "}
            <span className="syn-param">roles</span>: <span className="syn-keyword">readonly</span>{" "}
            <span className="syn-type">string</span>[],{"\n"}
            {"  "}
            <span className="syn-param">permissions</span>:{" "}
            <span className="syn-type">ReadonlySet</span>
            {"<"}
            <span className="syn-type">string</span>
            {">"},{"\n"}
            {"  "}
            <span className="syn-param">attributes</span>?: <span className="syn-type">Record</span>
            {"<"}
            <span className="syn-type">string</span>, <span className="syn-type">unknown</span>
            {">"}
            {"\n"}
            {"): "}
            <span className="syn-type">AuthSubject</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="creating a subject">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createAuthSubject</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">'@hex-di/guard'</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">subject</span>{" "}
            = <span className="syn-function">createAuthSubject</span>({"\n"}
            {"  "}
            <span className="syn-string">'user-42'</span>,{"\n"}
            {"  "}[<span className="syn-string">'global_content_manager'</span>],{"\n"}
            {"  "}
            <span className="syn-keyword">new</span> <span className="syn-type">Set</span>([{"\n"}
            {"    "}
            <span className="syn-string">'user:manage'</span>,{"\n"}
            {"    "}
            <span className="syn-string">'brand:manage'</span>,{"\n"}
            {"    "}
            <span className="syn-string">'content:approve_global'</span>,{"\n"}
            {"  "}]),{"\n"}
            {"  "}
            {"{"}
            {"\n"}
            {"    "}
            <span className="syn-property">allowedBrandIds</span>:{" "}
            <span className="syn-keyword">new</span> <span className="syn-type">Set</span>([
            <span className="syn-string">'brand-1'</span>]),{"\n"}
            {"    "}
            <span className="syn-property">region</span>: <span className="syn-string">'EU'</span>,
            {"\n"}
            {"  "}
            {"}"}
            {"\n"}
            {")"}
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="green">
          <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-3">
            Subject Bridge Pattern
          </span>
          <p className="font-mono text-base text-hex-muted leading-relaxed mb-3">
            In real apps, the subject is constructed from your auth provider's user model via a{" "}
            <span className="text-hex-green">bridge function</span>. This isolates the guard domain
            from the identity provider.
          </p>
          <div className="terminal-window">
            <div className="terminal-header">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
              <span className="ml-2 font-mono text-sm text-hex-muted tracking-wider">
                subject-bridge.ts
              </span>
            </div>
            <pre className="terminal-body whitespace-pre overflow-x-auto">
              <code>
                <span className="syn-keyword">function</span>{" "}
                <span className="syn-function">createAppSubject</span>(
                <span className="syn-param">user</span>: <span className="syn-type">AppUser</span>):{" "}
                <span className="syn-type">AuthSubject</span> {"{"}
                {"\n"}
                {"  "}
                <span className="syn-keyword">const</span>{" "}
                <span className="syn-property">roleIds</span> ={" "}
                <span className="syn-property">user</span>.
                <span className="syn-property">roles</span>.
                <span className="syn-function">map</span>(<span className="syn-param">r</span> =
                {">"} <span className="syn-param">r</span>.<span className="syn-property">id</span>)
                {"\n"}
                {"  "}
                <span className="syn-keyword">const</span>{" "}
                <span className="syn-property">permissions</span> ={" "}
                <span className="syn-function">flattenFromRoleMap</span>(
                <span className="syn-property">roleIds</span>){"\n"}
                {"  "}
                <span className="syn-keyword">return</span>{" "}
                <span className="syn-function">createAuthSubject</span>({"\n"}
                {"    "}
                <span className="syn-property">user</span>.<span className="syn-property">id</span>,{" "}
                <span className="syn-property">roleIds</span>,{" "}
                <span className="syn-property">permissions</span>,{"\n"}
                {"    "}
                {"{"} <span className="syn-property">allowedBrandIds</span>:{" "}
                <span className="syn-function">extractBrands</span>(
                <span className="syn-property">user</span>) {"}"}
                {"\n"}
                {"  "}){"\n"}
                {"}"}
              </code>
            </pre>
          </div>
        </HudCard>
      </Animate>
    </Section>
  );
}
