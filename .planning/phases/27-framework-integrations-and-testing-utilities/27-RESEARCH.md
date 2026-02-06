# Phase 27: Framework Integrations and Testing Utilities - Research

**Researched:** 2026-02-06
**Domain:** Framework tracing integration (Hono, React), test utilities, performance benchmarking
**Confidence:** HIGH

## Summary

Phase 27 adds first-class tracing support to existing framework integrations (Hono, React), creates test assertion helpers for span verification, and establishes performance benchmarks to validate tracer overhead. This is the final phase of v7.0, completing the distributed tracing implementation.

The foundation is already built: @hex-di/tracing provides complete tracing primitives (Tracer, Span, W3C Trace Context), @hex-di/hono has middleware patterns, and @hex-di/react has context/hooks patterns. This phase EXTENDS existing integration packages with tracing-specific middleware/providers/hooks and adds testing utilities to @hex-di/tracing.

**Key Insight:** This is NOT about building new frameworks - it's about adding tracing capabilities to existing, mature integrations. The patterns already exist (Hono middleware, React Context), we're just adding tracing-specific variants.

**Primary recommendation:** Implement tracingMiddleware for Hono following existing createScopeMiddleware pattern, TracingProvider for React following existing ContainerProvider pattern, and test utilities as pure functions exported from @hex-di/tracing.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)

| Library         | Version | Purpose                                      | Why Standard                                                |
| --------------- | ------- | -------------------------------------------- | ----------------------------------------------------------- |
| @hex-di/tracing | latest  | Tracing primitives, Tracer port, W3C context | Built in Phases 23-24, provides all needed tracing APIs     |
| @hex-di/hono    | latest  | Hono integration with middleware pattern     | Already has createScopeMiddleware, follows Hono conventions |
| @hex-di/react   | latest  | React integration with Context/hooks         | Already has ContainerProvider/usePort patterns              |
| vitest          | 4.0+    | Test framework with benchmark support        | Already used across monorepo, has `bench()` API             |

### Supporting

| Library                | Version | Purpose                 | When to Use                           |
| ---------------------- | ------- | ----------------------- | ------------------------------------- |
| hono                   | 4.x     | Web framework           | Hono middleware implementation        |
| react                  | 18.x    | UI library              | React provider/hooks implementation   |
| @testing-library/react | latest  | React testing utilities | Testing React components with tracing |

### Alternatives Considered

| Instead of             | Could Use                       | Tradeoff                                                             |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------- |
| Vitest benchmarks      | Manual timing code              | Vitest provides statistical analysis, reporters, comparison          |
| Test utility functions | Matcher library (jest-extended) | Pure functions simpler, no dependency, better tree-shaking           |
| React Context          | React.createContext directly    | Existing pattern works, maintains consistency with ContainerProvider |

**Installation:**

```bash
# No new dependencies - all packages exist
# Phase 27 adds code to existing packages
```

## Architecture Patterns

### Recommended Project Structure

```
integrations/hono/src/
├── middleware.ts           # createScopeMiddleware (exists)
├── tracing-middleware.ts   # NEW: tracingMiddleware with W3C context
└── index.ts               # Export tracingMiddleware

integrations/react/src/
├── providers/
│   ├── container-provider.tsx  # Exists
│   ├── tracing-provider.tsx    # NEW: TracingProvider
│   └── index.ts               # Export TracingProvider
├── hooks/
│   ├── use-port.ts            # Exists
│   ├── use-tracer.ts          # NEW: useTracer()
│   ├── use-span.ts            # NEW: useSpan()
│   ├── use-traced-callback.ts # NEW: useTracedCallback()
│   └── index.ts               # Export new hooks
└── index.ts                   # Export all tracing APIs

packages/tracing/src/
├── testing/
│   ├── matchers.ts            # NEW: span matchers
│   ├── assertions.ts          # NEW: assertSpanExists()
│   └── index.ts               # Export test utilities
└── index.ts                   # Export from testing/

packages/tracing/tests/
├── benchmarks/
│   ├── noop-overhead.bench.ts     # NEW: NoOp vs baseline
│   └── memory-overhead.bench.ts   # NEW: Memory vs baseline
└── setup.ts                       # Test setup
```

