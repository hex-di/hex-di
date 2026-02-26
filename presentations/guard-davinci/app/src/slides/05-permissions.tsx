import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";

export function PermissionsSlide(): ReactNode {
  return (
    <Section id="permissions" number={5} label="Guard Primitives" title="Permission Tokens">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Replace string permissions with{" "}
          <span className="text-hex-primary">branded nominal types</span>. Each permission is a
          compile-time token. Typos become type errors. Mixing{" "}
          <code className="text-hex-accent font-mono text-base">brand.delete</code> with{" "}
          <code className="text-hex-accent font-mono text-base">brand.read</code> is impossible at
          the type level.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="@hex-di/guard">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createPermission</span>,{" "}
            <span className="syn-function">createPermissionGroup</span> {"}"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">brand</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"brand"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"write"</span>,{" "}
            <span className="syn-string">"delete"</span>, <span className="syn-string">"sync"</span>
            {"\n"}
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">content</span>{" "}
            = <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"content"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"write"</span>,{" "}
            <span className="syn-string">"approve"</span>,{" "}
            <span className="syn-string">"publish"</span>
            {"\n"}
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">user</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"user"</span>, [<span className="syn-string">"read"</span>,{" "}
            <span className="syn-string">"manage"</span>])
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">run</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"run"</span>, [<span className="syn-string">"read"</span>,{" "}
            <span className="syn-string">"readAll"</span>])
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">memory</span>{" "}
            = <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"memory"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"write"</span>,{" "}
            <span className="syn-string">"delete"</span>,{" "}
            <span className="syn-string">"toggle"</span>
            {"\n"}
            ])
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <div className="space-y-4">
            <HudCard>
              <div className="flex items-center gap-3 mb-3">
                <span className="num-badge">i</span>
                <span className="font-display font-semibold text-hex-primary text-lg tracking-wide">
                  Branded Token Types
                </span>
              </div>
              <p className="font-mono text-base text-hex-muted leading-relaxed mb-3">
                Each permission is a branded token type.{" "}
                <code className="text-hex-accent">brand.delete</code> is a distinct type from{" "}
                <code className="text-hex-accent">brand.read</code> — not a string, not a boolean.
              </p>
              <div className="font-mono text-base text-hex-muted leading-relaxed">
                <div className="mb-2">
                  <span className="text-hex-primary block mb-1">DaVinci Mapping</span>
                </div>
                <div className="space-y-1">
                  {[
                    ["brand", "read, write, delete, sync"],
                    ["content", "read, write, approve, publish"],
                    ["user", "read, manage"],
                    ["run", "read, readAll"],
                    ["memory", "read, write, delete, toggle"],
                  ].map(([group, actions]) => (
                    <div key={group} className="flex items-start gap-2">
                      <span className="text-hex-accent shrink-0">{"\u25B8"}</span>
                      <span>
                        <span className="text-hex-primary">{group}</span>
                        <span className="text-hex-muted/60">
                          {" "}
                          {"\u2192"} {actions}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </HudCard>

            <div className="flex gap-3 flex-wrap">
              <Badge variant="accent">5 Groups</Badge>
              <Badge variant="cyan">17 Permissions</Badge>
              <Badge variant="pink">Branded Types</Badge>
            </div>
          </div>
        </Animate>
      </div>
    </Section>
  );
}
