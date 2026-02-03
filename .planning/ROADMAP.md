# Roadmap: HexDI

## Milestones

- [x] **v1.0 MVP** - Phases 1-2 (shipped 2025-12-xx)
- [x] **v1.1 Scoped Overrides** - Phases 3-4 (shipped 2026-01-xx)
- [x] **v1.2 Port Directions** - Phase 5 (shipped 2026-02-01)
- [x] **v2.0 Unified Port API** - Phases 6-8 (shipped 2026-02-02)
- [x] **v3.0 Unified Adapter API** - Phases 9-11 (shipped 2026-02-02)
- [x] **v4.0 GraphBuilder Improvements** - Phases 12-14 (shipped 2026-02-03) -> [v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)
- [ ] **v5.0 Runtime Package Improvements** - Phases 15-19 (current)

## Current: v5.0 Runtime Package Improvements

**Milestone Goal:** Elevate runtime package quality from 8.7/10 to 9.5/10 through code organization, plugin consolidation, type-safe APIs, performance optimizations, comprehensive testing, and enhanced developer experience.

### Phase 15: Foundation

**Goal:** Developers work with a well-organized codebase where tracing and inspection are core features, not plugins.

**Dependencies:** None (foundation phase)

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, API-05

**Success Criteria:**

1. Types are split into focused files (<400 lines each), imports resolve without circular dependency errors
2. Wrapper utility functions are extracted to a shared module, reducing duplication by ~200 LOC
3. Tracing is a core runtime feature accessed via container API, not via HOOKS_ACCESS symbol
4. Inspection is a core runtime feature accessed via container API, not via plugin indirection
5. Legacy type exports (`CaptiveDependencyErrorLegacy`, etc.) removed from package exports

**Plans:** 5 plans

Plans:

- [ ] 15-01-PLAN.md - Split types.ts into types/ subdirectory
- [ ] 15-02-PLAN.md - Extract wrapper utilities to wrapper-utils.ts
- [ ] 15-03-PLAN.md - Add public hook API, remove HOOKS_ACCESS
- [ ] 15-04-PLAN.md - Create standalone inspect/trace functions
- [ ] 15-05-PLAN.md - Remove legacy exports, add explicit return types

---

### Phase 16: Performance

**Goal:** Runtime container operations meet production performance requirements with measurable baselines.

**Dependencies:** None (parallel-safe with Phase 15)

**Requirements:** PERF-01, PERF-02, PERF-03

**Success Criteria:**

1. Child container unregistration completes in O(1) time (Map-based tracking replaces Array.filter)
2. Timestamp capture can be disabled via configuration option for production builds
3. Performance benchmarks exist for resolution (100k ops), scope operations (10k ops), and disposal (1k containers)

**Plans:** TBD

---

### Phase 17: Type-Safe API

**Goal:** Users get compile-time validation for override configurations and simplified container creation.

**Dependencies:** Phase 15 (requires consolidated runtime before new API patterns)

**Requirements:** API-01, API-02, API-03, API-04, TYPE-01, TYPE-02

**Success Criteria:**

1. User can call `withOverrides({ [portObject]: () => mock })` with compile-time port name validation
2. User can use fluent builder: `container.withOverrides().override(port, () => mock).build()`
3. User creates container with single options object: `createContainer({ graph, hooks, options })`
4. Existing string-based override API continues to work (deprecated but functional)
5. Circular dependency detection surfaces at compile time with clear error types
6. Context variable helpers available in `@hex-di/core` package

**Plans:** TBD

---

### Phase 18: Testing

**Goal:** Hook and core tracing/inspection APIs have comprehensive test coverage documenting expected behavior.

**Dependencies:** Phases 15-17 (test final consolidated API surface)

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04

**Success Criteria:**

1. Resolution hook tests cover 20+ scenarios (beforeResolve, afterResolve, error cases, async)
2. Hook composition tests verify 10+ ordering and interaction patterns
3. Inspector API tests cover core integrated API (not plugin), validating all public methods and edge cases
4. Tracer API tests cover core integrated API, verifying trace collection, filtering, and output formats

**Plans:** TBD

---

### Phase 19: Polish

**Goal:** Users receive actionable guidance when errors occur and can understand system architecture.

**Dependencies:** Phases 15-18 (document and polish final state)

**Requirements:** ERR-01, ERR-02, ERR-03, DOC-01, DOC-02, DOC-03, DOC-04

**Success Criteria:**

1. Runtime errors include `suggestion` property with specific fix recommendations
2. Common error messages include copy-paste-ready code examples showing correct usage
3. Mistyped port names trigger "Did you mean X?" suggestions with Levenshtein distance matching
4. Architecture documentation explains container lifecycle, resolution flow, and module responsibilities
5. Container lifecycle state machine is documented with visual diagram
6. Type parameters documented with `@typeParam` JSDoc for IDE hover information

