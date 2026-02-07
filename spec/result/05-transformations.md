# 05 - Transformations

_Previous: [04 - Type Guards & Narrowing](./04-type-guards.md)_

---

## 18. map

Transforms the success value while leaving errors untouched. The fundamental functor operation.

```typescript
// On Result<T, E>:
map<U>(f: (value: T) => U): Result<U, E>;
```

**Ok behavior:** Applies `f` to the value, wraps the return in `Ok`.
**Err behavior:** Returns `this` unchanged (short-circuits).

```typescript
const result: Result<number, string> = ok(42);

result.map(n => n * 2); // Ok(84)
result.map(n => String(n)); // Ok("42")
result.map(n => ({ count: n })); // Ok({ count: 42 })

const failure: Result<number, string> = err("bad");
failure.map(n => n * 2); // Err("bad") -- f is never called
```

### Chaining maps

```typescript
ok(10)
  .map(n => n + 5) // Ok(15)
  .map(n => n * 2) // Ok(30)
  .map(n => `${n}px`); // Ok("30px")
```

### map must be pure

`map` should not produce side effects. If you need side effects, use `inspect` or `andTee`. If `f` throws, the exception propagates -- this is a bug in `f`, not expected behavior. Result chains assume that mapping functions are total.

## 19. mapErr

Transforms the error value while leaving success values untouched. The dual of `map`.

```typescript
// On Result<T, E>:
mapErr<F>(f: (error: E) => F): Result<T, F>;
```

**Ok behavior:** Returns `this` unchanged.
**Err behavior:** Applies `f` to the error, wraps the return in `Err`.

```typescript
const failure: Result<number, string> = err("not a number");

failure.mapErr(msg => new Error(msg));
// Err(Error("not a number"))

failure.mapErr(msg => ({ _tag: "ParseError" as const, message: msg }));
// Err({ _tag: "ParseError", message: "not a number" })
```

### Use case: error normalization

`mapErr` is the primary tool for converting between error types at layer boundaries:

```typescript
// Repository layer returns database errors
function findUser(id: string): Result<User, DbError> { ... }

// Service layer normalizes to domain errors
function getUser(id: string): Result<User, DomainError> {
  return findUser(id).mapErr((dbErr) => ({
    _tag: "NotFound" as const,
    resource: "User",
    id,
    cause: dbErr,
  }));
}

// Controller layer normalizes to HTTP errors
function handleGetUser(id: string): Result<User, HttpError> {
  return getUser(id).mapErr((domainErr) => ({
    status: 404,
    message: `User ${domainErr.id} not found`,
  }));
}
```

## 20. mapBoth

Transforms both the success and error values in a single operation. Equivalent to calling `map` and `mapErr` together but in one pass.

```typescript
// On Result<T, E>:
mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Result<U, F>;
```

```typescript
const result: Result<number, string> = ok(42);

result.mapBoth(
  n => `Success: ${n}`,
  e => new Error(e)
);
// Ok("Success: 42")

const failure: Result<number, string> = err("bad");
failure.mapBoth(
  n => `Success: ${n}`,
  e => new Error(e)
);
// Err(Error("bad"))
```

### When to use mapBoth vs. map + mapErr

Use `mapBoth` when you need to transform both sides to a common type (e.g., for rendering):

```typescript
const message = result.mapBoth(
  user => `Welcome, ${user.name}`,
  error => `Error: ${error.message}`
);
// Type: Result<string, string>
// Then: message.merge() → string
```

## 21. flatten

Unwraps a nested Result. Converts `Result<Result<T, E1>, E2>` into `Result<T, E1 | E2>`.

```typescript
// On Result<Result<T, E1>, E2>:
flatten(): Result<T, E1 | E2>;
```

```typescript
const nested: Result<Result<number, string>, boolean> = ok(ok(42));
nested.flatten(); // Ok(42)  -- Type: Result<number, string | boolean>

const nestedErr: Result<Result<number, string>, boolean> = ok(err("inner"));
nestedErr.flatten(); // Err("inner")

const outerErr: Result<Result<number, string>, boolean> = err(true);
outerErr.flatten(); // Err(true)
```

### When flatten is useful

`flatten` is needed when a mapping function itself returns a Result:

```typescript
// This produces a nested Result:
const nested = ok(42).map(n => (n > 0 ? ok(n) : err("negative")));
// Type: Result<Result<number, string>, never>

// Flatten it:
const flat = nested.flatten();
// Type: Result<number, string>
```

In practice, `andThen` is preferred because it maps and flattens in one step. `flatten` is useful when you receive a nested Result from external code.

## 22. flip

Swaps the Ok and Err sides. Converts `Result<T, E>` to `Result<E, T>`.

```typescript
// On Result<T, E>:
flip(): Result<E, T>;
```

```typescript
ok(42).flip(); // Err(42) -- Type: Result<never, number>
err("bad").flip(); // Ok("bad") -- Type: Result<string, never>
```

### When flip is useful

Rare, but useful when you want to apply Ok-side operations to the error:

```typescript
// You have a Result<T, E> and want to map the error with andThen-like logic
result
  .flip() // Result<E, T> -- errors are now "values"
  .andThen(recoverE) // Apply recovery logic as if it were a success chain
  .flip(); // Result<T, F> -- flip back
```

This is equivalent to `orElse` and exists mainly for completeness.

---

_Previous: [04 - Type Guards & Narrowing](./04-type-guards.md) | Next: [06 - Chaining](./06-chaining.md)_
