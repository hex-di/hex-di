# 10 - Generator-Based Early Return

_Previous: [09 - ResultAsync](./09-async.md)_

---

## 45. safeTry (sync)

`safeTry` uses JavaScript generators to emulate Rust's `?` operator. Inside a `safeTry` block, `yield*` on a `Result` either extracts the Ok value or early-returns the Err.

```typescript
function safeTry<T, E>(
  generator: () => Generator<Err<never, E>, Result<T, E>, unknown>
): Result<T, E>;
```

### Usage

```typescript
import { safeTry, ok, err } from "@hex-di/result";

function processOrder(raw: string): Result<Order, ParseError | ValidationError | DbError> {
  return safeTry(function* () {
    const input = yield* parseInput(raw); // Result<Input, ParseError>
    const validOrder = yield* validateOrder(input); // Result<ValidOrder, ValidationError>
    const saved = yield* saveOrder(validOrder); // Result<Order, DbError>
    return ok(saved);
  });
}
```

### How it works

1. `safeTry` invokes the generator function
2. Each `yield*` passes a `Result` to the generator runtime
3. If the Result is `Ok`, the value is returned from `yield*` as the expression result
4. If the Result is `Err`, the generator short-circuits and `safeTry` returns that `Err`
5. If the generator completes (reaches `return`), `safeTry` returns the returned Result

This is possible because `Result` implements the iterator protocol for generator interop:

```typescript
// On Ok<T, E>:
*[Symbol.iterator](): Generator<never, T, unknown> {
  return this.value;
}

// On Err<T, E>:
*[Symbol.iterator](): Generator<Err<never, E>, never, unknown> {
  yield this;  // Yields the Err to safeTry
  // Never reaches here -- safeTry catches the yielded Err
  throw new Error("unreachable");
}
```

### Comparison with andThen chains

```typescript
// andThen chain:
const result = parseInput(raw).andThen(validateOrder).andThen(saveOrder);

// safeTry equivalent:
const result = safeTry(function* () {
  const input = yield* parseInput(raw);
  const valid = yield* validateOrder(input);
  const saved = yield* saveOrder(valid);
  return ok(saved);
});
```

Both produce the same type: `Result<Order, ParseError | ValidationError | DbError>`.

The `safeTry` version shines when you need intermediate values or conditional logic:

```typescript
const result = safeTry(function* () {
  const user = yield* getUser(id);
  const settings = yield* getSettings(user.settingsId);

  // Conditional logic with intermediate values:
  if (settings.requiresMfa) {
    const mfa = yield* validateMfa(user, token);
    yield* recordMfaSuccess(mfa);
  }

  // Use multiple intermediate values:
  const enriched = {
    ...user,
    settings,
    lastLogin: new Date(),
  };

  return ok(enriched);
});
```

## 46. safeTry (async)

The async version uses async generators. `yield*` works with both `Result` and `ResultAsync`.

```typescript
function safeTry<T, E>(
  generator: () => AsyncGenerator<Err<never, E>, Result<T, E>, unknown>
): ResultAsync<T, E>;
```

### Usage

```typescript
const result = safeTry(async function* () {
  const user = yield* await fetchUser(id); // ResultAsync → await → Result → yield*
  const profile = yield* await fetchProfile(user); // ResultAsync → await → Result → yield*
  const saved = yield* saveLocally(profile); // sync Result → yield*
  return ok(saved);
});
// Type: ResultAsync<SavedProfile, FetchError | ProfileError | SaveError>
```

### The `yield* await` pattern

For `ResultAsync` values, you need `yield* await`:

1. `await` resolves the `ResultAsync` to a `Result`
2. `yield*` extracts the Ok value or early-returns the Err

```typescript
safeTry(async function* () {
  // ResultAsync: use yield* await
  const user = yield* await fetchUser(id);

  // sync Result: use yield* directly
  const validated = yield* validateUser(user);

  // Plain Promise: use await (not yield*) -- won't short-circuit
  const timestamp = await getTimestamp();

  return ok({ user: validated, timestamp });
});
```

