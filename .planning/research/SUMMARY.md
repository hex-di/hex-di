# Project Research Summary

**Project:** HexDI v7.0 Distributed Tracing
**Domain:** TypeScript DI Container Distributed Tracing
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

HexDI v7.0 introduces a new `@hex-di/tracing` package that replaces the existing `TraceCollector`/`TracingAPI`/`ResolutionSpan` infrastructure with a proper distributed tracing system. The universal approach in 2026 is OpenTelemetry for all backends, with the sole exception of DataDog which benefits from its proprietary `dd-trace` client. Research across stack, features, architecture, and pitfalls converges on a clear design: a zero-dependency core tracing package that defines Tracer/Span/SpanExporter port interfaces, with separate backend adapter packages. The core package implements W3C Trace Context manually (the spec is simple enough to avoid dependencies), uses a module-level span stack for context propagation, and provides NoOp/Memory/Console built-in adapters.

The critical architectural decision is **Centralized Tree-Walking Subscription** rather than tracer propagation or hook inheritance. Codebase analysis confirms that hooks are deliberately isolated per container and should stay that way. Instead, a single tracer explicitly instruments the entire container tree by walking the hierarchy via `inspector.getChildContainers()` and installing hooks on each container. This requires NO changes to `@hex-di/runtime` for the MVP. A `WeakMap<InspectorAPI, Container>` in the tracing package serves as the MVP workaround for inspector-to-container reverse lookup.

The top risks are: (1) cross-container trace context loss if the span stack doesn't properly link child container resolutions to parent spans, (2) memory leaks from unclosed spans when async factories throw errors, and (3) type safety challenges when bridging HexDI's `AttributeValue` type to OpenTelemetry's types without using type casts (which violates project rules). All three have documented prevention strategies. The breaking change to replace `container.tracer` (TracingAPI) with a new Tracer interface must be handled as a clean break -- per project rules, no backward compatibility shims are needed.

## Key Findings

### Recommended Stack

The core `@hex-di/tracing` package requires ZERO external dependencies. It implements port interfaces, built-in adapters (NoOp, Memory, Console), W3C Trace Context parsing/serialization, and span stack management. Backend packages add external dependencies only when needed.

**Core technologies:**

- **@hex-di/tracing** (packages/tracing/): Zero dependencies, defines Tracer/Span/SpanExporter/SpanProcessor ports, built-in adapters, W3C Trace Context implementation
- **@opentelemetry/api ^1.9.0 + SDK ^2.5.0**: Universal backend adapter for @hex-di/tracing-otel -- stable API at 1.x, SDK at 2.x, exporter packages at 0.x (stable despite version number)
- **dd-trace ^5.85.0**: DataDog-only backend -- proprietary protocol provides richer features than OTLP ingestion
- **W3C Trace Context (manual)**: `traceparent: 00-{32hex}-{16hex}-{2hex}` -- spec is simple enough (55-char header) that manual implementation beats adding a dependency

**What NOT to use:**

- jaeger-client (deprecated, use @opentelemetry/exporter-jaeger instead)
- zipkin npm package (maintenance mode, use @opentelemetry/exporter-zipkin instead)
- Standalone clients of any kind -- OpenTelemetry subsumes them all

### Expected Features

**Must have (table stakes):**

- W3C Trace Context propagation (traceparent/tracestate headers)
- Parent/child span relationships across container boundaries
- OpenTelemetry-compatible span attributes (span.kind, di.port.name, di.port.lifetime, etc.)
- TracerPort for dependency injection (DI library should DI its own tracer)
- Zero-overhead NoOp implementation (singleton frozen span object, no allocation)
- Cross-container span propagation via centralized tree-walking instrumentation
- Manual span creation API (withSpan, withSpanAsync, startSpan, getActiveSpan)
- SpanExporter/SpanProcessor interfaces for backend integration

**Should have (differentiators):**

- Automatic DI instrumentation via `instrumentContainer()` / `instrumentContainerTree()` -- zero-config tracing leveraging existing hooks
- Testing utilities (MemoryTracer with span collection and assertion helpers)
- Framework integrations (Hono tracingMiddleware, React TracingProvider)
- Correlation ID propagation via context variables

**Defer (post-milestone):**

- Sampling strategies (head-based, tail-based) -- optimization, not core
- Span links for causality -- OTel feature, rarely used in DI context
- Baggage propagation (W3C Baggage spec) -- complex, low demand
- Metrics and logging -- separate concern, separate packages
- Automatic third-party library instrumentation -- users install @opentelemetry/auto-instrumentations-node separately

