# 01 — Overview & Philosophy

`@hex-di/guard-cedar` adapts the AWS Cedar policy engine for use with HexDI Guard's authorization system. It bridges Guard's evaluation context model with Cedar's PARC (Principal, Action, Resource, Context) authorization request format, enabling declarative, formally verifiable authorization policies.

---

## Mission

Provide a zero-configuration Cedar policy evaluation adapter for `@hex-di/guard` that:

1. Maps Guard subjects, resources, and actions to Cedar's typed entity model
2. Evaluates Cedar policies via the embedded WASM engine (no external service required)
3. Returns Guard-compatible `Decision` values with full evaluation traces
4. Supports Cedar's formal verification capabilities for policy correctness proofs

---

## Design Philosophy

1. **Embedded evaluation** — Cedar policies are evaluated in-process via WASM, eliminating network latency and external service dependencies. The adapter ships the Cedar WASM module as a dependency.

2. **Schema-first** — Every Cedar deployment requires a schema that types principals, resources, actions, and their attributes. The adapter enforces schema-first authoring: policies that don't conform to the schema are rejected at load time, not at evaluation time.

3. **Faithful translation** — Guard's evaluation context maps directly to Cedar's PARC model. The adapter does not invent abstractions on top of Cedar — it translates faithfully between the two models. Guard's `AuthSubject` becomes a Cedar principal entity, Guard's resource becomes a Cedar resource entity, and the policy kind becomes a Cedar action.

4. **Composable with native policies** — Cedar evaluation is exposed as a Guard `PolicyConstraint` via the `cedarPolicy` factory. This means Cedar policies can be composed with Guard's native `allOf`, `anyOf`, `not`, and `labeled` combinators, enabling hybrid authorization strategies.

5. **Default-deny preserved** — Cedar's default-deny semantics align with Guard's deny-by-default model. A Cedar evaluation that produces no matching `permit` policy results in a Guard `Deny` decision.

---

## Scope

### In scope (v0.1.0)

- `CedarEnginePort` — port interface for Cedar evaluation
- `createCedarEngine()` — factory producing a WASM-backed Cedar engine
- `cedarPolicy()` — factory producing a Guard `PolicyConstraint` backed by Cedar
- Entity mapping: `AuthSubject` → Cedar principal, resource → Cedar resource
- Schema loading from JSON or Cedar schema format
- Policy loading from Cedar policy text
- Decision mapping: Cedar `Allow`/`Deny` → Guard `Decision`
- Diagnostics propagation (Cedar's policy-level reasons)
- Synchronous evaluation (WASM is synchronous)

### Out of scope (v0.1.0)

- HTTP/gRPC Cedar service integration (see ADR-CD-001)
- Cedar policy authoring UI or tooling
- Automatic schema generation from Guard types
- Cedar template policies
- Cedar partial evaluation
- Policy hot-reloading (planned for v0.2.0)

---

## Package Structure

```
libs/guard/cedar/
  src/
    index.ts                    # Public API exports
    port.ts                     # CedarEnginePort interface
    engine.ts                   # WASM-backed CedarEngine implementation
    factory.ts                  # createCedarEngine() factory
    policy.ts                   # cedarPolicy() Guard PolicyConstraint factory
    entity-mapper.ts            # AuthSubject/Resource → Cedar Entity mapping
    schema-loader.ts            # Cedar schema loading and validation
    policy-store.ts             # Cedar policy text storage
    decision-mapper.ts          # Cedar Response → Guard Decision mapping
    errors.ts                   # Error types (discriminated union)
    types.ts                    # Shared type definitions
  tests/
    unit/
      engine.test.ts            # CedarEngine unit tests
      entity-mapper.test.ts     # Entity mapping tests
      schema-loader.test.ts     # Schema loading tests
      policy-store.test.ts      # Policy store tests
      decision-mapper.test.ts   # Decision mapping tests
      errors.test.ts            # Error construction tests
    integration/
      cedar-guard.test.ts       # End-to-end Cedar + Guard integration
    cedar-policy.test-d.ts      # Type-level tests
  package.json
  tsconfig.json
  tsconfig.build.json
```

---

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │         Application Code            │
                    │                                     │
                    │  const policy = allOf([             │
                    │    hasRole("admin"),                 │
                    │    cedarPolicy("documents:read"),    │ ← hybrid: native + Cedar
                    │  ]);                                 │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │     @hex-di/guard — evaluate()      │
                    │                                     │
                    │  Dispatches to policy kind handler   │
                    │  "cedarPolicy" → CedarEnginePort    │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   @hex-di/guard-cedar               │
                    │                                     │
                    │  ┌──────────┐  ┌─────────────────┐  │
                    │  │ Entity   │  │ Policy           │  │
                    │  │ Mapper   │  │ Store            │  │
                    │  └────┬─────┘  └────────┬────────┘  │
                    │       │                 │            │
                    │  ┌────▼─────────────────▼────────┐  │
                    │  │   Cedar WASM Engine            │  │
                    │  │   (isAuthorized)               │  │
                    │  └────────────┬──────────────────┘  │
                    │               │                      │
                    │  ┌────────────▼──────────────────┐  │
                    │  │   Decision Mapper              │  │
                    │  │   Cedar Response → Guard       │  │
                    │  └───────────────────────────────┘  │
                    └─────────────────────────────────────┘
```
