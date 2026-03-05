# @hex-di/guard-cedar — Invariants

Runtime guarantees enforced by the `@hex-di/guard-cedar` implementation.

---

## INV-CD-1: Cedar Evaluation Semantics Preserved

The adapter MUST NOT alter Cedar's three evaluation rules: default-deny, forbid-overrides-permit, and skip-on-error. The Cedar WASM engine is the sole authority for policy evaluation. The adapter translates inputs and outputs but never overrides, filters, or reorders Cedar's decision.

**Source**: `src/engine.ts` — `isAuthorized` delegates directly to WASM without post-processing the decision.

**Implication**: Users can rely on Cedar's documented semantics. Formal verification results for Cedar policies apply unchanged when evaluated through this adapter.

**Related**: [CD-POL-010, CD-POL-011](03-policy-translation.md), FM-1 in risk-assessment.

---

## INV-CD-2: Frozen Decision Objects

All `Decision` objects returned by the adapter are deeply frozen (`Object.freeze`). This includes the evaluation trace and embedded Cedar diagnostics. No consumer can mutate a decision after it is produced.

**Source**: `src/decision-mapper.ts` — `mapCedarResponse` applies `Object.freeze` before returning.

**Implication**: Decision objects are safe to share across async boundaries, cache, and pass to audit trail ports without defensive copying.

**Related**: [CD-DEC-030, CD-DEC-031](06-decision-mapping.md). Aligns with Guard's INV-GD-1.

---

## INV-CD-3: Schema Validation at Load Time

When `validateOnLoad` is true (default), policies are validated against the schema at adapter creation time. A policy that references undefined entity types, actions, or attributes will be rejected before any evaluation occurs.

**Source**: `src/factory.ts` — `createCedarAdapter` calls `validate` before returning the adapter.

**Implication**: Runtime evaluation never encounters a schema mismatch error for policies that passed load-time validation. Schema errors are caught at startup, not at request time.

**Related**: [CD-PORT-041, CD-SCH-020](02-cedar-engine-port.md), [CD-SCH-030](05-schema-management.md).

---

## INV-CD-4: No Exceptions Thrown

The adapter never throws JavaScript exceptions. All error paths return `Result.Err(...)` with a frozen, tagged error object. This includes WASM initialization failures, policy parse errors, schema validation errors, entity mapping errors, and evaluation errors.

**Source**: All public functions in `src/factory.ts`, `src/engine.ts`, `src/entity-mapper.ts`, `src/schema-loader.ts`, `src/policy-store.ts`.

**Implication**: Consumers handle errors via `Result` pattern matching. No try/catch is needed at the call site.

**Related**: [CD-ERR-001, CD-ERR-070](07-error-handling.md). Aligns with Guard's error handling convention.

---

## INV-CD-5: Entity UID Uniqueness in Slice

The entity slice passed to Cedar never contains duplicate entity UIDs. When the same entity UID is produced by multiple mapping paths (e.g., subject-derived and resource-derived), the adapter merges their attributes and parent sets into a single entity entry.

**Source**: `src/entity-mapper.ts` — `buildEntitySlice` deduplicates by `${uid.type}::${uid.id}`.

**Implication**: Cedar's entity resolution operates on a well-formed entity set. Duplicate UIDs would cause undefined behavior in Cedar — this invariant prevents that.

**Related**: [CD-ENT-041, CD-ENT-042](04-entity-mapping.md).

---

## INV-CD-6: Immutable Schema Objects

Loaded Cedar schemas are deeply frozen. After `loadSchema` returns, no consumer can mutate the schema object. This prevents accidental schema drift between validation and evaluation.

**Source**: `src/schema-loader.ts` — `loadSchema` applies recursive `Object.freeze`.

**Implication**: Schema objects can be shared across multiple Cedar engine instances without risk of mutation.

**Related**: [CD-SCH-012](05-schema-management.md).

---

## INV-CD-7: Policy Store Immutability

The `CedarPolicyStore` is effectively immutable. `load` and `add` operations produce new state without mutating the existing policy text. Only `clear` resets the store.

**Source**: `src/policy-store.ts` — operations append to an internal frozen snapshot.

**Implication**: Concurrent readers of the policy store see a consistent snapshot even if the store is being updated from another context.

**Related**: [CD-POL-023](03-policy-translation.md).