### Pattern 1: Hono Tracing Middleware

**What:** Middleware that extracts W3C Trace Context from incoming requests, creates root span, and injects context into responses

**When to use:** Every Hono application that wants distributed tracing across HTTP boundaries

**Example:**

```typescript
// integrations/hono/src/tracing-middleware.ts
import type { MiddlewareHandler } from "hono";
import type { Tracer } from "@hex-di/tracing";
import { extractTraceContext, injectTraceContext } from "@hex-di/tracing";

export interface TracingMiddlewareOptions {
  tracer: Tracer;
  spanName?: (c: Context) => string;
  extractContext?: boolean;
  injectContext?: boolean;
  attributes?: (c: Context) => Record<string, string | number | boolean>;
}

export function tracingMiddleware(options: TracingMiddlewareOptions): MiddlewareHandler {
  const {
    tracer,
    spanName = c => `${c.req.method} ${c.req.path}`,
    extractContext = true,
    injectContext = true,
    attributes = () => ({}),
  } = options;

  return async (c, next) => {
    // Extract parent context from headers
    const parentContext = extractContext
      ? extractTraceContext(Object.fromEntries(c.req.raw.headers))
      : undefined;

    // Create root span
    const span = tracer.startSpan(spanName(c), {
      kind: "server",
      attributes: {
        "http.method": c.req.method,
        "http.url": c.req.url,
        "http.target": c.req.path,
        ...attributes(c),
      },
      ...(parentContext ? { parent: parentContext } : {}),
    });

    try {
      await next();

      // Set status from response
      span.setStatus(c.res.status >= 500 ? "error" : "ok");
      span.setAttribute("http.status_code", c.res.status);

      // Inject context into response headers
      if (injectContext && span.context) {
        const headers: Record<string, string> = {};
        injectTraceContext(span.context, headers);
        Object.entries(headers).forEach(([key, value]) => {
          c.res.headers.set(key, value);
        });
      }
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.setStatus("error");
      throw error;
    } finally {
      span.end();
    }
  };
}
```

**Key Design Decisions:**

- Default span name from HTTP method + path (common pattern)
- Optional custom spanName function for flexibility
- Separate toggles for extract/inject (enable one-way tracing)
- Attributes function allows request-specific metadata
- Error handling matches existing createScopeMiddleware pattern

### Pattern 2: React Tracing Provider

**What:** React Context provider that makes tracer available to component tree

**When to use:** When React components need to create custom spans (business logic spans, not just DI resolution)

**Example:**

```typescript
// integrations/react/src/providers/tracing-provider.tsx
import React, { createContext, useContext } from "react";
import type { Tracer } from "@hex-di/tracing";

const TracingContext = createContext<Tracer | null>(null);
TracingContext.displayName = "HexDI.TracingContext";

export interface TracingProviderProps {
  tracer: Tracer;
  children: React.ReactNode;
}

export function TracingProvider({ tracer, children }: TracingProviderProps) {
  return <TracingContext.Provider value={tracer}>{children}</TracingContext.Provider>;
}

// integrations/react/src/hooks/use-tracer.ts
export function useTracer(): Tracer {
  const tracer = useContext(TracingContext);
  if (!tracer) {
    throw new Error("useTracer must be used within TracingProvider");
  }
  return tracer;
}

// integrations/react/src/hooks/use-span.ts
export function useSpan(): Span | undefined {
  const tracer = useTracer();
  return tracer.getActiveSpan();
}

// integrations/react/src/hooks/use-traced-callback.ts
export function useTracedCallback<T extends (...args: any[]) => any>(
  name: string,
  callback: T,
  deps: React.DependencyList
): T {
  const tracer = useTracer();

  return React.useCallback(
    ((...args: Parameters<T>) => {
      return tracer.withSpan(name, (span) => {
        return callback(...args);
      });
    }) as T,
    [tracer, name, callback, ...deps]
  );
}
```

