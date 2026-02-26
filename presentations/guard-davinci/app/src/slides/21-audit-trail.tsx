import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";
import { Animate } from "../components/animate";

export function AuditTrailSlide(): ReactNode {
  return (
    <Section id="audit-trail" number={21} label="Visibility & Quality" title="Audit Trail">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Every authorization decision is recorded with full context — who asked, what was decided,
          why, and how long it took. The hash chain ensures tamper-evident integrity.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="AuditEntry structure">
            <span className="syn-keyword">interface</span>{" "}
            <span className="syn-type">AuditEntry</span> {"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">evaluationId</span>:{" "}
            <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">timestamp</span>:{" "}
            <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">subjectId</span>:{" "}
            <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">decision</span>:{" "}
            <span className="syn-string">"allow"</span> | <span className="syn-string">"deny"</span>
            {"\n"}
            {"  "}
            <span className="syn-property">policy</span>: <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">portName</span>: <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">reason</span>?: <span className="syn-type">string</span>
            {"\n"}
            {"  "}
            <span className="syn-property">durationMs</span>:{" "}
            <span className="syn-type">number</span>
            {"\n"}
            {"  "}
            <span className="syn-property">trace</span>:{" "}
            <span className="syn-type">EvaluationTrace</span>
            {"\n"}
            {"  "}
            <span className="syn-property">hashChain</span>:{" "}
            <span className="syn-type">string</span>
            {"    "}
            <span className="syn-comment">// GxP integrity</span>
            {"\n"}
            {"}"}
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <div className="space-y-4">
            <div className="font-mono text-sm tracking-[0.15em] uppercase text-hex-muted mb-2">
              Sample Audit Log
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-hex-primary/15">
                    <th className="text-left py-2 px-2 text-hex-muted font-normal tracking-wider uppercase text-xs">
                      Time
                    </th>
                    <th className="text-left py-2 px-2 text-hex-muted font-normal tracking-wider uppercase text-xs">
                      Subject
                    </th>
                    <th className="text-left py-2 px-2 text-hex-muted font-normal tracking-wider uppercase text-xs">
                      Policy
                    </th>
                    <th className="text-center py-2 px-2 text-hex-muted font-normal tracking-wider uppercase text-xs">
                      Decision
                    </th>
                    <th className="text-right py-2 px-2 text-hex-muted font-normal tracking-wider uppercase text-xs">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      time: "12:04:01",
                      subject: "admin-user",
                      policy: "canDeleteBrand",
                      decision: "ALLOW",
                      duration: "0.04ms",
                    },
                    {
                      time: "12:04:02",
                      subject: "local-writer",
                      policy: "canManageUsers",
                      decision: "DENY",
                      duration: "0.02ms",
                    },
                    {
                      time: "12:04:03",
                      subject: "global-mgr",
                      policy: "canAccessBrand",
                      decision: "ALLOW",
                      duration: "0.08ms",
                    },
                  ].map(row => (
                    <tr key={row.time} className="border-b border-hex-primary/5">
                      <td className="py-2 px-2 text-hex-muted">{row.time}</td>
                      <td className="py-2 px-2 text-hex-text">{row.subject}</td>
                      <td className="py-2 px-2 text-hex-primary">{row.policy}</td>
                      <td className="text-center py-2 px-2">
                        {row.decision === "ALLOW" ? (
                          <span className="text-hex-green">{row.decision}</span>
                        ) : (
                          <span className="text-red-500/70">{row.decision}</span>
                        )}
                      </td>
                      <td className="text-right py-2 px-2 text-hex-muted">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Animate>
      </div>

      <Animate variant="scale-in" delay={200}>
        <HudCard variant="pink">
          <div className="flex items-center gap-3 mb-3">
            <span className="num-badge">#</span>
            <span className="font-display font-semibold text-hex-pink text-lg tracking-wide">
              Hash-Chain Integrity
            </span>
          </div>
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            Hash-chain integrity ensures audit entries cannot be tampered with. Each entry's hash
            includes the previous entry's hash — GxP compliant.
          </p>
        </HudCard>
      </Animate>

      <Animate variant="fade-in" delay={300}>
        <div className="flex flex-wrap gap-2 mt-6">
          <Badge variant="pink">Every Decision</Badge>
          <Badge variant="pink">Hash Chain</Badge>
          <Badge variant="pink">GxP Ready</Badge>
        </div>
      </Animate>
    </Section>
  );
}
