import type { ReactNode, CSSProperties, RefObject } from "react";
import { useEffect, useState, useRef } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import GuardNav from "../components/GuardNav";

// ============================================================
// CONSTANTS
// ============================================================

const ACCENT = "#F59E0B";
const DENY = "#EF4444";
const ALLOW = "#22C55E";
const INSTALL_CMD = "npm install @hex-di/guard";

// ============================================================
// CODE STRINGS
// ============================================================

const BEFORE_CODE = `// Scattered across codebase
if (user.role === "admin"
    || user.permissions
      .includes("Write")) {
  if (!user.suspended) {
    // allow... maybe?
  }
}
// No audit trail
// No composition
// No type safety
// Changes require grep + pray`;

const AFTER_CODE = `// Defined once, enforced everywhere
const policy = allOf(
  anyOf(hasRole("admin"),
    hasPermission(Write)),
  not(hasAttribute("suspended", true)),
);

const { granted, trace } = evaluate(policy, ctx);
// Full audit trail
// Composable & reusable
// Compile-time type safe
// Changes in one place`;

const COMPOSITION_CODE = `import {
  allOf, anyOf, not,
  hasPermission, hasRole, hasAttribute,
  hasRelationship, withLabel,
} from "@hex-di/guard";

const canPublish = withLabel("publish-access",
  allOf(
    // Must be an editor or admin
    anyOf(
      hasRole("editor"),
      hasRole("admin"),
    ),
    // Must have publish permission
    hasPermission(Permissions.Publish),
    // Must not be suspended
    not(hasAttribute("suspended", true)),
    // Must own the resource OR be admin
    anyOf(
      hasRelationship("owner"),
      hasRole("admin"),
    ),
  ),
);`;

const EVALUATION_CODE = `const decision = evaluate(canPublish, {
  subject: { id: "u-1", roles: ["editor"] },
  resource: { id: "doc-42", owner: "u-1" },
});

// decision.granted    \u2192 true
// decision.durationMs \u2192 0.12
// decision.trace:
//   allOf [ALLOW 0.12ms]
//   \u251C\u2500\u2500 anyOf [ALLOW 0.03ms]
//   \u2502   \u251C\u2500\u2500 hasRole("editor") \u2192 ALLOW
//   \u2502   \u2514\u2500\u2500 hasRole("admin") \u2192 DENY (skipped)
//   \u251C\u2500\u2500 hasPermission("Publish") \u2192 ALLOW
//   \u251C\u2500\u2500 not(hasAttribute("suspended")) \u2192 ALLOW
//   \u2514\u2500\u2500 anyOf [ALLOW 0.02ms]
//       \u2514\u2500\u2500 hasRelationship("owner") \u2192 ALLOW`;

const REACT_CAN_CODE = `import { Can } from "@hex-di/guard/react";

function DocumentActions({ doc }) {
  return (
    <Can policy={canPublish} resource={doc}>
      <button>Publish</button>
    </Can>
  );
}
// Renders children only if policy grants`;

const REACT_HOOK_CODE = `import { useCan } from "@hex-di/guard/react";

function DocumentPage({ doc }) {
  const { granted, loading } =
    useCan(canPublish, { resource: doc });

  if (loading) return <Spinner />;
  if (!granted) return <Forbidden />;

  return <Editor doc={doc} />;
}`;

// ============================================================
// DATA
// ============================================================

interface Feature {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly iconColor: string;
}