**Key Design Decisions:**

- Separate from ContainerProvider (tracing is orthogonal to DI)
- useTracer throws if outside provider (matches usePort pattern)
- useSpan returns undefined for conditional logic (not all code needs spans)
- useTracedCallback wraps callbacks in spans (common pattern for event handlers)
- Follows existing React integration patterns (Context + hooks)

### Pattern 3: Test Assertion Helpers

**What:** Pure functions for asserting span properties in tests

**When to use:** Every test that verifies tracing behavior

**Example:**

```typescript
// packages/tracing/src/testing/assertions.ts
import type { SpanData } from "../types/span.js";

export interface SpanMatcher {
  name?: string | RegExp;
  status?: "ok" | "error" | "unset";
  attributes?: Record<string, string | number | boolean>;
  hasEvent?: string;
  minDuration?: number;
}

export function assertSpanExists(spans: SpanData[], matcher: SpanMatcher): SpanData {
  const matched = spans.find(span => matchesSpan(span, matcher));

  if (!matched) {
    const details = JSON.stringify(matcher, null, 2);
    throw new Error(`No span found matching: ${details}\nCollected spans: ${spans.length}`);
  }

  return matched;
}

function matchesSpan(span: SpanData, matcher: SpanMatcher): boolean {
  // Name match
  if (matcher.name !== undefined) {
    if (typeof matcher.name === "string" && span.name !== matcher.name) {
      return false;
    }
    if (matcher.name instanceof RegExp && !matcher.name.test(span.name)) {
      return false;
    }
  }

  // Status match
  if (matcher.status !== undefined && span.status !== matcher.status) {
    return false;
  }

  // Attributes match
  if (matcher.attributes !== undefined) {
    for (const [key, value] of Object.entries(matcher.attributes)) {
      if (span.attributes[key] !== value) {
        return false;
      }
    }
  }

  // Event match
  if (matcher.hasEvent !== undefined) {
    if (!span.events || !span.events.some(e => e.name === matcher.hasEvent)) {
      return false;
    }
  }

  // Duration match
  if (matcher.minDuration !== undefined) {
    const duration = span.endTime - span.startTime;
    if (duration < matcher.minDuration) {
      return false;
    }
  }

  return true;
}

// packages/tracing/src/testing/matchers.ts
export function hasAttribute(span: SpanData, key: string, value?: unknown): boolean {
  if (value === undefined) {
    return key in span.attributes;
  }
  return span.attributes[key] === value;
}

export function hasEvent(span: SpanData, name: string): boolean {
  return span.events?.some(e => e.name === name) ?? false;
}

export function hasStatus(span: SpanData, status: "ok" | "error" | "unset"): boolean {
  return span.status === status;
}

export function hasDuration(span: SpanData, minMs?: number, maxMs?: number): boolean {
  const durationMs = span.endTime - span.startTime;
  if (minMs !== undefined && durationMs < minMs) return false;
  if (maxMs !== undefined && durationMs > maxMs) return false;
  return true;
}
```

**Key Design Decisions:**

- Pure functions (no global state, easy to test)
- assertSpanExists throws with helpful message (matches Vitest expect API)
- Matchers return boolean (composable with test assertions)
- RegExp support for name matching (flexible patterns)
- Partial matching (only check specified properties)

### Pattern 4: Performance Benchmarks

**What:** Vitest benchmarks comparing tracer overhead vs baseline (no tracing)

**When to use:** Verify PERF-01 (NoOp < 5%) and PERF-02 (Memory < 10%) requirements

**Example:**

