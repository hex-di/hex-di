# Type-Level Graph Invariants

Reference document for type-level encoding of dependency graph properties in `@hex-di/graph`.

## Overview

The `@hex-di/graph` builder tracks the dependency graph topology in phantom type parameters. This document specifies the type-level representations of graph invariants -- acyclicity, completeness, topological ordering -- and the strategies for working within TypeScript's recursion depth limits.

For the design rationale behind full type-level topology encoding, see [ADR-GR-003](../decisions/003-full-type-level-topology.md). For the research foundation, see [RES-08](../../../research/RES-08-refinement-dependent-types-graph-safety.md).

## Type-Level Graph Representation

### GraphShape

The dependency graph is encoded as a mapped type where keys are port names (string literals) and values describe each node's metadata:

```typescript
type GraphShape<TNodes extends GraphNodes> = {
  readonly nodes: TNodes;
};

type GraphNodes = {
  readonly [PortName in string]: {
    readonly lifetime: "singleton" | "scoped" | "transient";
    readonly requires: ReadonlyArray<string>;
  };
};
```

This representation is built incrementally by the `GraphBuilder`. Each `.provide()` call adds an entry to the nodes map via the `TInternalState` phantom parameter.

### Edge derivation

Edges are derived from the node `requires` tuples rather than stored separately. This avoids redundant type-level data and ensures edges are always consistent with node declarations:

```typescript
type DeriveEdges<TNodes extends GraphNodes> = {
  readonly [K in keyof TNodes & string]: TNodes[K]["requires"][number];
};

// Example: { UserService: "UserRepository" | "CacheService"; AuthService: "TokenStore" }
```

## HasNoCycles

Cycle freedom is verified by a depth-bounded DFS traversal. The traversal visits every node and follows all outgoing edges. If a node is visited while already on the current DFS path, a cycle is detected.

### Algorithm

```typescript
type HasNoCycles<
  TGraph extends GraphNodes,
  TDepth extends ReadonlyArray<unknown> = BuildCounter<30>,
> = CheckAllNodes<TGraph, keyof TGraph & string, TDepth>;

type CheckAllNodes<
  TGraph extends GraphNodes,
  TRemaining extends string,
  TDepth extends ReadonlyArray<unknown>,
> = [TRemaining] extends [never]
  ? true
  : TRemaining extends infer TNode extends string
    ? DFSVisit<TGraph, TNode, never, TDepth> extends "CYCLE_DETECTED"
      ? false
      : CheckAllNodes<TGraph, Exclude<TRemaining, TNode>, TDepth>
    : true;

type DFSVisit<
  TGraph extends GraphNodes,
  TNode extends string,
  TPath extends string,
  TDepth extends ReadonlyArray<unknown>,
> = TDepth extends []
  ? "DEPTH_EXCEEDED"
  : TNode extends TPath
    ? "CYCLE_DETECTED"
    : TGraph[TNode]["requires"][number] extends infer TDep extends string
      ? [TDep] extends [never]
        ? "OK"
        : TDep extends string
          ? DFSVisit<TGraph, TDep, TPath | TNode, Pop<TDepth>> extends "CYCLE_DETECTED"
            ? "CYCLE_DETECTED"
            : "OK"
          : "OK"
      : "OK";
```

### Depth exceeded behavior

When DFS exceeds the depth counter, the result is `"DEPTH_EXCEEDED"` rather than `"CYCLE_DETECTED"`. The caller interprets this based on configuration:

- **Default mode**: `DEPTH_EXCEEDED` produces a compile-time error string via template literal types.
- **Extended depth mode** (`withExtendedDepth()`): `DEPTH_EXCEEDED` produces a warning exposed via `$depthWarnings`, and runtime validation handles the check.

**Cross-reference**: [BEH-GR-02](../behaviors/02-cycle-detection.md), [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph).

## IsComplete

Completeness verifies that every port referenced in an adapter's `requires` tuple has a corresponding provider in the graph. A complete graph can resolve every port without "missing service" errors.

### Algorithm

```typescript
type IsComplete<TGraph extends GraphNodes> = {
  [K in keyof TGraph & string]: TGraph[K]["requires"][number] extends infer TReq extends string
    ? [TReq] extends [never]
      ? true
      : TReq extends keyof TGraph
        ? true
        : false
    : true;
}[keyof TGraph & string] extends true
  ? true
  : false;

// When completeness fails, extract the unsatisfied ports for error reporting:
type UnsatisfiedPorts<TGraph extends GraphNodes> = {
  [K in keyof TGraph & string]: TGraph[K]["requires"][number] extends infer TReq extends string
    ? TReq extends keyof TGraph
      ? never
      : TReq
    : never;
}[keyof TGraph & string];
// Produces: "CacheService" | "TokenStore" (the missing ports)
```

