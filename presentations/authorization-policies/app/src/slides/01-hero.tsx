import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Badge } from "../components/badge";

const models = [
  { label: "ACL", variant: "muted" as const },
  { label: "DAC", variant: "muted" as const },
  { label: "MAC", variant: "accent" as const },
  { label: "RBAC", variant: "primary" as const },
  { label: "ABAC", variant: "green" as const },
  { label: "CBAC", variant: "pink" as const },
  { label: "ReBAC", variant: "teal" as const },
  { label: "PBAC", variant: "blue" as const },
  { label: "Context", variant: "accent" as const },
  { label: "Risk", variant: "red" as const },
];

function LockIcon(): ReactNode {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="policy-glow">
      <rect
        x="25"
        y="50"
        width="70"
        height="50"
        rx="4"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="rgba(167,139,250,0.06)"
      />
      <path d="M40 50V35a20 20 0 0 1 40 0v15" stroke="#A78BFA" strokeWidth="2" fill="none" />
      <circle cx="60" cy="72" r="6" fill="#F59E0B" opacity="0.8" />
      <path d="M60 78v8" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="60" x2="22" y2="60" stroke="#A78BFA" strokeWidth="0.5" opacity="0.3" />
      <line x1="98" y1="60" x2="110" y2="60" stroke="#A78BFA" strokeWidth="0.5" opacity="0.3" />
      <line x1="60" y1="10" x2="60" y2="22" stroke="#A78BFA" strokeWidth="0.5" opacity="0.3" />
      <line x1="60" y1="105" x2="60" y2="115" stroke="#A78BFA" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

export function HeroSlide(): ReactNode {
  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
    >
      <Animate variant="scale-in" delay={200}>
        <LockIcon />
      </Animate>

      <Animate variant="fade-up" delay={350}>
        <p className="font-mono text-sm tracking-[0.25em] uppercase text-auth-accent mt-8 mb-4">
          Deep Dive Into Access Control
        </p>
      </Animate>

      <Animate variant="fade-up" delay={500}>
        <h1 className="font-display font-bold text-6xl md:text-8xl tracking-wide text-auth-text text-glow-primary">
          Policy Authorization
        </h1>
      </Animate>

      <Animate variant="fade-up" delay={650}>
        <p className="text-xl text-auth-muted mt-4 max-w-2xl">
          From ACLs to Zero Trust — a comprehensive guide to every major access control model, with
          real-world comparisons, code examples, and library recommendations.
        </p>
      </Animate>

      <Animate variant="fade-in" delay={800}>
        <div className="flex flex-wrap justify-center gap-2 mt-10 max-w-xl">
          {models.map(m => (
            <Badge key={m.label} variant={m.variant}>
              {m.label}
            </Badge>
          ))}
        </div>
      </Animate>

      <Animate variant="fade-in" delay={1000}>
        <p className="font-mono text-xs text-auth-muted/50 tracking-widest uppercase mt-16">
          &#8595; scroll to explore
        </p>
      </Animate>
    </section>
  );
}
