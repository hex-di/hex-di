# Distributed Tracing Architecture for HexDI

**Research Date:** 2026-02-06
**Confidence:** HIGH (codebase analysis), MEDIUM (best practices from first principles)

## Executive Summary

This document addresses how distributed tracing integrates with HexDI's container hierarchy architecture. The **recommended approach is Centralized Tree-Walking Subscription** over tracer propagation, with **NO changes to hook inheritance** needed. This preserves the existing isolation model while enabling cross-container observability.

**Key Finding:** HexDI's current architecture creates ISOLATED tracers per container (each has its own MemoryCollector). For distributed tracing, we need a **single tracer that observes the entire container tree**, NOT per-container tracers that try to propagate.

## Critical Current Architecture Constraints

### 1. Hooks are NOT Inherited

**CONFIRMED FROM CODEBASE:**

```typescript
// packages/runtime/src/container/factory.ts:135-138
const hooksHolder: HooksHolder = { hookSources: [] };
const lateBindingHooks = createLateBindingHooks(hooksHolder);
```

Each container has its own isolated `hooksHolder.hookSources` array. Child containers do NOT inherit parent hooks. This is by design for isolation.

### 2. Current Tracer is Per-Container Isolated

**CONFIRMED FROM CODEBASE:**

```typescript
// packages/runtime/src/inspection/builtin-api.ts:42-63
export function createBuiltinTracerAPI(): TracingAPI {
  const collector = new MemoryCollector(); // NEW instance per container
  // ...
}
```

Each container gets its own `MemoryCollector` instance via `attachBuiltinAPIs()`. This means:

- `rootContainer.tracer` has its own collector
- `childContainer.tracer` has a DIFFERENT collector
- Parent cannot see child resolutions automatically

### 3. Container Hierarchy is Bidirectional

**CONFIRMED FROM CODEBASE:**

```typescript
// packages/runtime/src/container/internal/lifecycle-manager.ts:88-89
private readonly childContainers: Map<number, Disposable> = new Map();
// Parent tracks children via Map

// packages/runtime/src/container/factory.ts:276
registerChildContainer: child => impl.registerChildContainer(child),
// Child registers itself with parent during creation
```

The LifecycleManager maintains bidirectional references enabling tree-walking from either root or any node.

## Problem Statement: Cross-Container Tracing Gap

**Current Limitation:**

```typescript
const root = createContainer({ graph, name: "Root" });
const child = root.createChild(childGraph, { name: "Child" });

// Install tracer on root
instrumentContainer(root, tracer);

// Child resolutions are INVISIBLE to root's tracer
child.resolve(ChildServicePort); // NOT traced!
```

**Why:** Child container has its OWN `hooksHolder` (not inherited). Child resolutions run through child's hooks (empty if not instrumented).

## Architecture Decision: Centralized Tree-Walking

### Recommended Approach

**Single tracer subscribes to container tree via explicit instrumentation.**

```typescript
// API Design
function instrumentContainerTree(
  rootOrNode: Container,
  tracer: Tracer,
  options?: InstrumentOptions
): () => void {
  const instrumented = new Set<Container>();

  function instrumentRecursive(container: Container): void {
    if (instrumented.has(container)) return;

    // Install hooks on this container
    const cleanup = instrumentContainer(container, tracer, options);
    instrumented.add(container);

    // Walk to children via inspector
    const children = container.inspector.getChildContainers();
    for (const childInspector of children) {
      // Need container ← inspector mapping (see integration points)
      instrumentRecursive(getContainerFromInspector(childInspector));
    }
  }

  instrumentRecursive(rootOrNode);

  return () => {
    // Cleanup all instrumented containers
  };
}
```

### Why This Approach

✅ **Preserves Isolation** — No changes to hook inheritance model
✅ **Clear Separation of Concerns** — Tracing logic in @hex-di/tracing, runtime unchanged
✅ **Explicit Opt-In** — User controls scope of instrumentation
✅ **Handles Dynamic Creation** — Can retrofit existing container trees

