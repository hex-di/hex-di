import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { Badge } from "../components/badge";

export function ScatteredChecksSlide(): ReactNode {
  return (
    <Section
      id="scattered-checks"
      number={3}
      label="The Problem"
      title="Scattered Permission Checks"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Over <span className="text-hex-accent">40 locations</span> in the codebase call{" "}
          <code className="text-hex-primary font-mono text-base">useUserStore</code> to read boolean
          permission flags. Each component pulls its own slice, checks its own conditions, and hides
          or shows UI accordingly. No centralized policy. No enforcement layer.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="brand-header.tsx">
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">canDeleteBrand</span> ={"\n"}
            {"  "}
            <span className="syn-function">useUserStore</span>(
            <span className="syn-param">state</span> ={">"} <span className="syn-param">state</span>
            .<span className="syn-property">canDeleteBrand</span>){"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">canSyncPromoMats</span> ={"\n"}
            {"  "}
            <span className="syn-function">useUserStore</span>(
            <span className="syn-param">state</span> ={">"} <span className="syn-param">state</span>
            .<span className="syn-property">canSyncPromoMats</span>){"\n"}
            {"\n"}
            {"{"}
            <span className="syn-property">canDeleteBrand</span> && ({"\n"}
            {"  "}
            {"<"}
            <span className="syn-tag">Menu.Item</span>
            {">"} Delete brand {"</"}
            <span className="syn-tag">Menu.Item</span>
            {">"}
            {"\n"}
            {")"}
            {"}"}
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="create-item-button.tsx">
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">canManageMemoryItems</span> ={"\n"}
            {"  "}
            <span className="syn-function">useUserStore</span>(
            <span className="syn-param">state</span> ={">"} <span className="syn-param">state</span>
            .<span className="syn-property">canManageMemoryItems</span>){"\n"}
            {"\n"}
            <span className="syn-keyword">if</span> (!
            <span className="syn-property">canManageMemoryItems</span>){" "}
            <span className="syn-keyword">return</span> <span className="syn-keyword">null</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={200}>
          <CodeBlock title="run-item.tsx">
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">canViewAllRuns</span> ={"\n"}
            {"  "}
            <span className="syn-function">useUserStore</span>(
            <span className="syn-param">state</span> ={">"} <span className="syn-param">state</span>
            .<span className="syn-property">canViewAllRuns</span>){"\n"}
            {"\n"}
            {"{"}
            <span className="syn-property">canViewAllRuns</span> && ({"\n"}
            {"  "}
            {"<"}
            <span className="syn-tag">Tooltip</span> <span className="syn-attr">label</span>={"{"}
            <span className="syn-property">run</span>.<span className="syn-property">user</span>
            {"}"}
            {">"}...{"</"}
            <span className="syn-tag">Tooltip</span>
            {">"}
            {"\n"}
            {")"}
            {"}"}
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={300}>
          <CodeBlock title="brand-selector.tsx">
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">canAddBrand</span> ={"\n"}
            {"  "}
            <span className="syn-function">useUserStore</span>(
            <span className="syn-param">state</span> ={">"} <span className="syn-param">state</span>
            .<span className="syn-property">canAddBrand</span>){"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">allowedBrandIds</span> ={"\n"}
            {"  "}
            <span className="syn-function">useUserStore</span>(
            <span className="syn-param">state</span> ={">"} <span className="syn-param">state</span>
            .<span className="syn-property">allowedBrandIds</span>){"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">filtered</span> ={" "}
            <span className="syn-property">brands</span>.
            <span className="syn-function">filter</span>(<span className="syn-param">b</span> ={">"}
            {"\n"}
            {"  "}
            <span className="syn-property">allowedBrandIds</span>.
            <span className="syn-function">includes</span>(<span className="syn-param">b</span>.
            <span className="syn-property">id</span>){"\n"})
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="fade-in" delay={400}>
        <div className="flex justify-center gap-4 flex-wrap">
          <Badge variant="accent">40+ Locations</Badge>
          <Badge variant="pink">0 Centralized Policy</Badge>
          <Badge variant="muted">Copy-paste Logic</Badge>
        </div>
      </Animate>
    </Section>
  );
}
