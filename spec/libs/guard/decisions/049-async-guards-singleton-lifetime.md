# ADR-GD-049: Async guards force singleton lifetime

> **Status:** Accepted
> **ADR Number:** 049 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

`guardAsync()` uses an async factory function to resolve the initial authorization state. The DI container's `resolve()` is synchronous — it cannot `await` an async factory. Scoped or transient factories would need to be resolved synchronously each time, which is impossible for async factories.

## Decision

`guardAsync()` produces adapters with singleton lifetime. The async factory executes once; the result is cached. Attempting to use `guardAsync()` with scoped or transient lifetime produces a compile-time error via the `GuardedAsyncAdapter` conditional type.

```ts
// GuardedAsyncAdapter conditional type rejects non-singleton lifetimes
type GuardedAsyncAdapter<TAdapter, TLifetime> =
  TLifetime extends "singleton" ? TAdapter : never; // compile error for non-singleton

// Usage: singleton lifetime is required
const guardedAdapter = guardAsync(asyncFactory, {
  policy,
  lifetime: "singleton", // required — other values produce compile error
});
```

## Consequences

**Positive**:
- Compile-time enforcement of the correct lifetime
- No runtime surprises from async resolution failures
- The async factory cost is paid exactly once

**Negative**:
- Singleton lifetime may be unexpected for users familiar with scoped guard patterns
- All async guards share the same resolved state within the container

**Trade-off accepted**: Compile-time correctness is essential for a security-critical DI integration; the singleton lifetime constraint is a necessary consequence of synchronous container resolution.