const FEATURES: readonly Feature[] = [
  {
    title: "Compile-Time Policies",
    description:
      "Policies are data, not decorators. Define authorization rules as composable values with full type safety at compile time.",
    icon: "lock",
    iconColor: "#F59E0B",
  },
  {
    title: "Role DAG Inheritance",
    description:
      "O(1) permission lookup via directed acyclic graph flattening. Define role hierarchies that resolve instantly.",
    icon: "hierarchy",
    iconColor: "#20B2AA",
  },
  {
    title: "10 Policy Kinds",
    description:
      "hasPermission, hasRole, hasAttribute, hasResourceAttribute, hasSignature, hasRelationship, allOf, anyOf, not, withLabel.",
    icon: "grid",
    iconColor: "#BD93F9",
  },
  {
    title: "Full Evaluation Traces",
    description:
      "Every authorization decision is auditable. The Decision object carries the full evaluation trace, timing, and policy metadata.",
    icon: "trace",
    iconColor: "#22C55E",
  },
  {
    title: "Framework Agnostic",
    description:
      "No decorators, no reflection, no magic. Pure functions and data structures that work everywhere TypeScript runs.",
    icon: "gear",
    iconColor: "#FF79C6",
  },
  {
    title: "GxP Ready",
    description:
      "21 CFR Part 11 compliance support. Electronic signatures, audit trails, and tamper-evident records.",
    icon: "clipboard",
    iconColor: "#EF4444",
  },
];

const STATS = [
  { value: "10", label: "policy kinds" },
  { value: "0", label: "runtime deps" },
  { value: "\u2713", label: "full audit trails" },
  { value: "TS 5.6+", label: "TypeScript native" },
] as const;

interface PolicyKind {
  readonly title: string;
  readonly code: string;
  readonly annotation: string;
}

const POLICY_KINDS: readonly PolicyKind[] = [
  {
    title: "hasPermission",
    code: `hasPermission(Permissions.Write)`,
    annotation: "Check if subject holds a specific permission token.",
  },
  {
    title: "hasRole",
    code: `hasRole("admin")`,
    annotation: "Check if subject has been assigned a role.",
  },
  {
    title: "hasAttribute",
    code: `hasAttribute("department", "engineering")`,
    annotation: "Match a subject attribute against an expected value.",
  },
  {
    title: "hasResourceAttribute",
    code: `hasResourceAttribute("visibility", "public")`,
    annotation: "Match a resource attribute against an expected value.",
  },
  {
    title: "hasSignature",
    code: `hasSignature("electronic")`,
    annotation: "Verify electronic signature type \u2014 21 CFR Part 11.",
  },
  {
    title: "hasRelationship",
    code: `hasRelationship("owner")`,
    annotation: "Check subject-resource relationship \u2014 ReBAC pattern.",
  },
  {
    title: "allOf",
    code: `allOf(policy1, policy2, policy3)`,
    annotation: "All child policies must grant. Short-circuits on first deny.",
  },
  {
    title: "anyOf",
    code: `anyOf(policy1, policy2)`,
    annotation: "At least one child must grant. Short-circuits on first allow.",
  },
  {
    title: "not",
    code: `not(hasAttribute("suspended", true))`,
    annotation: "Inverts the child policy decision.",
  },
  {
    title: "withLabel",
    code: `withLabel("audit-check", policy)`,
    annotation: "Attaches a label for trace identification and filtering.",
  },
];

interface EcosystemLib {
  readonly name: string;
  readonly purpose: string;
  readonly highlighted?: boolean;
}

const ECOSYSTEM_LIBS: readonly EcosystemLib[] = [
  { name: "hex-di", purpose: "DI Core" },
  { name: "@hex-di/result", purpose: "Result Type" },
  { name: "@hex-di/flow", purpose: "State Machines" },
  { name: "@hex-di/saga", purpose: "Orchestration" },
  { name: "@hex-di/guard", purpose: "Auth & Permissions", highlighted: true },
  { name: "@hex-di/query", purpose: "Data Fetching" },
];

// ============================================================
// SHARED STYLES
// ============================================================

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
  section: (bg?: string): CSSProperties => ({
    padding: "100px 40px",
    position: "relative" as const,
    background: bg,
  }),
  container: (): CSSProperties => ({
    maxWidth: "1200px",
    margin: "0 auto",
    position: "relative" as const,
    zIndex: 1,
  }),
  sectionHeader: (): CSSProperties => ({
    marginBottom: "64px",
    textAlign: "center" as const,
  }),
};

// ============================================================
// SYNTAX HIGHLIGHTING (Dracula-inspired for Guard)
// ============================================================

const SYN = {
  keyword: "#FF79C6",
  type: "#8BE9FD",
  string: "#F1FA8C",
  comment: "#6272A4",
  fn: "#50FA7B",
  num: "#BD93F9",
  punc: "#6272A4",
  text: "#F8F8F2",
} as const;

