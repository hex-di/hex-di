import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function SubjectAdapterSlide(): ReactNode {
  return (
    <Section id="subject-adapter" number={18} label="DaVinci Migration" title="Subject Adapter">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          The Zustand store becomes a thin adapter. The{" "}
          <code className="text-hex-primary font-mono text-base">createDaVinciSubject()</code>{" "}
          function maps the <code className="text-hex-accent font-mono text-base">/user/me</code>{" "}
          response to a Guard{" "}
          <code className="text-hex-primary font-mono text-base">AuthSubject</code> — once, on
          login.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="davinci/create-subject.ts">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createAuthSubject</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            <span className="syn-keyword">import</span> <span className="syn-keyword">type</span>{" "}
            {"{"} <span className="syn-type">User</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@lib/api/client/_user"</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export function</span>{" "}
            <span className="syn-function">createDaVinciSubject</span>(
            <span className="syn-param">user</span>: <span className="syn-type">User</span>) {"{"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span> <span className="syn-property">roles</span> ={" "}
            <span className="syn-property">user</span>.<span className="syn-property">roles</span>.
            <span className="syn-function">map</span>(<span className="syn-param">r</span> ={">"}{" "}
            <span className="syn-param">r</span>.<span className="syn-property">id</span>){"\n"}
            {"  "}
            <span className="syn-keyword">const</span> <span className="syn-property">isAdmin</span>{" "}
            = <span className="syn-property">roles</span>.
            <span className="syn-function">includes</span>(
            <span className="syn-string">"admin"</span>){"\n"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">permissions</span> ={" "}
            <span className="syn-function">flattenRolePermissions</span>(
            <span className="syn-property">roles</span>){"\n"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span> <span className="syn-property">ctxs</span> ={" "}
            <span className="syn-property">user</span>.
            <span className="syn-property">allowedContexts</span> ?? []
            {"\n"}
            {"\n"}
            {"  "}
            <span className="syn-comment">
              {"// Normalize to id-only tuples for policy evaluation"}
            </span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">allowedContexts</span> ={" "}
            <span className="syn-property">isAdmin</span>
            {"\n"}
            {"    "}? <span className="syn-keyword">null</span>
            {"\n"}
            {"    "}: <span className="syn-property">ctxs</span>.
            <span className="syn-function">map</span>(<span className="syn-param">c</span> ={"> "}(
            {"{"}
            {"\n"}
            {"        "}
            <span className="syn-property">brandId</span>: <span className="syn-param">c</span>.
            <span className="syn-property">brandId</span>,{"\n"}
            {"        "}
            <span className="syn-property">country</span>: <span className="syn-param">c</span>.
            <span className="syn-property">country</span>.<span className="syn-property">id</span>,
            {"\n"}
            {"        "}
            <span className="syn-property">indications</span>: <span className="syn-param">c</span>.
            <span className="syn-property">indications</span>.
            <span className="syn-function">map</span>(<span className="syn-param">i</span> ={">"}{" "}
            <span className="syn-param">i</span>.<span className="syn-property">id</span>),
            {"\n"}
            {"      "}
            {"}"}))
            {"\n"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">return</span>{" "}
            <span className="syn-function">createAuthSubject</span>({"\n"}
            {"    "}
            <span className="syn-property">user</span>.<span className="syn-property">id</span>,
            {"\n"}
            {"    "}
            <span className="syn-property">roles</span>,{"\n"}
            {"    "}
            <span className="syn-keyword">new</span> <span className="syn-type">Set</span>(
            <span className="syn-property">permissions</span>),
            {"\n"}
            {"    "}
            {"{"}
            {"\n"}
            {"      "}
            <span className="syn-property">scope</span>:{" "}
            <span className="syn-function">deriveScope</span>(
            <span className="syn-property">roles</span>),
            {"\n"}
            {"      "}
            <span className="syn-property">allowedContexts</span>,{"\n"}
            {"      "}
            <span className="syn-property">mfaVerified</span>:{" "}
            <span className="syn-property">user</span>.
            <span className="syn-property">mfaVerified</span> ??{" "}
            <span className="syn-keyword">false</span>,{"\n"}
            {"    "}
            {"}"},{"\n"}
            {"  "}){"\n"}
            {"}"}
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="stores/user.ts — simplified">
            <span className="syn-comment">// stores/user.ts — simplified</span>
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">useUserStore</span> ={" "}
            <span className="syn-function">create</span>((<span className="syn-param">set</span>) =
            {">"} ({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">subject</span>: <span className="syn-keyword">null</span>
            ,{"\n"}
            {"  "}
            <span className="syn-function">setUser</span>: (<span className="syn-param">user</span>)
            ={">"} <span className="syn-function">set</span>({"{"}
            {"\n"}
            {"    "}
            <span className="syn-property">subject</span>:{" "}
            <span className="syn-function">createDaVinciSubject</span>(
            <span className="syn-property">user</span>),
            {"\n"}
            {"  "}
            {"}"}),
            {"\n"}
            {"}"}))
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="amber">
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge">S</span>
            <span className="font-display font-semibold text-hex-amber text-lg tracking-wide">
              Immutable Subject Snapshot
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            The subject is created once on login and cached. All policy evaluations use this
            immutable snapshot — no re-derivation on every render.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
