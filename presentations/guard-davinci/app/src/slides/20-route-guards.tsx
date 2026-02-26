import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function RouteGuardsSlide(): ReactNode {
  return (
    <Section id="route-guards" number={20} label="DaVinci Migration" title="Route Protection">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          DaVinci currently has <span className="text-red-400 font-semibold">no route guards</span>.
          Anyone with a URL can reach any page. The{" "}
          <code className="text-hex-primary font-mono text-base">GuardedRoute</code> component adds
          policy-based route protection with a single wrapper.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="GuardedRoute component">
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">GuardedRoute</span>({"{"}{" "}
            <span className="syn-param">policy</span>, <span className="syn-param">fallback</span>,{" "}
            <span className="syn-param">children</span> {"}"}) {"{"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span> {"{"}{" "}
            <span className="syn-property">allowed</span>,{" "}
            <span className="syn-property">loading</span> {"}"} ={" "}
            <span className="syn-function">useCan</span>(
            <span className="syn-property">policy</span>){"\n"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">if</span> (<span className="syn-property">loading</span>){" "}
            <span className="syn-keyword">return</span> <span className="syn-tag">{"<"}</span>
            <span className="syn-type">Spinner</span> <span className="syn-tag">/{">"}</span>
            {"\n"}
            {"  "}
            <span className="syn-keyword">if</span> (!
            <span className="syn-property">allowed</span>){" "}
            <span className="syn-keyword">return</span>{" "}
            <span className="syn-property">fallback</span> ?? <span className="syn-tag">{"<"}</span>
            <span className="syn-type">Navigate</span> <span className="syn-property">to</span>=
            <span className="syn-string">"/"</span> <span className="syn-tag">/{">"}</span>
            {"\n"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">return</span>{" "}
            <span className="syn-property">children</span>
            {"\n"}
            {"}"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Usage in router</span>
            {"\n"}
            <span className="syn-tag">{"<"}</span>
            <span className="syn-type">Route</span>
            {"\n"}
            {"  "}
            <span className="syn-property">path</span>=
            <span className="syn-string">"/settings/user-management"</span>
            {"\n"}
            {"  "}
            <span className="syn-property">element</span>={"{"}
            {"\n"}
            {"    "}
            <span className="syn-tag">{"<"}</span>
            <span className="syn-type">GuardedRoute</span>
            {"\n"}
            {"      "}
            <span className="syn-property">policy</span>={"{"}
            <span className="syn-property">policies</span>.
            <span className="syn-property">canManageUsers</span>
            {"}"}
            {"\n"}
            {"      "}
            <span className="syn-property">fallback</span>={"{"}
            <span className="syn-tag">{"<"}</span>
            <span className="syn-type">AccessDenied</span> <span className="syn-tag">/{">"}</span>
            {"}"}
            <span className="syn-tag">{">"}</span>
            {"\n"}
            {"      "}
            <span className="syn-tag">{"<"}</span>
            <span className="syn-type">UserManagement</span> <span className="syn-tag">/{">"}</span>
            {"\n"}
            {"    "}
            <span className="syn-tag">{"</"}</span>
            <span className="syn-type">GuardedRoute</span>
            <span className="syn-tag">{">"}</span>
            {"\n"}
            {"  "}
            {"}"}
            {"\n"}
            <span className="syn-tag">/{">"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <HudCard variant="amber">
            <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-4">
              Route Policy Map
            </span>
            <div className="space-y-3 font-mono text-base">
              {[
                ["/settings/user-management", "canManageUsers"],
                ["/brand-manager/:id/delete", "canDeleteBrand"],
                ["/brand-manager/new", "canAddBrand"],
                ["/history (all runs view)", "canViewAllRuns"],
              ].map(([route, policy]) => (
                <div key={route} className="flex items-start gap-3">
                  <span className="text-hex-muted shrink-0">{route}</span>
                  <span className="text-hex-amber shrink-0">&rarr;</span>
                  <span className="text-hex-primary">{policy}</span>
                </div>
              ))}
            </div>
          </HudCard>
        </Animate>
      </div>
    </Section>
  );
}
