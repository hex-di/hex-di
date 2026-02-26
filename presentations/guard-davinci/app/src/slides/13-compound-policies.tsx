import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { PermissionMatrix } from "../components/permission-matrix";
import { Animate } from "../components/animate";

export function CompoundPoliciesSlide(): ReactNode {
  return (
    <Section id="compound-policies" number={13} label="Composition" title="Compound Policies">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          DaVinci's full compound permission matrix — every business rule expressed as a{" "}
          <span className="text-hex-accent">named, composable policy</span> in a single registry
          file.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in" delay={200}>
          <CodeBlock title="davinci/policies.ts">
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canManageUsers</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">"Can Manage Users"</span>,{"\n"}
            {"    "}
            <span className="syn-function">anyOf</span>(
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"admin"</span>),{"\n"}
            {"          "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"global_content_manager"</span>),{"\n"}
            {"          "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"local_content_manager"</span>),{"\n"}
            {"          "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"cph_content_manager"</span>)))
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canDeleteBrand</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">"Can Delete Brand"</span>,{"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"admin"</span>))
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canSyncPromoMats</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">"Can Sync PromoMats"</span>,{"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"admin"</span>))
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canManageMemory</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">"Can Manage Memory"</span>,{"\n"}
            {"    "}
            <span className="syn-function">anyOf</span>(
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"admin"</span>),{"\n"}
            {"          "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"global_content_manager"</span>),{"\n"}
            {"          "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"local_content_manager"</span>),{"\n"}
            {"          "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"cph_content_manager"</span>)))
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canViewAllRuns</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">"Can View All Runs"</span>,{"\n"}
            {"    "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"admin"</span>))
            {"\n"}
            {"\n"}
            <span className="syn-keyword">export const</span>{" "}
            <span className="syn-property">canApproveContent</span> ={"\n"}
            {"  "}
            <span className="syn-function">withLabel</span>(
            <span className="syn-string">"Can Approve Content"</span>,{"\n"}
            {"    "}
            <span className="syn-function">allOf</span>(
            <span className="syn-function">hasPermission</span>(
            <span className="syn-property">content</span>.
            <span className="syn-property">approve</span>),{"\n"}
            {"          "}
            <span className="syn-function">anyOf</span>(
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"global_content_manager"</span>),{"\n"}
            {"                "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"local_content_manager"</span>),{"\n"}
            {"                "}
            <span className="syn-function">hasRole</span>(
            <span className="syn-string">"cph_content_manager"</span>))))
          </CodeBlock>
        </Animate>

        <Animate variant="fade-up" delay={300}>
          <PermissionMatrix
            columns={[
              "Manage Users",
              "Delete Brand",
              "Sync Promo",
              "Manage Memory",
              "View All Runs",
              "Approve",
            ]}
            rows={[
              { label: "admin", values: [true, true, true, true, true, false] },
              { label: "global-mgr", values: [true, false, false, true, false, true] },
              { label: "local-mgr", values: [true, false, false, true, false, true] },
              { label: "local-writer", values: [false, false, false, false, false, false] },
            ]}
          />
        </Animate>
      </div>
    </Section>
  );
}