```typescript
// packages/tracing/tests/benchmarks/noop-overhead.bench.ts
import { bench, describe } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { NOOP_TRACER, instrumentContainer } from "../../src/index.js";

const TestPort = port<object>()({ name: "TestPort" });
const TestAdapter = createAdapter({
  provides: TestPort,
  requires: [],
  lifetime: "transient",
  factory: () => ({}),
});

describe("NoOp tracer overhead", () => {
  bench("baseline: 100k resolutions (no tracing)", () => {
    const graph = GraphBuilder.create().provide(TestAdapter).build();
    const container = createContainer({ graph, name: "Baseline" });

    for (let i = 0; i < 100_000; i++) {
      container.resolve(TestPort);
    }
  });

  bench("with NoOp tracer: 100k resolutions", () => {
    const graph = GraphBuilder.create().provide(TestAdapter).build();
    const container = createContainer({ graph, name: "NoOp" });
    const cleanup = instrumentContainer(container, NOOP_TRACER);

    for (let i = 0; i < 100_000; i++) {
      container.resolve(TestPort);
    }

    cleanup();
  });
});

// Verify requirement: NoOp overhead < 5%
// Run with: pnpm --filter @hex-di/tracing test:bench
// Compare ops/sec between baseline and NoOp
```

**Key Design Decisions:**

- Same workload for both benchmarks (100k resolutions)
- Transient lifetime (forces factory calls, not cache hits)
- Cleanup called but not measured (benchmark steady state only)
- vitest bench provides statistical analysis (mean, variance, samples)
- Pattern matches existing packages/runtime/tests/performance.bench.ts

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                  | Don't Build                         | Use Instead                            | Why                                                                 |
| ------------------------ | ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Benchmark infrastructure | Custom timing loops with Date.now() | Vitest bench() API                     | Statistical analysis, warm-up, outlier detection, reporters         |
| React Context patterns   | Custom context with useState        | Existing ContainerProvider pattern     | Type safety, error handling, nesting detection already solved       |
| Span matching            | String comparison loops             | Pattern matching with predicates       | Regex support, partial matching, composable                         |
| W3C header extraction    | Manual header parsing               | extractTraceContext/injectTraceContext | Case-insensitive lookup, validation, tracestate handling (Phase 23) |

**Key insight:** All framework patterns (Hono middleware, React Context) already exist in the codebase. Phase 27 adds tracing-specific variants following established patterns, not inventing new abstractions.

## Common Pitfalls

### Pitfall 1: Forgetting to Clean Up Tracing Middleware

**What goes wrong:** Span leaks if middleware throws before span.end()

**Why it happens:** Async middleware can throw at any point, span.end() in try/finally is easy to forget

**How to avoid:** Always use try/catch/finally pattern with span.end() in finally block

**Warning signs:** Tests show growing span counts, memory usage increases over time

**Example:**

```typescript
// BAD - span never ends if next() throws
const span = tracer.startSpan("request");
await next();
span.end();

// GOOD - span always ends
const span = tracer.startSpan("request");
try {
  await next();
  span.setStatus("ok");
} catch (error) {
  span.recordException(error);
  span.setStatus("error");
  throw error;
} finally {
  span.end();
}
```

### Pitfall 2: React Hooks Called Conditionally

**What goes wrong:** useTracer() or useSpan() called conditionally breaks React rules of hooks

**Why it happens:** Developers try to optimize by skipping hook when tracing disabled

**How to avoid:** Always call hooks unconditionally, check result value instead

**Warning signs:** "Rendered fewer hooks than expected" error in React

**Example:**

```typescript
// BAD - conditional hook call
if (tracingEnabled) {
  const tracer = useTracer(); // ❌ Breaks rules of hooks
}

// GOOD - unconditional hook, conditional usage
const tracer = useTracer();
if (tracingEnabled) {
  tracer.withSpan("operation", () => {});
}

// BETTER - separate component
function TracedOperation() {
  const tracer = useTracer();
  // Use tracer unconditionally
}
```

### Pitfall 3: Benchmark Warm-up Bias

**What goes wrong:** First benchmark runs slower due to JIT compilation, skewing results

**Why it happens:** V8 optimizes functions during execution, cold runs are slower

