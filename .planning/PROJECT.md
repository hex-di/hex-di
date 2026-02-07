# HexDI

## What This Is

A TypeScript dependency injection library implementing Hexagonal Architecture (Ports & Adapters) with compile-time validation. Provides type-safe dependency graphs, lifetime management (singleton/scoped/transient), fluent builder APIs, type-safe override builders, distributed tracing, and framework integrations for React and Hono.

## Core Value

Catch dependency graph errors at compile time, not runtime -- invalid graphs should fail to typecheck.

## Current State

**Latest:** v7.0 Distributed Tracing (shipped 2026-02-07)

- 15 packages under `@hex-di/*` scope across 4 directory groups
- `packages/` -- Core DI engine (core, graph, runtime) + Tracing (tracing, tracing-otel, tracing-jaeger, tracing-zipkin, tracing-datadog)
- `integrations/` -- Framework integrations (react, hono)
- `tooling/` -- Developer tools (testing, visualization, graph-viz)
- `libs/` -- Higher-level libraries (flow/{core,react})
- 3,940 tests passing (266 test files)
- 189,385 total lines of TypeScript
- 8 milestones shipped (v1.1, v1.2, v2.0, v3.0, v4.0, v5.0, v6.0, v7.0)
- 94 plans executed across 31 phases

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Port/Adapter abstraction with branded types
- GraphBuilder with type-state machine validation
- Cycle detection at type level
- Captive dependency detection at type level
- Lifetime hierarchy enforcement (singleton > scoped > transient)
- Container resolution (sync and async)
- Scope management with disposal
- React integration (providers, hooks)
- Hono integration (per-request scopes)
- Flow state machine runtime
- Testing utilities
- Runtime captive detection as defense-in-depth -- v1.1
- Merge operations preserve parentProvides union -- v1.1
- Merge operations preserve UnsafeDepthOverride flag -- v1.1
- Scoped overrides with `withOverrides()` pattern -- v1.2
- Enhanced `defineService()` with builder pattern -- v1.2
- `fromClass()` helper for class-based services -- v1.2
- Port direction types (`createInboundPort()`, `createOutboundPort()`) -- v1.2
- Port metadata for documentation and visualization -- v1.2
- Unified `createPort()` with object config -- v2.0
- `InboundPorts`/`OutboundPorts` type utilities -- v2.0
- Graph inspection filtering by direction/category/tags -- v2.0
- Unified `createAdapter()` function replacing 7 adapter creation patterns -- v3.0
- Auto-detect async from factory return type -- v3.0
- Compile-time enforcement: async factories require singleton lifetime -- v3.0
- Smart defaults (lifetime: singleton, requires: []) -- v3.0
- Unified `provide()` with auto-detect async (removed provideAsync, provideUnchecked, provideFirstError) -- v4.0
- `merge()` handles max depth safely (removed mergeWith) -- v4.0
- `withExtendedDepth()` clearer naming (renamed from withUnsafeDepthOverride) -- v4.0
- `inspect({ summary: true })` returns lightweight GraphSummary -- v4.0
- Disposal lifecycle verified (LIFO order, async, error aggregation) -- v4.0
- Bidirectional captive validation verified complete -- v4.0
- Split `types.ts` into 8 focused files in types/ subdirectory -- v5.0
- Extracted wrapper utilities to `wrapper-utils.ts` (~180 LOC dedup) -- v5.0
- Consolidated tracing/inspection as core features, removed HOOKS_ACCESS plugin -- v5.0
- Removed legacy type exports (`CaptiveDependencyErrorLegacy`) -- v5.0
- Type-safe `container.override(adapter).build()` with compile-time port validation -- v5.0
- Unified `createContainer()` with single options object -- v5.0
- O(1) child container unregistration via Map-based tracking -- v5.0
- Configurable timestamp capture for production builds -- v5.0
- Performance benchmarks for resolution, scopes, and disposal -- v5.0
- Compile-time circular dependency detection (type-level DFS) -- v5.0
- Context variable helpers in `@hex-di/core` package -- v5.0
- Resolution hook tests (29 tests) and hook composition tests (15 tests) -- v5.0
- Inspector API tests (21 tests) and tracer API tests (23 tests) -- v5.0
- Error messages with `suggestion` property and "Did you mean?" -- v5.0
- Architecture documentation and design decisions -- v5.0
- `@typeParam` JSDoc annotations for IDE support -- v5.0
- Monorepo restructured into packages/, integrations/, tooling/, libs/ groups -- v6.0
- libs/ uses nested sub-packages per library (libs/flow/{core,react}) -- v6.0
- All workspace configs, tsconfig references, and build configs updated -- v6.0
- All tests, typechecks, builds, and lint pass after migration -- v6.0
- Examples and website workspace references updated -- v6.0
- Distributed tracing with Tracer, Span, SpanExporter, SpanProcessor ports -- v7.0
- NoOp, Memory, Console tracer adapters (zero-cost, testing, development) -- v7.0
- W3C Trace Context propagation (traceparent/tracestate headers) -- v7.0
- Container instrumentation (`instrumentContainer()`, `instrumentContainerTree()`) -- v7.0
- Cross-container parent-child span relationships via module-level span stack -- v7.0
- Dynamic child container auto-instrumentation via child-created events -- v7.0
- OpenTelemetry export pipeline with batch/simple processors -- v7.0
- Backend packages: tracing-otel, tracing-jaeger, tracing-zipkin, tracing-datadog -- v7.0
- Hono tracing middleware with W3C Trace Context extraction/injection -- v7.0
- React TracingProvider with useTracer(), useSpan(), useTracedCallback() -- v7.0
- Test utilities: createMemoryTracer(), assertSpanExists(), span matchers -- v7.0
- Old tracing system fully removed (TraceCollector, TracingAPI, ResolutionSpan) -- v7.0
- NoOp tracer: 0% overhead via conditional hook registration -- v7.0
- Zero `any` types, zero type casts, zero eslint-disable comments in tracing code -- v7.0

