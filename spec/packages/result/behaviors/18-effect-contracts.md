# 18 — Effect Contracts

Type-level function contracts that declare effects (error types) as part of the function signature. Enables compile-time verification that implementations satisfy their declared effect profiles. See [ADR-018](../decisions/018-effect-contracts.md) and [RES-01](../../../research/RES-01-type-and-effect-systems.md).

## BEH-18-001: EffectContract<In, Out, Effects>

A type-level function contract declaring input type, output type, and the set of effects (error tags) the function may produce.

```ts
type EffectContract<In, Out, Effects extends TaggedError<string, Record<string, unknown>>> = {
  readonly _brand: unique symbol;
  readonly _in: In;
  readonly _out: Out;
  readonly _effects: Effects;
};

// Constructor
function defineContract<
  In,
  Out,
  Effects extends TaggedError<string, Record<string, unknown>>,
>(): EffectContract<In, Out, Effects>;
```

**Exported from**: `contracts/effect-contract.ts` (proposed).

**Algorithm**:

1. Define a contract with `defineContract<In, Out, Effects>()`
2. The contract exists only at the type level (zero runtime cost)
3. Functions annotated with the contract must return `Result<Out, Effects>`
4. The `Effects` parameter is the union of all possible error tags

**Behavior Table**:

| Contract Definition                                          | Valid Implementation                                           | Invalid Implementation                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `EffectContract<string, User, NotFoundError>`                | `(id: string) => Result<User, NotFoundError>`                  | `(id: string) => Result<User, NotFoundError \| TimeoutError>` (extra effect)          |
| `EffectContract<string, User, never>`                        | `(id: string) => Result<User, never>` (pure)                   | `(id: string) => Result<User, SomeError>` (not pure)                                  |
| `EffectContract<UserData, User, ValidationError \| DBError>` | `(data: UserData) => Result<User, ValidationError \| DBError>` | `(data: UserData) => Result<User, ValidationError>` (subset — valid via subeffecting) |

**Example**:

```ts
import { defineContract, type EffectContract, type TaggedError } from "@hex-di/result";

type NotFound = TaggedError<"NotFound", { id: string }>;
type Timeout = TaggedError<"Timeout", { ms: number }>;

// Define a contract: fetchUser may produce NotFound or Timeout effects
type FetchUserContract = EffectContract<string, User, NotFound | Timeout>;

// Implementation must satisfy the contract
const fetchUser: SatisfiesContract<typeof fetchUserImpl, FetchUserContract> = (
  id: string
): Result<User, NotFound | Timeout> => {
  // ... implementation
};
```

**Design notes**:

- Effect contracts are pure types — no runtime representation, no performance cost.
- A function may produce a **subset** of declared effects (subeffecting). A contract declaring `NotFound | Timeout` is satisfied by a function that only produces `NotFound`.
- Cross-ref: [RES-01](../../../research/RES-01-type-and-effect-systems.md) for type-and-effect system foundations.

## BEH-18-002: SatisfiesContract<Fn, Contract>

A type-level predicate that verifies a function type satisfies an effect contract. Returns `true` if the function's input, output, and effect types are compatible with the contract.

```ts
type SatisfiesContract<
  Fn extends (...args: ReadonlyArray<unknown>) => Result<unknown, unknown>,
  Contract extends EffectContract<unknown, unknown, unknown>,
> =
  Parameters<Fn> extends [Contract["_in"]]
    ? InferOk<ReturnType<Fn>> extends Contract["_out"]
      ? InferErr<ReturnType<Fn>> extends Contract["_effects"]
        ? true
        : EffectViolation<InferErr<ReturnType<Fn>>, Contract["_effects"]>
      : OutputViolation<InferOk<ReturnType<Fn>>, Contract["_out"]>
    : InputViolation<Parameters<Fn>, [Contract["_in"]]>;

type EffectViolation<Actual, Expected> = {
  readonly _error: "EFFECT_VIOLATION";
  readonly unexpected: Exclude<Actual, Expected>;
  readonly declared: Expected;
};
```

**Algorithm**:

1. Check that the function's parameter type is assignable to the contract's `In` type
2. Check that the function's `Ok` return type is assignable to the contract's `Out` type
3. Check that the function's `Err` type is assignable to the contract's `Effects` type
4. If all three checks pass, return `true`
5. If any check fails, return a descriptive error type identifying the violation

**Behavior Table**:

| Function Signature                                 | Contract                                            | Result                                   |
| -------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `(s: string) => Result<User, NotFound>`            | `EffectContract<string, User, NotFound>`            | `true`                                   |
| `(s: string) => Result<User, NotFound>`            | `EffectContract<string, User, NotFound \| Timeout>` | `true` (subset of effects)               |
| `(s: string) => Result<User, NotFound \| Timeout>` | `EffectContract<string, User, NotFound>`            | `EffectViolation` (Timeout not declared) |
| `(n: number) => Result<User, NotFound>`            | `EffectContract<string, User, NotFound>`            | `InputViolation`                         |

**Example**:

```ts
import { type SatisfiesContract, type EffectContract } from "@hex-di/result";

type MyContract = EffectContract<string, User, NotFound | Timeout>;

// Type check: does myFunction satisfy the contract?
type Check = SatisfiesContract<typeof myFunction, MyContract>;
// If myFunction has extra effects, Check will be an EffectViolation type
// with the unexpected effects listed
```

**Design notes**:

- `SatisfiesContract` is a type-level predicate, not a runtime check. It can be used in type assertions, conditional types, or as a constraint on generic parameters.
- Subeffecting is allowed: a function producing fewer effects than declared satisfies the contract. This follows the Liskov Substitution Principle for effects.
- The error types (`EffectViolation`, `OutputViolation`, `InputViolation`) provide human-readable type-level error messages when the contract is violated.

## BEH-18-003: Contract Composition

Compose two effect contracts to produce a contract for the composition of two functions.

```ts
type ComposeContracts<
  C1 extends EffectContract<unknown, unknown, unknown>,
  C2 extends EffectContract<unknown, unknown, unknown>,
> = C1["_out"] extends C2["_in"]
  ? EffectContract<C1["_in"], C2["_out"], C1["_effects"] | C2["_effects"]>
  : ContractCompositionError<C1["_out"], C2["_in"]>;
```

**Algorithm**:

1. Verify that `C1`'s output type is assignable to `C2`'s input type
2. If compatible, produce a new contract with:
   - Input: `C1._in`
   - Output: `C2._out`
   - Effects: `C1._effects | C2._effects` (union of both effect sets)
3. If incompatible, return a descriptive error type

**Behavior Table**:

| C1                           | C2                            | Composed Contract                                          |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `EC<string, User, NotFound>` | `EC<User, Role, Forbidden>`   | `EC<string, Role, NotFound \| Forbidden>`                  |
| `EC<string, User, NotFound>` | `EC<number, Role, Forbidden>` | `ContractCompositionError` (User not assignable to number) |
| `EC<A, B, never>`            | `EC<B, C, never>`             | `EC<A, C, never>` (pure composition)                       |

**Design notes**:

- Contract composition corresponds to function composition in the effectful domain: if `f: A → Result<B, E1>` and `g: B → Result<C, E2>`, then `g ∘ f: A → Result<C, E1 | E2>`.
- Effects accumulate via union — composition cannot eliminate effects. Effect elimination requires explicit handlers (see [BEH-17](17-higher-order-effects.md)).
- Cross-ref: [RES-07](../../../research/RES-07-category-theory-composition.md) for the category of effectful functions (Kleisli category).