**How to avoid:** Vitest bench handles warm-up automatically, don't pre-run manually

**Warning signs:** High variance in benchmark results, first run much slower

**Example:**

```typescript
// BAD - manual warm-up interferes with vitest
bench("operation", () => {
  // Pre-warm
  for (let i = 0; i < 1000; i++) operation();

  // Actual bench
  operation(); // ❌ Vitest already warmed up
});

// GOOD - let vitest handle warm-up
bench("operation", () => {
  operation(); // ✅ Vitest runs warm-up iterations
});
```

### Pitfall 4: Test Utilities With Side Effects

**What goes wrong:** Assertion helpers that mutate spans or tracer state break test isolation

**Why it happens:** Trying to "enhance" spans with debugging info during assertions

**How to avoid:** Keep test utilities pure - read-only operations, no mutations

**Warning signs:** Tests pass in isolation but fail when run together

**Example:**

```typescript
// BAD - mutation in assertion
export function assertSpanExists(spans: SpanData[], matcher: SpanMatcher): SpanData {
  const matched = spans.find(s => matches(s, matcher));
  matched.attributes["_tested"] = true; // ❌ Mutation
  return matched;
}

// GOOD - pure function
export function assertSpanExists(spans: SpanData[], matcher: SpanMatcher): SpanData {
  const matched = spans.find(s => matches(s, matcher));
  if (!matched) throw new Error("Not found");
  return matched; // ✅ No mutation
}
```

## Code Examples

Verified patterns from official sources:

### Vitest Benchmark Pattern

```typescript
// Source: packages/runtime/tests/performance.bench.ts (existing)
import { bench, describe } from "vitest";

describe("operation performance", () => {
  bench("baseline", () => {
    // Baseline operation
  });

  bench("with instrumentation", () => {
    // Instrumented operation
  });
});

// Run: pnpm test:bench
// Output: ops/sec, mean, min/max, variance
```

### React Testing Pattern

```typescript
// Source: @testing-library/react patterns (standard)
import { render, screen } from "@testing-library/react";
import { createMemoryTracer } from "@hex-di/tracing";

test("TracingProvider provides tracer to children", () => {
  const tracer = createMemoryTracer();

  const TestComponent = () => {
    const t = useTracer();
    t.withSpan("test", () => {});
    return <div>Traced</div>;
  };

  render(
    <TracingProvider tracer={tracer}>
      <TestComponent />
    </TracingProvider>
  );

  expect(tracer.getCollectedSpans()).toHaveLength(1);
});
```

### Test Assertion Pattern

```typescript
// Pattern: Pure function assertions (existing Vitest style)
import { assertSpanExists, hasAttribute } from "@hex-di/tracing/testing";

test("resolution creates span with attributes", () => {
  const tracer = createMemoryTracer();
  const cleanup = instrumentContainer(container, tracer);

  container.resolve(TestPort);

  const span = assertSpanExists(tracer.getCollectedSpans(), {
    name: "resolve:TestPort",
    status: "ok",
  });

  expect(hasAttribute(span, "hex-di.port.name", "TestPort")).toBe(true);
  expect(hasAttribute(span, "hex-di.port.lifetime", "singleton")).toBe(true);
});
```

## State of the Art

| Old Approach               | Current Approach            | When Changed              | Impact                                     |
| -------------------------- | --------------------------- | ------------------------- | ------------------------------------------ |
| Manual tracer threading    | Context-based tracer access | React 16.3+ (2018)        | Eliminates prop drilling for tracer        |
| Global tracer singleton    | Tracer via DI/Context       | Modern (2020+)            | Better testability, multi-tenant support   |
| Ad-hoc timing              | Structured spans            | OpenTelemetry (2019+)     | Standardized format, backend compatibility |
| Custom middleware patterns | W3C Trace Context           | W3C Recommendation (2020) | Interoperability across services           |

**Deprecated/outdated:**

