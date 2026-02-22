import type { ReactNode, CSSProperties, RefObject } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

// ============================================================
// CONSTANTS
// ============================================================

const INSTALL_CMD = 'npm install hex-di';

const QUICK_START_CODE = `import { port, createAdapter, GraphBuilder, createContainer } from 'hex-di';

// 1. Define a contract
interface Logger { log(msg: string): void }

// 2. Create a port — name is inferred as a literal type
const LoggerPort = port<Logger>()({ name: 'Logger' });

// 3. Declare an adapter with explicit dependencies
const ConsoleLogger = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log('[App]', msg),
  }),
});

// 4. Build the graph — validated at compile time
// Missing dependencies are TypeScript errors ✗
const graph = GraphBuilder.create()
  .provide(ConsoleLogger)
  .build();

// 5. Resolve — fully typed, no casts
const container = createContainer({ graph, name: 'App' });
const logger = container.resolve(LoggerPort);
// ^— TypeScript knows this is Logger ✓
logger.log('System online.');`;

const BROKEN_CODE_PREFIX = `// Service that requires LoggerPort
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],       // ← dependency declared
  lifetime: 'singleton',
  factory: ({ Logger }) => ({ /* ... */ }),
});

// Graph missing the required adapter
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter)  // needs LoggerPort`;

interface Feature {
  title: string;
  description: string;
  accent: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Compile-Time Safety',
    description:
      'Missing dependencies are TypeScript errors — caught before your code runs, not in production at 3 AM.',
    accent: 'cyan',
  },
  {
    title: 'Zero Reflection',
    description:
      'No decorators. No reflect-metadata. No runtime overhead. Pure TypeScript structural types do the work.',
    accent: 'orange',
  },
  {
    title: 'Hexagonal Architecture',
    description:
      'Ports define contracts, adapters provide implementations. Your domain logic stays clean and framework-free.',
    accent: 'cyan',
  },
  {
    title: 'React Integration',
    description:
      'Provider, scope, and resolution hooks for React. usePort() resolves typed services directly from your DI graph — no prop drilling, no context boilerplate.',
    accent: 'orange',
  },
  {
    title: 'Lifetime Management',
    description:
      'Singleton, Scoped, and Transient lifetimes. The container enforces scope boundaries — scoped services cannot leak outside their scope.',
    accent: 'cyan',
  },
  {
    title: 'Framework Agnostic',
    description:
      'Works with any TypeScript project: Node.js, React, Hono, Express, Deno. No lock-in, ever.',
    accent: 'orange',
  },
];

interface PackageInfo {
  name: string;
  label: string;
  description: string;
  accent: 'cyan' | 'orange';
}

const PACKAGES: PackageInfo[] = [
  {
    name: 'hex-di',
    label: 'CORE',
    description: 'Ports, adapters, graph builder, and container. Everything you need.',
    accent: 'cyan',
  },
  {
    name: '@hex-di/react',
    label: 'OPTIONAL',
    description: 'React provider, context, and hooks that mirror your DI graph.',
    accent: 'orange',
  },
  {
    name: '@hex-di/testing',
    label: 'OPTIONAL',
    description: 'Type-safe mock adapters, graph assertions, and renderWithContainer — DI-aware test utilities for Vitest and Testing Library.',
    accent: 'orange',
  },
];

interface Lifetime {
  name: string;
  code: string;
  description: string;
  detail: string;
  color: string;
}

const LIFETIMES: Lifetime[] = [
  {
    name: 'SINGLETON',
    code: "lifetime: 'singleton'",
    description: 'One instance for the entire container lifetime. Shared across all consumers.',
    detail: 'Loggers, configuration providers, API clients, and services with no per-request state.',
    color: '#00F0FF',
  },
  {
    name: 'SCOPED',
    code: "lifetime: 'scoped'",
    description: 'One instance per scope. Shared within the scope, isolated across scopes.',
    detail: 'Request auth context, database connections, per-user state, unit-of-work.',
    color: '#7c5cbf',
  },
  {
    name: 'TRANSIENT',
    code: "lifetime: 'transient'",
    description: 'New instance every resolution. Never shared between consumers.',
    detail: 'Stateful services that must not be shared between callers — each consumer gets its own instance.',
    color: '#FF5E00',
  },
];

interface EcosystemLib {
  name: string;
  purpose: string;
  detail: string;
  accent: 'cyan' | 'orange';
}

const ECOSYSTEM: EcosystemLib[] = [
  { name: '@hex-di/logger',      purpose: 'Structured logging',      detail: 'pino · winston · bunyan',          accent: 'cyan'   },
  { name: '@hex-di/tracing',     purpose: 'Distributed tracing',     detail: 'OTel · Datadog · Jaeger · Zipkin', accent: 'cyan'   },
  { name: '@hex-di/query',       purpose: 'Data fetching & caching', detail: 'port-based query layer',           accent: 'orange' },
  { name: '@hex-di/store',       purpose: 'Reactive state',          detail: 'signal-based DI port',             accent: 'cyan'   },
  { name: '@hex-di/flow',        purpose: 'State machines',          detail: 'injected service FSMs',            accent: 'orange' },
  { name: '@hex-di/saga',        purpose: 'Workflow orchestration',  detail: 'distributed saga pattern',         accent: 'cyan'   },
  { name: '@hex-di/guard',       purpose: 'Auth & permissions',      detail: 'role · policy · ABAC',             accent: 'orange' },
  { name: '@hex-di/clock',       purpose: 'Testable time',           detail: 'virtual clock for tests',          accent: 'cyan'   },
  { name: '@hex-di/http-client', purpose: 'HTTP client port',        detail: 'typed client with retry',          accent: 'orange' },
];

const STATS = [
  { value: '0',   label: 'runtime dependencies', sub: 'in @hex-di/core'       },
  { value: '3',   label: 'core packages',        sub: 'one install: hex-di'   },
  { value: '9',   label: 'ecosystem libraries',  sub: 'ports-first design'    },
  { value: 'TS 5+', label: 'TypeScript support',   sub: 'strict structural types' },
] as const;

const PARTICLE_LEFT_POSITIONS = [5, 12, 18, 26, 33, 42, 51, 58, 65, 73, 82, 90];

// ============================================================
// SHARED STYLES
// ============================================================

const S = {
  monoLabel: (color = '#00F0FF'): CSSProperties => ({
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.68rem',
    letterSpacing: '0.25em',
    color,
    textTransform: 'uppercase' as const,
    marginBottom: '16px',
  }),
  h2: (): CSSProperties => ({
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    margin: '0 0 16px',
  }),
  body: (color = '#8a9bb0'): CSSProperties => ({
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    lineHeight: 1.65,
    color,
    margin: 0,
  }),
  section: (bg?: string): CSSProperties => ({
    padding: '100px 40px',
    position: 'relative' as const,
    background: bg,
  }),
  container: (): CSSProperties => ({
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative' as const,
    zIndex: 1,
  }),
  sectionHeader: (): CSSProperties => ({
    marginBottom: '64px',
    textAlign: 'center' as const,
  }),
};

// ============================================================
// HOOKS & ANIMATION UTILITIES
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
      { threshold },
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
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, [bp]);
  return mobile ?? false;
}