const TS_KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "interface",
  "type",
  "function",
  "return",
  "new",
  "extends",
  "implements",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "class",
  "static",
  "readonly",
  "of",
  "in",
  "for",
  "while",
  "if",
  "else",
  "throw",
  "yield",
]);

const TS_BUILTIN_TYPES = new Set([
  "void",
  "string",
  "number",
  "boolean",
  "never",
  "any",
  "unknown",
  "object",
  "symbol",
  "bigint",
]);

const GUARD_API = new Set([
  "hasPermission",
  "hasRole",
  "hasAttribute",
  "hasResourceAttribute",
  "hasSignature",
  "hasRelationship",
  "allOf",
  "anyOf",
  "not",
  "withLabel",
  "evaluate",
  "Can",
  "useCan",
]);

interface SynToken {
  readonly text: string;
  readonly color: string;
}

function tokenizeLine(line: string): SynToken[] {
  const tokens: SynToken[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ text: line.slice(i), color: SYN.comment });
      break;
    }

    if (line[i] === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== "`") {
        if (line[j] === "\\") j++;
        j++;
      }
      j++;
      tokens.push({ text: line.slice(i, j), color: SYN.string });
      i = j;
      continue;
    }

    if (line[i] === "'" || line[i] === '"') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      j++;
      tokens.push({ text: line.slice(i, j), color: SYN.string });
      i = j;
      continue;
    }

    if (/\s/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: SYN.text });
      i = j;
      continue;
    }

    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);

      let color: string;
      if (TS_KEYWORDS.has(word)) {
        color = SYN.keyword;
      } else if (TS_BUILTIN_TYPES.has(word)) {
        color = SYN.type;
      } else if (GUARD_API.has(word)) {
        color = SYN.fn;
      } else if (/^[A-Z]/.test(word)) {
        color = SYN.type;
      } else {
        let k = j;
        while (k < line.length && line[k] === " ") k++;
        color = line[k] === "(" ? SYN.fn : SYN.text;
      }

      tokens.push({ text: word, color });
      i = j;
      continue;
    }

    if (/[0-9]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: SYN.num });
      i = j;
      continue;
    }

    const ch = line[i];
    const isPunc = /[{}()[\]:;,.<>=!+\-*/&|^~?@]/.test(ch);
    tokens.push({ text: ch, color: isPunc ? SYN.punc : SYN.text });
    i++;
  }

  return tokens;
}

function GuardCodeBlock({ code }: { readonly code: string }): ReactNode {
  const lines = code.split("\n");
  const parts: ReactNode[] = [];

  lines.forEach((line, li) => {
    const lineTokens = tokenizeLine(line);
    lineTokens.forEach((tok, ti) => {
      // Post-process: colorize ALLOW/DENY in comments
      if (tok.color === SYN.comment) {
        const segments = tok.text.split(/(ALLOW|DENY)/g);
        segments.forEach((seg, si) => {
          if (seg === "ALLOW") {
            parts.push(
              <span key={`${li}-${ti}-${si}`} style={{ color: ALLOW }}>
                {seg}
              </span>
            );
          } else if (seg === "DENY") {
            parts.push(
              <span key={`${li}-${ti}-${si}`} style={{ color: DENY }}>
                {seg}
              </span>
            );
          } else if (seg.length > 0) {
            parts.push(
              <span key={`${li}-${ti}-${si}`} style={{ color: tok.color }}>
                {seg}
              </span>
            );
          }
        });
      } else {
        parts.push(
          <span key={`${li}-${ti}`} style={{ color: tok.color }}>
            {tok.text}
          </span>
        );
      }
    });
    if (li < lines.length - 1) parts.push("\n");
  });

  return <>{parts}</>;
}

// ============================================================
// HOOKS
// ============================================================

function useFadeIn(threshold = 0.12): [RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useIsMobile(bp = 768): boolean {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const check = (): void => setMobile(window.innerWidth < bp);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, [bp]);
  return mobile ?? false;
}