- OpenTracing: Merged into OpenTelemetry in 2021, use OTel instead
- Manual header propagation: W3C Trace Context is standard
- Global singleton tracers: Use DI or React Context instead

## Testing Strategy

### Test Categories

1. **Unit Tests** (packages/tracing/tests/unit/)
   - Test utilities: assertSpanExists, matchers work correctly
   - Edge cases: empty spans array, regex matching, partial attributes

2. **Integration Tests** (integrations/hono/tests/, integrations/react/tests/)
   - Hono: tracingMiddleware extracts/injects headers correctly
   - React: TracingProvider provides tracer to tree, hooks access tracer

3. **Benchmarks** (packages/tracing/tests/benchmarks/)
   - NoOp overhead < 5% vs baseline
   - Memory overhead < 10% vs baseline
   - 100k resolution workload (matches existing benchmarks)

### Verification Approach

**For FRMW requirements:** Integration tests showing middleware/hooks work end-to-end

**For TEST requirements:** Unit tests showing utilities work, examples in documentation

**For PERF requirements:** Benchmark verification with `pnpm test:bench`, assert percentage thresholds

## Open Questions

1. **useTracedCallback dependency array**
   - What we know: React useCallback requires deps array for memoization
   - What's unclear: Should tracer be in deps (it's stable) or excluded (minor optimization)?
   - Recommendation: Include tracer for correctness, optimize if profiling shows issue

2. **Span name format in Hono middleware**
   - What we know: Common patterns are "GET /users/:id" or "http.request"
   - What's unclear: Should we follow OTel HTTP semantic conventions exactly?
   - Recommendation: Use OTel conventions (http.method + http.target) with escape hatches

3. **Test utilities package location**
   - What we know: Could be @hex-di/tracing/testing or separate @hex-di/testing-tracing
   - What's unclear: Impact on tree-shaking and import paths
   - Recommendation: @hex-di/tracing/testing subpath export (single package, optional import)

## Requirements Mapping

### Framework Integration (FRMW-01 to FRMW-06)

**FRMW-01:** Hono tracingMiddleware extracts traceparent, creates root span, injects traceparent

- Implementation: tracingMiddleware function in integrations/hono/src/tracing-middleware.ts
- Pattern: Follows createScopeMiddleware structure with W3C context handling

**FRMW-02:** Hono middleware options: tracer, spanName function, extractContext, injectContext, attributes

- Implementation: TracingMiddlewareOptions interface with all required fields
- Pattern: Optional parameters with defaults (extractContext=true, injectContext=true)

**FRMW-03:** React TracingProvider establishing trace context

- Implementation: TracingProvider component in integrations/react/src/providers/tracing-provider.tsx
- Pattern: React Context with displayName, follows ContainerProvider pattern

**FRMW-04:** React useTracer() hook

- Implementation: Hook in integrations/react/src/hooks/use-tracer.ts
- Pattern: useContext wrapper that throws if outside provider (matches usePort)

**FRMW-05:** React useSpan() hook

- Implementation: Hook in integrations/react/src/hooks/use-span.ts
- Pattern: Returns tracer.getActiveSpan(), can be undefined (conditional logic)

**FRMW-06:** React useTracedCallback() hook

- Implementation: Hook in integrations/react/src/hooks/use-traced-callback.ts
- Pattern: Wraps useCallback with tracer.withSpan, includes tracer in deps

### Testing Utilities (TEST-01 to TEST-04)

**TEST-01:** createMemoryTracer() factory

- Status: ALREADY IMPLEMENTED in Phase 23-04
- Location: packages/tracing/src/adapters/memory/tracer.ts
- Verify: Export in packages/tracing/src/index.ts exists

**TEST-02:** assertSpanExists(spans, matcher)

- Implementation: Function in packages/tracing/src/testing/assertions.ts
- Pattern: Throws Error with helpful message if no match found

**TEST-03:** Span matchers (hasAttribute, hasEvent, hasStatus, hasDuration)