❌ Requires inspector ↔ container mapping (see integration points)

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ @hex-di/tracing                                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ instrumentContainerTree()                             │ │
│  │                                                       │ │
│  │  - Walks container hierarchy via inspector           │ │
│  │  - Installs hooks on each container                  │ │
│  │  - Tracks instrumented containers                    │ │
│  │  - Returns cleanup function                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ instrumentContainer()                                 │ │
│  │                                                       │ │
│  │  - Installs hooks on single container               │ │
│  │  - Creates spans for resolutions                    │ │
│  │  - Propagates trace context via span stack          │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ container.addHook('beforeResolve', ...)              │ │
│  │ container.addHook('afterResolve', ...)               │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ @hex-di/runtime (NO CHANGES)                                │
│                                                             │
│  - addHook() / removeHook()                                │
│  - inspector.getChildContainers()                          │
│  - Isolated hooks per container                            │
└─────────────────────────────────────────────────────────────┘
```

## Span Hierarchy Mapping

### Container Hierarchy → Span Hierarchy

```
Root Container
├─ Child Container 1
│  └─ Child Container 1.1
└─ Child Container 2

MAPS TO:

Trace (single traceId)
├─ Span: resolve RootService (container=Root)
│  ├─ Span: resolve ChildService (container=Child1)
│  │  └─ Span: resolve GrandchildService (container=Child1.1)
│  └─ Span: resolve Dependency (container=Root)
└─ Span: resolve OtherService (container=Child2)
```

**Span attributes indicate container:**

```typescript
{
  'hex-di.container.name': 'Child1',
  'hex-di.container.kind': 'child',
  'hex-di.container.parent': 'Root',
  'hex-di.port.name': 'ChildService',
  'hex-di.resolution.inheritance_mode': 'shared' | 'forked' | 'isolated',
}
```

### Resolution Delegation (Shared Mode)

When child delegates to parent:

```typescript
child.resolve(SharedPort)  // Inheritance mode: 'shared'
  └─> parent.resolveInternal(SharedPort)  // Bypasses parent hooks!
```

**Result:** ONE span attributed to child container, with delegation attributes:

```typescript
{
  'hex-di.resolution.delegated': true,
  'hex-di.resolution.from_container': 'Child1',
  'hex-di.resolution.to_container': 'Root',
  'hex-di.resolution.inheritance_mode': 'shared',
}
```

**Why one span?** It's ONE resolution from user perspective. Child doesn't create instance, just retrieves parent's.

**Key Insight:** `resolveInternal()` bypasses hooks. This is correct—prevents double-counting. Child's hooks see full resolution including delegation.

## Context Propagation Strategy

### Span Stack for Active Context

```typescript
// Module-level span stack in instrumentation
const spanStack: Span[] = [];

beforeResolve: ctx => {
  const parentSpan = spanStack[spanStack.length - 1];
  const span = tracer.startSpan("resolve " + ctx.portName, {
    parent: parentSpan?.context,
    attributes: {
      "hex-di.container.name": ctx.containerId,
      "hex-di.port.name": ctx.portName,
      "hex-di.resolution.depth": ctx.depth,
      "hex-di.resolution.inheritance_mode": ctx.inheritanceMode,
      // ... more attributes
    },
  });
  spanStack.push(span);
};

afterResolve: ctx => {
  const span = spanStack.pop();
  if (span) {
    if (ctx.error) {
      span.recordException(ctx.error);
      span.setStatus("error");
    }
    span.end();
  }
};
```

**Why module-level stack vs context variables?**

- Context variables in @hex-di/core are passive (no active propagation)
- Span stack works with existing hook execution model
- No async-local-storage needed (single-threaded JavaScript)

## Integration Points with Existing Components

### 1. Container.addHook() / removeHook()

**Status:** ✅ No changes needed

**Usage:**

```typescript
function instrumentContainer(container: Container, tracer: Tracer): () => void {
  const beforeHandler = ctx => {
    /* create span */
  };
  const afterHandler = ctx => {
    /* end span */
  };

  container.addHook("beforeResolve", beforeHandler);
  container.addHook("afterResolve", afterHandler);

  return () => {
    container.removeHook("beforeResolve", beforeHandler);
    container.removeHook("afterResolve", afterHandler);
  };
}
```

### 2. Inspector.getChildContainers()

**Status:** ✅ No changes needed for basic functionality

**Current API:**

```typescript
interface InspectorAPI {
  getChildContainers(): readonly InspectorAPI[];
}
```

**Challenge:** InspectorAPI → Container reverse lookup needed for tree walking.

**MVP Solution:** External WeakMap in @hex-di/tracing

```typescript
// In @hex-di/tracing
const inspectorToContainer = new WeakMap<InspectorAPI, Container>();

