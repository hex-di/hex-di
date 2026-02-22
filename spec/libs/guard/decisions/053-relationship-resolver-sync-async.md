# ADR-GD-053: `RelationshipResolver` has both sync and async methods

> **Status:** Accepted
> **ADR Number:** 053 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Relationship stores vary widely in their access patterns: in-memory stores support synchronous lookup (O(1)), while graph databases (Neo4j, Amazon Neptune) and external authorization services (Zanzibar) require asynchronous network calls. A resolver with only async methods would add overhead for in-memory use cases; only sync methods would exclude remote stores.

## Decision

`RelationshipResolver` port has both `check()` (sync) and `checkAsync()` (async) methods with identical parameters. Sync works with `evaluate()`; async works with `evaluateAsync()`.

```ts
interface RelationshipResolver {
  check(subjectId: string, relation: string, resourceId: string, options?: { depth?: number }): Result<boolean, RelationshipError>;
  checkAsync(subjectId: string, relation: string, resourceId: string, options?: { depth?: number }): Promise<Result<boolean, RelationshipError>>;
}
```

## Consequences

**Positive**:
- In-memory resolvers work with sync `evaluate()` (zero async overhead)
- Remote resolvers work with `evaluateAsync()`
- Single port covers both cases

**Negative**:
- Implementations must provide both methods (or throw `NotImplementedError` for the unsupported method)
- Port has two methods with near-identical semantics

**Trade-off accepted**: A single port covering both sync and async is architecturally simpler than two separate resolver ports with the same conceptual responsibility.