function FadeIn({
  children,
  delay = 0,
  style,
}: {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly style?: CSSProperties;
}): ReactNode {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

function TerminalWindow({
  title,
  code,
  maxHeight,
}: {
  readonly title: string;
  readonly code: string;
  readonly maxHeight?: string;
}): ReactNode {
  return (
    <div
      style={{
        background: "#0a1420",
        border: "1px solid #1a2a3e",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid #1a2a3e",
          background: "rgba(6, 13, 20, 0.9)",
        }}
      >
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: DENY, opacity: 0.7 }}
        />
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#F1FA8C", opacity: 0.7 }}
        />
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: ALLOW, opacity: 0.7 }}
        />
        <span
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.65rem",
            color: "#506070",
            marginLeft: 8,
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <div className="guard-scanline-overlay" />
        <pre
          style={{
            margin: 0,
            padding: "20px",
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.82rem",
            lineHeight: 1.7,
            overflowX: "auto",
            maxHeight: maxHeight ?? "none",
          }}
        >
          <GuardCodeBlock code={code} />
        </pre>
      </div>
    </div>
  );
}

function ShieldSVG(): ReactNode {
  return (
    <svg
      width="200"
      height="220"
      viewBox="0 0 200 220"
      fill="none"
      aria-label="Guard shield logo"
      style={{ filter: "drop-shadow(0 0 40px rgba(245, 158, 11, 0.15))" }}
    >
      <path
        d="M100 10L20 55v55c0 52 34.5 100 80 112 45.5-12 80-60 80-112V55L100 10z"
        stroke={ACCENT}
        strokeWidth="2"
        fill="rgba(245, 158, 11, 0.04)"
      />
      <path
        d="M100 30L35 65v45c0 42 27 82 65 92 38-10 65-50 65-92V65L100 30z"
        stroke={ACCENT}
        strokeWidth="1"
        fill="rgba(245, 158, 11, 0.06)"
        opacity="0.6"
      />
      <circle
        cx="100"
        cy="95"
        r="16"
        stroke={ACCENT}
        strokeWidth="2"
        fill="rgba(245, 158, 11, 0.1)"
      />
      <rect
        x="95"
        y="108"
        width="10"
        height="25"
        rx="2"
        fill="rgba(245, 158, 11, 0.2)"
        stroke={ACCENT}
        strokeWidth="1"
      />
      <circle cx="100" cy="95" r="6" fill={ACCENT} opacity="0.7" />
      <line x1="40" y1="50" x2="50" y2="50" stroke={ACCENT} strokeWidth="1" opacity="0.4" />
      <line x1="40" y1="50" x2="40" y2="60" stroke={ACCENT} strokeWidth="1" opacity="0.4" />
      <line x1="160" y1="50" x2="150" y2="50" stroke={ACCENT} strokeWidth="1" opacity="0.4" />
      <line x1="160" y1="50" x2="160" y2="60" stroke={ACCENT} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function getIcon(name: string, color: string): ReactNode {
  switch (name) {
    case "lock":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "hierarchy":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M12 2v6M12 18v4M4 14h16M4 14v-4h4v4M16 14v-4h4v4M8 14v4h4v-4" />
        </svg>
      );
    case "grid":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      );
    case "trace":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "gear":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    default:
      return null;
  }
}

// ============================================================
// SECTION 1: HERO
// ============================================================

function HeroSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="guard-hero-section guard-bg-grid" style={{ paddingTop: 80 }}>
      <div
        className="guard-hero-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 40px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 48 : 64,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Left: text */}
        <div>
          {/* Badge */}
          <div
            className="guard-anim-fade-in"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: ACCENT,
              border: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "4px 10px",
              background: "rgba(245, 158, 11, 0.05)",
              marginBottom: 24,
            }}
          >
            <span
              className="guard-pulse-dot"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: ACCENT,
                boxShadow: `0 0 8px ${ACCENT}`,
              }}
            />
            GUARD::ACTIVE
          </div>

          {/* H1 */}
          <h1
            className="guard-anim-fade-in-d1"
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              lineHeight: 0.9,
              color: "#FFFFFF",
              margin: "0 0 20px",
              letterSpacing: "-0.02em",
            }}
          >
            ACCESS
            <br />
            IS NOT
            <br />A STRING <span style={{ color: ACCENT }}>CHECK</span>
          </h1>

          {/* Subtitle */}
          <div
            className="guard-anim-fade-in-d2"
            style={{
              borderLeft: "2px solid rgba(245, 158, 11, 0.2)",
              paddingLeft: 16,
              marginBottom: 28,
            }}
          >
            <p style={{ fontSize: "1rem", color: "#a0b4c8", margin: "0 0 4px" }}>
              Policies are data.
            </p>
            <p style={{ fontSize: "1rem", color: "#a0b4c8", margin: "0 0 4px" }}>
              Compile-time safe.
            </p>
            <p style={{ fontSize: "1rem", color: "#a0b4c8", margin: 0 }}>Fully auditable.</p>
          </div>

          {/* CTA buttons */}
          <div
            className="guard-anim-fade-in-d3"
            style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}
          >
            <Link
              to="/docs"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                background: ACCENT,
                color: "#020408",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
            >
              Get Started
            </Link>
            <Link
              to="/docs"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                border: "1px solid #1a2a3e",
                color: "#a0b4c8",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.95rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              View Docs
            </Link>
          </div>

          {/* Install box */}
          <div
            className="guard-anim-fade-in-d4"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid ${ACCENT}`,
              padding: "12px 16px",
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.85rem",
              color: ACCENT,
              cursor: "pointer",
              userSelect: "all",
            }}
          >
            {INSTALL_CMD}
          </div>
        </div>

        {/* Right: Shield + floating HUD card */}
        <div
          className="guard-hide-mobile"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}
        >
          <ShieldSVG />

          {/* Floating HUD eval trace card */}
          <div
            className="guard-hud-card guard-float-3d"
            style={{
              width: 340,
              perspective: "1000px",
            }}
          >
            {/* Scanline overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245, 158, 11, 0.02) 3px, rgba(245, 158, 11, 0.02) 4px)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <pre
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.78rem",
                lineHeight: 1.8,
                margin: 0,
                position: "relative",
                zIndex: 2,
              }}
            >
              <span
                style={{
                  color: "#8a9bb0",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                EVALUATION TRACE
              </span>
              {"\n\n"}
              <span style={{ color: ACCENT }}>policy:</span>{" "}
              <span style={{ color: "#a0b4c8" }}>canPublish</span>
              {"\n"}
              <span style={{ color: ACCENT }}>subject:</span>{" "}
              <span style={{ color: "#8a9bb0" }}>user-042</span>
              {"\n"}
              <span style={{ color: ACCENT }}>decision:</span>{" "}
              <span style={{ color: ALLOW }}>ALLOW</span>
              {"\n\n"}
              <span style={{ color: "#8a9bb0" }}>trace:</span>
              {"\n"}
              {"  "}
              <span style={{ color: ACCENT }}>allOf</span>{" "}
              <span style={{ color: ALLOW }}>{"\u2713"}</span>
              {"\n"}
              {"  "}
              <span style={{ color: "#8a9bb0" }}>{"\u251C"}</span>{" "}
              <span style={{ color: "#a0b4c8" }}>
                hasRole({"\u0022"}admin{"\u0022"})
              </span>{" "}
              <span style={{ color: ALLOW }}>{"\u2713"}</span>
              {"\n"}
              {"  "}
              <span style={{ color: "#8a9bb0" }}>{"\u251C"}</span>{" "}
              <span style={{ color: "#a0b4c8" }}>
                hasPerm({"\u0022"}Write{"\u0022"})
              </span>{" "}
              <span style={{ color: ALLOW }}>{"\u2713"}</span>
              {"\n"}
              {"  "}
              <span style={{ color: "#8a9bb0" }}>{"\u2514"}</span>{" "}
              <span style={{ color: "#a0b4c8" }}>not(suspended)</span>{" "}
              <span style={{ color: ALLOW }}>{"\u2713"}</span>
              {"\n\n"}
              <span style={{ color: "#8a9bb0", fontSize: "0.7rem" }}>duration: 0.08ms</span>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 2: STATS BAR
// ============================================================

function StatsBar(): ReactNode {
  return (
    <section
      style={{
        padding: "24px 40px",
        background: "#08101C",
        borderTop: `1px solid rgba(245, 158, 11, 0.1)`,
        borderBottom: `1px solid rgba(245, 158, 11, 0.1)`,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "40px",
        }}
      >
        {STATS.map(s => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1.3rem",
                color: ACCENT,
              }}
            >
              {s.value}
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.72rem",
                color: "#8a9bb0",
                letterSpacing: "0.05em",
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// SECTION 3: BEFORE / AFTER
// ============================================================

function BeforeAfterSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="guard-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: comparison</p>
            <h2 style={S.h2()}>Before & After</h2>
          </div>
        </FadeIn>

        <div
          className="guard-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 24,
            maxWidth: 1000,
            margin: "0 auto",
          }}
        >
          {/* Before (red HUD) */}
          <FadeIn delay={100}>
            <div className="guard-hud-card guard-hud-card-deny">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: DENY,
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "4px 10px",
                  background: "rgba(239, 68, 68, 0.1)",
                  marginBottom: 16,
                }}
              >
                RUNTIME_FAIL
              </div>
              <pre
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.7,
                  margin: 0,
                  overflowX: "auto",
                }}
              >
                <GuardCodeBlock code={BEFORE_CODE} />
              </pre>
            </div>
          </FadeIn>

          {/* After (amber HUD) */}
          <FadeIn delay={200}>
            <div className="guard-hud-card">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: ACCENT,
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "4px 10px",
                  background: "rgba(245, 158, 11, 0.1)",
                  marginBottom: 16,
                }}
              >
                COMPILE_OK
              </div>
              <pre
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.7,
                  margin: 0,
                  overflowX: "auto",
                }}
              >
                <GuardCodeBlock code={AFTER_CODE} />
              </pre>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 4: POLICY KINDS (10 numbered cards)
// ============================================================

function PolicyKindsSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="guard-section" style={S.section("#08101C")}>
      <div style={{ ...S.container(), maxWidth: 900 }}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: policy kinds</p>
            <h2 style={S.h2()}>10 Policy Kinds</h2>
            <p style={{ ...S.body(), maxWidth: 560, margin: "0 auto" }}>
              Every authorization pattern you need, as a composable value.
            </p>
          </div>
        </FadeIn>

        <div
          className="guard-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 20,
          }}
        >
          {POLICY_KINDS.map((pk, i) => (
            <FadeIn key={pk.title} delay={i * 50}>
              <div className="guard-api-card">
                {/* Number badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    background: "rgba(245, 158, 11, 0.1)",
                    color: ACCENT,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.6rem",
                    marginBottom: 8,
                  }}
                >
                  {i + 1}
                </div>
                {/* Title */}
                <h4
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: ACCENT,
                    margin: "0 0 8px",
                  }}
                >
                  {pk.title}
                </h4>
                {/* Code */}
                <pre
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.8rem",
                    lineHeight: 1.6,
                    margin: "0 0 8px",
                    overflowX: "auto",
                  }}
                >
                  <GuardCodeBlock code={pk.code} />
                </pre>
                {/* Annotation */}
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.78rem",
                    color: "#8a9bb0",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {pk.annotation}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 5: COMPOSITION
// ============================================================

function CompositionSection(): ReactNode {
  return (
    <section className="guard-section" style={S.section("#020408")}>
      <div style={{ ...S.container(), maxWidth: 700 }}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: composition</p>
            <h2 style={S.h2()}>Compose Into Any Shape</h2>
          </div>
        </FadeIn>

        <FadeIn delay={150}>
          <TerminalWindow title="access-policy.ts" code={COMPOSITION_CODE} />
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 6: EVALUATION
// ============================================================

function EvaluationSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="guard-section" style={S.section("#08101C")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: evaluation</p>
            <h2 style={S.h2()}>Full Decision Objects</h2>
          </div>
        </FadeIn>

        <div
          className="guard-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 3fr",
            gap: isMobile ? 40 : 64,
            alignItems: "start",
          }}
        >
          <FadeIn>
            <div>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  padding: 0,
                  margin: 0,
                }}
              >
                {[
                  ["\u25A0", "granted", "\u2014 boolean result"],
                  ["\u25A0", "trace", "\u2014 full evaluation path with timing"],
                  ["\u25A0", "durationMs", "\u2014 total evaluation time"],
                  ["\u25A0", "Every node", "in the tree is individually traceable"],
                ].map(([icon, label, desc]) => (
                  <li key={label} style={{ color: "#8a9bb0" }}>
                    <span style={{ color: ACCENT, marginRight: 8 }}>{icon}</span>
                    <code
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: "0.85rem",
                        color: "#a0b4c8",
                      }}
                    >
                      {label}
                    </code>{" "}
                    {desc}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <TerminalWindow title="evaluate.ts" code={EVALUATION_CODE} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 7: REACT INTEGRATION
// ============================================================

function ReactSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="guard-section" style={S.section("#020408")}>
      <div style={{ ...S.container(), maxWidth: 1000 }}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: react</p>
            <h2 style={S.h2()}>First-Class React Support</h2>
          </div>
        </FadeIn>

        <div
          className="guard-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 24,
          }}
        >
          <FadeIn delay={100}>
            <div className="guard-hud-card" style={{ height: "100%" }}>
              <h4
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  color: ACCENT,
                  margin: "0 0 12px",
                }}
              >
                {"<Can>"} Component
              </h4>
              <pre
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.7,
                  margin: "0 0 12px",
                  overflowX: "auto",
                }}
              >
                <GuardCodeBlock code={REACT_CAN_CODE} />
              </pre>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.78rem",
                  color: "#8a9bb0",
                  margin: 0,
                }}
              >
                Declarative gate. Renders children only when the policy grants.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="guard-hud-card" style={{ height: "100%" }}>
              <h4
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  color: ACCENT,
                  margin: "0 0 12px",
                }}
              >
                useCan() Hook
              </h4>
              <pre
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.7,
                  margin: "0 0 12px",
                  overflowX: "auto",
                }}
              >
                <GuardCodeBlock code={REACT_HOOK_CODE} />
              </pre>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.78rem",
                  color: "#8a9bb0",
                  margin: 0,
                }}
              >
                Imperative hook for conditional rendering and loading states.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 8: FEATURES (6 HUD cards with icons)
// ============================================================

function FeaturesSection(): ReactNode {
  return (
    <section className="guard-section" style={S.section("#08101C")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: capabilities</p>
            <h2 style={S.h2()}>Why Guard?</h2>
          </div>
        </FadeIn>

        <div
          className="guard-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            maxWidth: 1000,
            margin: "0 auto",
          }}
        >
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 80}>
              <div className="guard-hud-card" style={{ height: "100%" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: `1px solid ${f.iconColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {getIcon(f.icon, f.iconColor)}
                </div>
                <h3
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    color: "#ffffff",
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

// ============================================================
// SECTION 9: ECOSYSTEM + CTA
// ============================================================

function EcosystemSection(): ReactNode {
  return (
    <section className="guard-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: ecosystem</p>
            <h2 style={S.h2()}>Part of the HexDI Stack</h2>
            <p style={{ ...S.body(), maxWidth: 560, margin: "0 auto 40px" }}>
              Guard integrates seamlessly with the HexDI dependency injection ecosystem. Use it
              standalone or compose it with other libraries.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 40,
            }}
          >
            {ECOSYSTEM_LIBS.map(lib => (
              <div
                key={lib.name}
                style={{
                  padding: "8px 16px",
                  border: `1px solid ${lib.highlighted ? ACCENT : "#1a2a3e"}`,
                  background: lib.highlighted ? `${ACCENT}0c` : "rgba(6, 13, 20, 0.8)",
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.72rem",
                  color: lib.highlighted ? ACCENT : "#8a9bb0",
                  letterSpacing: "0.03em",
                }}
              >
                {lib.name}
                <span style={{ color: "#506070", marginLeft: 8 }}>{lib.purpose}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div style={{ textAlign: "center" }}>
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
                textDecoration: "none",
                display: "inline-block",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              Explore HexDI
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 10: CTA
// ============================================================

function CTASection(): ReactNode {
  return (
    <section
      className="guard-section"
      style={{
        ...S.section("#08101C"),
        padding: "80px 40px",
      }}
    >
      <div style={S.container()}>
        <FadeIn>
          <div
            className="guard-hud-card"
            style={{
              maxWidth: 700,
              margin: "0 auto",
              textAlign: "center",
              padding: "48px 40px",
            }}
          >
            <h2 style={{ ...S.h2(), marginBottom: 12 }}>Ready to secure your stack?</h2>
            <p style={{ ...S.body(), maxWidth: 460, margin: "0 auto 32px" }}>
              Replace scattered permission checks with composable, typed policies. Zero
              dependencies. Full TypeScript inference.
            </p>
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/docs"
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  background: ACCENT,
                  color: "#020408",
                  textDecoration: "none",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  transition: "opacity 0.2s",
                }}
              >
                Read the Docs
              </Link>
              <Link
                to="/docs/api/api-reference"
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  background: "transparent",
                  color: ACCENT,
                  textDecoration: "none",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: `1px solid ${ACCENT}40`,
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                View API Reference
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================

function GuardFooter(): ReactNode {
  const linkStyle: CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.8rem",
    color: "#506070",
    textDecoration: "none",
    lineHeight: 2.2,
    transition: "color 0.2s",
  };

  const colTitleStyle: CSSProperties = {
    fontFamily: "'Fira Code', monospace",
    fontSize: "0.65rem",
    color: ACCENT,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    marginBottom: 16,
  };

  return (
    <footer
      style={{
        padding: "48px 40px 32px",
        background: "#020408",
        borderTop: "1px solid rgba(245, 158, 11, 0.2)",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 40,
          marginBottom: 32,
        }}
      >
        <div>
          <p style={colTitleStyle}>Docs</p>
          <Link to="/docs" style={linkStyle}>
            Getting Started
          </Link>
          <br />
          <Link to="/docs/api/api-reference" style={linkStyle}>
            API Reference
          </Link>
        </div>
        <div>
          <p style={colTitleStyle}>Ecosystem</p>
          <a href="https://hexdi.dev" style={linkStyle}>
            Core (hexdi.dev)
          </a>
          <br />
          <a href="https://flow.hexdi.dev" style={linkStyle}>
            Flow
          </a>
          <br />
          <a href="https://result.hexdi.dev" style={linkStyle}>
            Result
          </a>
          <br />
          <a href="https://saga.hexdi.dev" style={linkStyle}>
            Saga
          </a>
        </div>
        <div>
          <p style={colTitleStyle}>Community</p>
          <a href="https://github.com/leaderiop/hex-di" style={linkStyle}>
            GitHub
          </a>
          <br />
          <a href="/blog" style={linkStyle}>
            Blog
          </a>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.6rem",
          color: "#2a3a4e",
          letterSpacing: "0.08em",
        }}
      >
        @hex-di/guard
      </div>
    </footer>
  );
}

// ============================================================
// PAGE ASSEMBLY
// ============================================================

export default function Home(): ReactNode {
  useEffect(() => {
    document.body.classList.add("dark-home-page");
    return () => document.body.classList.remove("dark-home-page");
  }, []);

  return (
    <Layout description="Type-Safe Authorization for TypeScript">
      <Head>
        <title>Guard | Type-Safe Authorization | HexDI</title>
        <meta
          name="description"
          content="Type-safe authorization for TypeScript. 10 policy kinds, full evaluation traces, zero dependencies."
        />
        <style>{`.main-wrapper{padding-top:0!important}footer{display:none!important}`}</style>
      </Head>
      <main>
        <GuardNav />
        <HeroSection />
        <StatsBar />
        <BeforeAfterSection />
        <PolicyKindsSection />
        <CompositionSection />
        <EvaluationSection />
        <ReactSection />
        <FeaturesSection />
        <EcosystemSection />
        <CTASection />
        <GuardFooter />
      </main>
    </Layout>
  );
}
