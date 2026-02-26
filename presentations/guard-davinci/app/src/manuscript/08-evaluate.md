# The Evaluator

Replace `if (canDeleteBrand)` with `evaluate(canDeleteBrand, { subject })`.

```typescript
const result = evaluate(canDeletePolicy, { subject });

if (result.isOk()) {
  const decision = result.value;
  // decision.kind → "allow" | "deny"
  // decision.durationMs → 0.042
  // decision.trace → full evaluation tree
}
```

Every evaluation returns `Result<Decision, EvaluationError>` with timing, trace, and reason. Never throws.
