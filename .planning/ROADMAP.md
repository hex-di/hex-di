# Roadmap: HexDI v1.2 Developer Experience

**Created:** 2026-02-01
**Milestone:** v1.2 Developer Experience
**Goal:** Improve developer experience through better override patterns, ergonomic APIs, and enhanced port system clarity

## Phase Overview

| #   | Phase            | Goal                                   | Requirements         | Success Criteria |
| --- | ---------------- | -------------------------------------- | -------------------- | ---------------- |
| 3   | Scoped Overrides | Enable runtime override contexts       | SCOPE-01 to SCOPE-06 | 6                |
| 4   | API Ergonomics   | Reduce boilerplate for common patterns | API-01 to API-06     | 6                |
| 5   | Port Directions  | Add hexagonal clarity to port system   | PORT-01 to PORT-05   | 5                |

**Total:** 3 phases | 17 requirements | All mapped

## Phase 3: Scoped Overrides

**Goal:** Enable temporary override contexts and request-scoped lifetimes for flexible service substitution

**Requirements:** SCOPE-01, SCOPE-02, SCOPE-03, SCOPE-04, SCOPE-05, SCOPE-06

**Why this phase:** Scoped overrides scored lowest (7.0/10) in expert analysis. Current HexDI requires container recreation for any override scenario, creating friction for testing and multi-tenant use cases.

**Key deliverables:**

- `withOverrides()` method on Container for temporary override contexts
- `'request'` lifetime as first-class option in Lifetime type
- `createRequestScope()` for HTTP request isolation
- Isolated MemoMap per override context

**Success criteria:**

1. User can call `container.withOverrides({ port: adapter }, fn)` to resolve with temporary overrides
2. Override context instances are isolated from parent container memo
3. Request-scoped services are created fresh per request context
4. All existing tests continue to pass (backward compatible)
5. Type inference correctly tracks override types
6. Documentation includes usage examples

**Files likely modified:**

- `packages/runtime/src/container/base-container.ts`
- `packages/runtime/src/container/types.ts`
- `packages/core/src/adapters/types.ts` (Lifetime type)
- `packages/runtime/src/scope/` (new request scope implementation)

---

## Phase 4: API Ergonomics

**Goal:** Reduce boilerplate for common service definition patterns through builder API and class helpers

**Requirements:** API-01, API-02, API-03, API-04, API-05, API-06

**Why this phase:** API ergonomics scored 8.0/10. While functional, the current API requires verbose explicit configuration for every service. A builder pattern can reduce boilerplate by ~50% for common cases.

**Key deliverables:**

- Enhanced `defineService()` with fluent builder pattern
- `.singleton()`, `.scoped()`, `.transient()` lifetime chainable methods
- `.requires(...ports)` for dependency declaration
- `.factory(fn)` terminal method
- `fromClass()` helper for class-based services

**Success criteria:**

1. User can define service as `defineService<Logger>('Logger').singleton().factory(() => new ConsoleLogger())`
2. Dependencies declared as `.requires(PortA, PortB)` flow correctly to factory function
3. `fromClass(MyClass).as<MyInterface>('Name').scoped()` creates correct adapter
4. Type inference works throughout builder chain
5. Existing `createAdapter()` and `defineService()` APIs continue to work unchanged
6. Documentation includes migration examples

**Files likely modified:**

- `packages/graph/src/adapter/define-service.ts`
- `packages/graph/src/adapter/from-class.ts` (new)
- `packages/graph/src/adapter/builder.ts` (new)
- `packages/graph/src/index.ts` (exports)

---

## Phase 5: Port Directions

**Goal:** Add explicit inbound/outbound port distinction for hexagonal architecture clarity

**Requirements:** PORT-01, PORT-02, PORT-03, PORT-04, PORT-05

**Why this phase:** Port system scored 8.5/10. While type-safe, ports don't distinguish between inbound (use cases) and outbound (infrastructure) roles. This distinction is core to hexagonal architecture and aids documentation/visualization.

**Key deliverables:**

- `createInboundPort()` factory with `__direction: 'inbound'`
- `createOutboundPort()` factory with `__direction: 'outbound'`
- `PortMetadata` interface with description, category, tags
- `isDirectedPort()` type guard
- Backward compatibility with existing `Port` type

**Success criteria:**

1. User can create `createInboundPort<'CreateUser', CreateUserUseCase>({ name: 'CreateUser', description: '...' })`
2. User can create `createOutboundPort<'UserRepo', UserRepository>({ name: 'UserRepo', category: 'Persistence' })`
3. `isDirectedPort(port)` correctly narrows type
4. Directed ports work with existing GraphBuilder and Container
5. Existing `createPort()` continues to work unchanged
6. Port inspector can categorize ports by direction

**Files likely modified:**

- `packages/core/src/ports/types.ts`
- `packages/core/src/ports/factory.ts`
- `packages/core/src/ports/directed.ts` (new)
- `packages/core/src/index.ts` (exports)

---

## Execution Order

Phases are ordered by:

1. **Impact** — Scoped overrides addresses weakest area first
2. **Dependencies** — API ergonomics builds on stable runtime
3. **Risk** — Port directions are most isolated change

**Recommended execution:**

```
Phase 3 (Scoped Overrides) → Phase 4 (API Ergonomics) → Phase 5 (Port Directions)
```

## Validation Strategy

**Per-phase validation:**

- All existing tests pass (1844 type + 1498 runtime)
- New tests cover all requirements
- No `any` types or casting (per project rules)
- Public API additions are backward compatible

**Milestone validation:**

- All 17 requirements marked complete
- Expert re-analysis shows score improvements
- Documentation updated for all new APIs

---

_Roadmap created: 2026-02-01_
_Last updated: 2026-02-01 after initial creation_
