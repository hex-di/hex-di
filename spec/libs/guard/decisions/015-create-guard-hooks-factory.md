# ADR-GD-015: `createGuardHooks()` factory for React (not global hooks)

> **Status:** Accepted
> **ADR Number:** 015 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Global React hooks (`useGuard()`, `usePolicy()`) create a single shared guard context. Applications that embed multiple independent guard contexts (a main app plus an embedded widget, each with different guard configurations) cannot use global hooks — they would share the same context.

## Decision

`createGuardHooks()` factory produces a typed hook set bound to a specific guard context provider. The default export provides convenience single-context hooks for the common case.

```ts
// Create typed hooks for a specific guard context
const { GuardProvider, useGuard, usePolicy } = createGuardHooks<MyGuardConfig>();

// Application: multiple independent guard contexts are possible
function App() {
  return (
    <GuardProvider config={mainAppConfig}>
      <EmbeddedWidget /> {/* Can have its own GuardProvider */}
    </GuardProvider>
  );
}
```

## Consequences

**Positive**:
- Multiple independent guard contexts work correctly
- Type inference for the specific guard configuration
- Follows the `createTypedHooks()` pattern established elsewhere in hex-di

**Negative**:
- More setup for single-context applications (must call the factory)
- Slightly more verbose than global hooks for the common case

**Trade-off accepted**: The factory pattern is slightly more verbose but enables flexibility; the default convenience hooks minimize boilerplate for the most common single-context case.
