# ADR-GD-048: Async evaluation wraps sync — zero-cost when not needed

> **Status:** Accepted
> **ADR Number:** 048 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Attribute resolvers for `hasAttribute` and `hasResourceAttribute` policies may be async (database lookups, external API calls). Adding async to the core `evaluate()` function would force all consumers to use `await` even when no async resolution is needed — breaking backward compatibility and adding overhead to sync use cases.

## Decision

`evaluate()` remains synchronous. `evaluateAsync()` wraps it: it resolves missing attributes on demand via `AttributeResolver` before delegating to the synchronous `evaluate()`. When no attribute resolution is needed, `evaluateAsync()` completes in a single microtask.

```ts
// Sync path — unchanged for existing consumers
const result = evaluate(policy, { subject, resource });

// Async path — wraps sync, resolves attributes on demand
const result = await evaluateAsync(policy, { subject, resource }, {
  attributeResolver: async (key) => externalAttributeStore.get(key),
});
```

## Consequences

**Positive**:
- Backward compatible — existing sync consumers are unaffected
- Zero overhead for sync consumers (no async overhead when no resolution is needed)
- Async resolution is opt-in per-call

**Negative**:
- Two evaluation functions (`evaluate` and `evaluateAsync`) to understand and document
- The async wrapper adds a microtask even when resolution is not needed

**Trade-off accepted**: Backward compatibility and zero overhead for sync consumers outweigh the two-function API complexity; the wrapper pattern is a clean way to add opt-in async without breaking existing code.