function FadeIn({ children, delay = 0, style }: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}): ReactNode {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// TACTICAL NAV
// ============================================================

function TacticalNav(): ReactNode {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const docsHref = useBaseUrl('/docs/getting-started');

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Ecosystem', href: '#ecosystem' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Docs', href: docsHref },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        background: scrolled ? 'rgba(2, 4, 8, 0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0, 240, 255, 0.12)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        transition: 'all 0.3s ease',
        fontFamily: "'Fira Code', monospace",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginRight: 'auto',
          textDecoration: 'none',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polygon
            points="14,2 24,8 24,20 14,26 4,20 4,8"
            stroke="#00F0FF"
            strokeWidth="1.5"
            fill="rgba(0,240,255,0.08)"
          />
          <polygon
            points="14,7 20,11 20,19 14,23 8,19 8,11"
            stroke="#00F0FF"
            strokeWidth="0.8"
            fill="rgba(0,240,255,0.04)"
          />
          <circle cx="14" cy="15" r="2.5" fill="#00F0FF" opacity="0.85" />
        </svg>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '0.12em',
            color: '#00F0FF',
            textTransform: 'uppercase',
          }}
        >
          HexDI
        </span>
      </div>

      {/* Desktop nav — hidden on mobile */}
      <div className="hex-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navItems.map(({ label, href }) => (
          <NavLink key={label} label={label} href={href} />
        ))}

        {/* SYS.ONLINE indicator */}
        <div
          style={{
            marginLeft: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '0.65rem',
            color: 'rgba(0, 240, 255, 0.45)',
            letterSpacing: '0.12em',
          }}
        >
          <span
            className="pulse-dot"
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#00F0FF',
              boxShadow: '0 0 8px #00F0FF',
            }}
          />
          MIT / OPEN SOURCE
        </div>
      </div>

      {/* Mobile hamburger button — shown only on mobile */}
      <button
        className="hex-show-mobile"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        style={{
          background: 'none',
          border: 'none',
          color: '#00F0FF',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '8px',
          fontFamily: "'Fira Code', monospace",
        }}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            background: 'rgba(2,4,8,0.97)',
            borderBottom: '1px solid rgba(0,240,255,0.12)',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0',
          }}
        >
          {navItems.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 24px',
                color: '#c8d6e5',
                textDecoration: 'none',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.82rem',
              }}
            >
              [{label}]
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}

function NavLink({ label, href }: { label: string; href: string }): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 14px',
        fontFamily: "'Fira Code', monospace",
        fontSize: '0.75rem',
        letterSpacing: '0.04em',
        color: hovered ? '#00F0FF' : 'rgba(200, 214, 229, 0.75)',
        textDecoration: 'none',
        border: '1px solid',
        borderColor: hovered ? 'rgba(0, 240, 255, 0.3)' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      [{label}]
    </a>
  );
}

// ============================================================
// HERO SECTION
// ============================================================

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
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '80px 20px 60px' : '120px 40px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid bg */}
      <div
        className="bg-grid"
        style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '500px',
          background:
            'radial-gradient(ellipse at center, rgba(0,240,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="hex-hero-grid"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left: Text with staggered entrance */}
        <div>
          {/* Label */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '28px',
              opacity: 0,
              animation: 'tactical-fade-in 1s cubic-bezier(0.16,1,0.3,1) 0s forwards',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '28px',
                height: '1px',
                background: '#00F0FF',
              }}
            />
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.68rem',
                letterSpacing: '0.22em',
                color: '#00F0FF',
                textTransform: 'uppercase',
              }}
            >
              Type-Safe DI for TypeScript
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              margin: '0 0 28px',
              opacity: 0,
              animation: 'tactical-fade-in 1s cubic-bezier(0.16,1,0.3,1) 0.1s forwards',
            }}
          >
            The compiler
            <br />
            <span style={{ color: '#00F0FF' }}>enforces</span>
            <br />
            the architecture
          </h1>

          {/* Description */}
          <p
            style={{
              ...S.body(),
              fontSize: '1.05rem',
              maxWidth: '460px',
              marginBottom: '40px',
              opacity: 0,
              animation: 'tactical-fade-in 1s cubic-bezier(0.16,1,0.3,1) 0.2s forwards',
            }}
          >
            Catch missing dependencies at compile time, not in production. HexDI encodes your
            entire dependency graph into TypeScript types — missing adapters are type errors,
            not runtime crashes.
          </p>

          {/* Install command */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'stretch',
              background: 'rgba(6, 13, 20, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.22)',
              marginBottom: '36px',
              opacity: 0,
              animation: 'tactical-fade-in 1s cubic-bezier(0.16,1,0.3,1) 0.3s forwards',
            }}
          >
            <div
              style={{
                padding: '11px 20px',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.88rem',
                color: '#c8d6e5',
                letterSpacing: '0.03em',
              }}
            >
              <span style={{ color: '#506070', userSelect: 'none' }}>$ </span>
              {INSTALL_CMD}
            </div>
            <button
              onClick={copy}
              aria-label="Copy install command"
              style={{
                padding: '11px 16px',
                background: 'rgba(0, 240, 255, 0.07)',
                border: 'none',
                borderLeft: '1px solid rgba(0, 240, 255, 0.18)',
                color: copied ? '#00F0FF' : '#506070',
                cursor: 'pointer',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                transition: 'color 0.2s',
              }}
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>

          {/* CTA buttons */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
              opacity: 0,
              animation: 'tactical-fade-in 1s cubic-bezier(0.16,1,0.3,1) 0.4s forwards',
            }}
          >
            <Link
              to="/docs/getting-started"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: '#00F0FF',
                color: '#020408',
                textDecoration: 'none',
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'opacity 0.2s',
              }}
            >
              Get Started →
            </Link>
            <a
              href="https://github.com/leaderiop/hex-di"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: 'transparent',
                color: '#c8d6e5',
                textDecoration: 'none',
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: '1px solid rgba(200, 214, 229, 0.18)',
                transition: 'border-color 0.2s',
              }}
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Right: 3D floating hexagon dependency graph */}
        <div style={{ display: 'flex', justifyContent: 'center', perspective: '1200px' }}>
          <div className="hex-float-3d" style={{ display: 'flex', justifyContent: 'center' }}>
            <HexDependencyGraph />
          </div>
        </div>
      </div>
    </section>
  );
}

