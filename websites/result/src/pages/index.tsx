import type { ReactNode, CSSProperties, RefObject } from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import ResultNav from "../components/ResultNav";

// ============================================================
// CONSTANTS
// ============================================================

const ACCENT = "#A6E22E";
const ERR_COLOR = "#F92672";
const INSTALL_CMD = "npm install @hex-di/result";

// ============================================================
// CODE STRINGS
// ============================================================

const BEFORE_CODE = `try {
  const txn = chargeCard(user.card, amount);
  const receipt = sendReceipt(txn);
  return \`Sent to \${receipt.email}\`;
} catch (e) {
  // e is \`unknown\` — no type info
  // Was it a network error? Card expired?
  // Fraud check? We don't know.
  console.error("payment failed", e);
}`;

const AFTER_CODE = `const result = fromThrowable(
  () => chargeCard(user.card, amount),
  (e) => ({ _tag: "PaymentFailed", cause: e }),
)
  .andThen((txn) => sendReceipt(txn))
  .catchTag("CardExpired", (e) => ok(renewAndRetry(e)))
  .match(
    (receipt) => \`Sent to \${receipt.email}\`,
    (e) => \`Failed: \${e._tag}\`,
    // ^— e: NetworkTimeout | FraudDetected
    //    CardExpired already handled ✓
  );`;

const PIPELINE_CODE = `import { fromThrowable, ok, err } from '@hex-di/result';

const reading = fromThrowable(
  () => sensor.read(),
  (e) => ({ _tag: "SensorOffline", id: sensor.id }),
)
  .andThen((raw) =>
    raw.value > threshold
      ? ok(raw)
      : err({ _tag: "OutOfRange", value: raw.value })
  )
  .map((valid) => normalize(valid))
  .andTee((v) => telemetry.record(v))
  .match(
    (v) => publish(v),
    (e) => alertOps(e),
  );`;

const SAFETRY_CODE = `import { safeTry, ok } from '@hex-di/result';

const approval = safeTry(function* () {
  const credit = yield* checkCredit(applicantId);
  const risk   = yield* assessRisk(credit);
  const terms  = yield* generateTerms(risk);

  return ok({ approved: true, terms });
  // If any step returns Err, execution stops
  // and the Err propagates — like Rust's ? operator
});`;

const DO_NOTATION_CODE = `import { ok, bind, let_ } from '@hex-di/result';

const user = ok({})
  .andThen(bind("name", () => validateName("Alice")))
  .andThen(bind("email", () => validateEmail("a@ex.com")))
  .andThen(bind("age", () => validateAge(25)))
  .andThen(let_("id", () => \`usr_\${Date.now()}\`));
// Type: Result<{
//   name: string; email: string;
//   age: number; id: string;
// }, ValidationError>`;

const CATCH_TAG_CODE = `type PaymentError =
  | { _tag: "CardExpired"; card: string }
  | { _tag: "NetworkTimeout"; ms: number }
  | { _tag: "FraudDetected"; score: number };

const result: Result<string, PaymentError> = chargeCard(card);

const handled = result
  .catchTag("NetworkTimeout", (e) =>
    ok(\`Retried after \${e.ms}ms\`))
  // Type: Result<string, CardExpired | FraudDetected>

  .catchTag("CardExpired", (e) =>
    ok(\`Renewed card \${e.card}\`))
  // Type: Result<string, FraudDetected>

  .orTee((e) => alertFraudTeam(e));
  // Only FraudDetected remains — type proves it ✓`;

const EFFECT_HANDLER_CODE = `import {
  composeHandlers, transformEffects,
  type EffectHandler,
} from '@hex-di/result';

const quotaHandler: EffectHandler<QuotaExceeded, string> = {
  _tag: "quota", tags: ["QuotaExceeded"],
  handle: (e) => ok(\`Queued: tenant \${e.tenantId}\`),
};

const corruptionHandler: EffectHandler<FileCorrupted, string> = {
  _tag: "corruption", tags: ["FileCorrupted"],
  handle: (e) => ok(\`Quarantined: \${e.fileName}\`),
};

// Compose + apply — only PermissionDenied remains
const handler = composeHandlers(quotaHandler, corruptionHandler);
const result = transformEffects(processFile(file), handler);
// Type: Result<string, PermissionDenied>`;

