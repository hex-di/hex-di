import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function ReactComponentsSlide(): ReactNode {
  return (
    <Section
      id="react-components"
      number={14}
      label="React Integration"
      title="Can / Cannot Components"
    >
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        Declarative authorization in JSX.{" "}
        <code className="text-hex-pink font-mono text-base">{"<Can>"}</code> renders children only
        if the policy allows.{" "}
        <code className="text-hex-pink font-mono text-base">{"<Cannot>"}</code> renders the inverse.
        Both accept a <code className="text-hex-primary font-mono text-base">fallback</code> prop.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CodeBlock title="<Can> component">
          <span className="syn-keyword">import</span> {"{"} <span className="syn-type">Can</span>{" "}
          {"}"} <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'@hex-di/guard-react'</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">function</span>{" "}
          <span className="syn-function">BrandActions</span>() {"{"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span> ({"\n"}
          {"    "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-keyword">div</span>
          {">"}
          {"\n"}
          {"      "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">Can</span>
          {"\n"}
          {"        "}
          <span className="syn-attr">policy</span>={"{"}
          <span className="syn-property">canDeleteBrandPolicy</span>
          {"}"}
          {"\n"}
          {"        "}
          <span className="syn-attr">fallback</span>={"{"}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-keyword">span</span>
          {">"}No access<span className="syn-tag">{"</"}</span>
          <span className="syn-keyword">span</span>
          {">"}
          {"}"}
          {"\n"}
          {"      "}
          {">"}
          {"\n"}
          {"        "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">DeleteButton</span> /{">"}
          {"\n"}
          {"      "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-type">Can</span>
          {">"}
          {"\n"}
          {"\n"}
          {"      "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">Can</span> <span className="syn-attr">policy</span>={"{"}
          <span className="syn-property">canAddBrandPolicy</span>
          {"}"}
          {">"}
          {"\n"}
          {"        "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">AddButton</span> /{">"}
          {"\n"}
          {"      "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-type">Can</span>
          {">"}
          {"\n"}
          {"    "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-keyword">div</span>
          {">"}
          {"\n"}
          {"  "}){"\n"}
          {"}"}
        </CodeBlock>

        <CodeBlock title="useCan() hook">
          <span className="syn-keyword">import</span> {"{"}{" "}
          <span className="syn-function">useCan</span> {"}"}{" "}
          <span className="syn-keyword">from</span>{" "}
          <span className="syn-string">'./guard/hooks'</span>
          {"\n"}
          {"\n"}
          <span className="syn-keyword">function</span>{" "}
          <span className="syn-function">Dashboard</span>() {"{"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">const</span> <span className="syn-property">canManage</span>{" "}
          = <span className="syn-function">useCan</span>({"\n"}
          {"    "}
          <span className="syn-property">canManageBrandsPolicy</span>
          {"\n"}
          {"  "}){"\n"}
          {"  "}
          <span className="syn-keyword">const</span> <span className="syn-property">canDelete</span>{" "}
          = <span className="syn-function">useCan</span>({"\n"}
          {"    "}
          <span className="syn-property">canDeleteBrandPolicy</span>
          {"\n"}
          {"  "}){"\n"}
          {"\n"}
          {"  "}
          <span className="syn-keyword">return</span> ({"\n"}
          {"    "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-keyword">div</span>
          {">"}
          {"\n"}
          {"      "}
          {"{"}
          <span className="syn-property">canManage</span> && <span className="syn-tag">{"<"}</span>
          <span className="syn-type">ManagePanel</span> /{">"}
          {"}"}
          {"\n"}
          {"      "}
          {"{"}
          <span className="syn-property">canDelete</span> && <span className="syn-tag">{"<"}</span>
          <span className="syn-type">DeleteZone</span> /{">"}
          {"}"}
          {"\n"}
          {"    "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-keyword">div</span>
          {">"}
          {"\n"}
          {"  "}){"\n"}
          {"}"}
        </CodeBlock>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CodeBlock title="<Cannot> component">
          <span className="syn-tag">{"<"}</span>
          <span className="syn-type">Cannot</span> <span className="syn-attr">policy</span>={"{"}
          <span className="syn-property">isAdminPolicy</span>
          {"}"}
          {">"}
          {"\n"}
          {"  "}
          <span className="syn-tag">{"<"}</span>
          <span className="syn-keyword">div</span> <span className="syn-attr">className</span>=
          <span className="syn-string">"restricted-banner"</span>
          {">"}
          {"\n"}
          {"    "}You need admin access to view this{"\n"}
          {"  "}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-keyword">div</span>
          {">"}
          {"\n"}
          <span className="syn-tag">{"</"}</span>
          <span className="syn-type">Cannot</span>
          {">"}
        </CodeBlock>

        <HudCard variant="pink">
          <span className="font-display font-semibold text-hex-pink text-lg tracking-wide block mb-2">
            Component vs Hook
          </span>
          <div className="space-y-2 font-mono text-base text-hex-muted">
            <div className="flex items-start gap-2">
              <span className="text-hex-pink shrink-0">&#9656;</span>
              <span>
                <code className="text-hex-primary">{"<Can>"}</code> — Declarative, template-level.
                Best for toggling UI elements.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-hex-pink shrink-0">&#9656;</span>
              <span>
                <code className="text-hex-primary">useCan()</code> — Imperative, logic-level. Best
                for conditional behavior in handlers.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-hex-pink shrink-0">&#9656;</span>
              <span>Both evaluate the same policy engine — same result, different ergonomics.</span>
            </div>
          </div>
        </HudCard>
      </div>
    </Section>
  );
}
