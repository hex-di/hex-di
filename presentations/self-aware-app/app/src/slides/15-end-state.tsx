import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";

const endStateItems = [
  { num: 1, text: "Knows what it's made of", source: "graph" },
  { num: 2, text: "Knows what it's doing", source: "tracing" },
  { num: 3, text: "Knows what state it's in", source: "runtime + store" },
  { num: 4, text: "Knows what data it has", source: "query" },
  { num: 5, text: "Knows what processes are live", source: "saga + flow" },
  { num: 6, text: "Knows what it can do", source: "agent" },
  { num: 7, text: "Knows who's authorized", source: "guard" },
  { num: 8, text: "Knows what it's logging", source: "logger" },
  { num: 9, text: "Can tell you all of the above", source: "MCP + A2A" },
  { num: 10, text: "Can act on that knowledge", source: "autonomic" },
];

export function EndStateSlide(): ReactNode {
  return (
    <Section id="end-state" number={15} label="The Vision" title="The End State">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          An application that:
        </p>
      </Animate>

      <div className="space-y-3 max-w-3xl">
        {endStateItems.map((item, i) => (
          <Animate key={item.num} variant="slide-left" delay={150 + i * 70}>
            <div className="flex items-center gap-4 p-3 rounded-sm hover:bg-hex-primary/3 transition-colors">
              <span
                className="num-badge shrink-0"
                style={{
                  textShadow: `0 0 10px rgba(0, 240, 255, 0.3)`,
                }}
              >
                {item.num}
              </span>
              <span className="font-display text-lg text-hex-text tracking-wide flex-1">
                {item.text}
              </span>
              <span className="font-mono text-xs text-hex-primary/60 tracking-wider">
                {"\u2192"} {item.source}
              </span>
            </div>
          </Animate>
        ))}
      </div>

      <Animate variant="scale-in" delay={1000}>
        <div className="mt-10 p-6 border border-hex-pink/15 bg-hex-pink/5 rounded-sm text-center">
          <p className="font-display text-xl font-bold text-hex-pink text-glow-pink tracking-wide">
            Not because someone instrumented it from the outside.
          </p>
          <p className="font-display text-xl font-bold text-hex-primary text-glow-cyan tracking-wide mt-2">
            Because self-knowledge is built into its foundation.
          </p>
        </div>
      </Animate>
    </Section>
  );
}