### Active

<!-- Current scope. Building toward these. -->

No active milestone. Planning next milestone.

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Decorator-based registration -- Optional future package, not core
- Convention-based auto-wiring -- Too implicit for core library philosophy
- Performance optimization for type checking -- Address in dedicated milestone
- Request-scoped lifetime -- Redundant with existing scoped lifetime and createScope()
- Plugin system for tracing -- Consolidated into core runtime (v5.0 decision)

## Context

- Monorepo with 15 packages under `@hex-di/*` scope across 4 directory groups
- Type-level validation is complex (1,250 line provide.ts, 810 line merge.ts)
- Graph builder validation is complete and verified
- Runtime package elevated to production quality (v5.0)
- Monorepo reorganized into semantic groups (v6.0)
- Distributed tracing system with 5 new packages (v7.0)
- 8 milestones shipped (v1.1, v1.2, v2.0, v3.0, v4.0, v5.0, v6.0, v7.0)
- 94 plans executed across 31 phases
- Pre-existing tech debt: lint errors in packages/graph (11), lint warnings in libs/flow/core (31), test failures in react-showcase (12)
- v7.0 tech debt: 3 lint warnings in @hex-di/tracing, ObjectPool utility retained despite negative benchmark, stale 31-VERIFICATION.md

## Constraints

- **Type safety**: No `any` types -- per project rules
- **No casting**: Fix underlying type issues, don't cast around them
- **Breaking changes welcome**: Clean breaks preferred over deprecation shims

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision                                              | Rationale                                                    | Outcome     |
| ----------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| Fix all 3 bugs in single milestone                    | They're related (all in merge/build logic)                   | Good (v1.1) |
| Verification-only milestone                           | Bugs were already fixed in prior refactoring                 | Good (v1.1) |
| Defense-in-depth validation                           | Runtime backs up compile-time checks                         | Good (v1.1) |
| Focus v1.2 on DX improvements                         | Expert analysis shows clear priority areas                   | Good (v1.2) |
| Additive-only changes for v1.2                        | Maintains backward compatibility                             | Good (v1.2) |
| Factory-based overrides keyed by port name            | API simplicity, lazy instantiation                           | Good (v1.2) |
| Curried create<TService>()(name) for ServiceBuilder   | Enables partial type application                             | Good (v1.2) |
| DirectedPort as intersection with Port                | Backward compatible, gradual adoption                        | Good (v1.2) |
| Unified createPort() with object config               | Single entry point, rich metadata                            | Good (v2.0) |
| Unified createAdapter() with auto-detect async        | 7 functions -> 1, clean API surface                          | Good (v3.0) |
| Compile-time async lifetime enforcement               | Catch invalid patterns before runtime                        | Good (v3.0) |
| Unified provide() with auto-detect async              | 4 methods -> 1, clean builder API                            | Good (v4.0) |
| Skip Plan 14-02 (pending constraints)                 | Gap doesn't exist -- existing code sufficient                | Good (v4.0) |
| Remove HOOKS_ACCESS plugin system                     | Tracing/inspection are core, not plugins                     | Good (v5.0) |
| Single options object for createContainer             | Clean API, no backward compatibility shims                   | Good (v5.0) |
| Type-safe override builder (adapter-keyed)            | Compile-time port validation, no strings                     | Good (v5.0) |
| Symbol-based context variable keys                    | Collision prevention and type safety                         | Good (v5.0) |
| FIFO beforeResolve / LIFO afterResolve ordering       | Middleware pattern for hook composition                      | Good (v5.0) |
| Levenshtein MAX_DISTANCE=2 for suggestions            | Balances helpfulness vs false positives                      | Good (v5.0) |
| Keep core/graph/runtime as separate packages          | Architectural separation of compile-time vs runtime concerns | Good (v6.0) |
| Nested sub-packages in libs/ (libs/flow/{core,react}) | Each library groups its own ecosystem                        | Good (v6.0) |
| Flat packages in packages/, integrations/, tooling/   | No per-library integration variants needed                   | Good (v6.0) |
| workspace:\* protocol for example dependencies        | Resilient to package location changes                        | Good (v6.0) |
| Centralized Tree-Walking Subscription                 | Multi-container instrumentation without tracer propagation   | Good (v7.0) |
| Module-level span stack for context                   | Cross-container parent-child spans without AsyncLocalStorage | Good (v7.0) |
| WeakMap for Inspector-to-Container reverse lookup     | Enables garbage collection, avoids runtime API changes       | Good (v7.0) |
| W3C Trace Context manual implementation               | Zero external dependencies in core tracing package           | Good (v7.0) |
| OTel as universal standard                            | Jaeger/Zipkin via OTel exporters; DataDog via dd-trace       | Good (v7.0) |
| Conditional hook registration (isEnabled() check)     | NoOp tracer achieves 0% overhead, no hooks registered        | Good (v7.0) |
| Object pooling rejected for short-lived spans         | Modern JS engines optimize better than manual pooling        | Good (v7.0) |

---

_Last updated: 2026-02-07 after v7.0 milestone shipped_