### Architecture Approach

The Centralized Tree-Walking Subscription model preserves HexDI's existing container isolation while enabling full cross-container observability. A single tracer instance walks the container hierarchy, installing beforeResolve/afterResolve hooks on each container. A module-level span stack tracks active spans across containers -- when a child container resolves a dependency, the hook reads the span stack to find the parent span and creates a child span under it. This works because JavaScript is single-threaded and DI resolution is synchronous (or async with proper await chains). NO changes to @hex-di/runtime are required for MVP.

**Major components:**

1. **@hex-di/tracing** (packages/tracing/) -- Core package: Tracer/Span/SpanExporter types, instrumentation functions, built-in adapters, W3C Trace Context, span stack context propagation
2. **@hex-di/tracing-otel** (packages/tracing-otel/) -- OpenTelemetry bridge: converts HexDI spans to OTel spans, configures OTLP/Jaeger/Zipkin exporters
3. **Framework integrations** (integrations/hono-tracing/, integrations/react-tracing/) -- Hono middleware for traceparent extraction/injection, React TracingProvider/useTracer

**Package placement:**

- `@hex-di/tracing` and `@hex-di/tracing-otel` go in `packages/` (runtime libraries, not dev tooling)
- Framework integrations go in `integrations/` (consistent with existing @hex-di/hono, @hex-di/react)

**Dependency rules:**

- @hex-di/tracing peers @hex-di/core and @hex-di/runtime
- @hex-di/runtime does NOT depend on @hex-di/tracing (tracing is opt-in)
- Backend packages depend on @hex-di/tracing
- No circular dependencies

### Critical Pitfalls

1. **Cross-container trace context loss** -- Each container has isolated hooks. If instrumentation only covers root, child resolutions are invisible. **Prevention:** `instrumentContainerTree()` walks hierarchy and installs hooks on every container. Module-level span stack ensures child spans link to parent's active span.

2. **Memory leak from unclosed spans** -- Async factory throws error, afterResolve hook never fires, span stays in recording state forever. **Prevention:** Always use try/finally pattern in hook implementations. Span lifecycle tied to WeakMap keyed by port objects. Bounded buffer with eviction in SpanProcessor. Timeout-based auto-close as safety net.

3. **Type safety with attributes** -- HexDI's `AttributeValue` (string | number | boolean | arrays) must bridge to OTel types without type casting (project rule). **Prevention:** Runtime type validation via typeof checks and Array.isArray in exporter adapter. Method overloads on `setAttribute()` to preserve type info at call site. Type guards instead of casts.

4. **Breaking changes cascade** -- Replacing `container.tracer: TracingAPI` with new Tracer interface breaks integration packages. **Prevention:** Per project rules, break cleanly -- no compatibility shims. Replace existing TraceCollector/TracingAPI/ResolutionSpan entirely. Update all integration packages in the same milestone. Run `pnpm -r typecheck` as gate.

5. **Span processor disposal deadlock** -- Container.dispose() awaits SpanProcessor.shutdown() which awaits batch flush which needs event loop. **Prevention:** Timeout-based shutdown with Promise.race (5s default). SpanProcessor.shutdown() is best-effort, not blocking.

## Implications for Roadmap

Based on combined research, the following 5-phase structure covers the full milestone. Phases are ordered by dependency chain: types and core first, then instrumentation, then export/backends, then framework integrations.

### Phase 1: Core Tracing Package Foundation

**Rationale:** Everything depends on the core type definitions and built-in adapters. The Tracer/Span/SpanExporter/SpanProcessor port interfaces must exist before any instrumentation or backend work can begin. This is the foundation layer with zero external dependencies.

**Delivers:**

- New @hex-di/tracing package scaffolded in packages/tracing/
- Tracer, Span, SpanContext, SpanExporter, SpanProcessor type definitions
- AttributeValue type with proper type guards (not casts)
- NoOpTracer adapter (singleton frozen span, zero allocation)
- MemoryTracer adapter (span collection for testing)
- ConsoleTracer adapter (development debugging)
- W3C Trace Context parsing/serialization (traceparent, tracestate)
- Trace/span ID generation (crypto.randomUUID or hex-encoded random bytes)
- TracerPort, SpanExporterPort, SpanProcessorPort port definitions
- Comprehensive JSDoc on all public API

**Addresses features:** TracerPort, NoOp implementation, manual span creation API, SpanExporter interface
**Avoids pitfalls:** Type-safe attributes (Pitfall 3) via type guards from day one, JSDoc coverage (Pitfall 13)

