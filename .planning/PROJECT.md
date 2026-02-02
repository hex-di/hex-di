# HexDI

## What This Is

A TypeScript dependency injection library implementing Hexagonal Architecture (Ports & Adapters) with compile-time validation. Provides type-safe dependency graphs, lifetime management (singleton/scoped/transient), fluent builder APIs, and framework integrations for React and Hono.

## Core Value

Catch dependency graph errors at compile time, not runtime — invalid graphs should fail to typecheck.

## Current State

**Latest:** v3.0 Unified Adapter API (shipped 2026-02-02)

- 10 packages under `@hex-di/*` scope
- 1634 tests passing
- Unified `createAdapter()` with auto-detect async

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
- Scoped overrides with `withOverrides()` pattern — v1.2
- Enhanced `defineService()` with builder pattern — v1.2
- `fromClass()` helper for class-based services — v1.2
- Port direction types (`createInboundPort()`, `createOutboundPort()`) — v1.2
- Port metadata for documentation and visualization — v1.2
- Unified `createPort()` with object config — v2.0
- `InboundPorts`/`OutboundPorts` type utilities — v2.0
- Graph inspection filtering by direction/category/tags — v2.0
- Unified `createAdapter()` function replacing 7 adapter creation patterns — v3.0
- Auto-detect async from factory return type — v3.0
- Compile-time enforcement: async factories require singleton lifetime — v3.0
- Smart defaults (lifetime: singleton, requires: []) — v3.0

### Active

<!-- Current scope. Building toward these. -->

(No active milestone)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Decorator-based registration — Optional future package, not core
- Convention-based auto-wiring — Too implicit for core library philosophy
- Performance optimization for type checking — Address in dedicated milestone
- Request-scoped lifetime — Redundant with existing scoped lifetime and createScope()

## Context

- Monorepo with 10 packages under `@hex-di/*` scope
- Type-level validation is complex (1,250 line provide.ts, 810 line merge.ts)
- Graph builder validation is complete and verified
- v1.2 improved weakest areas: scoped overrides (7→9), API ergonomics (8→9), port system (8.5→9)

## Constraints

- **Type safety**: No `any` types — per project rules
- **No casting**: Fix underlying type issues, don't cast around them
- **Backward compatible**: All improvements are additive, existing API unchanged

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision                                            | Rationale                                    | Outcome       |
| --------------------------------------------------- | -------------------------------------------- | ------------- |
| Fix all 3 bugs in single milestone                  | They're related (all in merge/build logic)   | ✓ Good (v1.1) |
| Verification-only milestone                         | Bugs were already fixed in prior refactoring | ✓ Good (v1.1) |
| Defense-in-depth validation                         | Runtime backs up compile-time checks         | ✓ Good (v1.1) |
| Focus v1.2 on DX improvements                       | Expert analysis shows clear priority areas   | ✓ Good (v1.2) |
| Additive-only changes for v1.2                      | Maintains backward compatibility             | ✓ Good (v1.2) |
| Factory-based overrides keyed by port name          | API simplicity, lazy instantiation           | ✓ Good (v1.2) |
| Curried create<TService>()(name) for ServiceBuilder | Enables partial type application             | ✓ Good (v1.2) |
| DirectedPort as intersection with Port              | Backward compatible, gradual adoption        | ✓ Good (v1.2) |
| Unified createPort() with object config             | Single entry point, rich metadata            | ✓ Good (v2.0) |
| Unified createAdapter() with auto-detect async      | 7 functions → 1, clean API surface           | ✓ Good (v3.0) |
| Compile-time async lifetime enforcement             | Catch invalid patterns before runtime        | ✓ Good (v3.0) |

---

_Last updated: 2026-02-02 after v3.0 milestone completed_
