# Roadmap

Planned enhancements to `@hex-di/graph`, organized by implementation tier. Each item links to its behavior spec, ADR, and source research.

## Tier 1: Near-Term (TypeScript-Feasible, High Impact)

Implementable with current TypeScript. No design ambiguity.

### Operation Completeness Verification

**Status**: Specified.

**Scope**: Verify at build time that an adapter provides implementations for all methods declared by its port interface. Inspired by ML module system signature matching.

**Deliverable**: [behaviors/05-operation-completeness.md](behaviors/05-operation-completeness.md), [decisions/001-operation-completeness-strategy.md](decisions/001-operation-completeness-strategy.md)

**Research**: [RES-05 (Module Systems)](../../research/RES-05-module-systems-compositional-verification.md)

**Invariants**: [INV-GR-1](invariants.md#inv-gr-1-complete-port-coverage)

### Enhanced Cycle Error Messages

**Status**: Specified.

**Scope**: Cycle detection errors include ASCII diagrams of the full cycle path and at least one refactoring suggestion (introduce lazy edge, split service, extract interface).

**Deliverable**: [behaviors/06-enhanced-cycle-errors.md](behaviors/06-enhanced-cycle-errors.md), [decisions/002-ascii-cycle-diagrams.md](decisions/002-ascii-cycle-diagrams.md)

**Research**: [RES-05 (Module Systems)](../../research/RES-05-module-systems-compositional-verification.md)

**Invariants**: [INV-GR-2](invariants.md#inv-gr-2-cycle-free-graph)

## Tier 2: Medium-Term (Design Needed, High Value)

Feasible within TypeScript but require design work and potentially API changes.

### Graph Composition Law Tests

**Status**: Specified.

**Scope**: Property-based tests (fast-check) verifying that `.merge()` satisfies associativity, identity, and commutativity laws. Ensures reliable graph composition.

**Deliverable**: [behaviors/07-graph-law-tests.md](behaviors/07-graph-law-tests.md)

**Research**: [RES-07 (Category Theory)](../../research/RES-07-category-theory-composition.md)

### Well-Founded Cycle Support

**Status**: Specified.

**Scope**: Allow cycles annotated with `lazyPort()` to pass validation when the cycle is well-founded (all lazy edges point to services fully constructed before method invocation).

**Deliverable**: [behaviors/08-well-founded-cycles.md](behaviors/08-well-founded-cycles.md)

**Research**: [RES-05 (Module Systems)](../../research/RES-05-module-systems-compositional-verification.md)

**Dependency**: Graph Law Tests (Tier 2) — need composition law tests before relaxing cycle constraints

### Initialization Order Verification

**Status**: Specified.

**Scope**: Type-level topological sort verifying that initialization order respects all dependency edges. Ensures no service is initialized before its dependencies.

**Deliverable**: [behaviors/09-init-order-verification.md](behaviors/09-init-order-verification.md)

**Research**: [RES-08 (Refinement & Dependent Types)](../../research/RES-08-refinement-dependent-types-graph-safety.md)

### Effect Propagation Analysis

**Status**: Specified.

**Scope**: Compute the transitive error profile for any port in the graph. If resolving port A can fail because its dependency B can fail with error `E`, then A's resolution error type includes `E`.

**Deliverable**: [behaviors/10-effect-propagation.md](behaviors/10-effect-propagation.md)

**Research**: [RES-01 (Type & Effect Systems)](../../research/RES-01-type-and-effect-systems.md), [RES-05 (Module Systems)](../../research/RES-05-module-systems-compositional-verification.md)

## Tier 3: Long-Term (Research/Experimental)

Push TypeScript's limits or require new tooling. Full specifications provided for future implementation.

### Full Type-Level Graph Topology

**Status**: Specified.

**Scope**: Encode the entire graph structure in TypeScript types for exhaustive compile-time validation. Includes TypeScript recursion limit analysis and fallback strategies.

**Deliverable**: [decisions/003-full-type-level-topology.md](decisions/003-full-type-level-topology.md)

**Research**: [RES-08 (Refinement & Dependent Types)](../../research/RES-08-refinement-dependent-types-graph-safety.md)

### Parametric Adapter Templates

**Status**: Specified.

**Scope**: ML functor model — adapters parameterized by other adapters. Enables generic patterns like "cache any service" or "log all calls to any service".

**Deliverable**: [decisions/004-parametric-adapter-templates.md](decisions/004-parametric-adapter-templates.md)

**Research**: [RES-05 (Module Systems)](../../research/RES-05-module-systems-compositional-verification.md)

### Multiparty Protocol Verification

**Status**: Specified.

**Scope**: Cross-service protocol constraints verified at build time. Ensures that interacting services follow compatible communication patterns. Includes decidability analysis.

**Deliverable**: [decisions/005-multiparty-protocols.md](decisions/005-multiparty-protocols.md)

**Research**: [RES-02 (Session Types)](../../research/RES-02-session-types-behavioral-contracts.md)

## Type System Documentation

| Document                                                           | Purpose                            |
| ------------------------------------------------------------------ | ---------------------------------- |
| [type-system/graph-invariants.md](type-system/graph-invariants.md) | Type-level graph property encoding |

## Cross-Package References

- **@hex-di/core**: [spec/packages/core/roadmap.md](../core/roadmap.md) — Port definitions, adapter lifecycle, container disposal
- **@hex-di/result**: [spec/packages/result/roadmap.md](../result/roadmap.md) — Effect elimination, error row utilities
- **Research**: [spec/research/](../../research/) — RES-01 through RES-08