### Phase 2: Container Instrumentation and Context Propagation

**Rationale:** With core types defined, the next dependency is the ability to instrument containers. This is the phase that solves the central problem -- cross-container tracing. The module-level span stack and tree-walking instrumentation are the architectural core of the system.

**Delivers:**

- `instrumentContainer(container, tracer, options)` -- installs hooks on single container
- `instrumentContainerTree(root, tracer, options)` -- walks hierarchy, instruments all containers
- Module-level span stack for active span context propagation
- WeakMap<InspectorAPI, Container> for inspector-to-container reverse lookup
- beforeResolve hook: creates child span under active parent, pushes to stack
- afterResolve hook: pops span from stack, records error/success, ends span
- Span attributes: hex-di.port.name, hex-di.port.lifetime, hex-di.resolution.cached, hex-di.container.name, hex-di.container.kind
- Reserved attribute namespace validation (hex-di.\* prefix protected)
- try/finally pattern ensuring spans close even on error

**Addresses features:** Cross-container span propagation, parent/child span relationships, OTel-compatible attributes, automatic DI instrumentation
**Avoids pitfalls:** Cross-container context loss (Pitfall 1), unclosed spans (Pitfall 2), attribute key collisions (Pitfall 9)

### Phase 3: OpenTelemetry Backend and Export Pipeline

**Rationale:** With instrumentation working and spans being created, they need to go somewhere. The OTel backend is the universal export path -- Jaeger, Zipkin, and OTLP collectors all work through OTel exporters. The batch SpanProcessor also lives here.

**Delivers:**

- @hex-di/tracing-otel package in packages/tracing-otel/
- OtelTracerAdapter bridging HexDI Tracer to OTel Tracer
- OtelSpanExporter converting HexDI SpanData to OTel ReadableSpan
- BatchSpanProcessor with configurable batch size and flush interval
- SimpleSpanProcessor for synchronous export (testing/development)
- OTLP HTTP exporter configuration
- Resource metadata (service.name, service.version, deployment.environment)
- Semantic conventions mapping (hex-di.\* to OTel standard attributes)
- Timeout-based shutdown for BatchSpanProcessor (prevents disposal deadlock)

**Addresses features:** Span exporter interface, backend integration
**Avoids pitfalls:** OTel version compatibility (Pitfall 8) via adapter abstraction, disposal deadlock (Pitfall 5) via timeout shutdown, performance overhead (Pitfall 6) via sampling support

### Phase 4: Breaking Change Migration and Integration Updates

**Rationale:** With the new tracing system working end-to-end, the existing TraceCollector/TracingAPI/ResolutionSpan must be replaced. Per project rules, this is a clean break. All downstream packages must be updated in the same milestone.

**Delivers:**

- Remove existing TraceCollector, TracingAPI, ResolutionSpan from @hex-di/runtime
- Remove trace(), enableTracing() standalone functions
- Update container.tracer property type (or remove it, tracing now external)
- Update @hex-di/hono integration package
- Update @hex-di/react integration package
- Update @hex-di/testing if it references old tracing types
- Update all examples
- Run full `pnpm -r typecheck` and `pnpm -r test` to verify no breakage

**Addresses features:** Clean API surface, no legacy baggage
**Avoids pitfalls:** Breaking changes cascade (Pitfall 7) by updating everything in one coordinated phase

### Phase 5: Framework Integrations and Testing Utilities

**Rationale:** With core tracing, instrumentation, export, and migration complete, framework-specific integrations add the final layer of developer experience. Testing utilities enable users to assert on tracing behavior.

**Delivers:**

- Hono tracingMiddleware: extract traceparent from incoming requests, create root span, inject traceparent in responses
- React TracingProvider + useTracer hook: propagate trace context via React Context (not AsyncLocalStorage, which breaks in concurrent rendering)
- Testing utilities: assertSpanExists(), span matchers, MemoryTracer assertion helpers
- Documentation and examples for all integration patterns
- Performance benchmarks: NoOp tracer overhead < 5% vs no tracing

**Addresses features:** Framework integrations, testing utilities, correlation ID propagation
**Avoids pitfalls:** React concurrent rendering context loss (Pitfall 4) via React Context instead of ALS, Hono middleware timing (Pitfall 10) via separate request/handler spans, performance degradation (Pitfall 6) via benchmarks and lazy timing

### Phase Ordering Rationale

