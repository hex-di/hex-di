import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { ComparisonCard } from "../components/comparison-card";
import { PermissionMatrix } from "../components/permission-matrix";
import { Animate } from "../components/animate";

export function BrandScopingSlide(): ReactNode {
  return (
    <Section id="brand-scoping" number={11} label="Composition" title="Brand Scoping Policy">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          Replace DaVinci's ad-hoc brand filtering with a{" "}
          <span className="text-hex-accent">declarative policy</span> that composes role checks,
          scope checks, and brand membership into a single evaluable tree.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <div className="mb-6">
          <ComparisonCard
            beforeTitle="DaVinci: Ad-hoc Filtering"
            afterTitle="Guard: Declarative Policy"
            before={
              <CodeBlock>
                <span className="syn-keyword">const</span>{" "}
                <span className="syn-property">allowedBrandIds</span> ={" "}
                <span className="syn-function">useUserStore</span>({"\n"}
                {"  "}
                <span className="syn-param">state</span> ={">"}{" "}
                <span className="syn-param">state</span>.
                <span className="syn-property">allowedBrandIds</span>
                {"\n"}
                {")"}
                {"\n"}
                <span className="syn-keyword">const</span>{" "}
                <span className="syn-property">filteredBrands</span> ={"\n"}
                {"  "}
                <span className="syn-property">allowedBrandIds</span> ==={" "}
                <span className="syn-keyword">null</span>
                {"\n"}
                {"    "}? <span className="syn-property">allBrands</span>
                {"\n"}
                {"    "}: <span className="syn-property">allBrands</span>.
                <span className="syn-function">filter</span>({"\n"}
                {"        "}
                <span className="syn-param">brand</span> ={">"}{" "}
                <span className="syn-property">allowedBrandIds</span>.
                <span className="syn-function">has</span>(<span className="syn-param">brand</span>.
                <span className="syn-property">id</span>){"\n"}
                {"      "})
              </CodeBlock>
            }
            after={
              <CodeBlock>
                <span className="syn-keyword">const</span>{" "}
                <span className="syn-property">canAccessBrand</span> ={"\n"}
                {"  "}
                <span className="syn-function">withLabel</span>(
                <span className="syn-string">"Brand Access"</span>,{"\n"}
                {"    "}
                <span className="syn-function">anyOf</span>({"\n"}
                {"      "}
                <span className="syn-function">hasRole</span>(
                <span className="syn-string">"admin"</span>),{"\n"}
                {"      "}
                <span className="syn-function">hasAttribute</span>({"\n"}
                {"        "}
                <span className="syn-string">"scope"</span>,{" "}
                <span className="syn-function">eq</span>(
                <span className="syn-function">literal</span>(
                <span className="syn-string">"global"</span>))){"\n"}
                {"      "}),{"\n"}
                {"      "}
                <span className="syn-function">hasAttribute</span>({"\n"}
                {"        "}
                <span className="syn-string">"allowedBrandIds"</span>,{"\n"}
                {"        "}
                <span className="syn-function">contains</span>(
                <span className="syn-property">brandId</span>){"\n"}
                {"      "}),{"\n"}
                {"    "}){"\n"}
                {"  "}
                {")"}
              </CodeBlock>
            }
          />
        </div>
      </Animate>

      <Animate variant="fade-up" delay={300}>
        <PermissionMatrix
          columns={["brand-123", "brand-456", "brand-789"]}
          rows={[
            { label: "admin", values: [true, true, true] },
            { label: "global-mgr", values: [true, true, true] },
            { label: "local-mgr", values: [true, true, false] },
            { label: "local-writer", values: [true, false, false] },
          ]}
        />
      </Animate>
    </Section>
  );
}
