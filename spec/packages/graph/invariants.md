# Invariants

Runtime guarantees and contracts enforced by the `@hex-di/graph` implementation.

## INV-GR-1: Complete Port Coverage

Every port referenced in an adapter's `requires` tuple has a corresponding provider registered in the graph. `.build()` fails with a dependency satisfaction error if any required port lacks a provider.

**Source**: `validation/types/dependency-satisfaction.ts` (compile-time), `builder/builder-build.ts` (runtime).

**Implication**: A graph that builds successfully can resolve every port. No "missing service" errors occur at resolution time.

**Referenced from**: [BEH-GR-01](behaviors/01-builder-api.md), [BEH-GR-05](behaviors/05-operation-completeness.md).

## INV-GR-2: Cycle-Free Graph

The built graph is a directed acyclic graph (DAG). No circular dependency chains exist unless explicitly annotated with `lazyPort()`. `.build()` fails with a cycle detection error if unannotated cycles are found.

**Source**: `validation/types/cycle/detection.ts` (compile-time DFS), `graph/inspection/runtime-cycle-detection.ts` (runtime Tarjan's).

**Implication**: Topological sort and initialization ordering are always possible. Resolution terminates in finite steps.

**Referenced from**: [BEH-GR-02](behaviors/02-cycle-detection.md), [BEH-GR-06](behaviors/06-enhanced-cycle-errors.md).

## INV-GR-3: Captive Dependency Prevention

No adapter with a longer lifetime depends on an adapter with a shorter lifetime without explicit opt-out. Singleton adapters cannot depend on scoped or transient adapters. Scoped adapters cannot depend on transient adapters.

**Source**: `validation/types/captive/detection.ts` (compile-time), `graph/inspection/runtime-captive-detection.ts` (runtime).

**Implication**: Instance lifetime expectations are preserved. A singleton never holds a stale reference to a transient instance.

**Referenced from**: [BEH-GR-03](behaviors/03-captive-dependency-detection.md).

## INV-GR-4: No Duplicate Providers

Each port has at most one provider in a built graph. If two adapters both provide the same port, `.build()` fails with a duplicate provider error. `.override()` is the explicit mechanism for replacing a provider.

**Source**: `validation/types/batch-duplicates.ts` (compile-time), `builder/builder-build.ts` (runtime).

**Implication**: Port resolution is deterministic. There is never ambiguity about which adapter implements a port.

**Referenced from**: [BEH-GR-01](behaviors/01-builder-api.md).
