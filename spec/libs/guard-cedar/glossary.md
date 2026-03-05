# @hex-di/guard-cedar — Glossary

Domain terminology for the Cedar policy engine adapter.

---

## Cedar

An open-source authorization policy language and evaluation engine developed by AWS. Cedar uses a `permit`/`forbid` effect model with default-deny semantics. It is not Turing-complete by design, enabling formal verification of policies.

See [01-overview.md](01-overview.md).

---

## PARC

Principal, Action, Resource, Context — the four components of a Cedar authorization request. Every Cedar evaluation answers: "Can this **principal** perform this **action** on this **resource** given this **context**?"

See [02-cedar-engine-port.md](02-cedar-engine-port.md#authorization-request).

---

## Entity

A Cedar entity is a typed object with an entity UID (type + ID pair), a set of attributes, and a set of parent entity UIDs. Entities form a directed acyclic graph (DAG) where parent relationships represent membership or hierarchy (e.g., a User is `in` a Group).

See [04-entity-mapping.md](04-entity-mapping.md).

---

## Entity UID

A pair of `(type, id)` that uniquely identifies a Cedar entity. Written in Cedar syntax as `Type::"id"` (e.g., `User::"alice"`, `Role::"admin"`).

See [02-cedar-engine-port.md](02-cedar-engine-port.md#authorization-request).

---

## Entity Slice

The subset of entities relevant to a single authorization request. The adapter builds an entity slice from the Guard evaluation context (subject, resource, roles) and passes it to the Cedar engine.

See [04-entity-mapping.md](04-entity-mapping.md#entity-slice-construction).

---

## Entity DAG

Directed Acyclic Graph formed by entity parent relationships. Cedar's `in` operator traverses this graph transitively: `principal in Group::"engineering"` is true if the principal is directly or transitively a member of the group.

See [ADR-CD-002](decisions/002-entity-dag-mapping-strategy.md).

---

## Default Deny

Cedar's fundamental evaluation rule: if no `permit` policy matches the request, the decision is `deny`. This is the same model as Guard's deny-by-default.

See [03-policy-translation.md](03-policy-translation.md#evaluation-semantics).

---

## Forbid Overrides Permit

Cedar's second evaluation rule: if any `forbid` policy matches the request, the decision is `deny` regardless of how many `permit` policies also match. Forbid is absolute.

See [03-policy-translation.md](03-policy-translation.md#evaluation-semantics).

---

## Skip on Error

Cedar's third evaluation rule: if a policy condition throws a runtime error (e.g., accessing an undefined attribute), the policy is skipped — it does not contribute to the decision as either permit or forbid.

See [03-policy-translation.md](03-policy-translation.md#evaluation-semantics).

---

## Cedar Schema

A JSON document that types all entities, actions, and attributes in a Cedar namespace. Schemas enable static validation of policies (checking that referenced entity types and attributes exist) and formal verification.

See [05-schema-management.md](05-schema-management.md).

---

## Policy Annotation

Metadata attached to a Cedar policy using the `@key("value")` syntax. The adapter uses `@id(...)` for policy identification and `@advice("visibleFields", ...)` for field visibility hints.

See [06-decision-mapping.md](06-decision-mapping.md#field-visibility).

---

## WASM (WebAssembly)

Binary instruction format used to run the Cedar evaluation engine in JavaScript environments. The adapter embeds the Cedar WASM module (compiled from Rust) rather than calling an external HTTP service.

See [ADR-CD-001](decisions/001-embedded-wasm-over-http-sidecar.md).

---

## Formal Verification

The ability to mathematically prove properties about Cedar policies, such as: "no user without `clearanceLevel >= 3` can access classified documents." Cedar supports formal verification because the language is not Turing-complete, making policy analysis decidable.

See [01-overview.md](01-overview.md#design-philosophy).

---

## Determining Policies

The set of Cedar policies that contributed to the final authorization decision. For `allow` decisions, these are the matching `permit` policies. For `deny` decisions caused by explicit `forbid` rules, these are the matching `forbid` policies.

See [06-decision-mapping.md](06-decision-mapping.md#diagnostics-propagation).
