import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function GxpSlide(): ReactNode {
  return (
    <Section id="gxp" number={18} label="Production & Beyond" title="GxP Compliance">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-4 max-w-4xl">
          Guard is built for <span className="text-hex-amber">regulated environments</span>. The
          audit trail, electronic signatures, write-ahead log, and data retention modules satisfy
          FDA 21 CFR Part 11 and EU GMP Annex 11 requirements.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={200}>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="amber">21 CFR Part 11</Badge>
          <Badge variant="amber">EU GMP Annex 11</Badge>
          <Badge variant="amber">GAMP 5</Badge>
          <Badge variant="amber">ALCOA+</Badge>
          <Badge variant="amber">SHA-256 Hash Chain</Badge>
        </div>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="audit trail with hash chain">
            <span className="syn-comment">// Every audit entry is hash-chained</span>
            {"\n"}
            <span className="syn-keyword">interface</span>{" "}
            <span className="syn-type">AuditEntry</span> {"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">id</span>: <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">timestamp</span>: <span className="syn-type">Date</span>
            {"\n"}
            {"  "}
            <span className="syn-property">subjectId</span>:{" "}
            <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">decision</span>:{" "}
            <span className="syn-string">'allow'</span> | <span className="syn-string">'deny'</span>
            {"\n"}
            {"  "}
            <span className="syn-property">hash</span>: <span className="syn-type">string</span>{" "}
            <span className="syn-comment">// SHA-256</span>
            {"\n"}
            {"  "}
            <span className="syn-property">prevHash</span>: <span className="syn-type">string</span>{" "}
            <span className="syn-comment">// chain link</span>
            {"\n"}
            {"  "}
            <span className="syn-property">trace</span>:{" "}
            <span className="syn-type">EvaluationTrace</span>
            {"\n"}
            {"}"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Hash = SHA-256(prevHash + entry data)</span>
            {"\n"}
            <span className="syn-comment">// Tampering breaks the chain</span>
            {"\n"}
            <span className="syn-comment">// Verifiable: any auditor can walk</span>
            {"\n"}
            <span className="syn-comment">// the chain and detect gaps</span>
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <CodeBlock title="electronic signatures">
            <span className="syn-comment">// hasSignature() policy</span>
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">releaseBatch</span> ={" "}
            <span className="syn-function">allOf</span>({"\n"}
            {"  "}
            <span className="syn-function">hasPermission</span>(
            <span className="syn-property">BatchPerms</span>.
            <span className="syn-property">release</span>),{"\n"}
            {"  "}
            <span className="syn-function">hasSignature</span>({"{"}
            {"\n"}
            {"    "}
            <span className="syn-property">meaning</span>:{" "}
            <span className="syn-string">'approval'</span>,{"\n"}
            {"    "}
            <span className="syn-property">freshness</span>:{" "}
            <span className="syn-number">300_000</span>,{"\n"}
            {"  "}
            {"}"}){"\n"}
            {")"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Signature meanings (Part 11 Sec 11.50)</span>
            {"\n"}
            <span className="syn-keyword">type</span>{" "}
            <span className="syn-type">SignatureMeaning</span> ={"\n"}
            {"  "}| <span className="syn-string">'approval'</span>
            {"\n"}
            {"  "}| <span className="syn-string">'review'</span>
            {"\n"}
            {"  "}| <span className="syn-string">'responsibility'</span>
            {"\n"}
            {"  "}| <span className="syn-string">'authorship'</span>
            {"\n"}
            {"  "}| <span className="syn-string">'verification'</span>
          </CodeBlock>
        </Animate>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Animate variant="fade-in">
          <CodeBlock title="write-ahead log (WAL)">
            <span className="syn-keyword">const</span> <span className="syn-property">wal</span> ={" "}
            <span className="syn-function">createWriteAheadLog</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">storage</span>:{" "}
            <span className="syn-property">walStorageAdapter</span>,{"\n"}
            {"  "}
            <span className="syn-property">flushInterval</span>:{" "}
            <span className="syn-number">5_000</span>,{"\n"}
            {"})"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// WAL ensures audit entries are</span>
            {"\n"}
            <span className="syn-comment">// persisted even if the main store</span>
            {"\n"}
            <span className="syn-comment">// fails. Recovery replays pending</span>
            {"\n"}
            <span className="syn-comment">// entries on next startup.</span>
          </CodeBlock>
        </Animate>

        <Animate variant="scale-in" delay={200}>
          <HudCard variant="amber">
            <span className="font-display font-semibold text-hex-amber text-lg tracking-wide block mb-3">
              GxP Module Summary
            </span>
            <div className="space-y-2 font-mono text-base">
              {[
                ["Hash Chain Audit", "Tamper-evident, verifiable trail"],
                ["Electronic Signatures", "Meaning-bound, freshness-checked"],
                ["Write-Ahead Log", "Crash-recovery for audit writes"],
                ["Data Retention", "Configurable retention policies"],
                ["Circuit Breaker", "Fail-safe on audit store outage"],
                ["Meta-Audit", "Audit of the audit system itself"],
                ["Decommissioning", "Archival and system retirement"],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-2">
                  <span className="text-hex-amber shrink-0">&#9656;</span>
                  <div>
                    <span className="text-hex-primary">{title}</span>
                    <span className="text-hex-muted"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </HudCard>
        </Animate>
      </div>
    </Section>
  );
}
