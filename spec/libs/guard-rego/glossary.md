# @hex-di/guard-rego — Glossary

Domain terminology for the OPA/Rego policy engine adapter.

---

## OPA (Open Policy Agent)

A CNCF-graduated, general-purpose policy engine. OPA decouples policy decisions from application code. It runs as a sidecar daemon, exposes a REST API, and evaluates policies written in the Rego language.

See [01-overview.md](01-overview.md).

---

## Rego

A Datalog-inspired, declarative policy language used by OPA. Rego is Turing-complete and supports rules, comprehensions, negation, partial evaluation, and ~150 built-in functions. Policies operate over an `input` document (request-scoped) and `data` documents (bundle-scoped).

See [03-policy-translation.md](03-policy-translation.md).

---

## Input Document

The JSON object sent to OPA as the `input` field of a query request. In this adapter, the input document is constructed from Guard's `EvaluationContext`: `input.subject` (AuthSubject), `input.resource` (resource record), and `input.action` (action string).

See [04-input-document-mapping.md](04-input-document-mapping.md).

---

## Data Document

Static JSON data loaded into OPA via bundles. Rego policies access data via `data.<path>`. Data documents provide reference information like role-permission mappings, classification levels, and organization hierarchies. Unlike input documents (request-scoped), data documents are bundle-scoped and shared across all evaluations.

See [05-bundle-management.md](05-bundle-management.md).

---

## Bundle

An OPA bundle is a tarball (`.tar.gz`) containing Rego policies, JSON data documents, and a manifest. OPA loads bundles from a configured bundle server and polls for updates. The adapter does not manage bundles — OPA does this autonomously.

See [05-bundle-management.md](05-bundle-management.md).

---

## Decision Document

A structured JSON object returned by Rego policies that conforms to the `OpaDecisionDocument` schema: `{ allow: boolean, reason?: string, visibleFields?: string[], metadata?: Record }`. This is the adapter's convention for parsing rich authorization decisions from OPA.

See [06-decision-mapping.md](06-decision-mapping.md#structured-decision-documents).

---

## Decision ID

A unique identifier returned by OPA for each query evaluation. When OPA's decision logging is enabled, the decision ID links a query response to its entry in OPA's decision log. The adapter propagates this ID to Guard's evaluation trace for audit correlation.

See [06-decision-mapping.md](06-decision-mapping.md#trace-and-diagnostics).

---

## Sidecar

A deployment pattern where OPA runs as a co-located process alongside the application (e.g., as a Kubernetes sidecar container or a separate daemon on the same host). The adapter communicates with OPA via `localhost` HTTP calls, minimizing network latency while keeping the policy engine in a separate process.

See [ADR-RG-001](decisions/001-http-sidecar-over-embedded-wasm.md).

---

## Data API

OPA's REST endpoint for policy evaluation: `POST /v1/data/{path}`. The `{path}` maps to a Rego package/rule path. The request body contains the `input` document. The response contains the `result` (policy evaluation output).

See [02-rego-engine-port.md](02-rego-engine-port.md).

---

## Fail-Closed

A security pattern where authorization failures default to deny. If the OPA sidecar is unreachable, the adapter produces a `Deny` decision rather than failing open. This prevents authorization bypass due to infrastructure failures.

See [INV-RG-1](invariants.md#inv-rg-1-fail-closed-on-opa-unavailability).

---

## Partial Rules

A Rego concept where multiple rule bodies with the same name combine via logical OR. If any body evaluates to `true`, the rule is `true`. This enables additive policy authoring:

```rego
allow if { input.subject.roles[_] == "admin" }
allow if { input.action == "read"; input.subject.roles[_] == "viewer" }
```

See [03-policy-translation.md](03-policy-translation.md#rego-policy-conventions).

---

## Undefined

In OPA/Rego, a rule that has no matching body evaluates to `undefined` (not `false`). The adapter treats `undefined` as deny, consistent with OPA's convention that undefined = no matching rules = deny.

See [02-rego-engine-port.md](02-rego-engine-port.md#opa-query-response).