**Plans:** TBD

---

## Progress

| Milestone                         | Phases | Status      | Shipped    |
| --------------------------------- | ------ | ----------- | ---------- |
| v1.0 MVP                          | 1-2    | Complete    | 2025-12-xx |
| v1.1 Scoped Overrides             | 3-4    | Complete    | 2026-01-xx |
| v1.2 Port Directions              | 5      | Complete    | 2026-02-01 |
| v2.0 Unified Port API             | 6-8    | Complete    | 2026-02-02 |
| v3.0 Unified Adapter API          | 9-11   | Complete    | 2026-02-02 |
| v4.0 GraphBuilder Improvements    | 12-14  | Complete    | 2026-02-03 |
| v5.0 Runtime Package Improvements | 15-19  | In Progress | -          |

---

<details>
<summary>v3.0 Unified Adapter API (Phases 9-11) - SHIPPED</summary>

## v3.0 Unified Adapter API

**Milestone Goal:** Unify Adapter API from 7 functions to 1, with compile-time async/lifetime enforcement.

### Phase 9: Unified createAdapter

**Goal:** Users create all adapters through a single `createAdapter()` function with object config.

**Dependencies:** None (foundation phase)

**Requirements:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, CLASS-01, CLASS-02, CLASS-03

**Plans:** 6 plans

Plans:

- [x] 09-01-PLAN.md - Config types and branded error types
- [x] 09-02-PLAN.md - Factory-based createAdapter overloads
- [x] 09-03-PLAN.md - Class-based createAdapter overloads
- [x] 09-04-PLAN.md - Type tests for compile-time validation
- [x] 09-05-PLAN.md - Runtime tests for behavior verification
- [x] 09-06-PLAN.md - Export and integration

**Success Criteria:**

1. User can create sync adapter with `createAdapter({ provides: port, factory: deps => ... })`
2. User can create class-based adapter with `createAdapter({ provides: port, class: MyClass, requires: [...] })`
3. User receives compile error when specifying both `factory` and `class`
4. User can omit `requires` and `lifetime` (defaults applied)
5. User can create async adapter with Promise-returning factory (auto-detected)

---

### Phase 10: Async Lifetime Enforcement

**Goal:** Users receive compile-time errors when combining async factories with non-singleton lifetimes.

**Dependencies:** Phase 9 (requires unified createAdapter)

**Requirements:** ASYNC-01, ASYNC-02, ASYNC-03, ASYNC-04, ASYNC-05

**Plans:** 2 plans

Plans:

- [x] 10-01-PLAN.md - Async lifetime error types and overload updates
- [x] 10-02-PLAN.md - Type tests for compile-time enforcement

**Success Criteria:**

1. User sees compile error when using `lifetime: 'scoped'` with async factory
2. User sees compile error when using `lifetime: 'transient'` with async factory
3. User can successfully compile async factory with `lifetime: 'singleton'` or lifetime omitted
4. Error message includes actionable hint explaining the singleton requirement

---

### Phase 11: API Removal

**Goal:** Users have a clean API surface with only `createAdapter()` for adapter creation.

**Dependencies:** Phase 10 (all new API complete before removing old)

**Requirements:** REM-01, REM-02, REM-03, REM-04, REM-05, REM-06

**Plans:**

- [x] Delete deprecated source files (factory.ts, service.ts, builder.ts, from-class.ts)
- [x] Remove deprecated exports from index.ts
- [x] Update tests to use createAdapter exclusively

**Success Criteria:**

1. User cannot import `createAsyncAdapter`, `defineService`, `defineAsyncService`, `ServiceBuilder`, `fromClass`, or `createClassAdapter`
2. Attempting to import removed functions produces clear "not exported" error
3. Package exports only the unified `createAdapter()` for adapter creation

</details>

## Phases (Historical)

<details>
<summary>v1.0-v1.2 (Phases 1-5) - SHIPPED</summary>

Phase 1-5 completed across milestones v1.0, v1.1, and v1.2.
See git history for details.

</details>

<details>
<summary>v2.0 Unified Port API (Phases 6-8) - SHIPPED</summary>

**Milestone Goal:** Single createPort() function with rich metadata, replacing three separate functions.

- [x] **Phase 6: Core Port API** - Unified createPort with metadata support
- [x] **Phase 7: Type Helpers** - Direction filtering and type aliases
- [x] **Phase 8: Graph Inspection** - Filtering by direction, category, tags

</details>

---

_Roadmap created: 2026-02-01_
_Last updated: 2026-02-03 (Phase 15 planned)_
