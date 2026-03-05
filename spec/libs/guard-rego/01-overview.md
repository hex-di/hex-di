# 01 — Overview & Philosophy

`@hex-di/guard-rego` adapts the Open Policy Agent (OPA) Rego policy engine for use with HexDI Guard's authorization system. It bridges Guard's evaluation context model with OPA's input/data/policy triad via OPA's REST API, enabling Rego-based authorization policies evaluated by an OPA sidecar daemon.

---

## Mission

Provide a production-ready OPA/Rego adapter for `@hex-di/guard` that:

1. Maps Guard subjects, resources, and actions to OPA input documents
2. Evaluates Rego policies via OPA's Data API (`POST /v1/data/{path}`)
3. Parses structured OPA decision documents into Guard's `Decision` type
4. Supports OPA's bundle system for GitOps-style policy deployment
5. Handles OPA availability failures gracefully with configurable fallback behavior

---

## Design Philosophy

1. **HTTP-first** — OPA is designed as a sidecar daemon with a REST API. The adapter communicates with OPA via HTTP, matching OPA's intended deployment model. This preserves OPA's full feature set: bundle management, decision logging, status API, and discovery.

2. **Structured decisions** — OPA's Rego language can return arbitrary JSON. The adapter defines a decision document schema that Rego policies must conform to. This contract enables reliable parsing of OPA responses into Guard `Decision` values.

3. **Input document convention** — The adapter constructs a standardized OPA input document from Guard's `EvaluationContext`. Rego policies consume this document via `input.subject`, `input.resource`, and `input.action`. The convention is documented so policy authors know the exact shape.

4. **Composable with native policies** — OPA evaluation is exposed as a Guard `PolicyConstraint` via the `regoPolicy` factory. Rego policies can be composed with Guard's native `allOf`, `anyOf`, `not`, and `labeled` combinators.

5. **Fail-closed** — If OPA is unreachable or returns an error, the adapter produces a `Deny` decision by default. This aligns with Guard's deny-by-default model and prevents authorization bypass due to infrastructure failures.

---

## Scope

### In scope (v0.1.0)

- `RegoEnginePort` — port interface for OPA evaluation
- `createRegoEngine()` — factory producing an HTTP-backed OPA client
- `regoPolicy()` — factory producing a Guard `PolicyConstraint` backed by OPA
- Input document mapping: `AuthSubject` + resource → OPA input JSON
- Decision document parsing: OPA response → Guard `Decision`
- Configurable OPA base URL, timeout, and retry
- Structured decision document schema
- Asynchronous evaluation (HTTP is inherently async)
- Health check via OPA's `/health` endpoint

### Out of scope (v0.1.0)

- Embedded OPA/WASM evaluation (see ADR-RG-001)
- Rego policy authoring or compilation
- OPA bundle management (OPA manages its own bundles)
- OPA discovery service integration
- Partial evaluation API (`POST /v1/compile`)
- Decision log retrieval
- Policy hot-reload notifications

---

## Package Structure

```
libs/guard/rego/
  src/
    index.ts                    # Public API exports
    port.ts                     # RegoEnginePort interface
    client.ts                   # HTTP-backed OPA client implementation
    factory.ts                  # createRegoEngine() and createRegoAdapter() factories
    policy.ts                   # regoPolicy() Guard PolicyConstraint factory
    input-mapper.ts             # AuthSubject/Resource → OPA input document
    decision-mapper.ts          # OPA response → Guard Decision mapping
    errors.ts                   # Error types (discriminated union)
    types.ts                    # Shared type definitions
  tests/
    unit/
      client.test.ts            # OPA HTTP client tests (mocked fetch)
      input-mapper.test.ts      # Input document construction tests
      decision-mapper.test.ts   # Decision mapping tests
      errors.test.ts            # Error construction tests
      factory.test.ts           # Factory tests
    integration/
      rego-guard.test.ts        # End-to-end Rego + Guard integration
    rego-policy.test-d.ts       # Type-level tests
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
                    │    hasRole("editor"),                │
                    │    regoPolicy("authz/documents"),    │ ← hybrid: native + Rego
                    │  ]);                                 │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   @hex-di/guard — evaluateAsync()   │
                    │                                     │
                    │  Dispatches to policy kind handler   │
                    │  "regoPolicy" → RegoEnginePort      │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   @hex-di/guard-rego                 │
                    │                                     │
                    │  ┌──────────┐  ┌──────────────────┐ │
                    │  │ Input    │  │ Decision          │ │
                    │  │ Mapper   │  │ Mapper            │ │
                    │  └────┬─────┘  └────────┬─────────┘ │
                    │       │                 ▲            │
                    │  ┌────▼─────────────────┴────────┐  │
                    │  │   HTTP Client                  │  │
                    │  │   POST /v1/data/{path}         │  │
                    │  └────────────┬──────────────────┘  │
                    └───────────────┼──────────────────────┘
                                    │ HTTP
                    ┌───────────────▼──────────────────────┐
                    │   OPA Sidecar Daemon                  │
                    │                                       │
                    │  ┌─────────┐ ┌──────┐ ┌───────────┐  │
                    │  │ Rego    │ │ Data │ │ Bundle    │  │
                    │  │ Policies│ │ Store│ │ Manager   │  │
                    │  └─────────┘ └──────┘ └───────────┘  │
                    └───────────────────────────────────────┘
```
