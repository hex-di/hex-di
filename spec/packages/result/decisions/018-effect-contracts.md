# ADR-018: Effect Contracts

## Status

Proposed (Tier 3 — Long-term)

## Context

Functions in `@hex-di/result` return `Result<T, E>` where `E` declares the possible error types. However, there is no mechanism to declare and verify effect contracts at the **function level** — ensuring that a function's actual error behavior matches its declared contract.

In type-and-effect systems (see [RES-01](../../../research/RES-01-type-and-effect-systems.md)), function types include their effect signatures: `f: A → B ! {E1, E2}` means "f takes A, returns B, and may produce effects E1 or E2". TypeScript's Result pattern encodes this as `f: (a: A) => Result<B, E1 | E2>`, but there is no enforcement that the implementation actually produces only `E1 | E2` — it could produce additional unlisted effects.

### Problem

```typescript
// Declared contract: only NotFound and Timeout
type FetchUser = (id: string) => Result<User, NotFound | Timeout>;

// Implementation accidentally introduces a new effect
const fetchUser: FetchUser = id => {
  if (!id) return err({ _tag: "ValidationError", field: "id" }); // Not in contract!
  // TypeScript allows this because ValidationError is assignable to the error union
  // only if the union is widened — but in practice, err() infers the literal type
  // ...
};
```

### Desired capability

```typescript
type FetchUserContract = EffectContract<string, User, NotFound | Timeout>;

// Compile-time verification
type Check = SatisfiesContract<typeof fetchUserImpl, FetchUserContract>;
// If fetchUserImpl produces ValidationError, Check = EffectViolation<...>
```

## Decision

**Introduce `EffectContract<In, Out, Effects>` as a type-level function contract and `SatisfiesContract<Fn, Contract>` as a type-level verification predicate.**

### EffectContract

```typescript
type EffectContract<In, Out, Effects> = {
  readonly _brand: unique symbol;
  readonly _in: In;
  readonly _out: Out;
  readonly _effects: Effects;
};
```

A phantom type that exists purely at the type level. Zero runtime cost.

### SatisfiesContract

```typescript
type SatisfiesContract<Fn, Contract> =
  // Check input compatibility
  // Check output compatibility
  // Check effect compatibility (Fn's effects ⊆ Contract's effects)
  // Return true or descriptive error type
```

Verifies that a function's type satisfies a contract's declared input, output, and effect types.

### Contract composition

```typescript
type ComposeContracts<C1, C2> = EffectContract<
  C1["_in"],
  C2["_out"],
  C1["_effects"] | C2["_effects"]
>;
```

Effects accumulate through composition (union). This matches the behavior of `andThen` chaining.

### Subeffecting

A function producing a **subset** of declared effects satisfies the contract. This follows the standard subeffecting rule from type-and-effect systems: if `E ⊆ F`, then `A → Result<B, E>` satisfies `EffectContract<A, B, F>`.

## Consequences

### Positive

1. **Declared effects**: Function contracts make effect profiles explicit and machine-checkable
2. **Composition tracking**: Contract composition computes the combined effect profile of function pipelines
3. **Subeffecting**: Natural support for functions that are "more pure" than their contract requires

### Negative

1. **Type-level only**: No runtime enforcement — contracts are verified statically
2. **Voluntary adoption**: Developers must explicitly define contracts; there is no automatic contract inference
3. **Type complexity**: Contract types add depth to type signatures, potentially producing verbose error messages

### Neutral

1. **Zero runtime cost**: All contract types are phantoms — erased at compilation
2. **Incremental adoption**: Contracts can be added to existing functions without changing their implementation

## References

- [BEH-18](../behaviors/18-effect-contracts.md): Effect Contracts behavior
- [type-system/effect-polymorphism.md](../type-system/effect-polymorphism.md): Effect type operations
- [RES-01](../../../research/RES-01-type-and-effect-systems.md): Type & Effect Systems
