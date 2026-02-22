# ADR-GD-051: `anyOf` with `fieldStrategy: "union"` requires full evaluation (no short-circuit)

> **Status:** Accepted
> **ADR Number:** 051 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Standard `anyOf` short-circuits on the first allowing child — subsequent children are not evaluated. When `fieldStrategy: "union"`, the evaluator must collect `visibleFields` from **all** allowing children to compute the union. Short-circuit evaluation would only collect fields from the first allowing child, missing fields from other allowing children.

## Decision

When `anyOf` has `fieldStrategy: "union"`, all children are evaluated (no short-circuit). The `complete` flag on `EvaluationTrace` is set to `true`. The decision logic remains unchanged: allow if any child allows.

```ts
// With fieldStrategy: "union" — all children are evaluated
const policy: AnyOfPolicy = {
  kind: "anyOf",
  fieldStrategy: "union",
  policies: [editorFields, reviewerFields, viewerFields],
};
// All 3 are evaluated — visibleFields = union of all allowing children
// EvaluationTrace.complete = true (all children were evaluated)
```

## Consequences

**Positive**:
- Correct union field semantics
- `complete: true` in the trace distinguishes exhaustive from short-circuited evaluation for debugging

**Negative**:
- Performance cost — all children evaluated even after the first `Allow` is found
- Larger evaluation traces

**Trade-off accepted**: Correct union field collection is a hard semantic requirement; the performance trade-off is explicitly documented, opt-in (`fieldStrategy: "union"` must be set), and bounded by the number of children.
