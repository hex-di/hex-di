import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { Animate } from "../components/animate";

export function ObdPortSlide(): ReactNode {
  return (
    <Section id="obd-port" number={5} label="The Insight" title="The OBD-II Port">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          Today, you bring your car to the service center. The technician plugs a diagnostic
          computer into the <span className="text-hex-primary font-semibold">OBD-II port</span>. In
          seconds:
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <CodeBlock title="OBD-II Diagnostic Output">
          <span className="syn-function">Cylinder 3</span>:{" "}
          <span className="syn-string">misfire</span>
          {"\n"}
          <span className="syn-function">O2 sensor bank 2</span>:{" "}
          <span className="syn-type">reading out of range</span>
          {"\n"}
          <span className="syn-function">Catalytic converter</span>:{" "}
          <span className="syn-type">efficiency below threshold</span>
        </CodeBlock>
      </Animate>

      <Animate variant="fade-up" delay={400}>
        <div className="mt-8 space-y-4">
          <p className="text-hex-muted text-lg leading-relaxed max-w-4xl">
            The car <span className="text-hex-primary font-semibold">told them</span>. Not the
            technician&apos;s intuition — the car&apos;s own sensors, reporting through a
            standardized interface.
          </p>
          <div className="p-5 border-l-2 border-hex-primary/40 bg-hex-primary/5">
            <p className="font-display text-2xl text-hex-primary tracking-wide">
              The car doesn&apos;t guess about itself. It <em>knows</em>.
            </p>
          </div>
        </div>
      </Animate>
    </Section>
  );
}
