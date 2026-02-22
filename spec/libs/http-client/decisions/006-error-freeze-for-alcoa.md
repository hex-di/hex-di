# ADR-HC-006: Error Object Freezing for ALCOA+ Compliance

## Status

Accepted

## Context

In GxP-regulated environments, audit trail entries must satisfy the ALCOA+ data integrity principles — in particular **Attributable**, **Legible**, **Original**, and **Accurate**. When an HTTP error is captured in an audit trail entry, history store, or logging sink, it must represent the **original** failure exactly as it occurred.

If error objects were mutable after construction, a downstream handler (e.g., an interceptor, a retry wrapper, or an audit sink) could alter `reason`, `message`, `cause`, or `request` fields after the error was produced. This would violate the **Original** principle: the record in the audit trail might not match what actually failed.

A secondary concern is the mutation window between construction and the first use of the object. If construction involves multiple assignment statements (first create the object, then set fields, then freeze), a concurrent execution context could observe a partially-constructed error before freezing completes.

## Decision

All error constructor functions follow an exact **populate-freeze-return** 3-step sequence:

1. **Populate**: All fields are assigned in a single object literal expression.
2. **Freeze**: `Object.freeze()` is called on the fully-populated object immediately — before any reference escapes.
3. **Return**: The frozen object is returned to the caller.

```typescript
function httpRequestError(
  reason: HttpRequestError["reason"],
  request: HttpRequest,
  message: string,
  cause?: unknown,
): HttpRequestError {
  // Step 1 + 2 combined: populate and freeze atomically
  return Object.freeze({
    _tag: "HttpRequestError" as const,
    reason,
    request,
    message,
    cause,
  });
  // Step 3: returned directly — no intermediate variable
}
```

No intermediate variable holds the mutable object. The expression `Object.freeze({ ... })` is the single value passed to `return`.

The nested `cause` field is intentionally **not** frozen — it may be a platform error (`TypeError`, `DOMException`) whose prototype chain must remain intact for proper display and `instanceof` checks.

## Consequences

**Positive**:
- Errors captured at failure time are guaranteed to be immutable. Any reference to the error — in a log, history entry, or audit trail — reflects the original failure.
- The zero-mutation-window construction eliminates the race condition between construction and freezing.
- `Object.isFrozen(error)` returns `true`, enabling tests to assert the invariant directly.
- Satisfies ALCOA+ **Original** principle: the error record cannot be altered after production.

**Negative**:
- `Object.freeze()` is shallow. Nested objects (`request`, `response`) must be frozen independently — the error freeze does not transitively freeze them.
- Debuggers may display frozen objects differently (some tools show a lock icon), which can be surprising for developers unfamiliar with the pattern.

**Trade-off accepted**: Shallow freeze is sufficient because `HttpRequest` (INV-HC-1) and `HttpResponse` are already independently frozen. The ALCOA+ integrity guarantee is achieved for the fields that matter — `reason`, `message`, and `cause` — without over-engineering deep freeze.

**Affected invariants**: [INV-HC-4](../invariants.md#inv-hc-4-error-object-immutability), [INV-HC-5](../invariants.md#inv-hc-5-error-populate-freeze-return-ordering)

**Affected spec sections**: [§23](../05-error-types.md#23-error-constructors--guards)

**Regulatory reference**: 21 CFR 11.10(e) (audit trail integrity), ALCOA+ Original principle, WHO TRS 1033 Annex 4.
