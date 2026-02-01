# HexDI

## What This Is

A TypeScript dependency injection library implementing Hexagonal Architecture (Ports & Adapters) with compile-time validation. Provides type-safe dependency graphs, lifetime management (singleton/scoped/transient), and framework integrations for React and Hono.

## Core Value

Catch dependency graph errors at compile time, not runtime — invalid graphs should fail to typecheck.

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
- ✓ Runtime captive detection as defense-in-depth — v1.1
- ✓ Merge operations preserve parentProvides union — v1.1
- ✓ Merge operations preserve UnsafeDepthOverride flag — v1.1

### Active

<!-- Current scope. Building toward these. -->

(None — ready for next milestone planning)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Performance optimization for type checking — address after v1.1 shipped
- New features — focus on stability first

## Current State

**Shipped:** v1.1 Bug Fixes (2026-02-01)

v1.1 verified and documented 3 bug fixes that were already implemented:

- BUILD-01: Runtime captive detection runs unconditionally
- MERGE-01: `UnifiedMergeInternals` merges `parentProvides` correctly
- MERGE-02: `UnsafeDepthOverride` preserved with OR semantics

All 1844 type tests and 1498 runtime tests pass.

## Context

- Monorepo with 10 packages under `@hex-di/*` scope
- Type-level validation is complex (1,250 line provide.ts, 810 line merge.ts)
- Graph builder validation is now complete and verified

## Constraints

- **Type safety**: No `any` types — per project rules
- **No casting**: Fix underlying type issues, don't cast around them
- **Backward compatible**: Changes should not break public API

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision                           | Rationale                                    | Outcome       |
| ---------------------------------- | -------------------------------------------- | ------------- |
| Fix all 3 bugs in single milestone | They're related (all in merge/build logic)   | ✓ Good (v1.1) |
| Verification-only milestone        | Bugs were already fixed in prior refactoring | ✓ Good (v1.1) |
| Defense-in-depth validation        | Runtime backs up compile-time checks         | ✓ Good (v1.1) |

---

_Last updated: 2026-02-01 after v1.1 milestone shipped_
