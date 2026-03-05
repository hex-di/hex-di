# 06 — Enhanced Cycle Errors

Cycle detection errors include ASCII diagrams of the full cycle path and at least one refactoring suggestion. See [ADR-GR-002](../decisions/002-ascii-cycle-diagrams.md) and [RES-05](../../../research/RES-05-module-systems-compositional-verification.md).

## BEH-GR-06-001: ASCII Cycle Diagram

When a cycle is detected during `.build()` or `.tryBuild()`, the error message includes an ASCII diagram showing the full cycle path with box-drawing characters.

```ts
interface CycleError {
  readonly _tag: "CycleDetected";
  readonly cycle: ReadonlyArray<string>; // Port names in cycle order
  readonly diagram: string; // Pre-formatted ASCII diagram
  readonly suggestions: ReadonlyArray<CycleSuggestion>;
}

interface CycleSuggestion {
  readonly _tag: "LazyEdge" | "InterfaceExtraction" | "EventDecoupling" | "ScopeSeparation";
  readonly description: string;
  readonly targetAdapter: string;
  readonly targetPort: string;
}
```

**Algorithm**:

1. Receive the cycle path as an ordered array of port names `[A, B, C, A]`
2. Deduplicate: normalize the cycle to start from the lexicographically smallest name
3. Generate the ASCII diagram:
   a. First line: `┌─→ {first}`
   b. For each intermediate node: `│   {node}` with `│     ↓ requires` connector
   c. Last line: `└─────┘ requires (cycle closes here)`
4. Generate suggestions (see [BEH-GR-06-002](#beh-gr-06-002-refactoring-suggestions))
5. Compose into the `CycleError` structure

**Behavior Table**:

| Cycle                | Diagram                               |
| -------------------- | ------------------------------------- |
| `[A, B, A]`          | 2-node cycle with single intermediate |
| `[A, B, C, A]`       | 3-node cycle                          |
| `[A, B, C, D, E, A]` | 5-node cycle (long chain)             |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, SINGLETON, ok } from "@hex-di/core";

const AuthPort = port<Auth>()({ name: "AuthService" });
const UserPort = port<UserRepo>()({ name: "UserRepository" });
const EventPort = port<EventBus>()({ name: "EventBus" });

// Creates cycle: AuthService → UserRepository → EventBus → AuthService
const authAdapter = createAdapter({
  provides: [AuthPort],
  requires: [UserPort] /* ... */,
});
const userAdapter = createAdapter({
  provides: [UserPort],
  requires: [EventPort] /* ... */,
});
const eventAdapter = createAdapter({
  provides: [EventPort],
  requires: [AuthPort] /* ... */,
});

const result = GraphBuilder.create()
  .provide(authAdapter)
  .provide(userAdapter)
  .provide(eventAdapter)
  .tryBuild();

// result.isErr() === true
// result.error.diagram ===
// ┌─→ AuthService
// │     ↓ requires
// │   UserRepository
// │     ↓ requires
// │   EventBus
// └─────┘ requires (cycle closes here)
//
// result.error.suggestions[0] ===
// { _tag: "LazyEdge",
//   description: "Add lazyPort(AuthServicePort) to EventBus's requires",
//   targetAdapter: "eventAdapter",
//   targetPort: "AuthService" }
```

**Design notes**:

- Unicode box-drawing characters are used for visual clarity. Falls back to ASCII (`+`, `|`, `->`) in environments without Unicode support.
- Diagrams are generated lazily (only computed when the error message is accessed) to avoid overhead when errors are caught and handled programmatically.
- Cross-ref: [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph).

## BEH-GR-06-002: Refactoring Suggestions

Each cycle error includes at least one actionable refactoring suggestion. Suggestions are ranked by applicability.

```ts
function generateCycleSuggestions(
  cycle: ReadonlyArray<string>,
  graph: GraphRegistrations
): ReadonlyArray<CycleSuggestion>;
```

**Algorithm**:

1. For each edge in the cycle, evaluate suggestion applicability:
   a. **LazyEdge**: If the target port's adapter has no initialization-time method calls, suggest `lazyPort()`. Score: high (minimal code change).
   b. **InterfaceExtraction**: If one adapter in the cycle has a large interface, suggest extracting the subset needed by the dependent. Score: medium.
   c. **EventDecoupling**: If both adapters in an edge are event-related (by port category or tags), suggest event-based decoupling. Score: medium.
   d. **ScopeSeparation**: If adapters have different lifetimes, suggest scope restructuring. Score: low.
2. Sort suggestions by score (highest first)
3. Return at least one suggestion (even if low-confidence)

**Behavior Table**:

| Cycle Pattern                         | Primary Suggestion                     |
| ------------------------------------- | -------------------------------------- |
| Simple A↔B mutual dependency          | `LazyEdge` on the edge from B→A        |
| Large service with many methods       | `InterfaceExtraction` — extract subset |
| Event emitter depending on subscriber | `EventDecoupling`                      |
| Cross-scope dependency                | `ScopeSeparation`                      |

**Design notes**:

- Suggestions are heuristic-based and may not always be optimal. They provide a starting point for investigation.
- The suggestion `description` is a human-readable sentence, ready for display in error messages.
- Suggestion generation examines adapter metadata (port categories, tags, lifetime) to select appropriate suggestions.
- Cross-ref: [BEH-GR-08](08-well-founded-cycles.md) for well-founded cycle support (the `LazyEdge` suggestion directly leads to this pattern).

## BEH-GR-06-003: Multi-Cycle Reporting

When a graph contains multiple independent cycles, each is reported separately with its own diagram and suggestions.

```ts
interface MultipleCyclesError {
  readonly _tag: "MultipleCyclesDetected";
  readonly cycles: ReadonlyArray<CycleError>;
  readonly summary: string; // "Found 3 circular dependencies"
}
```

**Algorithm**:

1. Run cycle detection (Tarjan's algorithm) to find all strongly connected components
2. For each SCC with more than one node:
   a. Extract the minimal cycle(s) within the SCC
   b. Generate a `CycleError` for each cycle
3. Deduplicate cycles (same nodes in different rotations are the same cycle)
4. Compose into `MultipleCyclesError` with a summary count

**Behavior Table**:

| Graph Structure                      | Reported Cycles           |
| ------------------------------------ | ------------------------- |
| One cycle: A→B→A                     | 1 cycle                   |
| Two independent cycles: A→B→A, C→D→C | 2 cycles                  |
| Overlapping cycles: A→B→C→A, B→D→B   | 2 cycles (sharing node B) |
| No cycles                            | No error (build succeeds) |

**Design notes**:

- Independent cycles are reported in topological order (by the first node in each cycle).
- Overlapping cycles (sharing nodes) are reported separately but the shared nodes are noted in the suggestions.