function instrumentContainerTree(root: Container, tracer: Tracer): () => void {
  inspectorToContainer.set(root.inspector, root);
  // Walk tree...
}
```

**Post-MVP Enhancement:** Add `inspector.getContainer()` method to @hex-di/runtime

### 3. ResolutionHookContext

**Status:** ✅ No changes needed

**Provides comprehensive context:**

```typescript
interface ResolutionHookContext {
  readonly port: Port<unknown, string>;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly scopeId: string | null;
  readonly parentPort: Port<unknown, string> | null; // For span nesting
  readonly isCacheHit: boolean;
  readonly depth: number; // For span hierarchy
  readonly containerId: string; // For span attributes
  readonly containerKind: ContainerKind;
  readonly inheritanceMode: InheritanceMode | null; // For delegation detection
  readonly parentContainerId: string | null;
}
```

All needed data available. No additions required.

### 4. LifecycleManager (Disposal)

**Status:** ✅ No changes needed

Instrumentation cleanup should happen before container disposal. User responsibility:

```typescript
const cleanup = instrumentContainer(container, tracer);

// Later:
cleanup();
await container.dispose();
```

## New Components Needed

### 1. @hex-di/tracing Package (packages/tracing/)

**Structure:**

```
packages/tracing/
├── src/
│   ├── index.ts                    # Public API
│   ├── types/
│   │   ├── tracer.ts               # Tracer, Span, SpanContext
│   │   ├── exporter.ts             # SpanExporter, SpanProcessor
│   │   └── attributes.ts           # Attribute types
│   ├── instrumentation/
│   │   ├── container.ts            # instrumentContainer()
│   │   ├── tree.ts                 # instrumentContainerTree()
│   │   └── hooks.ts                # Hook handler factories
│   ├── context/
│   │   ├── variables.ts            # TraceContextVar, ActiveSpanVar
│   │   ├── propagation.ts          # W3C Trace Context
│   │   └── stack.ts                # Span stack management
│   ├── adapters/
│   │   ├── noop.ts                 # NoOpTracer (zero cost)
│   │   ├── memory.ts               # MemoryTracer (testing)
│   │   └── console.ts              # ConsoleTracer (dev)
│   └── utils/
│       ├── id-generation.ts        # Trace/span ID generation
│       └── timing.ts               # High-resolution timing
└── tests/
```

**Dependencies:**

- `@hex-di/core` (peer)
- `@hex-di/runtime` (peer)
- No external dependencies for core package

### 2. Backend Packages (Separate)

**@hex-di/tracing-otel** (packages/tracing-otel/)

```typescript
import { SpanExporterPort } from "@hex-di/tracing";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export const OtelExporterAdapter = createAdapter({
  port: SpanExporterPort,
  factory: options => new OTLPSpanExporter(options),
  lifetime: "singleton",
});
```

**Why separate?**

- Heavy dependencies (OpenTelemetry SDK)
- User only installs backends they need
- Core @hex-di/tracing remains lightweight

**Other backends:**

- @hex-di/tracing-jaeger
- @hex-di/tracing-datadog
- @hex-di/tracing-zipkin

### 3. Framework Integration Packages

**@hex-di/hono-tracing** (integrations/hono-tracing/)

```typescript
export function tracingMiddleware(tracer: Tracer): MiddlewareHandler {
  return async (c, next) => {
    const parentContext = extractTraceContext(c.req.header());

    return tracer.withSpanAsync(
      "http.request",
      async span => {
        span.setAttribute("http.method", c.req.method);
        span.setAttribute("http.url", c.req.url);

        await next();

        span.setAttribute("http.status", c.res.status);
        injectTraceContext(span.context, c.res.headers);
      },
      { parent: parentContext }
    );
  };
}
```

**@hex-di/react-tracing** (integrations/react-tracing/)

```typescript
export function TracingProvider({ tracer, children }: Props) {
  return <TracingContext.Provider value={tracer}>{children}</TracingContext.Provider>;
}

export function useTracer(): Tracer {
  return useContext(TracingContext);
}
```

## Runtime Changes Required

### Answer: MINIMAL (None for MVP)

The centralized tree-walking approach requires NO changes to @hex-di/runtime:

✅ `container.addHook()` / `removeHook()` exist
✅ `container.inspector.getChildContainers()` exists
✅ `ResolutionHookContext` provides all needed data
✅ Hook isolation is correct behavior (no inheritance needed)

### Optional Post-MVP Enhancements

**1. Inspector → Container Reverse Lookup**

```typescript
// packages/runtime/src/inspection/types.ts
export interface InspectorAPI {
  // ... existing methods
  getContainer(): Container; // ADDED
}
```

**Why:** Simplifies tree walking (no external WeakMap needed)
**MVP Workaround:** WeakMap in @hex-di/tracing

**2. Dynamic Child Discovery Events**

```typescript
export type InspectorEvent =
  | { type: 'resolution'; ... }
  | { type: 'child-created'; child: InspectorAPI }; // ADDED
