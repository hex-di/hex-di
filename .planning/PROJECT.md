# HexDI

## What This Is

A TypeScript dependency injection library implementing Hexagonal Architecture (Ports & Adapters) with compile-time validation. Provides type-safe dependency graphs, lifetime management (singleton/scoped/transient), and framework integrations for React and Hono.

## Core Value

Catch dependency graph errors at compile time, not runtime — invalid graphs should fail to typecheck.

## Current Milestone: v1.2 Developer Experience

**Goal:** Improve developer experience through better override patterns, ergonomic APIs, and enhanced port system clarity.

**Target features:**

- Scoped override patterns (`withOverrides()`, request-scoped lifetime)
- Enhanced API ergonomics (`defineService()` builder, `fromClass()` helper)
- Port direction types for hexagonal clarity (`createInboundPort()`, `createOutboundPort()`)

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
- Runtime captive detection as defense-in-depth — v1.1
- Merge operations preserve parentProvides union — v1.1
- Merge operations preserve UnsafeDepthOverride flag — v1.1

### Active

<!-- Current scope. Building toward these. -->

- [ ] Scoped overrides with `withOverrides()` pattern
- [ ] Request-scoped lifetime as first-class concept
- [ ] Enhanced `defineService()` with builder pattern
- [ ] `fromClass()` helper for class-based services
- [ ] Port direction types (`createInboundPort()`, `createOutboundPort()`)
- [ ] Port metadata for documentation and visualization

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Decorator-based registration — Optional future package, not core v1.2
- Convention-based auto-wiring — Too implicit for core library philosophy
- Performance optimization for type checking — address in dedicated milestone

## Current State

**In Progress:** v1.2 Developer Experience

Based on comprehensive analysis (8.88/10 overall score from expert review), prioritizing:

1. **Scoped Overrides** (7.0 → 9.0) — Highest impact improvement
2. **API Ergonomics** (8.0 → 9.5) — High developer value
3. **Port System** (8.5 → 9.5) — Architectural clarity

All 1844 type tests and 1498 runtime tests pass.

## Context

- Monorepo with 10 packages under `@hex-di/*` scope
- Type-level validation is complex (1,250 line provide.ts, 810 line merge.ts)
- Graph builder validation is now complete and verified
- Expert analysis identified scoped overrides as weakest area (7.0/10)

## Constraints

- **Type safety**: No `any` types — per project rules
- **No casting**: Fix underlying type issues, don't cast around them
- **Backward compatible**: All improvements are additive, existing API unchanged

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision                           | Rationale                                    | Outcome       |
| ---------------------------------- | -------------------------------------------- | ------------- |
| Fix all 3 bugs in single milestone | They're related (all in merge/build logic)   | ✓ Good (v1.1) |
| Verification-only milestone        | Bugs were already fixed in prior refactoring | ✓ Good (v1.1) |
| Defense-in-depth validation        | Runtime backs up compile-time checks         | ✓ Good (v1.1) |
| Focus v1.2 on DX improvements      | Expert analysis shows clear priority areas   | — Pending     |
| Additive-only changes for v1.2     | Maintains backward compatibility             | — Pending     |

---

_Last updated: 2026-02-01 after v1.2 milestone started_
