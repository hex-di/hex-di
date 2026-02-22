import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";

export function DavinciReactSlide(): ReactNode {
  return (
    <Section
      id="davinci-react"
      number={17}
      label="Davinci In Action"
      title="React Integration in Production"
    >
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        Davinci uses <span className="text-hex-amber">GuardBridge</span>, custom hooks, a route
        guard, and data filter hooks to enforce authorization across the entire application.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="GuardBridge.tsx">
          <span className="syn-keyword">export function</span>{" "}
          <span className="syn-function">GuardBridge</span>({"{"}
          {"\n"}
          {"  "}
          <span className="syn-param">children</span>
          {"\n"}
          {"}: {"} <span className="syn-keyword">readonly</span>{" "}
          <span className="syn-property">children</span>:{" "}
          <span className="syn-type">ReactNode</span> {"}"}) {"{"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">const</span> <span className="syn-property">user</span> ={" "}
          <span className="syn-function">useUserStore</span>({"\n"}
          {"    "}(<span className="syn-param">s</span>) ={">"} <span className="syn-param">s</span>
          .<span className="syn-property">user</span>
          {"\n"}
          {"  "}){"\n"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">const</span> <span className="syn-property">subject</span> ={" "}
          <span className="syn-function">useMemo</span>(() ={">"} {"{"}
          {"\n"}
          {"    "}
          <span className="syn-keyword">if</span> (!<span className="syn-property">user</span>?.
          <span className="syn-property">roles</span>?.<span className="syn-property">length</span>)
          {"\n"}
          {"      "}
          <span className="syn-keyword">return</span>{" "}
          <span className="syn-function">createAuthSubject</span>({"\n"}
          {"        "}
          <span className="syn-string">'anonymous'</span>, [],{" "}
          <span className="syn-keyword">new</span> <span className="syn-type">Set</span>(){"\n"}
          {"      "}){"\n"}
          {"    "}
          <span className="syn-keyword">return</span>{" "}
          <span className="syn-function">createAppSubject</span>(
          <span className="syn-property">user</span>){"\n"}
          {"  "}
          {"}"}, [<span className="syn-property">user</span>]){"\n"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span> ({"\n"}
          {"    "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">SubjectContext.Provider</span>
          {"\n"}
          {"      "}
          <span className="syn-attr">value</span>={"{"}
          <span className="syn-property">subject</span>
          {"}"}
          {">"}
          {"\n"}
          {"      "}
          {"{"}
          <span className="syn-property">children</span>
          {"}"}
          {"\n"}
          {"    "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-type">SubjectContext.Provider</span>
          {">"}
          {"\n"}
          {"  "}){"\n"}
          {"}"}
        </CodeBlock>

        <CodeBlock title="route-guard.ts">
          <span className="syn-comment">// Non-hook guard for route protection</span>
          {"\n"}
          <span className="syn-keyword">export function</span>{" "}
          <span className="syn-function">canAccess</span>({"\n"}
          {"  "}
          <span className="syn-param">policy</span>:{" "}
          <span className="syn-type">PolicyConstraint</span>
          {"\n"}
          {"): "}
          <span className="syn-type">() ={">"} boolean</span> {"{"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span> () ={">"} {"{"}
          {"\n"}
          {"    "}
          <span className="syn-keyword">const</span> <span className="syn-property">user</span> =
          {"\n"}
          {"      "}
          <span className="syn-function">useUserStore</span>.
          <span className="syn-function">getState</span>().
          <span className="syn-property">user</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">if</span> (!<span className="syn-property">user</span>?.
          <span className="syn-property">roles</span>?.<span className="syn-property">length</span>)
          {"\n"}
          {"      "}
          <span className="syn-keyword">return</span> <span className="syn-keyword">false</span>
          {"\n"}
          {"    "}
          <span className="syn-keyword">const</span> <span className="syn-property">subject</span> ={" "}
          <span className="syn-function">createAppSubject</span>(
          <span className="syn-property">user</span>){"\n"}
          {"    "}
          <span className="syn-keyword">const</span> <span className="syn-property">result</span> ={" "}
          <span className="syn-function">evaluate</span>({"\n"}
          {"      "}
          <span className="syn-property">policy</span>, {"{"}{" "}
          <span className="syn-property">subject</span> {"}"}
          {"\n"}
          {"    "}){"\n"}
          {"    "}
          <span className="syn-keyword">return</span> <span className="syn-property">result</span>.
          <span className="syn-function">isOk</span>(){"\n"}
          {"      "}&& <span className="syn-property">result</span>.
          <span className="syn-property">value</span>.<span className="syn-property">kind</span> ==={" "}
          <span className="syn-string">'allow'</span>
          {"\n"}
          {"  "}
          {"}"}
          {"\n"}
          {"}"}
        </CodeBlock>
      </div>

      <CodeBlock title="brand-filter.ts — Data-level authorization">
        <span className="syn-keyword">export function</span>{" "}
        <span className="syn-function">useBrandFilter</span>() {"{"}
        {"\n"}
        {"  "}
        <span className="syn-keyword">const</span> {"{"}{" "}
        <span className="syn-property">enableUserRoleSetup</span> {"}"} ={" "}
        <span className="syn-function">useFlags</span>(){"\n"}
        {"  "}
        <span className="syn-keyword">const</span> <span className="syn-property">subject</span> ={" "}
        <span className="syn-function">useSubject</span>(){"\n"}
        {"  "}
        <span className="syn-keyword">const</span>{" "}
        <span className="syn-property">unrestricted</span> ={" "}
        <span className="syn-function">useCan</span>(
        <span className="syn-property">isAdminPolicy</span>){"\n"}
        {"\n"}
        {"  "}
        <span className="syn-keyword">return</span>{" "}
        <span className="syn-function">useCallback</span>({"<"}
        <span className="syn-type">T</span> <span className="syn-keyword">extends</span> {"{"}{" "}
        <span className="syn-property">id</span>: <span className="syn-type">string</span> {"}"}
        {">"}(<span className="syn-param">items</span>: <span className="syn-type">T</span>[]) =
        {">"} {"{"}
        {"\n"}
        {"    "}
        <span className="syn-keyword">if</span> (!
        <span className="syn-property">enableUserRoleSetup</span> ||{" "}
        <span className="syn-property">unrestricted</span>){" "}
        <span className="syn-keyword">return</span> <span className="syn-property">items</span>
        {"\n"}
        {"    "}
        <span className="syn-keyword">const</span> <span className="syn-property">allowed</span> ={" "}
        <span className="syn-property">subject</span>.
        <span className="syn-property">attributes</span>.
        <span className="syn-property">allowedBrandIds</span>
        {"\n"}
        {"    "}
        <span className="syn-keyword">if</span> (!(<span className="syn-property">allowed</span>{" "}
        <span className="syn-keyword">instanceof</span> <span className="syn-type">Set</span>)){" "}
        <span className="syn-keyword">return</span> <span className="syn-property">items</span>
        {"\n"}
        {"    "}
        <span className="syn-keyword">return</span> <span className="syn-property">items</span>.
        <span className="syn-function">filter</span>((<span className="syn-param">i</span>) ={">"}{" "}
        <span className="syn-property">allowed</span>.<span className="syn-function">has</span>(
        <span className="syn-param">i</span>.<span className="syn-property">id</span>)){"\n"}
        {"  "}
        {"}"}, [<span className="syn-property">enableUserRoleSetup</span>,{" "}
        <span className="syn-property">unrestricted</span>,{" "}
        <span className="syn-property">subject</span>]){"\n"}
        {"}"}
      </CodeBlock>
    </Section>
  );
}
