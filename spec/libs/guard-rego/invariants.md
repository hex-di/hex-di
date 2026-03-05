# @hex-di/guard-rego — Invariants

Runtime guarantees enforced by the `@hex-di/guard-rego` implementation.

---

## INV-RG-1: Fail-Closed on OPA Unavailability

When the OPA sidecar is unreachable (network error, timeout, DNS failure), the adapter MUST produce a `Deny` decision. The adapter never produces `Allow` when it cannot confirm the OPA decision. This prevents authorization bypass due to infrastructure failures.

**Source**: `src/client.ts` — HTTP error handling wraps failures in `RegoAdapterError` with tag `"evaluation-denied-on-error"`, which the adapter maps to a `Deny` decision.

**Implication**: Consumers can rely on fail-closed behavior. OPA downtime degrades availability (more denials) but never degrades security (no false allows).

**Related**: [RG-ERR-061](07-error-handling.md), FM-1 in risk-assessment.

---

## INV-RG-2: Frozen Decision Objects

All `Decision` objects returned by the adapter are deeply frozen (`Object.freeze`). This includes the evaluation trace and embedded OPA metadata. No consumer can mutate a decision after it is produced.

**Source**: `src/decision-mapper.ts` — `mapOpaResponse` applies `Object.freeze` before returning.

**Implication**: Decision objects are safe to share across async boundaries, cache, and pass to audit trail ports without defensive copying.

**Related**: [RG-DEC-060, RG-DEC-061](06-decision-mapping.md). Aligns with Guard's INV-GD-1.

---

## INV-RG-3: No Exceptions Thrown

The adapter never throws JavaScript exceptions. All error paths return `Result.Err(...)` with a frozen, tagged error object. This includes OPA network failures, timeout errors, response parse errors, and input mapping errors.

**Source**: All public functions in `src/factory.ts`, `src/client.ts`, `src/input-mapper.ts`, `src/decision-mapper.ts`.

**Implication**: Consumers handle errors via `Result` pattern matching. No try/catch is needed at the call site.

**Related**: [RG-ERR-060](07-error-handling.md). Aligns with Guard's error handling convention.

---

## INV-RG-4: Deterministic Input Serialization

Given the same `AuthSubject`, resource, and action, the adapter MUST produce identical JSON bytes for the OPA input document. This is achieved by sorting permission arrays and using stable key ordering.

**Source**: `src/input-mapper.ts` — `buildInputDocument` sorts permissions and preserves insertion order.

**Implication**: OPA's response caching (if enabled) works correctly because identical authorization contexts produce identical cache keys.

**Related**: [RG-INP-034](04-input-document-mapping.md).

---

## INV-RG-5: Immutable Input Documents

Input documents are deeply frozen after construction. No mutation occurs between construction and HTTP serialization.

**Source**: `src/input-mapper.ts` — `buildInputDocument` applies `Object.freeze`.

**Implication**: Input documents can be logged, cached, or inspected without risk of mutation.

**Related**: [RG-INP-033](04-input-document-mapping.md).

---

## INV-RG-6: Reserved Key Protection

The `additionalInput` merge MUST NOT override the `subject`, `resource`, or `action` keys in the input document. These reserved keys are always populated from the Guard evaluation context.

**Source**: `src/input-mapper.ts` — `buildInputDocument` filters reserved keys from `additionalInput`.

**Implication**: Rego policies can always rely on `input.subject`, `input.resource`, and `input.action` being populated from Guard's context, regardless of what `additionalInput` contains. A misconfigured `additionalInput` cannot mask the real subject.

**Related**: [RG-INP-032](04-input-document-mapping.md).

---

## INV-RG-7: OPA Decision ID Propagation

When OPA returns a `decisionId` in its response, the adapter MUST propagate it to the Guard evaluation trace. This enables bidirectional correlation between Guard audit entries and OPA decision logs.

**Source**: `src/decision-mapper.ts` — `mapOpaResponse` extracts `decisionId` from the OPA response and includes it in the trace.

**Implication**: Audit teams can trace a Guard authorization decision back to OPA's decision log entry using the decision ID.

**Related**: [RG-DEC-052](06-decision-mapping.md).
