import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

export function DavinciPoliciesSlide(): ReactNode {
  return (
    <Section
      id="davinci-policies"
      number={16}
      label="Davinci In Action"
      title="Policy Definitions & Test Matrix"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Davinci defines 13 named policies composed from the permission groups. Every policy is
          covered by a 91-case test matrix ensuring correctness across all 7 roles.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="davinci/policies.ts">
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">isAdminPolicy</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">'isAdmin'</span>,{"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">'admin'</span>
            )){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">isManagerPolicy</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">'isManager'</span>,{" "}
            <span className="syn-function">anyOf</span>({"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">'global_content_manager'</span>),{"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">'local_content_manager'</span>),{"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">'cph_content_manager'</span>),{"\n"}
            {"  "}))){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canManageUsersPolicy</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">'canManageUsers'</span>,{" "}
            <span className="syn-function">anyOf</span>({"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">'admin'</span>
            ),{"\n"}
            {"    "}
            <span className="syn-function">hasPermission</span>(
            <span className="syn-property">UserPerms</span>.
            <span className="syn-property">manage</span>),{"\n"}
            {"  "}))){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canDeleteBrandPolicy</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">'canDeleteBrand'</span>,{"\n"}
            {"    "}
            <span className="syn-function">hasPermission</span>(
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">delete</span>)){"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canApproveGlobalPolicy</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">'canApproveGlobalContent'</span>,{"\n"}
            {"    "}
            <span className="syn-function">hasPermission</span>(
            <span className="syn-property">ContentPerms</span>.
            <span className="syn-property">approve_global</span>))
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <div className="space-y-4">
            <HudCard variant="amber">
              <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-3">
                Test Matrix (91 Cases)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="text-hex-muted border-b border-hex-muted/20">
                      <th className="text-left py-1.5 pr-2">Policy</th>
                      <th className="text-center px-1">ADM</th>
                      <th className="text-center px-1">GCM</th>
                      <th className="text-center px-1">LCM</th>
                      <th className="text-center px-1">CCM</th>
                      <th className="text-center px-1">GCW</th>
                      <th className="text-center px-1">LCW</th>
                      <th className="text-center px-1">CCW</th>
                    </tr>
                  </thead>
                  <tbody className="text-hex-text">
                    {[
                      ["isAdmin", [true, false, false, false, false, false, false]],
                      ["isManager", [false, true, true, true, false, false, false]],
                      ["canManageUsers", [true, true, true, true, false, false, false]],
                      ["canManageBrands", [true, true, true, true, false, false, false]],
                      ["canDeleteBrand", [true, false, false, false, false, false, false]],
                      ["canAddBrand", [true, false, false, false, false, false, false]],
                      ["canSyncPromo", [true, false, false, false, false, false, false]],
                      ["canManageMemory", [false, true, true, true, false, false, false]],
                      ["canViewAllRuns", [true, false, false, false, false, false, false]],
                      ["canViewStatus", [true, true, true, true, false, false, false]],
                      ["canApproveGlobal", [false, true, true, true, false, false, false]],
                      ["isGlobalMarketer", [false, true, false, false, true, false, false]],
                      ["isLocalMarketer", [false, false, true, false, false, true, false]],
                    ].map(([policy, results]) => (
                      <tr key={policy as string} className="border-b border-hex-muted/10">
                        <td className="py-1 pr-2 text-hex-primary">{policy as string}</td>
                        {(results as boolean[]).map((r, i) => (
                          <td
                            key={i}
                            className={`text-center px-1 ${r ? "text-hex-green" : "text-hex-muted/40"}`}
                          >
                            {r ? "\u2713" : "\u2717"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HudCard>

            <HudCard>
              <p className="font-mono text-base text-hex-muted leading-relaxed">
                <span className="text-hex-primary">Key insight:</span> Admin cannot approve global
                content or manage memory. Managers can. Writers have no permissions at all — they
                rely purely on role-based checks like{" "}
                <code className="text-hex-accent">isGlobalMarketer</code>.
              </p>
            </HudCard>
          </div>
        </Animate>
      </div>
    </Section>
  );
}
