---
id: ADR-007
kind: decision
title: Flow-Based Orchestration
status: Superseded
superseded_by: ADR-005
date: 2026-02-26
supersedes: []
invariants: [INV-SF-9]
---

# ADR-007: Flow-Based Orchestration

## Context

The original SpecForge design had a single rigid 5-phase pipeline: Discovery → Spec Forge → Task Master → Dev Forge → Verification. Every use case (spec writing, reverse engineering, code review, risk assessment) was forced through this structure, with phases skipped or repurposed awkwardly.

Problems:

1. **One size fits none** — Reverse engineering doesn't need Discovery or Task Master phases. Code review doesn't need Dev Forge. Forcing everything through 5 phases added complexity and confusion.
2. **No extensibility** — Users couldn't define their own workflows. Adding a "security audit" flow meant hacking the pipeline engine.
3. **Rigid phase ordering** — The fixed sequence couldn't accommodate workflows where review happens before authoring (e.g., reviewing existing docs) or where development happens iteratively with spec refinement.

## Decision

Replace the rigid pipeline with a flow-based orchestration model:

- **Flows** are declarative sequences of phases, registered by name
- **Predefined flows** ship with SpecForge (spec writing, reverse engineering, code review, risk assessment, onboarding)
- **Custom flows** can be defined and registered by users
- The **flow engine** executes any flow definition uniformly

## Rationale

1. **Right-sized workflows** — Each use case gets a flow tailored to its needs. Reverse engineering has 6 phases with different agents than spec writing. Code review has 3 phases. No wasted phases.

2. **Extensibility** — Users define custom flows as declarative data structures. No need to modify the flow engine. Register a flow definition, invoke it by name.

3. **Composability** — Flows are built from phases; phases are built from stages with agent roles. The same agent roles (e.g., `reviewer`) can appear in different flows without duplication.

4. **Declarative over imperative** — Flow definitions are data, not code. This makes them inspectable, serializable, and validatable at registration time.

5. **Progressive or batch** — Any flow can run in progressive mode (pause between phases) or batch mode (run all phases). The execution model is orthogonal to the flow definition.

## Flow Engine Contract

```typescript
interface FlowEngine {
  registerFlow(definition: FlowDefinition): void;
  runFlow(name: string, input: FlowInput): ResultAsync<FlowResult, FlowError>;
  listFlows(): ReadonlyArray<FlowDefinition>;
}
```

The flow engine:

1. Validates the flow definition (all roles exist, convergence criteria present, iterations bounded)
2. Creates an ACP session and session manager scope for the flow run
3. Executes phases sequentially, stages within phases per their ordering
4. Evaluates convergence after each iteration
5. Materializes session chunks on completion

## Trade-offs

- **Migration cost** — The flow model replaces the pipeline model. The port contracts are similar; the key change is parameterizing the phase sequence instead of hardcoding it.

- **Validation complexity** — Custom flow definitions can be invalid (referencing non-existent roles, missing convergence criteria, circular dependencies). Mitigated by eager validation at registration time with clear error messages.

- **Discoverability** — With many flows available, users need to know which flow to use. Mitigated by the web dashboard's Flow Monitor view showing recent/active flows and the CLI's `specforge flow list`.

- **Why TypeScript, not YAML** — Flow definitions are TypeScript objects, not YAML or a custom DSL, because TypeScript provides type-checked convergence criteria (functions, not declarative rules), IDE support (autocomplete on `AgentRole`, `PhaseMetrics`), and zero parsing overhead. YAML would require a runtime validator and lose type safety on convergence functions.

## References

- [Flow Definitions](../behaviors/BEH-SF-049-flow-definitions.md) — Flow definitions, predefined flows, orchestration
- [CLI](../behaviors/BEH-SF-113-cli.md) — CLI commands for flow execution
- [Extensibility § Custom Flows](../behaviors/BEH-SF-087-extensibility.md)
- [INV-SF-9](../invariants/INV-SF-9-flow-determinism.md) — Flow Determinism
