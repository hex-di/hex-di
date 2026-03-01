import type { ReactNode } from "react";
import { Section } from "../components/section";
import { ComparisonCard } from "../components/comparison-card";
import { Animate } from "../components/animate";

export function SoftwareParallelSlide(): ReactNode {
  return (
    <Section id="software-parallel" number={6} label="The Insight" title="The Software Parallel">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Today&apos;s AI development tools are the old mechanic. They read your source files, parse
          imports, infer your architecture, and{" "}
          <span className="text-hex-accent">make educated guesses</span>.{" "}
          <span className="text-hex-primary font-semibold">
            HexDI is the OBD-II port for software.
          </span>
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <ComparisonCard
          beforeTitle="AI Tool Today"
          afterTitle="AI Tool + HexDI"
          before={
            <div className="space-y-3 font-mono text-sm">
              <div className="text-hex-muted">
                <span className="syn-number">1.</span> Reads{" "}
                <span className="syn-string">src/checkout/service.ts</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">2.</span> Reads{" "}
                <span className="syn-string">src/payment/gateway.ts</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">3.</span> Reads{" "}
                <span className="syn-string">src/config/database.ts</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">4.</span> Infers:{" "}
                <span className="syn-comment">
                  &quot;It might be the connection pool, or the payment timeout, or possibly N+1
                  queries...&quot;
                </span>
              </div>
              <div className="mt-4 flex gap-3">
                <span className="text-red-400 text-xs font-mono px-2 py-0.5 rounded border border-red-400/20 bg-red-400/5">
                  Heuristic
                </span>
                <span className="text-red-400 text-xs font-mono px-2 py-0.5 rounded border border-red-400/20 bg-red-400/5">
                  May be wrong
                </span>
                <span className="text-red-400 text-xs font-mono px-2 py-0.5 rounded border border-red-400/20 bg-red-400/5">
                  Incomplete
                </span>
              </div>
            </div>
          }
          after={
            <div className="space-y-3 font-mono text-sm">
              <div className="text-hex-muted">
                <span className="syn-number">1.</span> Queries:{" "}
                <span className="syn-function">hexdi://tracing/slow-resolutions</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">2.</span> Gets:{" "}
                <span className="syn-string">PaymentGateway avg 340ms (3x baseline)</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">3.</span> Queries:{" "}
                <span className="syn-function">hexdi://saga/workflows?status=failed</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">4.</span> Gets:{" "}
                <span className="syn-string">14 OrderSaga failures at processPayment</span>
              </div>
              <div className="text-hex-muted">
                <span className="syn-number">5.</span> Diagnosis:{" "}
                <span className="syn-string">&quot;Increase timeout from 5s to 8s&quot;</span>
              </div>
              <div className="mt-4 flex gap-3">
                <span className="text-hex-primary text-xs font-mono px-2 py-0.5 rounded border border-hex-primary/20 bg-hex-primary/5">
                  Exact
                </span>
                <span className="text-hex-primary text-xs font-mono px-2 py-0.5 rounded border border-hex-primary/20 bg-hex-primary/5">
                  Complete
                </span>
                <span className="text-hex-primary text-xs font-mono px-2 py-0.5 rounded border border-hex-primary/20 bg-hex-primary/5">
                  From the app
                </span>
              </div>
            </div>
          }
        />
      </Animate>

      <Animate variant="scale-in" delay={500}>
        <div className="mt-8 text-center">
          <p className="font-mono text-base text-hex-muted">
            The AI read{" "}
            <span className="text-hex-primary font-semibold text-glow-cyan">zero source files</span>
            . It queried the running application through its own diagnostic port.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