- Implementation: Pure functions in packages/tracing/src/testing/matchers.ts
- Pattern: Boolean predicates for composability with test assertions

**TEST-04:** MemoryTracer getCollectedSpans() and clear()

- Status: ALREADY IMPLEMENTED in Phase 23-04
- Location: packages/tracing/src/adapters/memory/tracer.ts
- Verify: Methods exist on MemoryTracer class

### Performance (PERF-01, PERF-02)

**PERF-01:** NoOp tracer overhead < 5% vs no tracing

- Implementation: Benchmark in packages/tracing/tests/benchmarks/noop-overhead.bench.ts
- Pattern: Compare baseline (no instrumentation) vs instrumentContainer(NOOP_TRACER)
- Workload: 100k transient resolutions

**PERF-02:** Memory tracer overhead < 10% vs no tracing

- Implementation: Benchmark in packages/tracing/tests/benchmarks/memory-overhead.bench.ts
- Pattern: Compare baseline vs instrumentContainer(createMemoryTracer())
- Workload: 100k transient resolutions

**PERF-05:** No any types, no casts, no eslint-disable

- Verification: Lint and typecheck pass for all new code
- Pattern: Use type guards, generics, proper interfaces throughout

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns:
  - /Users/u1070457/Projects/Perso/hex-di/integrations/hono/src/middleware.ts (Hono middleware pattern)
  - /Users/u1070457/Projects/Perso/hex-di/integrations/react/src/providers/container-provider.tsx (React provider pattern)
  - /Users/u1070457/Projects/Perso/hex-di/integrations/react/src/hooks/use-port.ts (React hooks pattern)
  - /Users/u1070457/Projects/Perso/hex-di/packages/runtime/tests/performance.bench.ts (Vitest benchmark pattern)
  - /Users/u1070457/Projects/Perso/hex-di/packages/tracing/src/adapters/memory/tracer.ts (MemoryTracer API)

- Phase 23 research (W3C Trace Context):
  - /Users/u1070457/Projects/Perso/hex-di/.planning/phases/23-core-tracing-foundation/23-RESEARCH.md

- Phase 24 research (Container instrumentation):
  - /Users/u1070457/Projects/Perso/hex-di/.planning/phases/24-container-instrumentation/24-RESEARCH.md

- v7.0 requirements:
  - /Users/u1070457/Projects/Perso/hex-di/.planning/REQUIREMENTS.md (FRMW-01..06, TEST-01..04, PERF-01..02)
  - /Users/u1070457/Projects/Perso/hex-di/.planning/milestones/v7.0-ROADMAP.md

### Secondary (MEDIUM confidence)

- Vitest documentation: vitest.dev (benchmark API, reporters)
- React Context patterns: React 18 documentation (official patterns)
- OpenTelemetry semantic conventions: HTTP server span attributes

### Tertiary (LOW confidence)

None - all findings verified against codebase or official sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All packages exist in codebase, versions verified
- Architecture: HIGH - Patterns extracted from existing integration code
- Pitfalls: HIGH - Based on common React/middleware patterns and testing experience
- Requirements: HIGH - All requirements mapped to specific implementations

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain, existing patterns)

## Implementation Checklist

Phase 27 must deliver:

- [ ] Hono tracingMiddleware with W3C context propagation (FRMW-01, FRMW-02)
- [ ] React TracingProvider and hooks (FRMW-03, FRMW-04, FRMW-05, FRMW-06)
- [ ] Test assertion helpers (TEST-02, TEST-03)
- [ ] Performance benchmarks (PERF-01, PERF-02)
- [ ] Integration tests for Hono middleware
- [ ] Integration tests for React provider/hooks
- [ ] Unit tests for test utilities
- [ ] Documentation examples
- [ ] Export surface verification

**Already complete from Phase 23:**

- [x] createMemoryTracer() factory (TEST-01)
- [x] MemoryTracer.getCollectedSpans() (TEST-04)
- [x] MemoryTracer.clear() (TEST-04)
