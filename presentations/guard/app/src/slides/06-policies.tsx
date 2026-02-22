import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";

function CombinatorCard({
  name,
  description,
  example,
}: {
  readonly name: string;
  readonly description: string;
  readonly example: ReactNode;
}): ReactNode {
  return (
    <HudCard>
      <div className="flex items-center gap-2 mb-2">
        <code className="font-mono text-base text-hex-primary font-semibold">{name}()</code>
      </div>
      <p className="font-mono text-base text-hex-muted leading-relaxed mb-3">{description}</p>
      <div className="font-mono text-base leading-relaxed">{example}</div>
    </HudCard>
  );
}

export function PoliciesSlide(): ReactNode {
  return (
    <Section id="policies" number={6} label="Access Model" title="Policy Combinators">
      <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
        Policies are composable, declarative rules. Atomic policies check single conditions.
        Combinators compose them into complex authorization logic. Every policy is a pure data
        structure — no callbacks, no side effects.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="cyan">hasPermission</Badge>
        <Badge variant="cyan">hasRole</Badge>
        <Badge variant="accent">anyOf</Badge>
        <Badge variant="accent">allOf</Badge>
        <Badge variant="accent">not</Badge>
        <Badge variant="green">withLabel</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <CombinatorCard
          name="hasPermission"
          description="Checks if subject holds a specific permission token."
          example={
            <>
              <span className="syn-function">hasPermission</span>(
              <span className="syn-property">BrandPerms</span>.
              <span className="syn-property">manage</span>)
            </>
          }
        />
        <CombinatorCard
          name="hasRole"
          description="Checks if subject has been assigned a specific role."
          example={
            <>
              <span className="syn-function">hasRole</span>(
              <span className="syn-string">'admin'</span>)
            </>
          }
        />
        <CombinatorCard
          name="anyOf"
          description="OR combinator. Passes if any child policy allows."
          example={
            <>
              <span className="syn-function">anyOf</span>({"\n"}
              {"  "}
              <span className="syn-function">hasRole</span>(
              <span className="syn-string">'admin'</span>),{"\n"}
              {"  "}
              <span className="syn-function">hasPermission</span>(
              <span className="syn-property">P</span>.<span className="syn-property">manage</span>)
              {"\n"})
            </>
          }
        />
        <CombinatorCard
          name="allOf"
          description="AND combinator. Passes only if all children allow."
          example={
            <>
              <span className="syn-function">allOf</span>({"\n"}
              {"  "}
              <span className="syn-function">hasRole</span>(
              <span className="syn-string">'manager'</span>),{"\n"}
              {"  "}
              <span className="syn-function">hasPermission</span>(
              <span className="syn-property">P</span>.<span className="syn-property">approve</span>)
              {"\n"})
            </>
          }
        />
        <CombinatorCard
          name="not"
          description="Negation combinator. Inverts the child policy decision."
          example={
            <>
              <span className="syn-function">not</span>(
              <span className="syn-function">hasRole</span>(
              <span className="syn-string">'banned'</span>))
            </>
          }
        />
        <CombinatorCard
          name="withLabel"
          description="Wraps a policy with a human-readable label for traces and audit."
          example={
            <>
              <span className="syn-function">withLabel</span>({"\n"}
              {"  "}
              <span className="syn-string">'canManageUsers'</span>,{"\n"}
              {"  "}
              <span className="syn-function">anyOf</span>(
              <span className="syn-function">hasRole</span>(
              <span className="syn-string">'admin'</span>), ...){"\n"})
            </>
          }
        />
      </div>

      <CodeBlock title="composition example">
        <span className="syn-keyword">import</span> {"{"}{" "}
        <span className="syn-function">anyOf</span>,{" "}
        <span className="syn-function">hasPermission</span>,{" "}
        <span className="syn-function">hasRole</span>,{" "}
        <span className="syn-function">withLabel</span> {"}"}{" "}
        <span className="syn-keyword">from</span>{" "}
        <span className="syn-string">'@hex-di/guard'</span>
        {"\n"}
        {"\n"}
        <span className="syn-keyword">export const</span>{" "}
        <span className="syn-property">canManageUsersPolicy</span> ={" "}
        <span className="syn-function">withLabel</span>({"\n"}
        {"  "}
        <span className="syn-string">'canManageUsers'</span>,{"\n"}
        {"  "}
        <span className="syn-function">anyOf</span>({"\n"}
        {"    "}
        <span className="syn-function">hasRole</span>(<span className="syn-string">'admin'</span>),
        {"\n"}
        {"    "}
        <span className="syn-function">hasPermission</span>(
        <span className="syn-property">UserPerms</span>.<span className="syn-property">manage</span>
        ){"\n"}
        {"  "}){"\n"}
        {")"}
      </CodeBlock>
    </Section>
  );
}