const ECOSYSTEM_CODE = `import { createAdapter } from 'hex-di';
import { ok, fromThrowable } from '@hex-di/result';

const UserService = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: 'singleton',
  factory: ({ Database, Logger }) => ({
    findUser: (id: string) =>
      fromThrowable(
        () => Database.query(id),
        () => new DatabaseError(id),
      )
        .andTee((u) => Logger.info('found', u))
        .mapErr((e) => new UserNotFound(id, e)),
  }),
});`;

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
    title: "No More Try-Catch",
    description:
      "Errors are values, not exceptions. Pattern match on success and failure paths with full type safety.",
    icon: "shield",
    iconColor: "#A6E22E",
  },
  {
    title: "Railway-Oriented",
    description:
      "Chain operations with map, andThen, and orElse. Errors propagate automatically through the pipeline.",
    icon: "route",
    iconColor: "#20B2AA",
  },
  {
    title: "Exhaustive Matching",
    description:
      "TypeScript ensures you handle every error variant. No silent failures, no forgotten catch blocks.",
    icon: "check",
    iconColor: "#BD93F9",
  },
  {
    title: "Zero Runtime Cost",
    description:
      "Lightweight wrapper with no dependencies. Result<T, E> compiles away to simple objects.",
    icon: "zap",
    iconColor: "#FFB86C",
  },
  {
    title: "Tagged Error Handling",
    description:
      "catchTag progressively eliminates errors from the union. Each handler narrows the type until nothing remains.",
    icon: "layers",
    iconColor: "#6272A4",
  },
  {
    title: "Effect System",
    description:
      "Type-level contracts, composable handlers, and effect tracking. Declare and verify error surfaces at zero runtime cost.",
    icon: "globe",
    iconColor: "#FF79C6",
  },
];

const STATS = [
  { value: "0", label: "runtime dependencies" },
  { value: "50+", label: "API methods" },
  { value: "7", label: "combinators" },
  { value: "TS 5.6+", label: "TypeScript native" },
] as const;

interface ApiCard {
  readonly title: string;
  readonly code: string;
  readonly annotation: string;
}

const API_CONSTRUCTORS: readonly ApiCard[] = [
  {
    title: "ok / err",
    code: `const a = ok(42);       // Ok<number>
const b = err('fail');  // Err<string>`,
    annotation: "Wrap values into the Result type",
  },
  {
    title: "fromThrowable",
    code: `const r = fromThrowable(
  () => JSON.parse(s),
  (e) => new ParseError(e),
);`,
    annotation: "Catch exceptions as typed errors",
  },
  {
    title: "fromNullable",
    code: `const r = fromNullable(
  map.get(key),
  () => new NotFound(key),
);`,
    annotation: "Convert null | undefined to Err",
  },
];

const API_CHAINING: readonly ApiCard[] = [
  {
    title: "map / mapErr",
    code: `ok(2)
  .map(n => n * 10)     // Ok(20)
  .mapErr(e => wrap(e)) // skipped`,
    annotation: "Transform the Ok or Err value",
  },
  {
    title: "andThen / orElse",
    code: `ok(id)
  .andThen(id => findUser(id))
  .orElse(e => fallback(e))`,
    annotation: "Chain Result-returning functions",
  },
  {
    title: "andTee / orTee",
    code: `ok(user)
  .andTee(u => log('found', u))
  .orTee(e => report(e))`,
    annotation: "Side-effects without changing the value",
  },
];

const API_COMBINATORS: readonly ApiCard[] = [
  {
    title: "all()",
    code: `const r = all(
  fetchUser(id),
  fetchOrder(id),
); // Ok<[User, Order]>`,
    annotation: "All must succeed or first Err wins",
  },
  {
    title: "zipOrAccumulate()",
    code: `const r = zipOrAccumulate(
  validateName(name),
  validateAge(age),
); // Err<[E, ...E[]]> collects ALL`,
    annotation: "Accumulate all errors, no short-circuit",
  },
  {
    title: "partition()",
    code: `const [oks, errs] = partition(
  items.map(i => validate(i))
);`,
    annotation: "Split into successes and failures",
  },
];

const API_TAGGED_ERRORS: readonly ApiCard[] = [
  {
    title: "catchTag()",
    code: `result
  .catchTag("NotFound", (e) =>
    ok(\`Fallback: \${e.resource}\`)
  ) // narrows error union`,
    annotation: "Handle one tagged error, narrow the type",
  },
  {
    title: "catchTags()",
    code: `result.catchTags({
  NotFound: (e) => ok("default"),
  Timeout:  (e) => ok("retry"),
}) // handles multiple at once`,
    annotation: "Handle multiple tagged errors in one call",
  },
  {
    title: "createErrorGroup()",
    code: `const Http = createErrorGroup("Http");
const NotFound = Http.create("NotFound");
const e = NotFound({ url: "/api", status: 404 });
Http.is(e) // true`,
    annotation: "Two-level discriminated error families",
  },
];

