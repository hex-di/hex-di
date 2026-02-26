import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

export function SubjectsSlide(): ReactNode {
  return (
    <Section id="subjects" number={7} label="Guard Primitives" title="Auth Subjects">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          DaVinci{"'"}s <code className="text-hex-primary font-mono text-base">/user/me</code>{" "}
          response maps directly to a Guard{" "}
          <code className="text-hex-primary font-mono text-base">AuthSubject</code>. The subject
          carries identity, role assignments, permissions, and arbitrary attributes for ABAC
          evaluation.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="DaVinci: /user/me response" fontSize="text-xs">
            {"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">"id"</span>:{" "}
            <span className="syn-string">"user-123"</span>,{"\n"}
            {"  "}
            <span className="syn-property">"userName"</span>:{" "}
            <span className="syn-string">"alice.smith"</span>,{"\n"}
            {"  "}
            <span className="syn-property">"firstName"</span>:{" "}
            <span className="syn-string">"Alice"</span>,{"\n"}
            {"  "}
            <span className="syn-property">"lastName"</span>:{" "}
            <span className="syn-string">"Smith"</span>,{"\n"}
            {"  "}
            <span className="syn-property">"email"</span>:{" "}
            <span className="syn-string">"alice@example.com"</span>,{"\n"}
            {"  "}
            <span className="syn-property">"roles"</span>: [{"\n"}
            {"    "}
            {"{"} <span className="syn-property">"id"</span>:{" "}
            <span className="syn-string">"local_content_manager"</span>,{" "}
            <span className="syn-property">"label"</span>:{" "}
            <span className="syn-string">"Local Content Manager"</span> {"}"}
            {"\n"}
            {"  "}],{"\n"}
            {"  "}
            <span className="syn-property">"allowedContexts"</span>: [{"\n"}
            {"    "}
            {"{"}
            {"\n"}
            {"      "}
            <span className="syn-property">"brandId"</span>:{" "}
            <span className="syn-string">"brand-123"</span>,{"\n"}
            {"      "}
            <span className="syn-property">"brandLabel"</span>:{" "}
            <span className="syn-string">"Dupixent"</span>,{"\n"}
            {"      "}
            <span className="syn-property">"country"</span>: {"{"}{" "}
            <span className="syn-property">"id"</span>: <span className="syn-string">"FR"</span>,{" "}
            <span className="syn-property">"label"</span>:{" "}
            <span className="syn-string">"France"</span> {"}"},{"\n"}
            {"      "}
            <span className="syn-property">"indications"</span>: [{"\n"}
            {"        "}
            {"{"} <span className="syn-property">"id"</span>:{" "}
            <span className="syn-string">"ind-01"</span>,{" "}
            <span className="syn-property">"label"</span>:{" "}
            <span className="syn-string">"Atopic Dermatitis"</span> {"}"}
            {"\n"}
            {"      "}]{"\n"}
            {"    "}
            {"}"},{"\n"}
            {"    "}
            {"{"}
            {"\n"}
            {"      "}
            <span className="syn-property">"brandId"</span>:{" "}
            <span className="syn-string">"brand-456"</span>,{"\n"}
            {"      "}
            <span className="syn-property">"brandLabel"</span>:{" "}
            <span className="syn-string">"Aubagio"</span>,{"\n"}
            {"      "}
            <span className="syn-property">"country"</span>: {"{"}{" "}
            <span className="syn-property">"id"</span>: <span className="syn-string">"FR"</span>,{" "}
            <span className="syn-property">"label"</span>:{" "}
            <span className="syn-string">"France"</span> {"}"},{"\n"}
            {"      "}
            <span className="syn-property">"indications"</span>: [{"\n"}
            {"        "}
            {"{"} <span className="syn-property">"id"</span>:{" "}
            <span className="syn-string">"ind-02"</span>,{" "}
            <span className="syn-property">"label"</span>:{" "}
            <span className="syn-string">"Multiple Sclerosis"</span> {"}"}
            {"\n"}
            {"      "}]{"\n"}
            {"    "}
            {"}"}
            {"\n"}
            {"  "}]{"\n"}
            {"}"}
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="Guard: createAuthSubject" fontSize="text-xs">
            <span className="syn-comment">{"// Extracted from /user/me response"}</span>
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">subject</span>{" "}
            = <span className="syn-function">createAuthSubject</span>({"\n"}
            {"  "}
            <span className="syn-string">"user-123"</span>,{"\n"}
            {"  "}[<span className="syn-string">"local_content_manager"</span>],
            {"\n"}
            {"  "}
            <span className="syn-keyword">new</span> <span className="syn-type">Set</span>([
            {"\n"}
            {"    "}
            <span className="syn-string">"brand:read"</span>,{" "}
            <span className="syn-string">"brand:write"</span>,{"\n"}
            {"    "}
            <span className="syn-string">"content:read"</span>,{" "}
            <span className="syn-string">"content:write"</span>,{"\n"}
            {"    "}
            <span className="syn-string">"content:approve"</span>,{"\n"}
            {"  "}]),{"\n"}
            {"  "}
            {"{"}
            {"\n"}
            {"    "}
            <span className="syn-property">scope</span>: <span className="syn-string">"local"</span>
            ,{"\n"}
            {"    "}
            <span className="syn-comment">{"// Full context tuples for policy evaluation"}</span>
            {"\n"}
            {"    "}
            <span className="syn-property">allowedContexts</span>: [{"\n"}
            {"      "}
            {"{"} <span className="syn-property">brandId</span>:{" "}
            <span className="syn-string">"brand-123"</span>,{" "}
            <span className="syn-property">country</span>: <span className="syn-string">"FR"</span>,
            {"\n"}
            {"        "}
            <span className="syn-property">indications</span>: [
            <span className="syn-string">"ind-01"</span>] {"}"},{"\n"}
            {"      "}
            {"{"} <span className="syn-property">brandId</span>:{" "}
            <span className="syn-string">"brand-456"</span>,{" "}
            <span className="syn-property">country</span>: <span className="syn-string">"FR"</span>,
            {"\n"}
            {"        "}
            <span className="syn-property">indications</span>: [
            <span className="syn-string">"ind-02"</span>] {"}"},{"\n"}
            {"    "}],
            {"\n"}
            {"  "}
            {"}"}
            {"\n"})
          </CodeBlock>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="green">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="num-badge"
              style={{
                borderColor: "rgba(166,226,46,0.3)",
                background: "rgba(166,226,46,0.08)",
                color: "#A6E22E",
              }}
            >
              {"\u2713"}
            </span>
            <span className="font-display font-semibold text-hex-green text-lg tracking-wide">
              ABAC Attributes
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Subject attributes carry arbitrary metadata — scope, MFA status, and the full{" "}
            <code className="text-hex-green">allowedContexts</code> tuples. Each tuple preserves the
            association between brand, country, and indications — policies can match on any single
            dimension or the full combination.
          </p>
        </HudCard>
      </Animate>
    </Section>
  );
}
