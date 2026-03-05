# 06 — Decision Mapping

This chapter specifies how Cedar's authorization response is translated back to Guard's `Decision` type. The mapping must preserve evaluation context, diagnostics, and field visibility information.

---

## Cedar Response to Guard Decision

REQUIREMENT (CD-DEC-001): When Cedar returns `decision: "allow"`, the adapter MUST produce a Guard `Decision` with `kind: "allow"`.

REQUIREMENT (CD-DEC-002): When Cedar returns `decision: "deny"`, the adapter MUST produce a Guard `Decision` with `kind: "deny"`.

REQUIREMENT (CD-DEC-003): The Guard `Decision` MUST include:

- `evaluationId` — carried from the Guard `EvaluationContext`
- `evaluatedAt` — ISO 8601 timestamp of the evaluation
- `subjectId` — from `AuthSubject.id`
- `policy` — the `cedarPolicy` `PolicyConstraint` that triggered this evaluation
- `trace` — evaluation trace containing Cedar diagnostics
- `durationMs` — wall-clock duration of the Cedar WASM evaluation

```ts
function mapCedarResponse(
  response: CedarAuthorizationResponse,
  context: CedarEvaluationContext
): Decision;
```

REQUIREMENT (CD-DEC-004): For `deny` decisions, the `reason` field MUST be constructed from Cedar's diagnostics. If Cedar provides policy-level errors, they MUST be included in the reason string. If no specific reason is available (default deny — no matching permit), the reason MUST be `"No matching Cedar permit policy"`.

---

## Diagnostics Propagation

REQUIREMENT (CD-DEC-010): The Cedar diagnostics MUST be propagated into the Guard `EvaluationTrace` under a `cedarDiagnostics` extension field.

```ts
interface CedarEvaluationTraceExtension {
  readonly cedarDiagnostics: {
    readonly determiningPolicies: ReadonlyArray<string>;
    readonly errors: ReadonlyArray<{
      readonly policyId: string;
      readonly error: string;
    }>;
  };
}
```

REQUIREMENT (CD-DEC-011): The `determiningPolicies` array MUST list the Cedar policy IDs that contributed to the final decision. For `allow`, these are the permit policies that matched. For `deny`, these are the forbid policies that overrode permits (if any).

REQUIREMENT (CD-DEC-012): If Cedar reports policy evaluation errors (conditions that threw), these MUST appear in the `errors` array. Skipped policies are NOT errors in Cedar — they are expected behavior. But the adapter MUST still report them for observability.

---

## Field Visibility

REQUIREMENT (CD-DEC-020): The adapter MUST support field-level visibility through Cedar policy annotations.

Cedar policies can embed field visibility hints via policy annotations:

```cedar
@advice("visibleFields", "name,email,department")
permit(
  principal in Role::"viewer",
  action == Action::"read",
  resource is Document
);
```

REQUIREMENT (CD-DEC-021): If the determining permit policy contains a `@advice("visibleFields", ...)` annotation, the adapter MUST extract the comma-separated field list and populate `Decision.visibleFields`.

REQUIREMENT (CD-DEC-022): If multiple determining permit policies specify different `visibleFields`, the adapter MUST merge them using set union (all fields from all determining policies are visible).

REQUIREMENT (CD-DEC-023): If no `visibleFields` annotation is present, `Decision.visibleFields` MUST be `undefined` (meaning all fields are visible, consistent with Guard's default behavior).

---

## Decision Immutability

REQUIREMENT (CD-DEC-030): All `Decision` objects produced by the adapter MUST be deeply frozen (`Object.freeze`). This is consistent with Guard's INV-GD-1 (frozen decision objects).

REQUIREMENT (CD-DEC-031): The `EvaluationTrace` within the decision MUST also be frozen. Cedar diagnostics embedded in the trace MUST be frozen.
