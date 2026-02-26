import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { HudCard } from "../components/hud-card";
import { ModelCard } from "../components/model-card";
import { Badge } from "../components/badge";

function RiskMeter({
  score,
  label,
  color,
}: {
  readonly score: number;
  readonly label: string;
  readonly color: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 h-2 bg-auth-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs" style={{ color }}>
        {score}
      </span>
      <span className="text-xs text-auth-muted">{label}</span>
    </div>
  );
}

export function ContextRiskSlide(): ReactNode {
  return (
    <Section
      id="context-risk"
      number={12}
      label="Modern Models"
      title="Context & Risk-Based Access"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Adaptive access control that incorporates environmental context and risk scoring to make
          dynamic authorization decisions. The foundation of Zero Trust.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="slide-left" delay={200}>
          <HudCard variant="teal">
            <h3 className="font-display font-semibold text-lg text-auth-teal mb-3">
              Context Signals
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-auth-teal font-mono text-xs mb-1">Location</p>
                <p className="text-auth-text/70">IP, geolocation, VPN status</p>
              </div>
              <div>
                <p className="text-auth-teal font-mono text-xs mb-1">Device</p>
                <p className="text-auth-text/70">Managed, OS version, compliance</p>
              </div>
              <div>
                <p className="text-auth-teal font-mono text-xs mb-1">Time</p>
                <p className="text-auth-text/70">Business hours, timezone</p>
              </div>
              <div>
                <p className="text-auth-teal font-mono text-xs mb-1">Behavior</p>
                <p className="text-auth-text/70">Login patterns, travel velocity</p>
              </div>
            </div>
          </HudCard>
        </Animate>

        <Animate variant="slide-right" delay={300}>
          <HudCard variant="accent">
            <h3 className="font-display font-semibold text-lg text-auth-accent mb-3">
              Risk Scoring
            </h3>
            <div className="space-y-3 mb-4">
              <RiskMeter score={30} label="New device (+30)" color="#F59E0B" />
              <RiskMeter score={25} label="Unusual location (+25)" color="#F59E0B" />
              <RiskMeter score={15} label="Off-hours (+15)" color="#F59E0B" />
              <RiskMeter score={25} label="No MFA (+25)" color="#EF4444" />
            </div>
            <div className="border-t border-auth-accent/20 pt-3 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-auth-green">0-30: Allow</span>
                <span className="text-auth-muted">Normal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-auth-accent">31-60: Step-up</span>
                <span className="text-auth-muted">Require MFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-auth-pink">61-80: Restrict</span>
                <span className="text-auth-muted">Read-only</span>
              </div>
              <div className="flex justify-between">
                <span className="text-auth-red">81+: Deny</span>
                <span className="text-auth-muted">Block + alert</span>
              </div>
            </div>
          </HudCard>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={400}>
        <HudCard variant="blue" className="mb-6">
          <h3 className="font-display font-semibold text-lg text-auth-blue mb-3">
            Zero Trust Principles
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="blue">Never Trust</Badge>
            <Badge variant="blue">Always Verify</Badge>
            <Badge variant="blue">Least Privilege</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-auth-text/70">
            <div>
              <p>
                <strong className="text-auth-blue">Google BeyondCorp</strong> — Context-aware access
                proxy
              </p>
              <p className="mt-1">
                <strong className="text-auth-blue">Microsoft Conditional Access</strong> —
                Risk-based policies
              </p>
            </div>
            <div>
              <p>
                <strong className="text-auth-blue">Okta Adaptive MFA</strong> — Risk score triggers
                step-up
              </p>
              <p className="mt-1">
                <strong className="text-auth-blue">NIST SP 800-207</strong> — Zero Trust
                Architecture
              </p>
            </div>
          </div>
        </HudCard>
      </Animate>

      <Animate variant="fade-up" delay={500}>
        <ModelCard
          name="Context & Risk-Based"
          icon="&#127919;"
          strengths={[
            "Adaptive — responds to real-time conditions",
            "Defense in depth — multiple signals combined",
            "User-friendly — low-risk = seamless access",
            "Aligns with Zero Trust",
          ]}
          weaknesses={[
            "Complex to implement and tune",
            "False positives frustrate users",
            "Requires real-time signal infrastructure",
            "Risk scoring is inherently subjective",
          ]}
        />
      </Animate>
    </Section>
  );
}
