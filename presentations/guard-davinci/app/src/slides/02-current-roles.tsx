import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function CurrentRolesSlide(): ReactNode {
  return (
    <Section id="current-roles" number={2} label="The Problem" title="Hardcoded Roles">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="stores/user.ts — Role Enum">
            <span className="syn-keyword">const</span> <span className="syn-property">Role</span> ={" "}
            {"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">ADMIN</span>: <span className="syn-string">'admin'</span>
            ,{"\n"}
            {"  "}
            <span className="syn-property">GLOBAL_CONTENT_WRITER</span>:{" "}
            <span className="syn-string">'global_content_writer'</span>,{"\n"}
            {"  "}
            <span className="syn-property">GLOBAL_CONTENT_MANAGER</span>:{" "}
            <span className="syn-string">'global_content_manager'</span>,{"\n"}
            {"  "}
            <span className="syn-property">LOCAL_CONTENT_WRITER</span>:{" "}
            <span className="syn-string">'local_content_writer'</span>,{"\n"}
            {"  "}
            <span className="syn-property">LOCAL_CONTENT_MANAGER</span>:{" "}
            <span className="syn-string">'local_content_manager'</span>,{"\n"}
            {"  "}
            <span className="syn-property">CPH_CONTENT_WRITER</span>:{" "}
            <span className="syn-string">'cph_content_writer'</span>,{"\n"}
            {"  "}
            <span className="syn-property">CPH_CONTENT_MANAGER</span>:{" "}
            <span className="syn-string">'cph_content_manager'</span>,{"\n"}
            {"}"} <span className="syn-keyword">as</span> <span className="syn-keyword">const</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="stores/user.ts — derivePermissions()">
            <span className="syn-keyword">function</span>{" "}
            <span className="syn-function">derivePermissions</span>(
            <span className="syn-param">user</span>) {"{"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">const</span> <span className="syn-property">isAdmin</span>{" "}
            = <span className="syn-property">roles</span>.<span className="syn-function">some</span>
            (<span className="syn-param">r</span> ={">"} <span className="syn-param">r</span>.
            <span className="syn-property">id</span> === <span className="syn-property">Role</span>.
            <span className="syn-property">ADMIN</span>){"\n"}
            {"  "}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">isManager</span> ={" "}
            <span className="syn-property">roles</span>.<span className="syn-function">some</span>(
            <span className="syn-param">r</span> ={">"}{" "}
            <span className="syn-property">MANAGER_ROLES</span>.
            <span className="syn-function">has</span>(<span className="syn-param">r</span>.
            <span className="syn-property">id</span>))
            {"\n"}
            {"\n"}
            {"  "}
            <span className="syn-keyword">return</span> {"{"}
            {"\n"}
            {"    "}
            <span className="syn-property">canManageUsers</span>:{" "}
            <span className="syn-property">isAdmin</span> ||{" "}
            <span className="syn-property">isManager</span>,{"\n"}
            {"    "}
            <span className="syn-property">canDeleteBrand</span>:{" "}
            <span className="syn-property">isAdmin</span>,{"\n"}
            {"    "}
            <span className="syn-property">canSyncPromoMats</span>:{" "}
            <span className="syn-property">isAdmin</span>,{"\n"}
            {"    "}
            <span className="syn-property">canManageMemoryItems</span>:{" "}
            <span className="syn-property">isAdmin</span> ||{" "}
            <span className="syn-property">isManager</span>,{"\n"}
            {"    "}
            <span className="syn-property">canViewAllRuns</span>:{" "}
            <span className="syn-property">isAdmin</span>,{"\n"}
            {"    "}
            <span className="syn-property">canViewStatus</span>:{" "}
            <span className="syn-property">isAdmin</span> ||{" "}
            <span className="syn-property">isManager</span>,{"\n"}
            {"    "}
            <span className="syn-property">canAddBrand</span>:{" "}
            <span className="syn-property">isAdmin</span>,{"\n"}
            {"    "}
            <span className="syn-property">canApproveGlobalContent</span>:{" "}
            <span className="syn-property">isAdmin</span> ||{" "}
            <span className="syn-property">isManager</span>,{"\n"}
            {"  "}
            {"}"}
            {"\n"}
            {"}"}
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="accent">
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge-accent">!</span>
            <span className="font-display font-semibold text-hex-accent text-lg tracking-wide">
              Monolithic Permission Derivation
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Every new permission requires modifying this function, rebuilding, and redeploying.
            There's no way to add permissions at runtime or test policies in isolation.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
