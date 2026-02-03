# Roadmap: HexDI

## Milestones

- [x] **v1.0 MVP** - Phases 1-2 (shipped 2025-12-xx)
- [x] **v1.1 Scoped Overrides** - Phases 3-4 (shipped 2026-01-xx)
- [x] **v1.2 Port Directions** - Phase 5 (shipped 2026-02-01)
- [x] **v2.0 Unified Port API** - Phases 6-8 (shipped 2026-02-02)
- [x] **v3.0 Unified Adapter API** - Phases 9-11 (shipped 2026-02-02)
- [x] **v4.0 GraphBuilder Improvements** - Phases 12-14 (shipped 2026-02-03) → [v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)

## Current: No active milestone

Next milestone to be defined via `/gsd:new-milestone`.

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

### Phase 11: API Removal ✅

**Goal:** Users have a clean API surface with only `createAdapter()` for adapter creation.

**Dependencies:** Phase 10 (all new API complete before removing old)

**Requirements:** REM-01, REM-02, REM-03, REM-04, REM-05, REM-06

**Plans:**

- [x] Delete deprecated source files (factory.ts, service.ts, builder.ts, from-class.ts)
- [x] Remove deprecated exports from index.ts
- [x] Update tests to use createAdapter exclusively

**Success Criteria:**

1. ✓ User cannot import `createAsyncAdapter`, `defineService`, `defineAsyncService`, `ServiceBuilder`, `fromClass`, or `createClassAdapter`
2. ✓ Attempting to import removed functions produces clear "not exported" error
3. ✓ Package exports only the unified `createAdapter()` for adapter creation

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

## Progress

All milestones through v4.0 complete.

| Milestone                      | Phases | Status   | Shipped    |
| ------------------------------ | ------ | -------- | ---------- |
| v1.0 MVP                       | 1-2    | Complete | 2025-12-xx |
| v1.1 Scoped Overrides          | 3-4    | Complete | 2026-01-xx |
| v1.2 Port Directions           | 5      | Complete | 2026-02-01 |
| v2.0 Unified Port API          | 6-8    | Complete | 2026-02-02 |
| v3.0 Unified Adapter API       | 9-11   | Complete | 2026-02-02 |
| v4.0 GraphBuilder Improvements | 12-14  | Complete | 2026-02-03 |

---

_Roadmap created: 2026-02-01_
_Last updated: 2026-02-03 (v4.0 Milestone complete)_
