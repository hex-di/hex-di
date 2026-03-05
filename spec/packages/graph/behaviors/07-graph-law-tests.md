# 07 — Graph Composition Law Tests

Property-based verification that the graph builder satisfies algebraic composition laws. Merge is associative with an identity element, provide is idempotent, and build is deterministic. Uses fast-check arbitraries for adapters and builders. See [RES-07](../../../research/RES-07-category-theory-composition.md) (Category Theory & Extensible Effects).

## BEH-GR-07-001: Merge Associativity

Merging three graph builders produces the same result regardless of grouping: `(A.merge(B)).merge(C)` is equivalent to `A.merge(B.merge(C))`.

```ts
type MergeAssociativity<
  A extends GraphBuilder<any, any, any, any, any>,
  B extends GraphBuilder<any, any, any, any, any>,
  C extends GraphBuilder<any, any, any, any, any>,
> = GraphEquivalent<
  ReturnType<ReturnType<A["merge"]<B>>["merge"]<C>>,
  ReturnType<A["merge"]<ReturnType<B["merge"]<C>>>>
>;
```

**Algorithm**:

1. Generate three arbitrary builders A, B, C using fast-check arbitraries
2. Compute the left-grouped merge: `left = A.merge(B).merge(C)`
3. Compute the right-grouped merge: `right = A.merge(B.merge(C))`
4. Assert structural equivalence:
   a. Both builders contain the same set of adapter registrations (order-insensitive)
   b. Both builders produce the same set of provided port names
   c. Both builders produce the same set of required port names
   d. Both builders produce the same set of override port names
5. Assert build equivalence: if one builds successfully, so does the other, producing graphs with the same port resolution behavior

**Behavior Table**:

| A          | B            | C         | `(A.merge(B)).merge(C)`     | `A.merge(B.merge(C))`       | Equivalent |
| ---------- | ------------ | --------- | --------------------------- | --------------------------- | ---------- |
| empty      | empty        | empty     | empty                       | empty                       | Yes        |
| `{Logger}` | `{Database}` | `{Cache}` | `{Logger, Database, Cache}` | `{Logger, Database, Cache}` | Yes        |
| `{Logger}` | empty        | `{Cache}` | `{Logger, Cache}`           | `{Logger, Cache}`           | Yes        |
| `{A→B}`    | `{B→C}`      | `{C}`     | `{A→B, B→C, C}`             | `{A→B, B→C, C}`             | Yes        |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, SINGLETON, ok } from "@hex-di/core";
import * as fc from "fast-check";

// Arbitrary adapter generator
const adapterArb = fc
  .record({
    name: fc.string({ minLength: 1, maxLength: 10 }),
    deps: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  })
  .map(({ name, deps }) => createTestAdapter(name, deps));

// Arbitrary builder generator
const builderArb = fc
  .array(adapterArb, { maxLength: 5 })
  .map(adapters => adapters.reduce((b, a) => b.provide(a), GraphBuilder.create()));

fc.assert(
  fc.property(builderArb, builderArb, builderArb, (a, b, c) => {
    const left = a.merge(b).merge(c);
    const right = a.merge(b.merge(c));

    // Same adapter sets (order-insensitive)
    expect(new Set(left.adapters.map(a => a.name))).toEqual(
      new Set(right.adapters.map(a => a.name))
    );

    // Same override port names
    expect(left.overridePortNames).toEqual(right.overridePortNames);
  })
);
```

**Design notes**:

- Adapter ordering within the merged builder may differ between left-grouped and right-grouped merges. Equivalence is defined by set equality of adapter registrations, not array order.
- This law follows from the monoid structure described in `builder-merge.ts`: adapter arrays are concatenated, and concatenation is associative.
- Cross-ref: [RES-07](../../../research/RES-07-category-theory-composition.md) Finding 1 (Fong, Spivak — compositionality as universal property).

## BEH-GR-07-002: Merge Identity

Merging any builder with an empty builder produces an equivalent builder: `A.merge(empty) ≡ A` and `empty.merge(A) ≡ A`.

```ts
type MergeIdentity<
  A extends GraphBuilder<any, any, any, any, any>,
> = GraphEquivalent<
  ReturnType<A["merge"]<GraphBuilder<never, never, never, never, DefaultInternals>>>,
  A
>;
```

**Algorithm**:

1. Generate an arbitrary builder A using fast-check arbitraries
2. Create an empty builder: `empty = GraphBuilder.create()`
3. Compute the right-identity merge: `rightId = A.merge(empty)`
4. Compute the left-identity merge: `leftId = empty.merge(A)`
5. Assert equivalence of each with A:
   a. Same adapter registrations (same set)
   b. Same provided port names
   c. Same required port names
   d. Same override port names
6. Assert type-level equivalence: the phantom type parameters of the merged builder match those of the original

**Behavior Table**:

| A                     | Operation            | Result                | Equivalent to A |
| --------------------- | -------------------- | --------------------- | --------------- |
| empty                 | `empty.merge(empty)` | empty                 | Yes             |
| `{Logger, Database}`  | `A.merge(empty)`     | `{Logger, Database}`  | Yes             |
| `{Logger, Database}`  | `empty.merge(A)`     | `{Logger, Database}`  | Yes             |
| `{A→B, B}` (complete) | `A.merge(empty)`     | `{A→B, B}` (complete) | Yes             |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";
import * as fc from "fast-check";

fc.assert(
  fc.property(builderArb, a => {
    const empty = GraphBuilder.create();

    const rightId = a.merge(empty);
    const leftId = empty.merge(a);

    // Right identity: A.merge(empty) ≡ A
    expect(rightId.adapters).toEqual(a.adapters);
    expect(rightId.overridePortNames).toEqual(a.overridePortNames);

    // Left identity: empty.merge(A) ≡ A
    expect(leftId.adapters).toEqual(a.adapters);
    expect(leftId.overridePortNames).toEqual(a.overridePortNames);
  })
);
```