function HexDependencyGraph(): ReactNode {
  return (
    <svg
      viewBox="0 0 380 380"
      width="380"
      height="380"
      style={{ maxWidth: '100%' }}
      aria-label="Dependency graph visualization"
    >
      <defs>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowC" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="rgba(0,240,255,0.55)" />
        </marker>
        <marker id="arrowO" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="rgba(255,94,0,0.55)" />
        </marker>
      </defs>

      {/* Background subtle hexagons */}
      {([80, 200, 320] as number[]).map((cx, i) => (
        <polygon
          key={i}
          points={`${cx},20 ${cx + 28},36 ${cx + 28},68 ${cx},84 ${cx - 28},68 ${cx - 28},36`}
          stroke="rgba(0,240,255,0.04)"
          strokeWidth="1"
          fill="none"
        />
      ))}

      {/* Connections */}
      {/* Container → Logger */}
      <path
        d="M190 118 L120 200"
        stroke="rgba(0,240,255,0.35)"
        strokeWidth="1"
        strokeDasharray="5 4"
        markerEnd="url(#arrowC)"
      >
        <animate attributeName="stroke-dashoffset" values="0;-18" dur="1.1s" repeatCount="indefinite" />
      </path>
      {/* Container → Database */}
      <path
        d="M190 118 L260 200"
        stroke="rgba(0,240,255,0.35)"
        strokeWidth="1"
        strokeDasharray="5 4"
        markerEnd="url(#arrowC)"
      >
        <animate attributeName="stroke-dashoffset" values="0;-18" dur="0.9s" repeatCount="indefinite" />
      </path>
      {/* Logger → Console Adapter */}
      <path
        d="M120 228 L100 295"
        stroke="rgba(255,94,0,0.3)"
        strokeWidth="1"
        strokeDasharray="5 4"
        markerEnd="url(#arrowO)"
      >
        <animate attributeName="stroke-dashoffset" values="0;-18" dur="1.3s" repeatCount="indefinite" />
      </path>
      {/* Database → Postgres Adapter */}
      <path
        d="M260 228 L280 295"
        stroke="rgba(255,94,0,0.3)"
        strokeWidth="1"
        strokeDasharray="5 4"
        markerEnd="url(#arrowO)"
      >
        <animate attributeName="stroke-dashoffset" values="0;-18" dur="1.5s" repeatCount="indefinite" />
      </path>

      {/* Node: Container (central) */}
      <g transform="translate(190, 88)" filter="url(#glow-cyan)">
        <polygon
          points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16"
          fill="rgba(0,240,255,0.09)"
          stroke="#00F0FF"
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="-5"
          textAnchor="middle"
          fill="#00F0FF"
          fontSize="7.5"
          fontFamily="'Fira Code', monospace"
          letterSpacing="0.1em"
        >
          CONTAINER
        </text>
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fill="rgba(0,240,255,0.6)"
          fontSize="6.5"
          fontFamily="'Fira Code', monospace"
        >
          createContainer()
        </text>
        <circle cx="0" cy="0" r="2" fill="#00F0FF">
          <animate attributeName="opacity" values="1;0.3;1" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Node: Logger Port */}
      <g transform="translate(118, 214)">
        <polygon
          points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13"
          fill="rgba(0,240,255,0.05)"
          stroke="rgba(0,240,255,0.45)"
          strokeWidth="1"
        />
        <text
          x="0"
          y="-4"
          textAnchor="middle"
          fill="#00F0FF"
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          opacity="0.85"
        >
          LOGGER
        </text>
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fill="rgba(0,240,255,0.4)"
          fontSize="6"
          fontFamily="'Fira Code', monospace"
        >
          port
        </text>
      </g>

      {/* Node: Database Port */}
      <g transform="translate(262, 214)">
        <polygon
          points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13"
          fill="rgba(0,240,255,0.05)"
          stroke="rgba(0,240,255,0.45)"
          strokeWidth="1"
        />
        <text
          x="0"
          y="-4"
          textAnchor="middle"
          fill="#00F0FF"
          fontSize="7"
          fontFamily="'Fira Code', monospace"
          opacity="0.85"
        >
          DATABASE
        </text>
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fill="rgba(0,240,255,0.4)"
          fontSize="6"
          fontFamily="'Fira Code', monospace"
        >
          port
        </text>
      </g>

      {/* Node: Console Adapter */}
      <g transform="translate(96, 312)">
        <rect
          x="-34"
          y="-18"
          width="68"
          height="36"
          fill="rgba(255,94,0,0.06)"
          stroke="rgba(255,94,0,0.4)"
          strokeWidth="1"
          rx="2"
        />
        <text
          x="0"
          y="-4"
          textAnchor="middle"
          fill="#FF5E00"
          fontSize="6.5"
          fontFamily="'Fira Code', monospace"
          opacity="0.85"
        >
          CONSOLE
        </text>
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fill="rgba(255,94,0,0.5)"
          fontSize="6"
          fontFamily="'Fira Code', monospace"
        >
          adapter
        </text>
      </g>

      {/* Node: Postgres Adapter */}
      <g transform="translate(284, 312)">
        <rect
          x="-34"
          y="-18"
          width="68"
          height="36"
          fill="rgba(255,94,0,0.06)"
          stroke="rgba(255,94,0,0.4)"
          strokeWidth="1"
          rx="2"
        />
        <text
          x="0"
          y="-4"
          textAnchor="middle"
          fill="#FF5E00"
          fontSize="6.5"
          fontFamily="'Fira Code', monospace"
          opacity="0.85"
        >
          POSTGRES
        </text>
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fill="rgba(255,94,0,0.5)"
          fontSize="6"
          fontFamily="'Fira Code', monospace"
        >
          adapter
        </text>
      </g>

      {/* Status badge */}
      <g transform="translate(190, 358)">
        <rect
          x="-60"
          y="-13"
          width="120"
          height="26"
          fill="rgba(0,240,255,0.04)"
          stroke="rgba(0,240,255,0.18)"
          strokeWidth="0.5"
          rx="2"
        />
        <circle cx="-42" cy="0" r="3" fill="rgba(0,240,255,0.6)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text
          x="-30"
          y="4"
          fill="rgba(0,240,255,0.55)"
          fontSize="7.5"
          fontFamily="'Fira Code', monospace"
          letterSpacing="0.05em"
        >
          compile-time valid ✓
        </text>
      </g>
    </svg>
  );
}

// ============================================================
// STATS BAR
// ============================================================