### Error type accumulation in generators

TypeScript tracks error types through the generator:

```typescript
const result = safeTry(async function* () {
  const a = yield* await stepA(); // E1
  const b = yield* stepB(a); // E2
  const c = yield* await stepC(b); // E3
  return ok(c);
});
// Type: ResultAsync<C, E1 | E2 | E3>
```

## 47. Yield Protocol

The `yield*` mechanism works through the iterator protocol. Both `Ok` and `Err` implement `[Symbol.iterator]` with specific behavior:

### Ok iterator

When `yield*` encounters an `Ok`, it returns the value immediately:

```typescript
// Conceptually:
function* okIterator<T>(value: T): Generator<never, T, unknown> {
  return value;
}
```

The generator continues execution with `value` as the expression result of `yield*`.

### Err iterator

When `yield*` encounters an `Err`, it yields the error to `safeTry`:

```typescript
// Conceptually:
function* errIterator<E>(error: E): Generator<Err<never, E>, never, unknown> {
  yield err(error);
  // Unreachable -- safeTry catches the yield and terminates the generator
}
```

`safeTry` receives the yielded `Err` and returns it immediately, stopping the generator.

### Type safety

The generator's yield type is `Err<never, E>` where `E` is the union of all error types from all `yield*` expressions. TypeScript infers this union automatically.

```typescript
safeTry(function* () {
  yield* ok(1); // yields nothing (Ok), returns 1
  yield* err("fail"); // yields Err<never, string>, returns never
  // Code after yield* err is unreachable -- TypeScript knows this
});
```

## 48. Comparison with Rust's ? Operator

### Rust

```rust
fn process_order(raw: &str) -> Result<Order, AppError> {
    let input = parse_input(raw)?;         // ? = early return on Err
    let valid = validate_order(input)?;
    let saved = save_order(valid)?;
    Ok(saved)
}
```

### @hex-di/result (safeTry)

```typescript
function processOrder(raw: string): Result<Order, AppError> {
  return safeTry(function* () {
    const input = yield* parseInput(raw); // yield* = early return on Err
    const valid = yield* validateOrder(input);
    const saved = yield* saveOrder(valid);
    return ok(saved);
  });
}
```

### Differences

| Feature          | Rust `?`                | `safeTry` `yield*`                  |
| ---------------- | ----------------------- | ----------------------------------- |
| Syntax           | `expr?`                 | `yield* expr`                       |
| Async            | `expr.await?`           | `yield* await expr`                 |
| Error conversion | Via `From<E>` trait     | Manual via `mapErr` before `yield*` |
| Performance      | Zero-cost abstraction   | Generator overhead (negligible)     |
| IDE support      | Full (language feature) | Partial (generator inference)       |
| Scope            | Function-level          | Generator block-level               |

### When to use safeTry vs. andThen chains

**Prefer andThen chains when:**

- The chain is linear (each step uses only the previous step's output)
- No conditional logic between steps
- The chain is short (2-4 steps)

**Prefer safeTry when:**

- You need intermediate values from multiple steps
- The flow has conditional branches
- You need to combine values from different steps
- The chain is long and readability suffers with nesting

```typescript
// andThen: clean for linear chains
parseInput(raw).andThen(validate).andThen(save);

// safeTry: clean for complex flows
safeTry(function* () {
  const input = yield* parseInput(raw);
  const config = yield* loadConfig(input.configId);

  const validated = config.strictMode
    ? yield* strictValidate(input)
    : yield* lenientValidate(input);

  const saved = yield* save({ ...validated, config });
  return ok(saved);
});
```

---

_Previous: [09 - ResultAsync](./09-async.md) | Next: [11 - Error Patterns](./11-error-patterns.md)_
