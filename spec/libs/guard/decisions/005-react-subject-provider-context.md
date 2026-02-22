# ADR-GD-005: SubjectProvider in React is a pure context provider, not a DI scope

> **Status:** Accepted
> **ADR Number:** 005 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

The guard system needs to make the authenticated subject available to React components. Options: (1) wrap the DI container scope, or (2) use a separate `React.createContext`. Option 1 couples subject availability to container scoping, requiring a DI container everywhere and creating unnecessary scope nesting.

## Decision

`SubjectProvider` is a pure React context provider using `React.createContext`, independent of the DI container. Components access the subject via `useSubject()`.

```tsx
function App() {
  const subject = useAuthSubject();
  return (
    <SubjectProvider subject={subject}>
      <GuardedFeature />
    </SubjectProvider>
  );
}
function GuardedFeature() {
  const subject = useSubject(); // reads from React context
}
```

## Consequences

**Positive**:
- No unnecessary DI scope nesting
- Subject works without a DI container
- Simpler mental model

**Negative**:
- Subject not available via `container.resolve()`
- Components must use `useSubject()` hook specifically

**Trade-off accepted**: Separating UI subject propagation from DI container scoping reduces coupling and simplifies the component model.
