# Project Milestones: HexDI

## v5.0 Runtime Package Improvements (Shipped: 2026-02-05)

**Delivered:** Elevated runtime package quality through code reorganization, plugin consolidation, type-safe override APIs, performance optimizations, comprehensive testing, and enhanced error experience.

**Phases completed:** 15-19 (22 plans total)

**Key accomplishments:**

- Split `types.ts` (1,271 LOC) into 8 focused files; extracted wrapper utilities (~180 LOC dedup)
- Consolidated tracing/inspection as core features, removed HOOKS_ACCESS plugin indirection
- O(1) child container unregistration, configurable timestamps, performance benchmarks
- Type-safe `container.override(adapter).build()` with compile-time port validation
- Compile-time circular dependency detection; context variable helpers moved to core
- 88 new tests for hooks, inspector, and tracer APIs
- Enhanced errors with "Did you mean?" suggestions and actionable code examples
- Architecture documentation (546 lines) and design decisions (1,174 lines)

**Stats:**

- 415 files changed, +42,524 / -39,120 lines
- 179,821 total lines of TypeScript
- 5 phases, 22 plans
- 1,816 tests passing (137 new tests)
- 3 days from start to ship (2026-02-03 to 2026-02-05)

**Git range:** `2b58ce6` -> `1378dc5`

**What's next:** Planning next milestone

---

## v4.0 GraphBuilder Improvements (Shipped: 2026-02-03)

**Delivered:** Unified provide() with auto-detect async, merge() with safe max depth, GraphSummary inspection mode, and bidirectional captive validation.

**Phases completed:** 12-14 (6 plans total)

**What's next:** v5.0 Runtime Package Improvements

---

## v3.0 Unified Adapter API (Shipped: 2026-02-02)

**Delivered:** Unified 7 adapter creation functions into single `createAdapter()` with auto-detect async and compile-time lifetime enforcement.

**Phases completed:** 9-11 (9 plans total)

**What's next:** v4.0 GraphBuilder Improvements

---

## v2.0 Unified Port API (Shipped: 2026-02-02)

**Delivered:** Unified 3 port creation functions into single `createPort()` with rich metadata, direction filtering, and graph inspection.

**Phases completed:** 6-8 (3 plans total)

**What's next:** v3.0 Unified Adapter API

---

## v1.2 Developer Experience (Shipped: 2026-02-01)

**Delivered:** Enhanced developer experience with override patterns, fluent builder APIs, and hexagonal port directions.

**Phases completed:** 3-5 (9 plans total)

**Key accomplishments:**

- `withOverrides()` for temporary override contexts with isolated memoization
- `ServiceBuilder` fluent API reducing boilerplate for service definitions
- `defineService<T>()('name')` curried pattern for ergonomic service creation
- `fromClass()` helper for class-based services with constructor injection
- `createInboundPort()` and `createOutboundPort()` for hexagonal architecture clarity
- Port metadata support (description, category, tags) for documentation

**Stats:**

- 27 files created/modified
- 3,457 lines of TypeScript added
- 3 phases, 9 plans
- 147 new tests (1619 total)

**Git range:** `9646a66` -> `10bb123`

---

## v1.1 Bug Fixes (Shipped: 2026-02-01)

**Delivered:** Verified and documented 3 bug fixes in the graph builder type-state machine for runtime validation and merge type preservation.

**Phases completed:** 1-2 (2 plans total)

**Key accomplishments:**

- Verified BUILD-01: Runtime captive detection runs unconditionally as defense-in-depth
- Verified MERGE-01: `UnifiedMergeInternals` correctly merges `parentProvides` using union type
- Verified MERGE-02: `UnsafeDepthOverride` flag preserved using OR semantics during merge
- Discovered all 3 documented bugs were already fixed in the codebase prior to this milestone

**Stats:**

- 11 files created/modified (planning docs)
- 2 phases, 2 plans
- 49 days from milestone start to ship (2025-12-14 -> 2026-02-01)

**Git range:** `862a060` -> `947b03d`

---

_Last updated: 2026-02-05_
