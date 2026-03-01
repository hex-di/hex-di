import type { CSSProperties } from "react";
import { useEffect, useState, useRef } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

const INSTALL_CMD = "npm install @hex-di/saga";
const ACCENT = "#FFB020";

interface Feature {
  readonly title: string;
  readonly description: string;
}

const FEATURES: Feature[] = [
  {
    title: "Compensation",
    description:
      "Automatic rollback when steps fail. Define forward and backward actions for each saga step.",
  },
  {
    title: "Checkpointing",
    description: "Persist saga state at each step. Resume from the last checkpoint after crashes.",
  },
  {
    title: "Type-Safe Steps",
    description:
      "Each step declares its input, output, and compensation types. The compiler validates the chain.",
  },
  {
    title: "Parallel Execution",
    description: "Run independent steps concurrently. The saga engine manages fan-out and fan-in.",
  },
  {
    title: "Dead Letter Queue",
    description: "Failed sagas are captured with full context for manual review and retry.",
  },
  {
    title: "Introspection",
    description: "Inspect running sagas, their state, and compensation history in real time.",
  },
];

const S = {
  monoLabel: (color = ACCENT): CSSProperties => ({
    fontFamily: "'Fira Code', monospace",
    fontSize: "0.68rem",
    letterSpacing: "0.25em",
    color,
    textTransform: "uppercase" as const,
    marginBottom: "16px",
  }),
  h2: (): CSSProperties => ({
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    margin: "0 0 16px",
  }),
  body: (color = "#8a9bb0"): CSSProperties => ({
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.9rem",
    lineHeight: 1.65,
    color,
    margin: 0,
  }),
};

function useFadeIn(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-section">
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p style={S.monoLabel()}>@hex-di ecosystem</p>
        <h1
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}
        >
          Saga
        </h1>
        <p
          style={{
            ...S.body("#a0b4c8"),
            fontSize: "1.15rem",
            maxWidth: 560,
            margin: "0 auto 40px",
          }}
        >
          Type-Safe Saga Orchestration for TypeScript
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to="/docs"
            style={{
              padding: "12px 32px",
              background: ACCENT,
              color: "#020408",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              borderRadius: 2,
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
          <div
            style={{
              padding: "12px 24px",
              border: `1px solid ${ACCENT}40`,
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.85rem",
              color: ACCENT,
              borderRadius: 2,
              cursor: "pointer",
              userSelect: "all",
            }}
          >
            {INSTALL_CMD}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section style={{ padding: "100px 40px", background: "#08101C" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <FadeIn>
          <p style={S.monoLabel()}>:: features</p>
          <h2 style={S.h2()}>Why Saga?</h2>
        </FadeIn>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            marginTop: 48,
          }}
        >
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1}>
              <div
                style={{
                  padding: 28,
                  border: "1px solid #1a2a3e",
                  borderRadius: 2,
                  background: "#0a1420",
                  transition: "border-color 0.3s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${ACCENT}60`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#1a2a3e";
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    color: "#fff",
                    margin: "0 0 8px",
                  }}
                >
                  {f.title}
                </h3>
                <p style={S.body()}>{f.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ecosystem() {
  return (
    <section style={{ padding: "80px 40px", background: "#020408" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <FadeIn>
          <p style={S.monoLabel()}>:: ecosystem</p>
          <h2 style={S.h2()}>Part of the HexDI Stack</h2>
          <p style={{ ...S.body(), maxWidth: 560, margin: "0 auto 32px" }}>
            Saga integrates seamlessly with the HexDI dependency injection ecosystem. Use it
            standalone or compose it with other libraries.
          </p>
          <Link
            to="https://hexdi.dev"
            style={{
              padding: "12px 32px",
              border: `1px solid ${ACCENT}40`,
              color: ACCENT,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              borderRadius: 2,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Explore HexDI
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

export default function Home(): React.ReactNode {
  return (
    <Layout description="Type-Safe Saga Orchestration for TypeScript">
      <Head>
        <title>Saga | HexDI</title>
      </Head>
      <main>
        <Hero />
        <Features />
        <Ecosystem />
      </main>
    </Layout>
  );
}
