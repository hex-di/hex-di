# ADR-GR-002: ASCII Cycle Diagrams in Error Messages

## Status

Proposed

## Context

When cycle detection finds a circular dependency, the current error message lists the cycle as a flat sequence of port names:

```
GraphBuildError: Circular dependency detected: A → B → C → A
```

For complex cycles (especially in large graphs with multiple interleaved cycles), this flat representation is difficult to parse. Developers must mentally reconstruct the graph structure from the text.

Module system research (see [RES-05](../../../research/RES-05-module-systems-compositional-verification.md)) emphasizes that **error quality is as important as error detection**. A type-safe system that produces incomprehensible errors provides diminished value.

### Current behavior

```
GraphBuildError: Circular dependency detected
  Cycle: AuthService → UserRepository → DatabaseConnection → EventBus → AuthService
```

### Desired behavior

```
GraphBuildError: Circular dependency detected

  ┌─→ AuthService
  │     ↓ requires
  │   UserRepository
  │     ↓ requires
  │   DatabaseConnection
  │     ↓ requires
  │   EventBus
  └─────┘ requires (cycle closes here)

  Suggestions:
  1. Add lazyPort(AuthServicePort) to EventBus's requires to break the cycle
  2. Extract a shared interface from AuthService that EventBus can depend on
  3. Introduce an event-based pattern to decouple EventBus from AuthService
```

## Decision

**Cycle detection errors include an ASCII diagram of the cycle path and at least one refactoring suggestion.**

### Diagram format

```
  ┌─→ {first node}
  │     ↓ requires
  │   {next node}
  │     ↓ requires
  │   ...
  └─────┘ requires (cycle closes here)
```

- Uses Unicode box-drawing characters (`┌`, `│`, `└`, `→`, `↓`)
- Each node is on its own line, indented under the box
- Edges are annotated with `requires`
- The closing edge is annotated with `(cycle closes here)`

### Suggestion generation

At least one suggestion is provided, selected from:

1. **Lazy edge**: If one edge in the cycle connects to a service that could be lazily initialized: `"Add lazyPort({portName}) to {adapterName}'s requires to break the cycle"`
2. **Interface extraction**: `"Extract a shared interface from {serviceName} that {dependentName} can depend on"`
3. **Event decoupling**: If both services emit/consume events: `"Introduce an event-based pattern to decouple {A} from {B}"`
4. **Scope separation**: If services are in different scopes: `"Move {serviceName} to a parent scope to break the dependency"`

### Multi-cycle reporting

When multiple cycles exist, each is reported separately with its own diagram. Cycles are deduplicated (a cycle A→B→C→A is the same regardless of starting node).

## Consequences

### Positive

1. **Visual clarity**: ASCII diagrams make cycle structure immediately apparent
2. **Actionable**: Suggestions give developers concrete next steps
3. **Copy-pasteable**: ASCII format works in terminals, logs, error trackers, and issue descriptions

### Negative

1. **Suggestion quality**: Generated suggestions may not always be appropriate — they are heuristic-based
2. **Terminal width**: Long port names may wrap awkwardly in narrow terminals

### Neutral

1. **Consistent with blame formatting**: Uses similar ASCII box-drawing as [BEH-CO-06-003](../../core/behaviors/06-blame-aware-errors.md)
2. **No runtime cost**: Diagram generation only runs on error paths

## References

- [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph): Cycle-Free Graph
- [BEH-GR-06](../behaviors/06-enhanced-cycle-errors.md): Enhanced Cycle Errors behavior
- [RES-05](../../../research/RES-05-module-systems-compositional-verification.md): Module Systems & Compositional Verification