```

**Why:** Auto-instrument containers created after tree instrumentation
**MVP Workaround:** Manual instrumentation or polling

## Hook Inheritance Decision

**Should hooks inherit from parent to child?**

**Answer: NO.** Keep existing isolated model.

**Rationale:**

1. **Architecture Principle:** Containers are independent units
2. **Existing Design is Correct:** Deliberate isolation per code comments
3. **Tracing Doesn't Need Inheritance:** Centralized tree-walking works better
4. **Other Use Cases Need Isolation:** Security policies, logging levels vary per container

**Comparison:**

- Express.js: Middleware inherits (single request pipeline)
- React: Context propagates (monolithic component tree)
- Effect-TS: Layers compose, not inherit (explicit composition)
- NestJS: Interceptors CAN inherit (opt-in)

**HexDI aligns with Effect-TS/NestJS:** Containers are composable units. Inheritance would reduce flexibility.

## Package Placement & Dependencies

### Package Location

| Package               | Location      | Rationale                                |
| --------------------- | ------------- | ---------------------------------------- |
| @hex-di/tracing       | packages/     | Core runtime library, framework-agnostic |
| @hex-di/tracing-otel  | packages/     | Backend exporter, peer of core           |
| @hex-di/hono-tracing  | integrations/ | Framework-specific                       |
| @hex-di/react-tracing | integrations/ | Framework-specific                       |

**Why packages/ not tooling/?**

- tooling/ = development tools (@hex-di/testing, @hex-di/visualization)
- packages/ = runtime libraries (used in production)
- Tracing is RUNTIME observability, not dev tooling

### Dependency Graph

```
@hex-di/core (types only)
       ▲
       │ peer
       │
@hex-di/runtime ◄──────┐
       ▲               │ peer
       │ peer          │
       │               │
@hex-di/tracing ───────┘
       ▲
       │ dependency
       │
@hex-di/tracing-otel
```

**Key Rules:**

1. @hex-di/core has NO dependencies (pure types)
2. @hex-di/tracing depends on @hex-di/core, peers @hex-di/runtime
3. @hex-di/runtime does NOT depend on @hex-di/tracing (tracing-agnostic)
4. Backend packages depend on @hex-di/tracing
5. No circular dependencies

### TracingAPI in @hex-di/core

**Current:**

```typescript
// packages/core/src/inspection/tracing-types.ts (EXISTING)
export interface TracingAPI {
  getTraces(filter?: TraceFilter): readonly TraceEntry[];
  getStats(): TraceStats;
  // Simple trace collection API
}
```

**This stays unchanged.** TracingAPI is a CONTRACT (interface), not implementation.

**New Tracer interface in @hex-di/tracing:**

```typescript
export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(name: string, fn: (span: Span) => T): T;
  // Full distributed tracing API
}
```

**Two separate concepts:**

- `TracingAPI`: Simple container-level trace collection (EXISTING)
- `Tracer`: Full distributed tracing with spans (NEW)

They coexist! No breaking changes.

## Build Order & Dependencies

### Phase 1: Core Types (No Dependencies)

```
@hex-di/tracing/src/types/
├── tracer.ts
├── exporter.ts
└── attributes.ts
```

**Can build:** Standalone, no external dependencies.

### Phase 2: Context & Utilities

```
@hex-di/tracing/src/context/
├── variables.ts       (uses @hex-di/core)
├── propagation.ts     (pure functions)
└── stack.ts           (pure functions)