function StatsBar(): ReactNode {
  return (
    <div
      style={{
        background: 'rgba(6, 13, 20, 0.7)',
        borderTop: '1px solid rgba(0,240,255,0.07)',
        borderBottom: '1px solid rgba(0,240,255,0.07)',
        padding: '32px 40px',
      }}
    >
      <div
        className="hex-grid-4"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {STATS.map((stat, i) => (
          <FadeIn key={stat.label} delay={i * 60}>
            <div
              style={{
                padding: '0 32px',
                textAlign: 'center',
                borderLeft: i > 0 ? '1px solid rgba(0,240,255,0.08)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                  fontWeight: 700,
                  color: '#00F0FF',
                  textShadow: '0 0 20px rgba(0,240,255,0.35)',
                  lineHeight: 1,
                  marginBottom: '8px',
                }}
              >
                {stat.value}
              </div>
              <div style={{ ...S.body('#c8d6e5'), fontSize: '0.82rem' }}>{stat.label}</div>
              <div style={{ ...S.body('#506070'), fontSize: '0.7rem', marginTop: '4px' }}>{stat.sub}</div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FEATURES SECTION
// ============================================================

function FeaturesSection(): ReactNode {
  return (
    <section id="features" className="hex-section" style={S.section()}>
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.15), transparent)',
        }}
      />

      <div style={S.container()}>
        <div style={S.sectionHeader()}>
          <div style={S.monoLabel()}>— CAPABILITIES —</div>
          <h2 style={S.h2()}>Type safety all the way down</h2>
          <p style={{ ...S.body(), maxWidth: '480px', margin: '0 auto' }}>
            No decorators. No string tokens. No runtime magic. Just TypeScript types doing real work.
          </p>
        </div>

        <div
          className="hex-grid-3"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            perspective: '1000px',
          }}
        >
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 60}>
              <div
                className={`hud-card depth-card${feature.accent === 'orange' ? ' hud-card-orange' : ''}`}
              >
                {/* Icon */}
                <div style={{ marginBottom: '16px' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <polygon
                      points="11,2 19,6.5 19,15.5 11,20 3,15.5 3,6.5"
                      stroke={feature.accent === 'cyan' ? '#00F0FF' : '#FF5E00'}
                      strokeWidth="1.5"
                      fill={
                        feature.accent === 'cyan'
                          ? 'rgba(0,240,255,0.08)'
                          : 'rgba(255,94,0,0.08)'
                      }
                    />
                    <circle
                      cx="11"
                      cy="11"
                      r="2.5"
                      fill={feature.accent === 'cyan' ? '#00F0FF' : '#FF5E00'}
                      opacity="0.8"
                    />
                  </svg>
                </div>

                <h3
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    margin: '0 0 10px',
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ ...S.body('#6a7f90'), fontSize: '0.855rem' }}>{feature.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ERROR SHOWCASE SECTION
// ============================================================

function BrokenCodeDisplay(): ReactNode {
  return (
    <pre
      style={{
        margin: 0,
        padding: '20px',
        fontFamily: "'Fira Code', monospace",
        fontSize: '0.73rem',
        lineHeight: 1.75,
        color: '#c8d6e5',
        overflow: 'auto',
        maxHeight: '320px',
      }}
    >
      <TacticalCodeBlock code={BROKEN_CODE_PREFIX} />
      {'\n'}
      <span style={{ color: SYN.punc }}>{'  '}</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{ color: SYN.punc }}>.</span>
        <span style={{ color: SYN.fn }}>build</span>
        <span style={{ color: SYN.punc }}>(); </span>
        <span
          style={{
            position: 'absolute',
            bottom: '-2px',
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(255,60,60,0.85)',
            animation: 'error-pulse 1.2s ease-in-out infinite',
            display: 'block',
          }}
        />
      </span>
      <span style={{ color: SYN.punc }}>{'                    '}</span>
      <span style={{ color: SYN.comment }}>{'// ← COMPILE ERROR ✗'}</span>
    </pre>
  );
}

function ErrorShowcaseSection(): ReactNode {
  return (
    <section
      id="compile-time"
      className="hex-section"
      style={{
        ...S.section('rgba(6,13,20,0.55)'),
        borderTop: '1px solid rgba(0,240,255,0.07)',
        borderBottom: '1px solid rgba(0,240,255,0.07)',
      }}
    >
      <div style={S.container()}>
        <FadeIn>
          <div>
            <div style={S.sectionHeader()}>
              <div style={S.monoLabel('rgba(255,60,60,0.7)')}>— COMPILE-TIME GUARANTEE —</div>
              <h2 style={S.h2()}>
                A broken dependency graph{' '}
                <span style={{ color: '#00F0FF' }}>won&apos;t compile</span>
              </h2>
              <p style={{ ...S.body(), maxWidth: '480px', margin: '0 auto' }}>
                HexDI encodes your dependency graph into TypeScript&apos;s type system. If a port
                has no adapter, the error appears before you run a single line of code.
              </p>
            </div>

            <div
              className="hex-grid-2"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
              }}
            >
              {/* Left: broken code */}
              <div
                className="hud-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  borderColor: 'rgba(255,60,60,0.25)',
                }}
              >
                <div
                  style={{
                    padding: '9px 16px',
                    background: 'rgba(255,60,60,0.04)',
                    borderBottom: '1px solid rgba(255,60,60,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,60,60,0.6)', display: 'inline-block' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,60,60,0.25)', display: 'inline-block' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,60,60,0.12)', display: 'inline-block' }} />
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: "'Fira Code', monospace",
                      fontSize: '0.63rem',
                      color: 'rgba(255,60,60,0.45)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    graph.ts
                  </span>
                </div>
                <BrokenCodeDisplay />
              </div>

              {/* Right: error panel */}
              <div
                className="hud-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  borderColor: 'rgba(255,60,60,0.25)',
                  background: 'rgba(10,4,4,0.85)',
                }}
              >
                <div
                  style={{
                    padding: '9px 16px',
                    background: 'rgba(255,60,60,0.04)',
                    borderBottom: '1px solid rgba(255,60,60,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: '0.63rem',
                      color: 'rgba(255,60,60,0.55)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    TypeScript Error
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '20px',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.73rem',
                    lineHeight: 1.75,
                    overflow: 'auto',
                    maxHeight: '320px',
                  }}
                >
                  <span style={{ color: 'rgba(255,100,100,0.9)', fontWeight: 700 }}>  ERROR [HEX008]{'\n'}</span>
                  <span style={{ color: 'rgba(255,60,60,0.4)' }}>  {'─'.repeat(37)}{'\n'}</span>
                  <span style={{ color: '#c8d6e5' }}>  Missing adapters for required ports:{'\n'}</span>
                  <span style={{ color: '#c8d6e5' }}>{'\n'}</span>
                  <span style={{ color: 'rgba(255,100,100,0.85)' }}>    ✗  </span>
                  <span style={{ color: '#c8d6e5' }}>LoggerPort{'\n'}</span>
                  <span style={{ color: '#c8d6e5' }}>{'\n'}</span>
                  <span style={{ color: '#8a9bb0' }}>  UserServiceAdapter declares LoggerPort{'\n'}</span>
                  <span style={{ color: '#8a9bb0' }}>  as a required dependency, but no{'\n'}</span>
                  <span style={{ color: '#8a9bb0' }}>  adapter in this graph provides it.{'\n'}</span>
                  <span style={{ color: '#c8d6e5' }}>{'\n'}</span>
                  <span style={{ color: '#506070' }}>  Fix: </span>
                  <span style={{ color: '#9ee09e' }}>.provide(LoggerAdapter){'\n'}</span>
                  <span style={{ color: 'rgba(255,60,60,0.4)' }}>  {'─'.repeat(37)}{'\n'}</span>
                  <span style={{ color: '#00F0FF' }}>  Detected at compile time — not at 3AM.</span>
                </pre>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// TACTICAL SYNTAX HIGHLIGHTER
// ============================================================

const SYN = {
  keyword: '#00F0FF',  // cyan — import, const, interface …
  type:    '#56d3f5',  // light cyan — built-in types, PascalCase
  string:  '#9ee09e',  // soft green
  comment: '#4a6070',  // muted grey
  fn:      '#FF8F40',  // orange — function/method names & API calls
  num:     '#d4a574',  // warm amber
  punc:    '#506070',  // dim — {}[]():;,
  text:    '#c8d6e5',  // default
} as const;

const TS_KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'interface', 'type',
  'function', 'return', 'new', 'extends', 'implements', 'async', 'await',
  'true', 'false', 'null', 'undefined', 'class', 'static', 'readonly',
  'of', 'in', 'for', 'while', 'if', 'else', 'throw',
]);

