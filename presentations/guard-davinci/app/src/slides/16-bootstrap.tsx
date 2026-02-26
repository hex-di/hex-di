import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function BootstrapSlide(): ReactNode {
  return (
    <Section id="bootstrap" number={16} label="DaVinci Migration" title="Bootstrap Guard">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Install <code className="text-hex-accent font-mono text-base">@hex-di/guard</code> and
          create two files that replace the{" "}
          <code className="text-hex-accent font-mono text-base">Role</code> enum and{" "}
          <code className="text-hex-accent font-mono text-base">derivePermissions()</code> in{" "}
          <code className="text-hex-accent font-mono text-base">stores/user.ts</code>. Permission
          tokens replace boolean flags. Roles replace the{" "}
          <code className="text-hex-accent font-mono text-base">MANAGER_ROLES</code> /{" "}
          <code className="text-hex-accent font-mono text-base">GLOBAL_ROLES</code> sets with typed
          inheritance.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in" delay={200}>
          <CodeBlock title="davinci/guard/permissions.ts">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createPermissionGroup</span> {"}"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">brand</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"brand"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"write"</span>,{" "}
            <span className="syn-string">"delete"</span>, <span className="syn-string">"sync"</span>
            ,{"\n"}
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">content</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"content"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"write"</span>,{" "}
            <span className="syn-string">"approve"</span>,{" "}
            <span className="syn-string">"publish"</span>,{"\n"}
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">user</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"user"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"manage"</span>
            ,{"\n"}
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">run</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"run"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>,{" "}
            <span className="syn-string">"readAll"</span>,{"\n"}
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">memory</span> ={" "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">"memory"</span>, [{"\n"}
            {"  "}
            <span className="syn-string">"read"</span>, <span className="syn-string">"write"</span>,{" "}
            <span className="syn-string">"delete"</span>,{" "}
            <span className="syn-string">"toggle"</span>,{"\n"}
            ])
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={300}>
          <CodeBlock title="davinci/guard/roles.ts">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createRole</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"@hex-di/guard"</span>
            {"\n"}
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-property">brand</span>,{" "}
            <span className="syn-property">content</span>,{" "}
            <span className="syn-property">user</span>, <span className="syn-property">run</span>,{" "}
            <span className="syn-property">memory</span> {"}"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">"./permissions"</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">globalWriter</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">"global_content_writer"</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">brand</span>.read,{" "}
            <span className="syn-property">content</span>.read,{" "}
            <span className="syn-property">content</span>.write,{"\n"}
            {"    "}
            <span className="syn-property">run</span>.read,{" "}
            <span className="syn-property">memory</span>.read,{"\n"}
            {"  "}],{"\n"}
            {"}"}){"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">globalManager</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">"global_content_manager"</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">content</span>.approve,{" "}
            <span className="syn-property">content</span>.publish,{"\n"}
            {"    "}
            <span className="syn-property">user</span>.manage,{" "}
            <span className="syn-property">memory</span>.write,{"\n"}
            {"    "}
            <span className="syn-property">memory</span>.delete,{" "}
            <span className="syn-property">memory</span>.toggle,{"\n"}
            {"  "}],{"\n"}
            {"  "}
            <span className="syn-property">inherits</span>: [
            <span className="syn-property">globalWriter</span>],{"\n"}
            {"}"}){"\n"}
            {"\n"}
            <span className="syn-comment">{"// localWriter, localManager — same shape"}</span>
            {"\n"}
            <span className="syn-comment">{"// cphWriter, cphManager   — same shape"}</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">admin</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>: <span className="syn-string">"admin"</span>,
            {"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [
            <span className="syn-comment">{"/* all 17 permissions */"}</span>],{"\n"}
            {"}"})
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={400}>
        <HudCard variant="green">
          <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-2">
            Zero Runtime Overhead
          </span>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            <code className="text-hex-accent">permissions.ts</code> defines{" "}
            <span className="text-hex-green font-semibold">5 groups, 17 tokens</span>.{" "}
            <code className="text-hex-accent">roles.ts</code> defines{" "}
            <span className="text-hex-green font-semibold">7 roles</span> matching the existing{" "}
            <code className="text-hex-accent">Role</code> enum in{" "}
            <code className="text-hex-accent">stores/user.ts</code>. Both files export plain frozen
            objects — no React providers, no Zustand, no context wrappers.
          </p>
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={500}>
        <div className="flex gap-3 flex-wrap mt-4">
          <Badge variant="amber">Step 1 of 5</Badge>
          <Badge variant="cyan">5 Groups · 17 Tokens</Badge>
          <Badge variant="accent">7 Roles</Badge>
          <Badge variant="green">Zero Providers</Badge>
        </div>
      </Animate>
    </Section>
  );
}
