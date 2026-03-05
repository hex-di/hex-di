# Roadmap

Planned enhancements to `@hex-di/core`, organized by implementation tier. Each item links to its behavior spec, ADR, and source research.

## Tier 1: Near-Term (TypeScript-Feasible, High Impact)

Implementable with current TypeScript. No design ambiguity.

### Frozen Port References

**Status**: Specified.

**Scope**: `Object.freeze()` resolved services before injection, extending existing port immutability to runtime capability protection.

**Deliverable**: [behaviors/05-frozen-port-references.md](behaviors/05-frozen-port-references.md), [decisions/001-frozen-port-references.md](decisions/001-frozen-port-references.md)

**Research**: [RES-04 (Capability-Based Security)](../../research/RES-04-capability-based-security.md)

**Invariants**: [INV-CO-1](invariants.md#inv-co-1-frozen-port-definitions), [INV-CO-2](invariants.md#inv-co-2-frozen-resolved-services)

### Blame-Aware Error Messages

**Status**: Specified.

**Scope**: Every container error includes a `BlameContext` structure identifying the responsible adapter, violated contract, violation type, and full resolution path.

**Deliverable**: [behaviors/06-blame-aware-errors.md](behaviors/06-blame-aware-errors.md), [decisions/002-blame-context-model.md](decisions/002-blame-context-model.md)

**Research**: [RES-06 (Contracts, Blame & Gradual Typing)](../../research/RES-06-contracts-blame-gradual-typing.md)

**Invariants**: [INV-CO-3](invariants.md#inv-co-3-blame-context-on-all-errors), [INV-CO-4](invariants.md#inv-co-4-blame-propagation-through-chains)

### Disposal State Phantom Types

**Status**: Specified.

**Scope**: `Container<TProvides, TPhase extends "active" | "disposed">` phantom type branding to prevent resolve-after-dispose at compile time.

**Deliverable**: [behaviors/07-disposal-state-branding.md](behaviors/07-disposal-state-branding.md), [decisions/003-disposal-state-phantom-types.md](decisions/003-disposal-state-phantom-types.md)

**Research**: [RES-03 (Linear & Affine Types)](../../research/RES-03-linear-affine-types-resource-lifecycle.md)

**Invariants**: [INV-CO-5](invariants.md#inv-co-5-phantom-disposal-prevention)

## Tier 2: Medium-Term (Design Needed, High Value)

Feasible within TypeScript but require design work and potentially API changes.

### Adapter Lifecycle States

**Status**: Specified.

**Scope**: `AdapterHandle<T, State>` phantom types tracking adapter lifecycle phases (created, initialized, active, disposing, disposed).

**Deliverable**: [behaviors/08-adapter-lifecycle-states.md](behaviors/08-adapter-lifecycle-states.md)

**Research**: [RES-02 (Session Types)](../../research/RES-02-session-types-behavioral-contracts.md), [RES-03 (Linear & Affine Types)](../../research/RES-03-linear-affine-types-resource-lifecycle.md)

**Dependency**: Disposal State Phantom Types (Tier 1)

### Scoped Reference Tracking

**Status**: Specified.

**Scope**: `ScopedRef<T, ScopeId>` branded references encoding scope identity to prevent scope escape at compile time.

**Deliverable**: [behaviors/09-scoped-reference-tracking.md](behaviors/09-scoped-reference-tracking.md)

**Research**: [RES-03 (Linear & Affine Types)](../../research/RES-03-linear-affine-types-resource-lifecycle.md)

**Dependency**: Adapter Lifecycle States (Tier 2)

### Contract Validation at Binding

**Status**: Specified.

**Scope**: Runtime contract checks when adapters are bound to ports, verifying that the adapter implementation satisfies the port interface before the container is built.

**Deliverable**: [behaviors/10-contract-validation.md](behaviors/10-contract-validation.md)

**Research**: [RES-06 (Contracts, Blame & Gradual Typing)](../../research/RES-06-contracts-blame-gradual-typing.md)

**Dependency**: Blame-Aware Errors (Tier 1)

### Capability Analyzer

**Status**: Specified.

**Scope**: Static analysis tool detecting ambient authority leaks — services that access global state, module singletons, or environment variables instead of receiving dependencies through ports.

**Deliverable**: [behaviors/11-capability-analyzer.md](behaviors/11-capability-analyzer.md)

**Research**: [RES-04 (Capability-Based Security)](../../research/RES-04-capability-based-security.md)

**Dependency**: Frozen Port References (Tier 1)

### Protocol State Machines

**Status**: Specified.

**Scope**: Port interfaces with phantom state parameters encoding valid method call ordering. Invalid sequences become type errors.

**Deliverable**: [behaviors/12-protocol-state-machines.md](behaviors/12-protocol-state-machines.md)

**Research**: [RES-02 (Session Types)](../../research/RES-02-session-types-behavioral-contracts.md)

### Behavioral Port Specifications

**Status**: Specified.

**Scope**: Machine-readable pre/postconditions on port methods, enabling runtime verification and contract-based programming.

**Deliverable**: [behaviors/13-behavioral-port-specs.md](behaviors/13-behavioral-port-specs.md)

**Research**: [RES-06 (Contracts, Blame & Gradual Typing)](../../research/RES-06-contracts-blame-gradual-typing.md)

**Dependency**: Blame-Aware Errors (Tier 1)

### Formal Disposal Ordering

**Status**: Specified.

**Scope**: Topological sort of disposal order based on the dependency graph, ensuring dependencies are disposed after their dependents.

**Deliverable**: [behaviors/14-formal-disposal-ordering.md](behaviors/14-formal-disposal-ordering.md)

**Research**: [RES-03 (Linear & Affine Types)](../../research/RES-03-linear-affine-types-resource-lifecycle.md)

**Dependency**: Adapter Lifecycle States (Tier 2)

## Tier 3: Long-Term (Research/Experimental)

Push TypeScript's limits or require new tooling. Full specifications provided for future implementation.

### Chaperone Contract Enforcement

**Status**: Specified.

**Scope**: Proxy-based runtime contract enforcement with configurable modes (dev/warn/strict). Adapters are wrapped in chaperone proxies that verify pre/postconditions on every method call.

**Deliverable**: [decisions/004-chaperone-contract-enforcement.md](decisions/004-chaperone-contract-enforcement.md)

**Research**: [RES-06 (Contracts, Blame & Gradual Typing)](../../research/RES-06-contracts-blame-gradual-typing.md)

### Resource Polymorphism

**Status**: Specified.

**Scope**: Type-level tracking of whether a service is disposable (`Disposable<T>`) or non-disposable (`NonDisposable<T>`), enabling the compiler to enforce disposal obligations.

**Deliverable**: [decisions/005-resource-polymorphism.md](decisions/005-resource-polymorphism.md)

**Research**: [RES-03 (Linear & Affine Types)](../../research/RES-03-linear-affine-types-resource-lifecycle.md)

### Unified Capability Model

**Status**: Specified.

**Scope**: Formal unification of port injection and guard policies into a single capability model. Port injection = capability granting; guard policies = capability constraints.

**Deliverable**: [decisions/006-unified-capability-model.md](decisions/006-unified-capability-model.md)

**Research**: [RES-04 (Capability-Based Security)](../../research/RES-04-capability-based-security.md), [RES-06 (Contracts, Blame & Gradual Typing)](../../research/RES-06-contracts-blame-gradual-typing.md)

### Effect-Capability Unification

**Status**: Specified.

**Scope**: Error channels (`E` in `Result<T, E>`) as capability profiles. A service's error type declares what capabilities it exercises and what can go wrong.

**Deliverable**: [decisions/007-effect-capability-unification.md](decisions/007-effect-capability-unification.md)

**Research**: [RES-01 (Type & Effect Systems)](../../research/RES-01-type-and-effect-systems.md), [RES-04 (Capability-Based Security)](../../research/RES-04-capability-based-security.md)

## Type System Documentation

| Document                                                       | Purpose                                      |
| -------------------------------------------------------------- | -------------------------------------------- |
| [type-system/phantom-states.md](type-system/phantom-states.md) | Phantom type patterns for lifecycle tracking |

## Cross-Package References

- **@hex-di/result**: [spec/packages/result/roadmap.md](../result/roadmap.md) — Effect elimination, error row utilities
- **@hex-di/graph**: [spec/packages/graph/roadmap.md](../graph/roadmap.md) — Graph validation, composition laws
- **Research**: [spec/research/](../../research/) — RES-01 through RES-08
