import type { ReactNode } from "react";
import { Section } from "../components/section";
import { ComparisonCard } from "../components/comparison-card";
import { Animate } from "../components/animate";

export function ComponentMigrationSlide(): ReactNode {
  return (
    <Section
      id="component-migration"
      number={19}
      label="DaVinci Migration"
      title="Component Migration"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Three real DaVinci components — before and after. Every{" "}
          <code className="text-hex-accent font-mono text-base">useUserStore</code> boolean check
          becomes a declarative{" "}
          <code className="text-hex-primary font-mono text-base">useCan()</code> call.
        </p>
      </Animate>

      <div className="space-y-5">
        <Animate variant="fade-in">
          <ComparisonCard
            beforeTitle="brand-header.tsx — Before"
            afterTitle="brand-header.tsx — After"
            before={
              <pre className="terminal-body whitespace-pre overflow-x-auto text-sm">
                <code>
                  <span className="syn-keyword">const</span>{" "}
                  <span className="syn-property">canDeleteBrand</span> ={"\n"}
                  {"  "}
                  <span className="syn-function">useUserStore</span>({"\n"}
                  {"    "}
                  <span className="syn-param">state</span> ={">"}{" "}
                  <span className="syn-param">state</span>.
                  <span className="syn-property">canDeleteBrand</span>
                  {"\n"}
                  {"  "}){"\n"}
                  {"\n"}
                  {"{"}
                  <span className="syn-property">canDeleteBrand</span> && ({"\n"}
                  {"  "}
                  <span className="syn-tag">{"<"}</span>
                  <span className="syn-type">MenuItem</span>
                  <span className="syn-tag">{">"}</span>Delete brand
                  <span className="syn-tag">{"</"}</span>
                  <span className="syn-type">MenuItem</span>
                  <span className="syn-tag">{">"}</span>
                  {"\n"}
                  {")"}
                  {"}"}
                </code>
              </pre>
            }
            after={
              <pre className="terminal-body whitespace-pre overflow-x-auto text-sm">
                <code>
                  <span className="syn-keyword">const</span> {"{"}{" "}
                  <span className="syn-property">allowed</span> {"}"} ={"\n"}
                  {"  "}
                  <span className="syn-function">useCan</span>(
                  <span className="syn-property">policies</span>.
                  <span className="syn-property">canDeleteBrand</span>){"\n"}
                  {"\n"}
                  {"{"}
                  <span className="syn-property">allowed</span> && ({"\n"}
                  {"  "}
                  <span className="syn-tag">{"<"}</span>
                  <span className="syn-type">MenuItem</span>
                  <span className="syn-tag">{">"}</span>Delete brand
                  <span className="syn-tag">{"</"}</span>
                  <span className="syn-type">MenuItem</span>
                  <span className="syn-tag">{">"}</span>
                  {"\n"}
                  {")"}
                  {"}"}
                </code>
              </pre>
            }
          />
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <ComparisonCard
            beforeTitle="create-item-button.tsx — Before"
            afterTitle="create-item-button.tsx — After"
            before={
              <pre className="terminal-body whitespace-pre overflow-x-auto text-sm">
                <code>
                  <span className="syn-keyword">const</span>{" "}
                  <span className="syn-property">canManageMemoryItems</span> ={"\n"}
                  {"  "}
                  <span className="syn-function">useUserStore</span>({"\n"}
                  {"    "}
                  <span className="syn-param">state</span> ={">"}{" "}
                  <span className="syn-param">state</span>.
                  <span className="syn-property">canManageMemoryItems</span>
                  {"\n"}
                  {"  "}){"\n"}
                  {"\n"}
                  <span className="syn-keyword">if</span> (!
                  <span className="syn-property">canManageMemoryItems</span>){"\n"}
                  {"  "}
                  <span className="syn-keyword">return</span>{" "}
                  <span className="syn-keyword">null</span>
                </code>
              </pre>
            }
            after={
              <pre className="terminal-body whitespace-pre overflow-x-auto text-sm">
                <code>
                  <span className="syn-keyword">const</span> {"{"}{" "}
                  <span className="syn-property">allowed</span> {"}"} ={"\n"}
                  {"  "}
                  <span className="syn-function">useCan</span>(
                  <span className="syn-property">policies</span>.
                  <span className="syn-property">canManageMemory</span>){"\n"}
                  {"\n"}
                  <span className="syn-keyword">if</span> (!
                  <span className="syn-property">allowed</span>){"\n"}
                  {"  "}
                  <span className="syn-keyword">return</span>{" "}
                  <span className="syn-keyword">null</span>
                </code>
              </pre>
            }
          />
        </Animate>

        <Animate variant="fade-in" delay={200}>
          <ComparisonCard
            beforeTitle="routes.config.ts — Before"
            afterTitle="routes.config.ts — After"
            before={
              <pre className="terminal-body whitespace-pre overflow-x-auto text-sm">
                <code>
                  <span className="syn-property">canAccess</span>: () ={">"}
                  {"\n"}
                  {"  "}
                  <span className="syn-function">useUserStore</span>.
                  <span className="syn-function">getState</span>()
                  {"\n"}
                  {"    "}.<span className="syn-property">canManageUsers</span>
                </code>
              </pre>
            }
            after={
              <pre className="terminal-body whitespace-pre overflow-x-auto text-sm">
                <code>
                  <span className="syn-property">canAccess</span>: () ={">"}
                  {"\n"}
                  {"  "}
                  <span className="syn-property">guardClient</span>.
                  <span className="syn-function">check</span>({"\n"}
                  {"    "}
                  <span className="syn-property">policies</span>.
                  <span className="syn-property">canManageUsers</span>
                  {"\n"}
                  {"  "})
                </code>
              </pre>
            }
          />
        </Animate>
      </div>
    </Section>
  );
}
