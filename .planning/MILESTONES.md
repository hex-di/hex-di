# Project Milestones: HexDI

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

**Git range:** `9646a66` → `10bb123`

**What's next:** v1.3 planning

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
- 49 days from milestone start to ship (2025-12-14 → 2026-02-01)

**Git range:** `862a060` → `947b03d`

---

_Last updated: 2026-02-01_
