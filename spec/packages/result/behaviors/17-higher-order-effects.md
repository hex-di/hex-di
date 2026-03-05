# 17 — Higher-Order Effect Handlers

Handler composition for effect-based error handling. Enables combining multiple handlers into composite handlers that process effect chains. See [ADR-017](../decisions/017-higher-order-effect-handlers.md), [RES-01](../../../research/RES-01-type-and-effect-systems.md), and [RES-07](../../../research/RES-07-category-theory-composition.md).

## BEH-17-001: ComposeHandlers<H1, H2>

Compose two effect handlers into a single handler that applies both in sequence. The composed handler processes errors from the union of both handlers' input types.

```ts
type ComposeHandlers<
  H1 extends EffectHandler<unknown, unknown>,
  H2 extends EffectHandler<unknown, unknown>,
> = EffectHandler<InputOf<H1> | InputOf<H2>, OutputOf<H1> & OutputOf<H2>>;

interface EffectHandler<TIn, TOut> {
  readonly _tag: string;
  readonly handle: (error: TIn) => Result<TOut, never>;
}

function composeHandlers<
  H1 extends EffectHandler<unknown, unknown>,
  H2 extends EffectHandler<unknown, unknown>,
>(h1: H1, h2: H2): ComposeHandlers<H1, H2>;
```

**Exported from**: `handlers/compose.ts` (proposed).

**Algorithm**:

1. Accept two handlers `h1` and `h2`
2. Create a new handler whose `handle` function:
   a. Attempts to match the error against `h1`'s input type
   b. If `h1` matches, apply `h1.handle(error)` and return the result
   c. If `h1` does not match, attempt `h2`
   d. If `h2` matches, apply `h2.handle(error)` and return the result
   e. If neither matches, pass through unchanged
3. The composed handler's type eliminates all tags handled by either `h1` or `h2`

**Behavior Table**:

| Error                  | H1 handles | H2 handles | Result                                |
| ---------------------- | ---------- | ---------- | ------------------------------------- |
| `{ _tag: "NotFound" }` | Yes        | No         | H1 processes it                       |
| `{ _tag: "Timeout" }`  | No         | Yes        | H2 processes it                       |
| `{ _tag: "NotFound" }` | Yes        | Yes        | H1 takes precedence (left-biased)     |
| `{ _tag: "Unknown" }`  | No         | No         | Pass-through (stays in error channel) |

**Example**:

```ts
import { composeHandlers, catchTag, ok } from "@hex-di/result";

const handleNotFound = {
  _tag: "NotFoundHandler" as const,
  handle: (e: { _tag: "NotFound" }) => ok(defaultUser),
};

const handleTimeout = {
  _tag: "TimeoutHandler" as const,
  handle: (e: { _tag: "Timeout" }) => ok(cachedUser),
};

const combined = composeHandlers(handleNotFound, handleTimeout);
// Type: EffectHandler<{ _tag: "NotFound" } | { _tag: "Timeout" }, User>

const result: Result<User, AppError> = fetchUser("123");
const handled = result.applyHandler(combined);
// Type: Result<User, Exclude<AppError, { _tag: "NotFound" | "Timeout" }>>
```

**Design notes**:

- Composition is left-biased: when both handlers match, `h1` takes precedence. This follows the convention of `catchTags` where the first matching handler wins.
- Composed handlers are themselves composable: `composeHandlers(composeHandlers(a, b), c)` works and satisfies associativity.
- The composition must satisfy the handler identity law: `composeHandlers(h, identityHandler) ≡ h`.
- Cross-ref: [RES-07](../../../research/RES-07-category-theory-composition.md) for the category-theoretic foundation of handler composition.

## BEH-17-002: Effect Transformation Chains

Chain multiple effect transformations that progressively narrow the error type. Each step in the chain eliminates one or more error tags.

```ts
// Method on Result<T, E>
transformEffects<
  Steps extends ReadonlyArray<EffectHandler<unknown, unknown>>
>(
  ...steps: Steps
): Result<T | UnionOfOutputs<Steps>, NarrowedError<E, Steps>>;
```

**Algorithm**:

1. Accept a tuple of effect handlers
2. Apply handlers left-to-right, each narrowing the error type
3. The final result's error type is `E` with all handled tags excluded
4. The value type is `T | (union of all handler output types)`

**Behavior Table**:

| Initial E     | Step 1 handles | Step 2 handles | Final E |
| ------------- | -------------- | -------------- | ------- |
| `A \| B \| C` | `A`            | `B`            | `C`     |
| `A \| B \| C` | `A \| B`       | `C`            | `never` |
| `A \| B`      | `A`            | —              | `B`     |

**Example**:

```ts
import { ok, err } from "@hex-di/result";

type AppError =
  | { _tag: "NotFound"; id: string }
  | { _tag: "Timeout"; ms: number }
  | { _tag: "Forbidden"; role: string };

declare function fetchUser(id: string): Result<User, AppError>;

const result = fetchUser("123").transformEffects(
  { _tag: "NotFoundHandler", handle: e => ok(defaultUser) },
  { _tag: "TimeoutHandler", handle: e => ok(cachedUser) }
);
// Type: Result<User, { _tag: "Forbidden"; role: string }>
```

**Design notes**:

- `transformEffects` is syntactic sugar over chained `catchTag` calls. The advantage is a single call site with explicit transformation pipeline.
- The chain must satisfy associativity: reordering independent handlers (that handle disjoint tags) produces the same result.
- Cross-ref: [BEH-15-001](15-effect-error-handling.md) for the underlying `catchTag` mechanism.

## BEH-17-003: Handler Algebra Properties

Effect handlers form an algebraic structure with specific laws that enable safe composition.

```ts
// Identity handler: does nothing, passes all errors through
const identityHandler: EffectHandler<never, never>;

// Handler composition is associative:
// compose(compose(h1, h2), h3) ≡ compose(h1, compose(h2, h3))

// Identity law:
// compose(h, identity) ≡ h
// compose(identity, h) ≡ h
```

**Verified via**: Property-based testing with `fast-check` (see [BEH-16](16-property-based-laws.md)).

**Behavior Table**:

| Law            | LHS                         | RHS                         | Must be equal? |
| -------------- | --------------------------- | --------------------------- | -------------- |
| Left identity  | `compose(id, h)`            | `h`                         | Yes            |
| Right identity | `compose(h, id)`            | `h`                         | Yes            |
| Associativity  | `compose(compose(a, b), c)` | `compose(a, compose(b, c))` | Yes            |

**Design notes**:

- The handler algebra forms a **monoid** (associative binary operation with identity). This is the category-theoretic foundation for reliable handler composition.
- The identity handler has input type `never` (handles no errors) and output type `never` (produces no values). Composing it with any handler is a no-op at both type and runtime levels.
- This algebra enables future optimizations: composed handlers can be flattened into a single dispatch table.
- Cross-ref: [RES-07](../../../research/RES-07-category-theory-composition.md) for monoid and category theory foundations.
