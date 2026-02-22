import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function DavinciSetupSlide(): ReactNode {
  return (
    <Section id="davinci-setup" number={15} label="Davinci In Action" title="Real-World Setup">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-4 max-w-4xl">
          The <span className="text-hex-amber">Davinci</span> project (
          <code className="text-hex-amber font-mono text-base">genai-front-web</code>) is a pharma
          content management platform. Here's how it defines its authorization model using Guard.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="amber">7 permission groups</Badge>
          <Badge variant="amber">7 roles</Badge>
          <Badge variant="amber">13 policies</Badge>
          <Badge variant="amber">91 test cases</Badge>
        </div>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="davinci/permissions.ts">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createPermissionGroup</span> {"}"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">'@hex-di/guard'</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">UserPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'user'</span>, [
            <span className="syn-string">'manage'</span>
            ]){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">BrandPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'brand'</span>,{"\n"}
            {"    "}[<span className="syn-string">'manage'</span>,{" "}
            <span className="syn-string">'delete'</span>, <span className="syn-string">'add'</span>
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">ContentPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'content'</span>,{"\n"}
            {"    "}[<span className="syn-string">'approve_global'</span>]){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">PromoPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'promo'</span>, [<span className="syn-string">'sync'</span>
            ])
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">MemoryPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'memory'</span>, [
            <span className="syn-string">'manage'</span>]){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">RunPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'run'</span>, [
            <span className="syn-string">'view_all'</span>
            ]){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">StatusPerms</span> ={"\n"}
            {"  "}
            <span className="syn-function">createPermissionGroup</span>(
            <span className="syn-string">'status'</span>, [
            <span className="syn-string">'view'</span>
            ])
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="davinci/roles.ts">
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">MANAGER_PERMISSIONS</span> = [{"\n"}
            {"  "}
            <span className="syn-property">UserPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"  "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"  "}
            <span className="syn-property">MemoryPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"  "}
            <span className="syn-property">StatusPerms</span>.
            <span className="syn-property">view</span>,{"\n"}
            {"  "}
            <span className="syn-property">ContentPerms</span>.
            <span className="syn-property">approve_global</span>,{"\n"}]{" "}
            <span className="syn-keyword">as const</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">GlobalWriter</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">'global_content_writer'</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: []{"\n"}
            {"})"}
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">GlobalManager</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">'global_content_manager'</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>:{" "}
            <span className="syn-property">MANAGER_PERMISSIONS</span>,{"\n"}
            {"  "}
            <span className="syn-property">inherits</span>: [
            <span className="syn-property">GlobalWriter</span>]{"\n"}
            {"})"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Admin — NO inheritance from managers</span>
            {"\n"}
            <span className="syn-comment">// Explicitly denied: approve_global,</span>
            {"\n"}
            <span className="syn-comment">// memory:manage</span>
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">Admin</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>: <span className="syn-string">'admin'</span>,
            {"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">UserPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"    "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"    "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">delete</span>,{"\n"}
            {"    "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">add</span>,{"\n"}
            {"    "}
            <span className="syn-property">PromoPerms</span>.
            <span className="syn-property">sync</span>,{"\n"}
            {"    "}
            <span className="syn-property">RunPerms</span>.
            <span className="syn-property">view_all</span>,{"\n"}
            {"    "}
            <span className="syn-property">StatusPerms</span>.
            <span className="syn-property">view</span>,{"\n"}
            {"  "}]{"\n"}
            {"})"}
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="amber">
          <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-2">
            Design Insight
          </span>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Admin explicitly does <span className="text-hex-amber">NOT</span> inherit from managers.
            This is intentional — the old Zustand code explicitly denied{" "}
            <code className="text-hex-accent">approve_global</code> and{" "}
            <code className="text-hex-accent">memory:manage</code> to admins. With Guard, this is
            modeled by simply not including those permissions in the Admin role.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