const TS_BUILTIN_TYPES = new Set([
  'void', 'string', 'number', 'boolean', 'never', 'any', 'unknown',
  'object', 'symbol', 'bigint',
]);

// HexDI public API identifiers — always orange regardless of position
const HEXDI_API = new Set([
  'port', 'createAdapter', 'createContainer', 'GraphBuilder',
]);

interface SynToken { text: string; color: string }

function tokenizeLine(line: string): SynToken[] {
  const tokens: SynToken[] = [];
  let i = 0;

  while (i < line.length) {
    // Line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), color: SYN.comment });
      break;
    }

    // Template literal (backtick)
    if (line[i] === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== '`') {
        if (line[j] === '\\') j++;
        j++;
      }
      j++;
      tokens.push({ text: line.slice(i, j), color: SYN.string });
      i = j;
      continue;
    }

    // String literal (single or double quote)
    if (line[i] === "'" || line[i] === '"') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      j++;
      tokens.push({ text: line.slice(i, j), color: SYN.string });
      i = j;
      continue;
    }

    // Whitespace — pass through
    if (/\s/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: SYN.text });
      i = j;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);

      let color: string;
      if (TS_KEYWORDS.has(word)) {
        color = SYN.keyword;
      } else if (TS_BUILTIN_TYPES.has(word)) {
        color = SYN.type;
      } else if (HEXDI_API.has(word)) {
        // HexDI API names — always orange (checked before PascalCase)
        color = SYN.fn;
      } else if (/^[A-Z]/.test(word)) {
        color = SYN.type;
      } else {
        // Scan ahead for '(' to detect method/function calls
        let k = j;
        while (k < line.length && line[k] === ' ') k++;
        color = line[k] === '(' ? SYN.fn : SYN.text;
      }

      tokens.push({ text: word, color });
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), color: SYN.num });
      i = j;
      continue;
    }

    // Punctuation / operator
    const ch = line[i];
    const isPunc = /[{}()[\]:;,.<>=!+\-*/&|^~?@]/.test(ch);
    tokens.push({ text: ch, color: isPunc ? SYN.punc : SYN.text });
    i++;
  }

  return tokens;
}

function TacticalCodeBlock({ code }: { code: string }): ReactNode {
  const lines = code.split('\n');
  const parts: ReactNode[] = [];

  lines.forEach((line, li) => {
    tokenizeLine(line).forEach((tok, ti) => {
      parts.push(
        <span key={`${li}-${ti}`} style={{ color: tok.color }}>
          {tok.text}
        </span>,
      );
    });
    if (li < lines.length - 1) parts.push('\n');
  });

  return <>{parts}</>;
}

// ============================================================
// CODE PREVIEW SECTION
// ============================================================

function CodePreviewSection(): ReactNode {
  const isMobile = useIsMobile();

  return (
    <section
      className="hex-section"
      style={{
        ...S.section('rgba(6, 13, 20, 0.55)'),
        borderTop: '1px solid rgba(0, 240, 255, 0.07)',
        borderBottom: '1px solid rgba(0, 240, 255, 0.07)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr',
          gap: '80px',
          alignItems: 'center',
        }}
      >
        {/* Left: description */}
        <FadeIn delay={0}>
          <div>
            <div style={S.monoLabel('#FF5E00')}>— QUICK START —</div>
            <h2 style={S.h2()}>
              From scratch to{' '}
              <span style={{ color: '#00F0FF' }}>type-safe</span>
              {' '}in 5 steps
            </h2>

            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '28px 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {[
                'Define your interfaces as plain TypeScript contracts',
                'Create ports — typed handles that name and represent each dependency',
                'Build adapters that satisfy those contracts',
                'Compose a type-checked dependency graph',
                'Resolve instances — fully typed, no casts',
              ].map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    ...S.body('#8a9bb0'),
                    fontSize: '0.875rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: '0.65rem',
                      color: '#00F0FF',
                      background: 'rgba(0,240,255,0.07)',
                      border: '1px solid rgba(0,240,255,0.18)',
                      padding: '2px 8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </FadeIn>

        {/* Right: code block */}
        <FadeIn delay={80}>
          <div
            style={{
              position: 'relative',
              background: 'rgba(2, 4, 8, 0.85)',
              border: '1px solid rgba(0, 240, 255, 0.14)',
              overflow: 'hidden',
            }}
          >
            {/* Header bar */}
            <div
              style={{
                padding: '9px 16px',
                background: 'rgba(0, 240, 255, 0.04)',
                borderBottom: '1px solid rgba(0, 240, 255, 0.09)',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <span
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,94,0,0.55)' }}
              />
              <span
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,94,0,0.25)' }}
              />
              <span
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,94,0,0.12)' }}
              />
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '0.63rem',
                  color: 'rgba(0, 240, 255, 0.35)',
                  letterSpacing: '0.08em',
                }}
              >
                main.ts
              </span>
            </div>

            <pre
              style={{
                margin: 0,
                padding: '20px',
                overflow: 'auto',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.73rem',
                lineHeight: 1.75,
                color: '#c8d6e5',
                maxHeight: '420px',
              }}
            >
              <TacticalCodeBlock code={QUICK_START_CODE} />
            </pre>

            {/* CRT scanline overlay */}
            <div className="scanline-overlay" />

            {/* Corner decoration */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '16px',
                height: '16px',
                borderRight: '2px solid rgba(0,240,255,0.4)',
                borderBottom: '2px solid rgba(0,240,255,0.4)',
              }}
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// ARCHITECTURE SECTION
// ============================================================