interface EcosystemLib {
  readonly name: string;
  readonly purpose: string;
  readonly highlighted?: boolean;
}

const ECOSYSTEM_LIBS: readonly EcosystemLib[] = [
  { name: "hex-di", purpose: "DI Core" },
  { name: "@hex-di/result", purpose: "Result Type", highlighted: true },
  { name: "@hex-di/flow", purpose: "State Machines" },
  { name: "@hex-di/saga", purpose: "Orchestration" },
  { name: "@hex-di/guard", purpose: "Auth & Permissions" },
  { name: "@hex-di/query", purpose: "Data Fetching" },
];

function getIcon(name: string, color: string): ReactNode {
  switch (name) {
    case "shield":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "route":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M17 7h4v4" />
        </svg>
      );
    case "check":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "zap":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "layers":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "globe":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    default:
      return null;
  }
}

const PIPELINE_STEPS = [
  { step: "fromThrowable", desc: "Catch sensor exceptions as typed errors" },
  { step: "andThen", desc: "Validate reading against thresholds" },
  { step: "map", desc: "Normalize the sensor value" },
  { step: "andTee", desc: "Record telemetry without changing the value" },
  { step: "match", desc: "Publish or alert — exhaustively" },
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
// SYNTAX HIGHLIGHTING (Dracula-inspired for Result)
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

const RESULT_API = new Set([
  "ok",
  "err",
  "fromThrowable",
  "safeTry",
  "match",
  "all",
  "collect",
  "partition",
  "fromNullable",
  "map",
  "mapErr",
  "andThen",
  "orElse",
  "andTee",
  "orTee",
  "Result",
  "catchTag",
  "catchTags",
  "andThenWith",
  "orDie",
  "createErrorGroup",
  "composeHandlers",
  "transformEffects",
  "identityHandler",
  "zipOrAccumulate",
  "forEach",
  "bind",
  "let_",
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
      } else if (RESULT_API.has(word)) {
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

function ResultCodeBlock({ code }: { readonly code: string }): ReactNode {
  const lines = code.split("\n");
  const parts: ReactNode[] = [];

  lines.forEach((line, li) => {
    tokenizeLine(line).forEach((tok, ti) => {
      parts.push(
        <span key={`${li}-${ti}`} style={{ color: tok.color }}>
          {tok.text}
        </span>
      );
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
// TERMINAL CODE WINDOW (reusable)
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
      {/* Title bar */}
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
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ERR_COLOR,
            opacity: 0.7,
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#F1FA8C",
            opacity: 0.7,
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ACCENT,
            opacity: 0.7,
          }}
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
      {/* Code area */}
      <div style={{ position: "relative" }}>
        <div className="result-scanline-overlay" />
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
          <ResultCodeBlock code={code} />
        </pre>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1: HERO
// ============================================================

function RailwaySVG(): ReactNode {
  return (
    <svg
      viewBox="0 0 420 260"
      width="420"
      height="260"
      style={{ maxWidth: "100%" }}
      aria-label="Railway-oriented programming visualization"
    >
      <defs>
        <filter id="glow-lime">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Ok path */}
        <path
          id="ok-path"
          d="M 30 80 C 80 80, 100 80, 140 80 L 200 80 L 270 80 L 340 80 L 390 80"
          fill="none"
        />
        {/* Err path — branches down */}
        <path
          id="err-path"
          d="M 140 80 C 160 80, 170 120, 200 160 L 270 160 L 340 160 L 390 160"
          fill="none"
        />
      </defs>

      {/* Background grid dots */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 12 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={25 + col * 35}
            cy={25 + row * 30}
            r="0.8"
            fill="rgba(166, 226, 46, 0.08)"
          />
        ))
      )}

      {/* Ok rail — solid lime */}
      <use
        href="#ok-path"
        stroke={ACCENT}
        strokeWidth="2"
        strokeDasharray="400"
        strokeDashoffset="400"
        opacity="0.8"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="400"
          to="0"
          dur="2s"
          fill="freeze"
          begin="0.3s"
        />
      </use>

      {/* Err rail — dashed red */}
      <use
        href="#err-path"
        stroke={ERR_COLOR}
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.4"
      >
        <animate attributeName="opacity" from="0" to="0.4" dur="0.8s" fill="freeze" begin="1.5s" />
      </use>

      {/* Traveling dot on Ok path */}
      <circle r="5" fill={ACCENT} filter="url(#glow-lime)" opacity="0">
        <animateMotion dur="4s" repeatCount="indefinite" begin="2.5s">
          <mpath href="#ok-path" />
        </animateMotion>
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.05;0.9;1"
          dur="4s"
          repeatCount="indefinite"
          begin="2.5s"
        />
      </circle>

      {/* Node labels on Ok path */}
      <g opacity="0">
        <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin="1s" />
        {/* input */}
        <text
          x="30"
          y="68"
          fill="#8a9bb0"
          fontSize="9"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
        >
          input
        </text>

        {/* ok() node */}
        <rect
          x="118"
          y="66"
          width="44"
          height="28"
          rx="3"
          fill="rgba(166, 226, 46, 0.08)"
          stroke={ACCENT}
          strokeWidth="1"
        />
        <text
          x="140"
          y="84"
          fill={ACCENT}
          fontSize="9"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
        >
          ok()
        </text>

        {/* map() node */}
        <rect
          x="183"
          y="66"
          width="38"
          height="28"
          rx="3"
          fill="rgba(166, 226, 46, 0.06)"
          stroke="rgba(166, 226, 46, 0.4)"
          strokeWidth="1"
        />
        <text
          x="202"
          y="84"
          fill={ACCENT}
          fontSize="9"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
          opacity="0.8"
        >
          map
        </text>

        {/* andThen() node */}
        <rect
          x="240"
          y="66"
          width="62"
          height="28"
          rx="3"
          fill="rgba(166, 226, 46, 0.06)"
          stroke="rgba(166, 226, 46, 0.4)"
          strokeWidth="1"
        />
        <text
          x="271"
          y="84"
          fill={ACCENT}
          fontSize="9"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
          opacity="0.8"
        >
          andThen
        </text>

        {/* match() node */}
        <rect
          x="320"
          y="66"
          width="50"
          height="28"
          rx="3"
          fill="rgba(166, 226, 46, 0.06)"
          stroke="rgba(166, 226, 46, 0.4)"
          strokeWidth="1"
        />
        <text
          x="345"
          y="84"
          fill={ACCENT}
          fontSize="9"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
          opacity="0.8"
        >
          match
        </text>

        {/* Result → onOk */}
        <text
          x="400"
          y="68"
          fill={ACCENT}
          fontSize="8"
          fontFamily="'Fira Code', monospace"
          textAnchor="start"
          filter="url(#glow-lime)"
        >
          onOk
        </text>
        <text
          x="400"
          y="82"
          fill={ACCENT}
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          textAnchor="start"
          opacity="0.5"
        >
          value ✓
        </text>
      </g>

      {/* Err path labels */}
      <g opacity="0">
        <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin="1.8s" />

        {/* err() label at branch point */}
        <text
          x="165"
          y="130"
          fill={ERR_COLOR}
          fontSize="8"
          fontFamily="'Fira Code', monospace"
          opacity="0.6"
        >
          err()
        </text>

        {/* Skip labels */}
        <text
          x="202"
          y="155"
          fill="#506070"
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
          opacity="0.4"
        >
          (skip)
        </text>
        <text
          x="271"
          y="155"
          fill="#506070"
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
          opacity="0.4"
        >
          (skip)
        </text>
        <text
          x="345"
          y="155"
          fill="#506070"
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          textAnchor="middle"
          opacity="0.4"
        >
          (skip)
        </text>

        {/* Result → onErr */}
        <text
          x="400"
          y="155"
          fill={ERR_COLOR}
          fontSize="8"
          fontFamily="'Fira Code', monospace"
          textAnchor="start"
          opacity="0.7"
        >
          onErr
        </text>
        <text
          x="400"
          y="169"
          fill={ERR_COLOR}
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          textAnchor="start"
          opacity="0.4"
        >
          error ✗
        </text>
      </g>

      {/* Legend */}
      <g opacity="0">
        <animate attributeName="opacity" from="0" to="0.7" dur="0.5s" fill="freeze" begin="2.2s" />
        <line x1="30" y1="230" x2="60" y2="230" stroke={ACCENT} strokeWidth="2" />
        <text x="68" y="233" fill="#8a9bb0" fontSize="8" fontFamily="'Fira Code', monospace">
          Ok path — values flow through
        </text>
        <line
          x1="30"
          y1="246"
          x2="60"
          y2="246"
          stroke={ERR_COLOR}
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.5"
        />
        <text x="68" y="249" fill="#8a9bb0" fontSize="8" fontFamily="'Fira Code', monospace">
          Err path — operations skipped
        </text>
      </g>
    </svg>
  );
}

function HeroSection(): ReactNode {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <section
      className="result-hero-section"
      style={{
        padding: isMobile ? "80px 20px 60px" : "120px 40px 80px",
      }}
    >
      {/* Background grid */}
      <div
        className="result-bg-grid"
        style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }}
      />

      <div
        className="result-hero-grid"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.1fr",
          gap: isMobile ? "48px" : "80px",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Left: text */}
        <div>
          <div
            className="anim-fade-in"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "28px",
            }}
          >
            <span
              style={{ display: "inline-block", width: "28px", height: "1px", background: ACCENT }}
            />
            <span style={S.monoLabel()}>@hex-di/result</span>
          </div>

          <h1
            className="anim-fade-in-d1"
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              margin: "0 0 28px",
            }}
          >
            Errors become <span style={{ color: ACCENT }}>values</span>.
            <br />
            Values become <span style={{ color: ACCENT }}>pipelines</span>.
          </h1>

          <p
            className="anim-fade-in-d2"
            style={{
              ...S.body("#a0b4c8"),
              fontSize: "1.05rem",
              maxWidth: "460px",
              marginBottom: "40px",
            }}
          >
            Type-safe error handling for TypeScript. Zero dependencies. Full railway-oriented
            programming in a single import.
          </p>

          {/* Install command */}
          <div
            className="anim-fade-in-d3"
            style={{
              display: "inline-flex",
              alignItems: "stretch",
              background: "rgba(6, 13, 20, 0.9)",
              border: `1px solid ${ACCENT}38`,
              marginBottom: "36px",
            }}
          >
            <div
              style={{
                padding: "11px 20px",
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.85rem",
                color: "#c8d6e5",
                letterSpacing: "0.03em",
              }}
            >
              <span style={{ color: "#506070", userSelect: "none" }}>$ </span>
              {INSTALL_CMD}
            </div>
            <button
              onClick={copy}
              aria-label="Copy install command"
              style={{
                padding: "11px 16px",
                background: `${ACCENT}0c`,
                border: "none",
                borderLeft: `1px solid ${ACCENT}2e`,
                color: copied ? ACCENT : "#506070",
                cursor: "pointer",
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                transition: "color 0.2s",
              }}
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>

          {/* CTA buttons */}
          <div
            className="anim-fade-in-d4"
            style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}
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
              Get Started
            </Link>
            <a
              href="https://github.com/leaderiop/hex-di"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "transparent",
                color: "#c8d6e5",
                textDecoration: "none",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "1px solid rgba(200, 214, 229, 0.18)",
                transition: "border-color 0.2s",
              }}
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Right: Railway SVG */}
        <div
          className="result-hide-mobile"
          style={{ display: "flex", justifyContent: "center", perspective: "1000px" }}
        >
          <div className="result-float-3d">
            <RailwaySVG />
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
    <div
      style={{
        background: "rgba(6, 13, 20, 0.7)",
        borderTop: `1px solid ${ACCENT}12`,
        borderBottom: `1px solid ${ACCENT}12`,
        padding: "32px 40px",
      }}
    >
      <div
        className="result-grid-4"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {STATS.map((stat, i) => (
          <FadeIn key={stat.label} delay={i * 60}>
            <div
              style={{
                padding: "0 24px",
                textAlign: "center",
                borderLeft: i > 0 ? `1px solid ${ACCENT}14` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: ACCENT,
                  lineHeight: 1,
                  marginBottom: "6px",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  color: "#8a9bb0",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 3: BEFORE / AFTER
// ============================================================

function BeforeAfterSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="result-section" style={S.section("#08101C")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel(ERR_COLOR)}>-- THE PROBLEM --</p>
            <h2 style={S.h2()}>
              Try-catch gives you <span style={{ color: "#506070" }}>unknown</span>. Result gives
              you <span style={{ color: ACCENT }}>types</span>.
            </h2>
          </div>
        </FadeIn>

        <div
          className="result-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 24,
          }}
        >
          <FadeIn delay={100}>
            <div className="result-hud-card result-hud-card-err">
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: ERR_COLOR,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.72rem",
                    color: ERR_COLOR,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Traditional try-catch
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.7,
                  overflowX: "auto",
                }}
              >
                <ResultCodeBlock code={BEFORE_CODE} />
              </pre>
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="result-hud-card">
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: ACCENT,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.72rem",
                    color: ACCENT,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Result pipeline
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.7,
                  overflowX: "auto",
                }}
              >
                <ResultCodeBlock code={AFTER_CODE} />
              </pre>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 4: CODE PIPELINE