`UnsatisfiedPorts` is used by `GraphBuilder.build()` to produce the template literal error message: `"ERROR[HEX008]: Missing adapters for CacheService, TokenStore"`.

**Cross-reference**: [BEH-GR-05](../behaviors/05-operation-completeness.md), [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## TopologicalOrder

Topological ordering determines the initialization sequence: dependencies are initialized before their dependents. The type-level algorithm uses iterative source removal (Kahn's algorithm).

### Algorithm

```typescript
type TopologicalOrder<
  TGraph extends GraphNodes,
  TRemaining extends string = keyof TGraph & string,
  TAcc extends ReadonlyArray<string> = [],
  TDepth extends ReadonlyArray<unknown> = BuildCounter<50>,
> = TDepth extends []
  ? TAcc // Partial order (depth exceeded)
  : [TRemaining] extends [never]
    ? TAcc // All nodes ordered
    : FindSources<TGraph, TRemaining> extends infer TSources extends string
      ? [TSources] extends [never]
        ? TAcc // Remaining nodes form a cycle (caught by HasNoCycles)
        : TopologicalOrder<TGraph, Exclude<TRemaining, TSources>, [...TAcc, TSources], Pop<TDepth>>
      : TAcc;

type FindSources<TGraph extends GraphNodes, TRemaining extends string> = {
  [K in TRemaining]: HasIncomingEdge<TGraph, K, TRemaining> extends false ? K : never;
}[TRemaining];

type HasIncomingEdge<
  TGraph extends GraphNodes,
  TTarget extends string,
  TRemaining extends string,
> = {
  [K in TRemaining]: TTarget extends TGraph[K]["requires"][number] ? true : never;
}[TRemaining] extends never
  ? false
  : true;
```

### Usage

The topological order type is used by [BEH-GR-09](../behaviors/09-init-order-verification.md) to verify initialization order and by the container runtime to determine disposal order (reverse topological order).

**Cross-reference**: [BEH-GR-09](../behaviors/09-init-order-verification.md).

## TypeScript Recursion Limit Strategies

TypeScript's conditional type recursion limit (~50 levels in TypeScript 5.x) constrains type-level graph algorithms. The following strategies mitigate this:

### 1. Depth counter pattern

Every recursive type includes a counter that decrements with each recursion step. When the counter reaches zero, the computation returns a safe fallback:

```typescript
type BuildCounter<
  N extends number,
  Acc extends ReadonlyArray<unknown> = [],
> = Acc["length"] extends N ? Acc : BuildCounter<N, [...Acc, unknown]>;

type Pop<T extends ReadonlyArray<unknown>> = T extends [unknown, ...infer Rest] ? Rest : [];
```

### 2. Budget allocation

The total recursion budget (~50 levels) is shared across all type-level computations triggered by a single `GraphBuilder` method call. The budget is partitioned:

| Computation              | Allocated depth | Notes                               |
| ------------------------ | --------------- | ----------------------------------- |
| Cycle detection DFS      | 30              | Longest dependency chain            |
| Captive dependency check | 10              | Direct edges + one transitive level |
| Completeness check       | 5               | Single-pass membership test         |
| Framework overhead       | 5               | Type mapping, union distribution    |

### 3. Configurable depth

`GraphBuilder.withMaxDepth<N>()` allows users to increase the DFS budget for larger graphs (up to ~100 with `withExtendedDepth()`). The trade-off is slower type-checking.

### 4. Graceful degradation

When depth is exceeded with `withExtendedDepth()` enabled, the type-level check produces a warning (exposed via `$depthWarnings`) rather than an error. Runtime validation in `.build()` performs the same check without depth limits.

### 5. Memoization via mapped types

Where possible, intermediate results are cached in mapped types to avoid recomputing the same type-level expressions. For example, the edge derivation `DeriveEdges<TNodes>` is computed once and reused across cycle detection, completeness checking, and topological sort.

## Cross-Reference Summary

| Type                  | Invariant                                                    | Behavior                                                | ADR                                                        |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| `HasNoCycles<G>`      | [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph)       | [BEH-GR-02](../behaviors/02-cycle-detection.md)         | [ADR-GR-003](../decisions/003-full-type-level-topology.md) |
| `IsComplete<G>`       | [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage) | [BEH-GR-05](../behaviors/05-operation-completeness.md)  | [ADR-GR-003](../decisions/003-full-type-level-topology.md) |
| `TopologicalOrder<G>` | --                                                           | [BEH-GR-09](../behaviors/09-init-order-verification.md) | [ADR-GR-003](../decisions/003-full-type-level-topology.md) |

## Research

- [RES-08](../../../research/RES-08-refinement-dependent-types-graph-safety.md): Refinement & Dependent Types for Compile-Time Graph Safety