function ArchitectureSection(): ReactNode {
  return (
    <section id="architecture" className="hex-section" style={S.section()}>
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <div style={S.monoLabel()}>— ARCHITECTURE —</div>
            <h2 style={S.h2()}>Built on hexagonal principles</h2>
            <p style={{ ...S.body(), maxWidth: '480px', margin: '0 auto' }}>
              Ports define contracts. Adapters provide implementations. Your domain stays clean.
            </p>
          </div>
        </FadeIn>

        <div
          className="hex-grid-2"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center',
          }}
        >
          {/* Diagram */}
          <FadeIn delay={0}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <EcosystemHubDiagram />
            </div>
          </FadeIn>

          {/* Package cards */}
          <FadeIn delay={100}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.name}
                  className={`hud-card${pkg.accent === 'orange' ? ' hud-card-orange' : ''}`}
                  style={{ padding: '18px 22px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: '0.6rem',
                        letterSpacing: '0.1em',
                        color: pkg.accent === 'cyan' ? '#00F0FF' : '#FF5E00',
                        background:
                          pkg.accent === 'cyan'
                            ? 'rgba(0,240,255,0.08)'
                            : 'rgba(255,94,0,0.08)',
                        border: `1px solid ${pkg.accent === 'cyan' ? 'rgba(0,240,255,0.2)' : 'rgba(255,94,0,0.2)'}`,
                        padding: '2px 8px',
                      }}
                    >
                      {pkg.label}
                    </span>
                    <code
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: '0.85rem',
                        color: '#c8d6e5',
                      }}
                    >
                      {pkg.name}
                    </code>
                  </div>
                  <p style={{ ...S.body('#6a7f90'), fontSize: '0.855rem', margin: 0 }}>
                    {pkg.description}
                  </p>
                </div>
              ))}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0,240,255,0.07)' }}>
                <div style={{ ...S.monoLabel('#506070'), marginBottom: '10px', textAlign: 'left', fontSize: '0.62rem' }}>
                  + 9 ECOSYSTEM LIBRARIES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {ECOSYSTEM.map((lib) => (
                    <span key={lib.name} style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: '0.68rem',
                      color: lib.accent === 'cyan' ? 'rgba(0,240,255,0.65)' : 'rgba(255,94,0,0.65)',
                      background: lib.accent === 'cyan' ? 'rgba(0,240,255,0.06)' : 'rgba(255,94,0,0.06)',
                      border: `1px solid ${lib.accent === 'cyan' ? 'rgba(0,240,255,0.14)' : 'rgba(255,94,0,0.14)'}`,
                      padding: '3px 8px',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                    }}>
                      {lib.name.replace('@hex-di/', '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

const ECO_NODES: ReadonlyArray<{ name: string; sub: string; accent: 'cyan' | 'orange'; cx: number; cy: number }> = [
  { name: 'logger',      sub: 'logging',   accent: 'cyan',   cx: 210, cy: 55  },
  { name: 'tracing',     sub: 'telemetry', accent: 'cyan',   cx: 310, cy: 91  },
  { name: 'query',       sub: 'fetching',  accent: 'orange', cx: 363, cy: 183 },
  { name: 'store',       sub: 'state',     accent: 'cyan',   cx: 344, cy: 288 },
  { name: 'flow',        sub: 'machines',  accent: 'orange', cx: 263, cy: 356 },
  { name: 'saga',        sub: 'workflows', accent: 'cyan',   cx: 157, cy: 356 },
  { name: 'guard',       sub: 'auth',      accent: 'orange', cx: 76,  cy: 288 },
  { name: 'clock',       sub: 'time',      accent: 'cyan',   cx: 57,  cy: 183 },
  { name: 'http-client', sub: 'transport', accent: 'orange', cx: 110, cy: 91  },
];

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180;
    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function EcosystemHubDiagram(): ReactNode {
  const PARTICLE_DUR = 2.4;
  return (
    <svg
      viewBox="0 0 420 420"
      width="420"
      height="420"
      aria-label="HexDI ecosystem — hex-di core wired to 9 ecosystem libraries"
    >
      <defs>
        {/* Glow filter for lib nodes */}
        <filter id="eco-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Stronger glow for center hex */}
        <filter id="center-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Radial background spotlight */}
        <radialGradient id="hub-bg" cx="50%" cy="50%" r="45%">
          <stop offset="0%"   stopColor="rgba(0,240,255,0.06)" />
          <stop offset="100%" stopColor="rgba(0,240,255,0)" />
        </radialGradient>
        {/* Spoke gradients */}
        <linearGradient id="spoke-grad-cyan" gradientUnits="userSpaceOnUse" x1="210" y1="210" x2="0" y2="0">
          <stop offset="0%"   stopColor="rgba(0,240,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,240,255,0.45)" />
        </linearGradient>
        <linearGradient id="spoke-grad-orange" gradientUnits="userSpaceOnUse" x1="210" y1="210" x2="0" y2="0">
          <stop offset="0%"   stopColor="rgba(255,94,0,0.05)" />
          <stop offset="100%" stopColor="rgba(255,94,0,0.45)" />
        </linearGradient>
        {/* Per-node spoke gradients (needed for correct direction per spoke) */}
        {ECO_NODES.map((node) => (
          <linearGradient
            key={`sg-${node.name}`}
            id={`spoke-grad-${node.name}`}
            gradientUnits="userSpaceOnUse"
            x1="210" y1="210"
            x2={node.cx} y2={node.cy}
          >
            <stop offset="0%"   stopColor={node.accent === 'cyan' ? 'rgba(0,240,255,0.05)' : 'rgba(255,94,0,0.05)'} />
            <stop offset="100%" stopColor={node.accent === 'cyan' ? 'rgba(0,240,255,0.45)' : 'rgba(255,94,0,0.45)'} />
          </linearGradient>
        ))}
        <marker id="pkgArrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="rgba(0,240,255,0.5)" />
        </marker>
        <style>{`.eco-spoke { animation: tactical-dash 2.4s linear infinite; }`}</style>
      </defs>

      {/* Background spotlight */}
      <rect x="0" y="0" width="420" height="420" fill="url(#hub-bg)" />

      {/* Decorative orbit rings */}
      <circle cx="210" cy="210" r="185" fill="none" stroke="rgba(0,240,255,0.08)" strokeWidth="0.5" strokeDasharray="3 8" />
      <circle cx="210" cy="210" r="150" fill="none" stroke="rgba(0,240,255,0.05)" strokeWidth="0.5" strokeDasharray="3 8" />

      {/* Spokes */}
      {ECO_NODES.map((node, i) => (
        <path
          key={node.name}
          d={`M210,210 L${node.cx},${node.cy}`}
          stroke={`url(#spoke-grad-${node.name})`}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          fill="none"
          className="eco-spoke"
          opacity={0.6}
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}

      {/* Flow particles along spokes */}
      {ECO_NODES.map((node, i) => {
        const begin = `${(i * PARTICLE_DUR / 9).toFixed(2)}s`;
        return (
          <circle key={`p-${node.name}`} r={2} fill={node.accent === 'cyan' ? '#00F0FF' : '#FF5E00'} opacity={0}>
            <animateMotion
              dur={`${PARTICLE_DUR}s`}
              begin={begin}
              repeatCount="indefinite"
              path={`M210,210 L${node.cx},${node.cy}`}
            />
            <animate
              attributeName="opacity"
              values="0;0.9;0.9;0"
              keyTimes="0;0.2;0.8;1"
              dur={`${PARTICLE_DUR}s`}
              begin={begin}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}

      {/* Lib nodes */}
      {ECO_NODES.map((node) => {
        const accentFull = node.accent === 'cyan' ? '#00F0FF' : '#FF5E00';
        const accentFill = node.accent === 'cyan' ? 'rgba(0,240,255,0.10)' : 'rgba(255,94,0,0.10)';
        const accentStroke = node.accent === 'cyan' ? 'rgba(0,240,255,0.50)' : 'rgba(255,94,0,0.50)';
        const accentHalo = node.accent === 'cyan' ? 'rgba(0,240,255,0.20)' : 'rgba(255,94,0,0.20)';
        const accentTick = node.accent === 'cyan' ? 'rgba(0,240,255,0.40)' : 'rgba(255,94,0,0.40)';
        const accentSub = node.accent === 'cyan' ? 'rgba(0,240,255,0.70)' : 'rgba(255,94,0,0.70)';
        return (
          <g key={node.name}>
            {/* Outer halo hexagon */}
            <polygon
              points={hexPoints(node.cx, node.cy, 37)}
              fill="none"
              stroke={accentHalo}
              strokeWidth={0.8}
            />
            {/* Main hexagon with glow */}
            <polygon
              points={hexPoints(node.cx, node.cy, 30)}
              fill={accentFill}
              stroke={accentStroke}
              strokeWidth={1.2}
              filter="url(#eco-glow)"
            />
            {/* Tick marks at each hex vertex on the r=37 halo */}
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (i * 60 * Math.PI) / 180;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={+(node.cx + 37 * cos).toFixed(1)}
                  y1={+(node.cy - 37 * sin).toFixed(1)}
                  x2={+(node.cx + 42 * cos).toFixed(1)}
                  y2={+(node.cy - 42 * sin).toFixed(1)}
                  stroke={accentTick}
                  strokeWidth={0.5}
                />
              );
            })}
            {/* Lib name */}
            <text
              x={node.cx} y={node.cy - 3}
              textAnchor="middle" dominantBaseline="middle"
              fill="white"
              fontSize={7.5}
              fontFamily="'Fira Code', monospace"
            >{node.name}</text>
            {/* Sublabel */}
            <text
              x={node.cx} y={node.cy + 8}
              textAnchor="middle" dominantBaseline="middle"
              fill={accentSub}
              fontSize={5}
              fontFamily="'Fira Code', monospace"
            >{node.sub}</text>
            {/* Pulse dot */}
            <circle
              cx={node.cx} cy={node.cy} r={3}
              fill={accentFull}
              className="pulse-dot"
              style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
            />
          </g>
        );
      })}

      {/* Centre hexagon (flat-top, r=38) with enhanced glow */}
      <polygon
        points="248,210 229,243 191,243 172,210 191,177 229,177"
        fill="rgba(0,240,255,0.08)"
        stroke="rgba(0,240,255,0.60)"
        strokeWidth="1.5"
        filter="url(#center-glow)"
      />
      {/* Corner brackets — all 4 corners of bounding box (172,177)–(248,243) */}
      <path d="M172,177 L182,177 M172,177 L172,187" stroke="#00F0FF" strokeWidth="1" fill="none" />
      <path d="M248,177 L238,177 M248,177 L248,187" stroke="#00F0FF" strokeWidth="1" fill="none" />
      <path d="M248,243 L238,243 M248,243 L248,233" stroke="#00F0FF" strokeWidth="1" fill="none" />
      <path d="M172,243 L182,243 M172,243 L172,233" stroke="#00F0FF" strokeWidth="1" fill="none" />
      {/* Center label */}
      <text
        x="210" y="210"
        textAnchor="middle" dominantBaseline="middle"
        fill="white"
        fontSize={8}
        fontFamily="'Fira Code', monospace"
      >HEX-DI</text>
    </svg>
  );
}

// ============================================================
// ECOSYSTEM SECTION
// ============================================================

function EcosystemSection(): ReactNode {
  return (
    <section
      id="ecosystem"
      className="hex-section"
      style={{
        ...S.section('rgba(6,13,20,0.55)'),
        borderTop: '1px solid rgba(0,240,255,0.07)',
        borderBottom: '1px solid rgba(0,240,255,0.07)',
      }}
    >
      <div style={S.container()}>
        <FadeIn>
          <div style={S.sectionHeader()}>
            <div style={S.monoLabel('#FF5E00')}>— THE ECOSYSTEM —</div>
            <h2 style={S.h2()}>
              A full ecosystem,{' '}
              <span style={{ color: '#00F0FF' }}>wired through one graph</span>
            </h2>
            <p style={{ ...S.body(), maxWidth: '520px', margin: '0 auto' }}>
              Every library exposes its functionality as ports. Wire them through the same
              container, and each library&apos;s services are fully typed and resolvable
              alongside your own.
            </p>
          </div>
        </FadeIn>

        <div
          className="hex-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}
        >
          {ECOSYSTEM.map((lib, i) => (
            <FadeIn key={lib.name} delay={i * 40}>
              <div
                className={`hud-card${lib.accent === 'orange' ? ' hud-card-orange' : ''}`}
                style={{ padding: '20px 22px', height: '100%', boxSizing: 'border-box' }}
              >
                <code
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.78rem',
                    color: lib.accent === 'cyan' ? '#00F0FF' : '#FF5E00',
                    display: 'block',
                    marginBottom: '10px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {lib.name}
                </code>
                <p style={{ ...S.body('#c8d6e5'), fontSize: '0.875rem', marginBottom: '6px' }}>
                  {lib.purpose}
                </p>
                <p style={{ ...S.body('#506070'), fontSize: '0.78rem' }}>
                  {lib.detail}
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
// LIFETIME SCOPES SECTION
// ============================================================

function LifetimeScopesSection(): ReactNode {
  return (
    <section
      className="hex-section"
      style={{
        ...S.section('rgba(6, 13, 20, 0.55)'),
        borderTop: '1px solid rgba(0, 240, 255, 0.07)',
        borderBottom: '1px solid rgba(0, 240, 255, 0.07)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={S.sectionHeader()}>
          <div style={S.monoLabel()}>— LIFETIME SCOPES —</div>
          <h2 style={S.h2()}>Control instance lifecycles</h2>
          <p style={{ ...S.body(), maxWidth: '440px', margin: '0 auto' }}>
            Declare how long each service lives. The container enforces it.
          </p>
        </div>

        <div
          className="hex-grid-3"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
          }}
        >
          {LIFETIMES.map((lt, i) => (
            <FadeIn key={lt.name} delay={i * 80}>
              <div className="hud-card" style={{ padding: '28px' }}>
                {/* Name badge */}
                <div
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.62rem',
                    letterSpacing: '0.18em',
                    color: lt.color,
                    textTransform: 'uppercase',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '5px',
                      height: '5px',
                      background: lt.color,
                      borderRadius: '50%',
                    }}
                  />
                  {lt.name}
                </div>

                {/* Code snippet */}
                <div
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.78rem',
                    color: lt.color,
                    background: `${lt.color}0d`,
                    border: `1px solid ${lt.color}22`,
                    padding: '8px 12px',
                    marginBottom: '16px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {lt.code}
                </div>

                <p
                  style={{
                    ...S.body('#c8d6e5'),
                    fontSize: '0.875rem',
                    marginBottom: '12px',
                  }}
                >
                  {lt.description}
                </p>
                <p style={{ ...S.body('#506070'), fontSize: '0.8rem' }}>{lt.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// WHY HEX-DI SECTION
// ============================================================

function WhyHexDISection(): ReactNode {
  const traditional = [
    'Requires reflect-metadata and experimental decorators',
    'Errors discovered at runtime, not at compile time',
    'Magic token strings instead of type-level contracts',
    'Framework code bleeds into your domain logic',
    'Testing requires brittle mock module overrides',
  ];

  const withHexDI = [
    'Pure TypeScript — no decorators, no magic',
    'Graph validated structurally at compile time',
    'Ports as typed handles — no string tokens, no injection decorators',
    'Domain code stays completely framework-free',
    'Testing via clean, scoped container overrides',
  ];

  return (
    <section id="why" className="hex-section" style={S.section()}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={S.sectionHeader()}>
          <div style={S.monoLabel()}>— WHY HEX-DI —</div>
          <h2 style={S.h2()}>The problem with traditional DI</h2>
        </div>

        {/* Comparison columns */}
        <div
          className="hex-grid-2"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '28px',
            marginBottom: '72px',
          }}
        >
          {/* Before */}
          <FadeIn delay={0}>
            <div
              style={{
                background: 'rgba(255, 60, 60, 0.03)',
                border: '1px solid rgba(255, 60, 60, 0.12)',
                padding: '28px 32px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '0.16em',
                  color: 'rgba(255, 100, 100, 0.55)',
                  marginBottom: '18px',
                }}
              >
                ✗ TRADITIONAL DI
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {traditional.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      ...S.body('#6a7f90'),
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255, 100, 100, 0.45)', flexShrink: 0 }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* After */}
          <FadeIn delay={80}>
            <div
              style={{
                background: 'rgba(0, 240, 255, 0.025)',
                border: '1px solid rgba(0, 240, 255, 0.12)',
                padding: '28px 32px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '0.16em',
                  color: 'rgba(0, 240, 255, 0.55)',
                  marginBottom: '18px',
                }}
              >
                ✓ WITH HEX-DI
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {withHexDI.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      ...S.body('#c8d6e5'),
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: '#00F0FF', flexShrink: 0 }}>+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>

        {/* Quote */}
        <FadeIn delay={0}>
          <div
            style={{
              textAlign: 'center',
              borderTop: '1px solid rgba(0, 240, 255, 0.08)',
              paddingTop: '56px',
            }}
          >
            <blockquote
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 'clamp(1.25rem, 2.5vw, 1.85rem)',
                fontWeight: 600,
                color: '#ffffff',
                lineHeight: 1.4,
                maxWidth: '680px',
                margin: '0 auto 20px',
                letterSpacing: '0.02em',
              }}
            >
              &ldquo;If a dependency is missing,
              <br />
              <span style={{ color: '#00F0FF' }}>the code shouldn&apos;t compile.&rdquo;</span>
            </blockquote>
            <cite
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.7rem',
                color: '#506070',
                letterSpacing: '0.1em',
                fontStyle: 'normal',
              }}
            >
              — The HexDI Philosophy
            </cite>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// CTA SECTION
// ============================================================

function CTASection(): ReactNode {
  return (
    <section
      className="hex-section"
      style={{
        ...S.section('rgba(6, 13, 20, 0.55)'),
        borderTop: '1px solid rgba(0, 240, 255, 0.07)',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
        <FadeIn>
          <div style={{ position: 'relative', border: '1px solid rgba(0, 240, 255, 0.18)', padding: '64px 48px' }}>
            {/* Corner decorations */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <div
                key={corner}
                style={{
                  position: 'absolute',
                  width: '20px',
                  height: '20px',
                  ...(corner === 'tl' && { top: -1, left: -1, borderTop: '3px solid #00F0FF', borderLeft: '3px solid #00F0FF' }),
                  ...(corner === 'tr' && { top: -1, right: -1, borderTop: '3px solid #00F0FF', borderRight: '3px solid #00F0FF' }),
                  ...(corner === 'bl' && { bottom: -1, left: -1, borderBottom: '3px solid #00F0FF', borderLeft: '3px solid #00F0FF' }),
                  ...(corner === 'br' && { bottom: -1, right: -1, borderBottom: '3px solid #00F0FF', borderRight: '3px solid #00F0FF' }),
                }}
              />
            ))}

            <div
              style={{
                ...S.monoLabel(),
                letterSpacing: '0.28em',
                marginBottom: '28px',
              }}
            >
              ◈ READY TO COMPILE ◈
            </div>

            <h2
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
                margin: '0 0 18px',
              }}
            >
              Start building type-safe
              <br />
              applications today
            </h2>

            <p style={{ ...S.body('#6a7f90'), fontSize: '1rem', marginBottom: '40px' }}>
              Catch dependency errors at compile time. Ship with confidence.
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/docs/getting-started"
                style={{
                  display: 'inline-block',
                  padding: '13px 32px',
                  background: '#00F0FF',
                  color: '#020408',
                  textDecoration: 'none',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Read the Docs →
              </Link>
              <Link
                to="/docs/examples"
                style={{
                  display: 'inline-block',
                  padding: '13px 32px',
                  background: 'transparent',
                  color: '#c8d6e5',
                  textDecoration: 'none',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(200, 214, 229, 0.18)',
                }}
              >
                View Examples
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================
// TACTICAL FOOTER
// ============================================================

function TacticalFooter(): ReactNode {
  return (
    <footer
      style={{
        padding: '32px 40px',
        borderTop: '1px solid rgba(0, 240, 255, 0.07)',
        background: 'rgba(2, 4, 8, 0.9)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: '0.65rem',
            color: '#506070',
            letterSpacing: '0.1em',
          }}
        >
          HEX-DI / MIT LICENSE / {new Date().getFullYear()}
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          {(
            [
              { label: 'DOCS', to: '/docs/getting-started' },
              { label: 'API', to: '/docs/api' },
            ] as { label: string; to: string }[]
          ).map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.65rem',
                color: 'rgba(0, 240, 255, 0.38)',
                textDecoration: 'none',
                letterSpacing: '0.1em',
              }}
            >
              [{label}]
            </Link>
          ))}
          <a
            href="https://github.com/leaderiop/hex-di"
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '0.65rem',
              color: 'rgba(0, 240, 255, 0.38)',
              textDecoration: 'none',
              letterSpacing: '0.1em',
            }}
          >
            [GITHUB]
          </a>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// PAGE ENTRY POINT
// ============================================================

export default function Home(): ReactNode {
  useEffect(() => {
    document.body.classList.add('dark-home-page');
    return () => {
      document.body.classList.remove('dark-home-page');
    };
  }, []);

  return (
    <Layout
      title="HexDI — Type-Safe Dependency Injection for TypeScript"
      description="Catch missing dependencies at compile time. HexDI gives your TypeScript dependency graph structural type checking — no decorators, no reflection, no runtime surprises."
      noFooter
    >
      {/* SSR-safe: hide Docusaurus navbar immediately without waiting for JS hydration */}
      <Head>
        <style>{`.navbar--fixed-top{display:none!important}.main-wrapper{padding-top:0!important}body{background:#020408!important}`}</style>
      </Head>
      <div style={{ background: '#020408', minHeight: '100vh', color: '#c8d6e5' }}>
        <TacticalNav />

        {/* Particle background — fixed, atmospheric */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          {PARTICLE_LEFT_POSITIONS.map((left, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                bottom: 0,
                width: '2px',
                height: '2px',
                borderRadius: '50%',
                background: '#00F0FF',
                animation: 'particle-rise 15s linear infinite',
                animationDelay: `-${(i * 14) / 11}s`,
              }}
            />
          ))}
        </div>

        <main>
          <HeroSection />
          <StatsBar />
          <FeaturesSection />
          <ErrorShowcaseSection />
          <CodePreviewSection />
          <ArchitectureSection />
          <EcosystemSection />
          <LifetimeScopesSection />
          <WhyHexDISection />
          <CTASection />
        </main>
        <TacticalFooter />
      </div>
    </Layout>
  );
}