// ============================================================

function CodePipelineSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="result-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <div
          className="result-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.2fr",
            gap: isMobile ? 40 : 80,
            alignItems: "center",
          }}
        >
          {/* Left: explanation */}
          <FadeIn>
            <div>
              <p style={S.monoLabel()}>:: pipeline</p>
              <h2 style={S.h2()}>Chain operations, not try-catch blocks</h2>
              <p style={{ ...S.body(), marginBottom: 32 }}>
                Build error-handling pipelines with a fluent API. Each step is type-checked. Errors
                short-circuit automatically.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: ACCENT,
                        minWidth: 24,
                        textAlign: "right",
                      }}
                    >
                      {i + 1}.
                    </span>
                    <div>
                      <span
                        style={{
                          fontFamily: "'Fira Code', monospace",
                          fontSize: "0.78rem",
                          color: ACCENT,
                        }}
                      >
                        {s.step}()
                      </span>
                      <span style={{ ...S.body(), marginLeft: 8, fontSize: "0.82rem" }}>
                        — {s.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Right: code terminal */}
          <FadeIn delay={150}>
            <TerminalWindow title="pipeline.ts" code={PIPELINE_CODE} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 5: FEATURES (HUD CARDS)
// ============================================================

function FeaturesSection(): ReactNode {
  return (
    <section id="features" className="result-section" style={S.section("#08101C")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: features</p>
            <h2 style={S.h2()}>Why Result?</h2>
          </div>
        </FadeIn>

        <div
          className="result-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 80}>
              <div className="result-hud-card" style={{ height: "100%" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${f.iconColor}33`,
                    background: `${f.iconColor}0a`,
                    marginBottom: 16,
                  }}
                >
                  {getIcon(f.icon, f.iconColor)}
                </div>
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

// ============================================================
// SECTION 6: API SHOWCASE
// ============================================================

function ApiCardRow({
  label,
  cards,
  delay,
}: {
  readonly label: string;
  readonly cards: readonly ApiCard[];
  readonly delay: number;
}): ReactNode {
  return (
    <div style={{ marginBottom: 48 }}>
      <FadeIn delay={delay}>
        <p
          style={{
            ...S.monoLabel(),
            fontSize: "0.62rem",
            marginBottom: 20,
          }}
        >
          {label}
        </p>
      </FadeIn>
      <div
        className="result-grid-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {cards.map((card, i) => (
          <FadeIn key={card.title} delay={delay + (i + 1) * 60}>
            <div className="result-api-card">
              <h4
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.82rem",
                  color: ACCENT,
                  margin: "0 0 12px",
                  fontWeight: 400,
                }}
              >
                {card.title}
              </h4>
              <pre
                style={{
                  margin: "0 0 12px",
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.72rem",
                  lineHeight: 1.65,
                  overflowX: "auto",
                }}
              >
                <ResultCodeBlock code={card.code} />
              </pre>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.75rem",
                  color: "#506070",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {card.annotation}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function APIShowcaseSection(): ReactNode {
  return (
    <section id="api" className="result-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: api</p>
            <h2 style={S.h2()}>50+ methods. One import.</h2>
            <p style={{ ...S.body(), maxWidth: 560, margin: "0 auto" }}>
              Constructors, chainers, combinators, tagged error handlers — everything you need to
              handle errors as first-class values.
            </p>
          </div>
        </FadeIn>

        <ApiCardRow label="// constructors" cards={API_CONSTRUCTORS} delay={0} />
        <ApiCardRow label="// chaining" cards={API_CHAINING} delay={100} />
        <ApiCardRow label="// combinators" cards={API_COMBINATORS} delay={200} />
        <ApiCardRow label="// tagged error handling" cards={API_TAGGED_ERRORS} delay={300} />
      </div>
    </section>
  );
}

// ============================================================
// SECTION 7: GENERATORS (safeTry)
// ============================================================

function GeneratorsSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="result-section" style={S.section("#08101C")}>
      <div style={S.container()}>
        <div
          className="result-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.2fr",
            gap: isMobile ? 40 : 80,
            alignItems: "center",
          }}
        >
          <FadeIn>
            <div>
              <p style={S.monoLabel()}>:: generators</p>
              <h2 style={S.h2()}>
                {"Rust's "}
                <span style={{ color: ACCENT }}>?</span>
                {" operator, in TypeScript"}
              </h2>
              <p style={{ ...S.body(), marginBottom: 24 }}>
                Use{" "}
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  safeTry
                </code>{" "}
                with generator functions to write linear, imperative code that short-circuits on the
                first error — just like Rust{"'"}s{" "}
                <code
                  style={{
                    color: SYN.keyword,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  ?
                </code>{" "}
                operator.
              </p>
              <p style={S.body()}>
                Each{" "}
                <code
                  style={{
                    color: SYN.keyword,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  yield*
                </code>{" "}
                unwraps an Ok value or immediately returns the Err. No nesting, no callbacks, no
                .then() chains.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <TerminalWindow title="safe-try.ts" code={SAFETRY_CODE} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 7b: DO NOTATION
// ============================================================

function DoNotationSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="result-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <div
          className="result-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.2fr",
            gap: isMobile ? 40 : 80,
            alignItems: "center",
          }}
        >
          <FadeIn>
            <div>
              <p style={S.monoLabel()}>:: do notation</p>
              <h2 style={S.h2()}>
                Build objects <span style={{ color: ACCENT }}>step by step</span>
              </h2>
              <p style={{ ...S.body(), marginBottom: 24 }}>
                Use{" "}
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  bind
                </code>{" "}
                and{" "}
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  let_
                </code>{" "}
                to accumulate fields into a typed object. Each step can fail — and the full object
                type is inferred automatically.
              </p>
              <p style={S.body()}>
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  bind
                </code>{" "}
                adds a Result-producing field.{" "}
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  let_
                </code>{" "}
                adds a pure value. Both accumulate into the same typed record.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <TerminalWindow title="do-notation.ts" code={DO_NOTATION_CODE} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 8: TAGGED ERROR HANDLING
// ============================================================

function TaggedErrorSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="result-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <div
          className="result-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
            gap: isMobile ? 40 : 80,
            alignItems: "center",
          }}
        >
          {/* Left: code terminal */}
          <FadeIn>
            <TerminalWindow title="tagged-errors.ts" code={CATCH_TAG_CODE} />
          </FadeIn>

          {/* Right: explanation */}
          <FadeIn delay={150}>
            <div>
              <p style={S.monoLabel()}>:: tagged errors</p>
              <h2 style={S.h2()}>
                Eliminate errors <span style={{ color: ACCENT }}>one tag at a time</span>
              </h2>
              <p style={{ ...S.body(), marginBottom: 24 }}>
                Use{" "}
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  catchTag
                </code>{" "}
                and{" "}
                <code
                  style={{
                    color: SYN.fn,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  catchTags
                </code>{" "}
                to progressively handle errors by their discriminant. TypeScript narrows the union
                after each handler — until nothing remains.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { fn: "catchTag", desc: "Handle one error type, narrow the union" },
                  { fn: "catchTags", desc: "Handle multiple at once, narrow all" },
                  { fn: "andThenWith", desc: "Chain with success + error recovery" },
                  { fn: "orDie", desc: "Extract value or throw — for boundaries" },
                ].map(s => (
                  <div key={s.fn} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: "0.78rem",
                        color: ACCENT,
                        minWidth: 110,
                      }}
                    >
                      {s.fn}()
                    </span>
                    <span style={{ ...S.body(), fontSize: "0.82rem" }}>{s.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28 }}>
                <Link
                  to="/docs/guides/tagged-error-handling"
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.78rem",
                    color: ACCENT,
                    textDecoration: "none",
                    borderBottom: `1px solid ${ACCENT}40`,
                    paddingBottom: 2,
                  }}
                >
                  Read the guide →
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 9: EFFECT HANDLERS
// ============================================================

function EffectHandlerSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section className="result-section" style={S.section("#08101C")}>
      <div style={S.container()}>
        <div
          className="result-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.2fr",
            gap: isMobile ? 40 : 80,
            alignItems: "center",
          }}
        >
          {/* Left: explanation */}
          <FadeIn>
            <div>
              <p style={S.monoLabel()}>:: effect system</p>
              <h2 style={S.h2()}>
                Composable <span style={{ color: ACCENT }}>error handlers</span>
              </h2>
              <p style={{ ...S.body(), marginBottom: 24 }}>
                Define handlers for specific error tags, compose them algebraically, and apply them
                to any Result. Plus type-level contracts that enforce effect declarations at compile
                time — zero runtime cost.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { fn: "EffectHandler", desc: "Typed handler for specific error tags" },
                  { fn: "composeHandlers", desc: "Merge handlers, left-biased precedence" },
                  { fn: "transformEffects", desc: "Apply handler chain to any Result" },
                  { fn: "EffectContract", desc: "Declare input/output/effects at type level" },
                ].map(s => (
                  <div key={s.fn} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: "0.78rem",
                        color: ACCENT,
                        minWidth: 150,
                      }}
                    >
                      {s.fn}
                    </span>
                    <span style={{ ...S.body(), fontSize: "0.82rem" }}>{s.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28 }}>
                <Link
                  to="/docs/advanced/effect-system"
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.78rem",
                    color: ACCENT,
                    textDecoration: "none",
                    borderBottom: `1px solid ${ACCENT}40`,
                    paddingBottom: 2,
                  }}
                >
                  Explore the effect system →
                </Link>
              </div>
            </div>
          </FadeIn>

          {/* Right: code terminal */}
          <FadeIn delay={150}>
            <TerminalWindow title="effect-handlers.ts" code={EFFECT_HANDLER_CODE} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECTION 10: ECOSYSTEM
// ============================================================

function EcosystemSection(): ReactNode {
  return (
    <section className="result-section" style={S.section("#020408")}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <p style={S.monoLabel()}>:: ecosystem</p>
            <h2 style={S.h2()}>Part of the HexDI stack</h2>
            <p style={{ ...S.body(), maxWidth: 560, margin: "0 auto 40px" }}>
              Result integrates seamlessly with HexDI adapters. Every factory returns{" "}
              <code style={{ color: SYN.fn, fontFamily: "'Fira Code', monospace" }}>
                Result&lt;T, E&gt;
              </code>{" "}
              — errors are typed and composable across your entire dependency graph.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ maxWidth: 700, margin: "0 auto 48px" }}>
            <TerminalWindow title="user-service.adapter.ts" code={ECOSYSTEM_CODE} />
          </div>
        </FadeIn>

        <FadeIn delay={200}>
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

        <FadeIn delay={300}>
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
// SECTION 9: CTA
// ============================================================

function CTASection(): ReactNode {
  return (
    <section
      className="result-section"
      style={{
        ...S.section("#08101C"),
        padding: "80px 40px",
      }}
    >
      <div style={S.container()}>
        <FadeIn>
          <div
            className="result-hud-card"
            style={{
              maxWidth: 700,
              margin: "0 auto",
              textAlign: "center",
              padding: "48px 40px",
            }}
          >
            <h2 style={{ ...S.h2(), marginBottom: 12 }}>
              Start building type-safe error handling today
            </h2>
            <p style={{ ...S.body(), maxWidth: 460, margin: "0 auto 32px" }}>
              Replace try-catch with composable, typed pipelines. Zero dependencies. Full TypeScript
              inference.
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

function ResultFooter(): ReactNode {
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
        borderTop: "1px solid rgba(166, 226, 46, 0.2)",
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
          <Link to="/docs/guides/tagged-error-handling" style={linkStyle}>
            Tagged Error Handling
          </Link>
          <br />
          <Link to="/docs/advanced/effect-system" style={linkStyle}>
            Effect System
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
          <a href="https://guard.hexdi.dev" style={linkStyle}>
            Guard
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
        @hex-di/result
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
    <Layout description="Type-Safe Error Handling for TypeScript">
      <Head>
        <title>Result | Type-Safe Error Handling | HexDI</title>
        <meta
          name="description"
          content="Type-safe error handling for TypeScript. Zero dependencies. Full railway-oriented programming."
        />
        <style>{`.main-wrapper{padding-top:0!important}footer{display:none!important}`}</style>
      </Head>
      <main>
        <ResultNav />
        <HeroSection />
        <StatsBar />
        <BeforeAfterSection />
        <CodePipelineSection />
        <FeaturesSection />
        <APIShowcaseSection />
        <GeneratorsSection />
        <DoNotationSection />
        <TaggedErrorSection />
        <EffectHandlerSection />
        <EcosystemSection />
        <CTASection />
        <ResultFooter />
      </main>
    </Layout>
  );
}
