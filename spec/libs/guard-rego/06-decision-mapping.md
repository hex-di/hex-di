# 06 — Decision Mapping

This chapter specifies how OPA's query response is translated to Guard's `Decision` type. The mapping handles both boolean and structured decision formats.

---

## OPA Response to Guard Decision

REQUIREMENT (RG-DEC-001): The decision mapper MUST support two response formats:

1. **Boolean result** — OPA returns `true` or `false` (or `undefined`)
2. **Structured result** — OPA returns an `OpaDecisionDocument` object

```ts
function mapOpaResponse(
  response: OpaQueryResponse,
  context: RegoEvaluationContext
): Result<Decision, RegoDecisionParseError>;
```

### Boolean Result Mapping

REQUIREMENT (RG-DEC-010): When `response.result` is `true`, the adapter MUST produce `Decision` with `kind: "allow"`.

REQUIREMENT (RG-DEC-011): When `response.result` is `false`, `null`, or `undefined`, the adapter MUST produce `Decision` with `kind: "deny"`.

REQUIREMENT (RG-DEC-012): For boolean `deny` decisions, the `reason` field MUST be:

- `"OPA rule evaluated to false"` when the result is `false`
- `"OPA rule is undefined (no matching rules)"` when the result is `undefined` or `null`

### Structured Result Mapping

REQUIREMENT (RG-DEC-020): When `response.result` is an object, the adapter MUST attempt to parse it as an `OpaDecisionDocument`.

```ts
interface OpaDecisionDocument {
  readonly allow: boolean;
  readonly reason?: string;
  readonly visibleFields?: ReadonlyArray<string>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
```

REQUIREMENT (RG-DEC-021): If the object has an `allow` field of type boolean, it is treated as a structured decision. The `allow` value determines `Decision.kind`.

REQUIREMENT (RG-DEC-022): If the object does NOT have an `allow` field, the adapter MUST return `Err(RegoDecisionParseError)` with tag `"missing-allow-field"` and include the raw result in the error for debugging.

---

## Structured Decision Documents

REQUIREMENT (RG-DEC-030): For structured `deny` decisions, the `reason` field from the `OpaDecisionDocument` MUST be used as `Decision.reason`. If `reason` is not provided, the default is `"OPA policy denied access"`.

REQUIREMENT (RG-DEC-031): For structured `allow` decisions, the `reason` field is ignored (Guard's `Allow` does not carry a reason).

---

## Field Visibility

REQUIREMENT (RG-DEC-040): When the `OpaDecisionDocument` contains a `visibleFields` array, the adapter MUST set `Decision.visibleFields` to that array.

REQUIREMENT (RG-DEC-041): The `visibleFields` array MUST contain only strings. If any element is not a string, the adapter MUST filter it out and record a warning.

REQUIREMENT (RG-DEC-042): If `visibleFields` is absent or empty, `Decision.visibleFields` MUST be `undefined` (all fields visible).

---

## Trace and Diagnostics

REQUIREMENT (RG-DEC-050): The Guard `Decision` MUST include:

- `evaluationId` — from the Guard `EvaluationContext` (or generated if absent)
- `evaluatedAt` — ISO 8601 timestamp of the evaluation
- `subjectId` — from `AuthSubject.id`
- `policy` — the `regoPolicy` `PolicyConstraint` that triggered this evaluation
- `trace` — evaluation trace with OPA-specific diagnostics
- `durationMs` — wall-clock duration including HTTP round-trip

REQUIREMENT (RG-DEC-051): The evaluation trace MUST include an `opaMetadata` extension field:

```ts
interface RegoEvaluationTraceExtension {
  readonly opaMetadata: {
    readonly decisionId?: string;
    readonly path: string;
    readonly httpStatus: number;
    readonly metrics?: OpaMetrics;
    readonly bundleRevision?: string;
    readonly rawResult?: unknown; // included when decision parsing fails (debug mode)
  };
}
```

REQUIREMENT (RG-DEC-052): The `decisionId` from OPA's response (if present) MUST be propagated to the trace. This enables correlation between Guard audit entries and OPA's decision logs.

REQUIREMENT (RG-DEC-053): When `metadata` is present in the structured decision document, it MUST be merged into the `opaMetadata` trace field under a `policyMetadata` sub-key.

---

## Decision Immutability

REQUIREMENT (RG-DEC-060): All `Decision` objects produced by the adapter MUST be deeply frozen (`Object.freeze`). This is consistent with Guard's INV-GD-1 (frozen decision objects).

REQUIREMENT (RG-DEC-061): The `EvaluationTrace` within the decision MUST also be frozen, including the `opaMetadata` extension.