**Design notes**:

- The empty builder (`GraphBuilder.create()`) is the identity element of the merge monoid. Its adapter array is `[]` and its override set is `∅`.
- At the type level, `never` (the initial TProvides and TRequires) is the identity element for union types: `T | never ≡ T`.
- Cross-ref: [RES-07](../../../research/RES-07-category-theory-composition.md) Finding 2 (Kiselyov — `ok()` as left/right identity for `andThen`).

## BEH-GR-07-003: Provide Idempotence

Providing the same adapter twice produces the same result as providing it once, or produces a deterministic duplicate error. The builder never enters an inconsistent state from repeated registrations.

```ts
function verifyProvideIdempotence<A extends AdapterConstraint>(adapter: A): void;
```

**Algorithm**:

1. Generate an arbitrary adapter A using fast-check arbitraries
2. Create builder with single provide: `single = GraphBuilder.create().provide(A)`
3. Attempt double provide: `double = GraphBuilder.create().provide(A).provide(A)`
4. Assert one of two outcomes:
   a. **Duplicate detection**: The second `provide(A)` produces a compile-time error (duplicate port) or runtime error at `build()`. The error identifies the duplicated port name.
   b. **Idempotent acceptance**: If the builder allows re-registration (future override semantics), the resulting graph resolves the port to the same adapter instance.
5. In either case, the builder remains internally consistent — no corrupted state, no partial registrations.

**Behavior Table**:

| Adapter                              | `provide(A)` | `provide(A).provide(A)`               | Result              |
| ------------------------------------ | ------------ | ------------------------------------- | ------------------- |
| `LoggerAdapter`                      | `{Logger}`   | Compile error: duplicate `"Logger"`   | Deterministic error |
| `DbAdapter`                          | `{Database}` | Compile error: duplicate `"Database"` | Deterministic error |
| Two different adapters for same port | `{Port}`     | Compile error: duplicate port         | Deterministic error |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, SINGLETON, ok } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}
const LoggerPort = port<Logger>()({ name: "Logger" });

const loggerAdapter = createAdapter({
  provides: [LoggerPort],
  factory: () => ok({ log: (msg: string) => console.log(msg) }),
  lifetime: SINGLETON,
});

// Compile-time error: duplicate provider for "Logger"
const builder = GraphBuilder.create().provide(loggerAdapter).provide(loggerAdapter); // ERROR[HEX001]: Duplicate adapter for port "Logger"
```

**Design notes**:

- Current implementation rejects duplicates at both compile time (via type-level overlap detection) and runtime (via build validation). This test verifies the error is stable and deterministic.
- Idempotence here means "repeated application produces the same observable effect" — which includes producing the same error consistently.
- Cross-ref: [INV-GR-4](../invariants.md#inv-gr-4-no-duplicate-providers).

## BEH-GR-07-004: Build Determinism

Given identical adapter registrations in the same order, `build()` always produces the same graph structure. Port resolution order, initialization tier assignment, and disposal ordering are deterministic.

```ts
function verifyBuildDeterminism(adapters: ReadonlyArray<AdapterConstraint>): void;
```

**Algorithm**:

1. Generate an arbitrary set of adapters (with satisfied dependencies) using fast-check arbitraries
2. Build the graph N times (N >= 10) with the same adapter sequence
3. For each pair of built graphs, assert:
   a. Same set of provided port names
   b. Same topological order (initialization sequence)
   c. Same disposal order (reverse topological)
   d. Resolving the same port produces structurally equivalent instances
4. Verify that the inspection output is identical across all builds:
   a. Same `maxChainDepth`
   b. Same `unsatisfiedRequirements` (should be empty)
   c. Same `provides` array
   d. Same `adapterCount`

**Behavior Table**:

| Registration Order          | Build 1           | Build 2           | Deterministic |
| --------------------------- | ----------------- | ----------------- | ------------- |
| `[Logger, Database, Cache]` | Graph G1          | Graph G2          | G1 ≡ G2       |
| `[A→B, B→C, C]`             | Topo: `[C, B, A]` | Topo: `[C, B, A]` | Yes           |
| `[A, B]` (independent)      | Stable order      | Same stable order | Yes           |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";
import * as fc from "fast-check";

fc.assert(
  fc.property(satisfiedBuilderArb, builder => {
    const graph1 = builder.build();
    const graph2 = builder.build();

    const inspection1 = builder.inspect();
    const inspection2 = builder.inspect();

    // Structural determinism
    expect(inspection1.provides).toEqual(inspection2.provides);
    expect(inspection1.maxChainDepth).toBe(inspection2.maxChainDepth);
    expect(inspection1.adapterCount).toBe(inspection2.adapterCount);
    expect(inspection1.unsatisfiedRequirements).toEqual(inspection2.unsatisfiedRequirements);
  })
);
```

**Design notes**:

- Determinism is a consequence of the immutable builder design: `GraphBuilder` instances are frozen after construction, adapter arrays are frozen, and all operations produce new instances.
- For independent adapters (no dependency edges between them), the stable ordering is defined by registration order. This is a design choice — topological sort has multiple valid orderings for unrelated nodes, and we break ties by insertion order.
- Cross-ref: [RES-07](../../../research/RES-07-category-theory-composition.md) Finding 1 (compositionality guarantees).
