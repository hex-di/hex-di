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

### Active

<!-- Current scope. Building toward these. -->

- [ ] Fix forward reference validation gap in `buildGraph()`
- [ ] Fix parentProvides merge losing second graph's ports
- [ ] Fix UnsafeDepthOverride flag lost during merge

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Performance optimization for type checking — address after correctness bugs fixed
- New features — focus on fixing existing bugs first

## Current Milestone: v1.1 Bug Fixes

**Goal:** Fix the 3 documented bugs in the graph builder type-state machine.

**Target fixes:**

- Forward reference validation gap (High priority)
- parentProvides merge issue (High priority)
- UnsafeDepthOverride merge flag loss (Medium priority)

## Context

- Monorepo with 10 packages under `@hex-di/*` scope
- Type-level validation is complex (1,250 line provide.ts, 810 line merge.ts)
- Bugs are in `packages/graph/src/builder/` area
- Existing test files document expected behavior for each bug

## Constraints

- **Type safety**: No `any` types in fixes — per project rules
- **No casting**: Fix underlying type issues, don't cast around them
- **Backward compatible**: Fixes should not change public API

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision                           | Rationale                                  | Outcome   |
| ---------------------------------- | ------------------------------------------ | --------- |
| Fix all 3 bugs in single milestone | They're related (all in merge/build logic) | — Pending |

---

_Last updated: 2026-02-01 after milestone v1.1 started_
