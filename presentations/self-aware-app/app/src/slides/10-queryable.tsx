import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Animate } from "../components/animate";

const categories = [
  {
    name: "Structural",
    variant: "green" as const,
    questions: [
      "What services exist? What are their lifetimes?",
      "What does CheckoutService transitively depend on?",
      "Are there circular dependencies or captive dependency risks?",
      "What is the initialization order?",
    ],
  },
  {
    name: "State",
    variant: "amber" as const,
    questions: [
      "What singletons are currently instantiated?",
      "Which queries are stale or pending?",
      "What state machines are in which states?",
      "What workflows are currently running?",
    ],
  },
  {
    name: "Behavioral",
    variant: "pink" as const,
    questions: [
      "Why did checkout fail for this user?",
      "What's the P99 resolution time for PaymentPort?",
      "Which sagas triggered compensation in the last hour?",
      "What's the current logging error rate?",
    ],
  },
  {
    name: "Synthesized",
    variant: "default" as const,
    questions: [
      "What's the blast radius if DatabasePort fails?",
      "Are there scope leaks?",
      "Suggest optimizations for the current graph.",
    ],
  },
];

export function QueryableSlide(): ReactNode {
  return (
    <Section id="queryable" number={10} label="The Diagnostic Port" title="What Can Be Queried">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          An AI agent, observability tool, or developer tool with access to the MCP diagnostic port
          can ask:
        </p>
      </Animate>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map((cat, i) => (
          <Animate key={cat.name} variant="fade-up" delay={200 + i * 100}>
            <HudCard variant={cat.variant} className="h-full">
              <span className="font-display font-semibold text-lg tracking-wide block mb-3">
                {cat.name} Questions
              </span>
              <div className="space-y-2">
                {cat.questions.map(q => (
                  <div key={q} className="flex items-start gap-2 font-mono text-sm">
                    <span className="text-hex-primary/50 shrink-0 mt-0.5">?</span>
                    <span className="text-hex-muted">{q}</span>
                  </div>
                ))}
              </div>
            </HudCard>
          </Animate>
        ))}
      </div>

      <Animate variant="fade-in" delay={700}>
        <div className="mt-8 p-5 border-l-2 border-hex-amber/40 bg-hex-amber/5">
          <p className="font-mono text-base text-hex-muted leading-relaxed">
            No file parsing. No inference. No guessing.{" "}
            <span className="text-hex-amber font-semibold">
              The application answers from its own runtime knowledge.
            </span>
          </p>
        </div>
      </Animate>
    </Section>
  );
}