@hex-di/tracing/src/utils/
├── id-generation.ts
└── timing.ts
```

**Depends on:** @hex-di/core (peer)

### Phase 3: Adapters

```
@hex-di/tracing/src/adapters/
├── noop.ts
├── memory.ts
└── console.ts
```

**Depends on:** Phase 1 types. Can test independently.

### Phase 4: Instrumentation

```
@hex-di/tracing/src/instrumentation/
├── container.ts       (uses container.addHook())
├── tree.ts            (uses container.inspector)
└── hooks.ts
```

**Depends on:**

- @hex-di/runtime (peer) — Container type, hook types
- Phase 1-3 (internal)

**Must build after:** @hex-di/runtime

### Phase 5: Backend Packages

```
@hex-di/tracing-otel/
└── src/exporter.ts
```

**Depends on:**

- @hex-di/tracing (peer)
- @opentelemetry/exporter-trace-otlp-http (dependency)

**Must build after:** @hex-di/tracing

### Turborepo Auto-Resolution

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

**Build order:**

1. @hex-di/core
2. @hex-di/runtime, @hex-di/graph
3. @hex-di/tracing (peer: core, runtime)
4. @hex-di/tracing-otel (peer: tracing)
5. @hex-di/hono-tracing (peer: tracing, hono)

## Migration & Backward Compatibility

### Existing Container.tracer API

**Stays unchanged:**

```typescript
// Simple trace collection (existing)
const traces = container.tracer.getTraces();
```

### New Distributed Tracing API

**Additive, opt-in:**

```typescript
import { createConsoleTracer, instrumentContainer } from "@hex-di/tracing";

const tracer = createConsoleTracer();
instrumentContainer(container, tracer);
```

**No breaking changes.** Both APIs coexist.

## Open Questions for Roadmap

### 1. Dynamic Child Discovery

**Question:** How to instrument containers created AFTER tree instrumentation?

**Options:**

- A. Polling: `setInterval(() => checkForNewChildren())`
- B. Events: Add `inspector.subscribe({ type: 'child-created' })`
- C. Manual: User calls `instrumentContainer()` on new children

**Recommendation:** Option C for MVP, Option B for v2.

### 2. Inspector → Container Reverse Lookup

**Question:** How to get Container from InspectorAPI?

**Options:**

- A. Add `inspector.getContainer()` method (runtime change)
- B. External WeakMap in @hex-di/tracing (workaround)
- C. Pass both container and inspector (verbose API)

**Recommendation:** Option B for MVP, Option A for v2.

### 3. Context Variable Propagation

**Question:** How to propagate trace context?

**Options:**

- A. Module-level span stack (simple)
- B. Async-local-storage (Node.js only)
- C. Context parameter threading (runtime changes)

**Recommendation:** Option A (span stack) for MVP.

### 4. Sampling Strategy

**Question:** How to sample traces?

**Options:**

- A. Head-based sampling (decide at trace start)
- B. Tail-based sampling (decide after complete)
- C. Filtering at instrumentation level

**Recommendation:** Option A for MVP, Option B post-MVP.

## Summary: Recommended Architecture

### Core Decisions

✅ **Centralized tree-walking subscription** — One tracer observes entire container tree
✅ **External instrumentation** — No changes to runtime hook inheritance
✅ **Span stack for context** — Module-level, no async-local-storage
✅ **One span per resolution** — Even for shared mode (add delegation attributes)
✅ **Container attributes on spans** — Identify which container resolved
✅ **Separate backend packages** — Keep core lightweight

### Integration Summary

| Component            | Changes Needed | Phase     |
| -------------------- | -------------- | --------- |
| @hex-di/runtime      | None (MVP)     | —         |
| @hex-di/tracing      | New package    | Phase 1-4 |
| @hex-di/tracing-otel | New package    | Phase 5   |
| @hex-di/hono-tracing | New package    | Phase 6   |

### Build Order

**MVP:**

1. Create @hex-di/tracing package (types, adapters, instrumentation)
2. Implement span stack context propagation
3. Manual tree instrumentation pattern
4. Basic testing with memory tracer

**Post-MVP:**

1. instrumentContainerTree() helper
2. Dynamic child discovery
3. Backend packages (OpenTelemetry, Jaeger)
4. Framework integrations (Hono, React)
5. Advanced features (sampling, filtering)

## Confidence Assessment

| Area                   | Confidence | Source                                   |
| ---------------------- | ---------- | ---------------------------------------- |
| Container hierarchy    | HIGH       | Direct codebase analysis                 |
| Hook isolation model   | HIGH       | Factory.ts, hooks.ts inspection          |
| Inspector API          | HIGH       | Builtin-api.ts, types.ts inspection      |
| Tree-walking approach  | HIGH       | Architecture alignment, first principles |
| Span hierarchy mapping | MEDIUM     | Distributed tracing patterns             |
| Context propagation    | MEDIUM     | Technical feasibility analysis           |
| Package placement      | HIGH       | Monorepo structure analysis              |
| Build dependencies     | HIGH       | Dependency graph analysis                |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Ready for roadmap creation**
