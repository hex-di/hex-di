# Roadmap: HexDI

## Milestones

- [x] **v1.0 MVP** - Phases 1-2 (shipped 2025-12-xx)
- [x] **v1.1 Scoped Overrides** - Phases 3-4 (shipped 2026-01-xx)
- [x] **v1.2 Port Directions** - Phase 5 (shipped 2026-02-01)
- [x] **v2.0 Unified Port API** - Phases 6-8 (shipped 2026-02-02)
- [ ] **v3.0 Unified Adapter API** - Phases 9-12 (in progress)

## v3.0 Unified Adapter API

**Milestone Goal:** Unify Adapter API from 7 functions to 1, with compile-time async/lifetime enforcement.

### Phase 9: Unified createAdapter

**Goal:** Users create all adapters through a single `createAdapter()` function with object config.

**Dependencies:** None (foundation phase)

**Requirements:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, CLASS-01, CLASS-02, CLASS-03

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

**Success Criteria:**

1. User cannot import `createAsyncAdapter`, `defineService`, `defineAsyncService`, `ServiceBuilder`, `fromClass`, or `createClassAdapter`
2. Attempting to import removed functions produces clear "not exported" error
3. Package exports only the unified `createAdapter()` for adapter creation

---

### Phase 12: Migration

**Goal:** All existing tests and documentation use the new `createAdapter()` API.

**Dependencies:** Phase 11 (old APIs removed, must update consumers)

**Requirements:** MIG-01, MIG-02

**Success Criteria:**

1. All test files use `createAdapter()` API exclusively
2. All tests pass with new API
3. Documentation shows `createAdapter()` as the single entry point

---

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

| Phase | Name                       | Status  | Requirements |
| ----- | -------------------------- | ------- | ------------ |
| 9     | Unified createAdapter      | Pending | 10           |
| 10    | Async Lifetime Enforcement | Pending | 5            |
| 11    | API Removal                | Pending | 6            |
| 12    | Migration                  | Pending | 2            |

**v3.0 Coverage:** 23/23 requirements mapped

---

_Roadmap created: 2026-02-01_
_Last updated: 2026-02-02 (v3.0 phases added)_