- **Phase 1 before everything:** All other phases import from @hex-di/tracing core types. The Tracer/Span interfaces are the foundation.
- **Phase 2 before Phase 3:** Instrumentation creates spans; export consumes them. Without instrumentation, there's nothing to export.
- **Phase 3 before Phase 4:** The new system must work end-to-end before removing the old one. Parallel operation validates the replacement.
- **Phase 4 before Phase 5:** Framework integrations should target the final API, not the transitional state. Breaking changes must land first.
- **Phase 5 last:** Framework integrations and testing utilities are the polish layer. They depend on stable core APIs.

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 2 (Instrumentation):** The span stack approach for cross-container context propagation has no prior art in JavaScript DI frameworks. The design is sound in principle but needs careful testing with deeply nested container hierarchies and async resolution chains.
- **Phase 3 (OTel Backend):** OTel package versions move quickly (monthly releases). Pin versions at implementation time and test the actual bridge code against real OTel SDK types.
- **Phase 4 (Migration):** Audit every usage of TracingAPI, TraceCollector, and ResolutionSpan across all packages before beginning removal. Run `pnpm -r typecheck` as gate.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Core Types):** Well-established patterns -- port/adapter definitions, W3C spec implementation, NoOp pattern. All documented in existing HexDI codebase.
- **Phase 5 (Framework Integrations):** Hono middleware and React provider patterns are well-documented in existing @hex-di/hono and @hex-di/react packages. Tracing variants follow the same structure.

## Confidence Assessment

| Area         | Confidence                                                  | Notes                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH                                                        | OpenTelemetry ecosystem well-documented, versions verified via npm registry, W3C Trace Context is stable spec since 2020                                                                                             |
| Features     | HIGH                                                        | Table stakes derived from OTel spec and DI framework comparison (Effect-TS, NestJS, InversifyJS). Anti-features clearly identified.                                                                                  |
| Architecture | HIGH                                                        | Centralized tree-walking validated against codebase -- hooks ARE isolated, inspector API exists, addHook/removeHook available. Zero runtime changes needed for MVP.                                                  |
| Pitfalls     | HIGH for codebase-derived, MEDIUM for framework integration | 13 pitfalls identified with prevention strategies. Cross-container context loss and unclosed spans derived from direct code analysis. React concurrent rendering and performance overhead need empirical validation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Inspector-to-Container reverse lookup:** MVP uses WeakMap workaround. Post-MVP should add `inspector.getContainer()` to @hex-di/runtime. Track as future enhancement.
- **Dynamic child container discovery:** Containers created AFTER `instrumentContainerTree()` runs won't be automatically instrumented. MVP solution is manual `instrumentContainer()` on new children. Post-MVP could add inspector event subscription.
- **Performance overhead benchmarks:** Research predicts NoOp tracer should be zero-cost (no allocation, no timing calls), but actual benchmarks needed during Phase 5. Target: < 5% overhead for NoOp, < 10% for Memory tracer.
- **Async resolution context propagation:** Module-level span stack works for synchronous resolution. Async factories with Promise-based initialization need testing to verify span parent/child relationships survive across await boundaries.
- **React concurrent rendering:** Theoretical analysis says AsyncLocalStorage breaks in concurrent mode. Empirical validation needed during Phase 5 React integration.

## Sources

### Primary (HIGH confidence)

- HexDI codebase: packages/runtime/src/container/factory.ts, inspection/builtin-api.ts, container/internal/lifecycle-manager.ts -- confirmed hook isolation, per-container tracing, bidirectional hierarchy
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/ -- stable recommendation since Feb 2020
- OpenTelemetry JS SDK documentation: https://opentelemetry.io/docs/languages/js/ -- package structure, version strategy
- npm registry: @opentelemetry/api 1.9.0, @opentelemetry/sdk-trace-base 2.5.0, dd-trace 5.85.0 -- version verification
- HexDI spec: specs/tracing-and-logging/SPEC-TRACING.md -- existing tracing design, migration requirements

### Secondary (MEDIUM confidence)

- Effect-TS tracing documentation -- API patterns (withSpan, Tracer as layer)
- NestJS OpenTelemetry integration -- automatic instrumentation patterns
- OpenTelemetry semantic conventions -- standard attribute naming (di.\* namespace)
- React 18 concurrent features -- AsyncLocalStorage limitations

### Tertiary (LOW confidence)

- performance.now() overhead estimates (system-dependent, needs benchmarking)
- OTel version forward-compatibility (hypothetical breaking changes in future versions)
- Span ID collision probability at high throughput (needs load testing)

---

_Research completed: 2026-02-06_
_Synthesized from: STACK.md, TRACING-FEATURES.md, ARCHITECTURE.md, PITFALLS.md_
_Ready for roadmap: yes_
