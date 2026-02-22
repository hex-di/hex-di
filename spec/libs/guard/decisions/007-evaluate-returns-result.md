# ADR-GD-007: `evaluate()` returns `Result<Decision, PolicyEvaluationError>`

> **Status:** Accepted
> **ADR Number:** 007 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Policy evaluation can fail for expected reasons: circular role inheritance, missing attributes, depth exceeded, resolver timeout. These are not programmer errors — they are expected conditions that must be handled explicitly. Should `evaluate()` throw or return typed errors?

## Decision

`evaluate()` returns `Result<Decision, PolicyEvaluationError>`. Failures are typed and exhaustively enumerable.

```ts
type PolicyEvaluationError =
  | { code: "ACL003"; kind: "depth-exceeded"; maxDepth: number }
  | { code: "ACL005"; kind: "circular-role-inheritance"; roleName: string }
  | { code: "ACL026"; kind: "resolver-timeout"; timeoutMs: number };

const result = evaluate(policy, context);
if (result.isErr()) {
  switch (result.error.kind) {
    case "depth-exceeded": /* ... */ break;
  }
}
```

## Consequences

**Positive**:
- Consistent with hex-di's Result-based error handling
- Callers must handle failures explicitly
- Type-safe error discrimination via exhaustive switch

**Negative**:
- Callers must unwrap the Result (slightly more verbose)
- Async evaluation adds a second wrapping layer

**Trade-off accepted**: Explicit error handling is a feature in a security-critical system; silently swallowing evaluation failures could result in incorrect authorization decisions.
