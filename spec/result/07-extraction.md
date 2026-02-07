# 07 - Extraction

_Previous: [06 - Chaining](./06-chaining.md)_

---

## 29. match

The primary extraction method. Takes two functions -- one for Ok, one for Err -- and returns the result of whichever applies. Both branches must be provided, guaranteeing exhaustive handling.

```typescript
// On Result<T, E>:
match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A | B;
```

**Ok behavior:** Returns `onOk(value)`.
**Err behavior:** Returns `onErr(error)`.

```typescript
const result: Result<User, AppError> = getUser(id);

const response = result.match(
  user => ({ status: 200, body: user }),
  error => ({ status: error.status, body: { message: error.message } })
);
// Type: { status: number; body: User } | { status: number; body: { message: string } }
```

### match as the universal eliminator

Every other extraction method can be defined in terms of `match`:

```typescript
unwrapOr(defaultValue) ===
  result.match(
    v => v,
    () => defaultValue
  );
toNullable() ===
  result.match(
    v => v,
    () => null
  );
merge() ===
  result.match(
    v => v,
    e => e
  );
```

`match` is the safest extraction because it forces you to handle both cases.

### match with error discrimination

```typescript
type FetchError =
  | { readonly _tag: "NotFound"; readonly id: string }
  | { readonly _tag: "Unauthorized" }
  | { readonly _tag: "Network"; readonly cause: Error };

const result: Result<User, FetchError> = fetchUser(id);

result.match(
  user => renderProfile(user),
  error => {
    switch (error._tag) {
      case "NotFound":
        return renderNotFound(error.id);
      case "Unauthorized":
        return renderLogin();
      case "Network":
        return renderNetworkError(error.cause);
    }
  }
);
```

## 30. unwrapOr / unwrapOrElse

Extract the success value with a fallback for the error case.

```typescript
// On Result<T, E>:
unwrapOr<U>(defaultValue: U): T | U;
unwrapOrElse<U>(f: (error: E) => U): T | U;
```

### unwrapOr

Returns the success value, or the provided default if it's an Err:

```typescript
ok(42).unwrapOr(0); // 42
err("bad").unwrapOr(0); // 0

// With type widening:
ok("hello").unwrapOr(null); // "hello" -- Type: string | null
err("bad").unwrapOr(null); // null -- Type: string | null
```

### unwrapOrElse

Like `unwrapOr`, but computes the default lazily from the error:

```typescript
ok(42).unwrapOrElse(e => e.length); // 42
err("bad").unwrapOrElse(e => e.length); // 3

// Useful when computing the default is expensive:
result.unwrapOrElse(error => computeExpensiveFallback(error));
```

### When to use which

- **`unwrapOr`**: The default is a constant or already computed
- **`unwrapOrElse`**: The default depends on the error, or is expensive to compute

## 31. toNullable / toUndefined

Convert a Result to a nullable/undefined value, discarding the error information.

```typescript
// On Result<T, E>:
toNullable(): T | null;
toUndefined(): T | undefined;
```

```typescript
ok(42).toNullable(); // 42
err("bad").toNullable(); // null

ok(42).toUndefined(); // 42
err("bad").toUndefined(); // undefined
```

### When to use

These are escape hatches for interop with code that expects nullable types:

```typescript
// Interop with DOM APIs that expect null
document.getElementById("output")?.textContent = result.toNullable();

// Interop with optional function parameters
processUser(result.toUndefined());

// In React components (conditional rendering)
const user = result.toUndefined();
return user ? <Profile user={user} /> : <NotFound />;
```

### Warning

`toNullable` and `toUndefined` discard the error information. Use `match` or `unwrapOr` when you need the error for handling or fallback computation.

## 32. intoTuple

Converts a Result into a Go-style error tuple: `[error, value]`. Exactly one element is `null`.

```typescript
// On Result<T, E>:
intoTuple(): [null, T] | [E, null];
```

```typescript
const [error, user] = getUser(id).intoTuple();

if (error) {
  // TypeScript narrows: error is E, user is null
  console.error("Failed:", error);
  return;
}

// TypeScript narrows: error is null, user is T
console.log("Found:", user.name);
```

### Why error-first

The Go convention puts the error first: `[err, value]`. This works well with TypeScript's narrowing:

```typescript
const [err, val] = result.intoTuple();
if (err) {
  // Early return handles the error
  return handleError(err);
}
// After the guard, val is narrowed to T
return processValue(val);
```

### When to use

`intoTuple` bridges Result-based code with code that expects Go-style error handling. It's also useful for destructuring in tests:

```typescript
const [err, val] = parseConfig(raw).intoTuple();
expect(err).toBeNull();
expect(val).toEqual({ port: 3000, host: "localhost" });
```

## 33. merge

Extracts the inner value regardless of whether it's Ok or Err. Only useful when both types are the same (or you want their union).

```typescript
// On Result<T, E>:
merge(): T | E;
```

```typescript
const result: Result<string, string> = ok("success");
result.merge(); // "success"

const error: Result<string, string> = err("failure");
error.merge(); // "failure"

// Common pattern: mapBoth to a common type, then merge
const message: string = result
  .mapBoth(
    user => `Welcome, ${user.name}`,
    error => `Error: ${error.message}`
  )
  .merge();
```

## 34. expect / expectErr

Escape hatches that extract the value or throw. These are the ONLY methods in `@hex-di/result` that throw.

```typescript
// On Result<T, E>:
expect(message: string): T;
expectErr(message: string): E;
```

### expect

Extracts the Ok value, or throws an Error with the given message if it's Err:

```typescript
ok(42).expect("should have a value"); // 42
err("bad").expect("should have a value"); // throws Error("should have a value")
```

### expectErr

Extracts the Err value, or throws an Error with the given message if it's Ok:

```typescript
err("bad").expectErr("should have failed"); // "bad"
ok(42).expectErr("should have failed"); // throws Error("should have failed")
```

### When to use

- **Tests**: When you know a Result is Ok/Err and want to assert:

  ```typescript
  const user = getUser("alice").expect("alice should exist in test fixtures");
  expect(user.name).toBe("Alice");
  ```

- **Truly unreachable code**: When you've already guarded all error cases:

  ```typescript
  // We validated id is present, so this should never fail
  const user = getUser(validatedId).expect("validated ID should always resolve");
  ```

- **Never in production error handling**: Use `match`, `unwrapOr`, or `orElse` instead.

### Error message best practices

The message should explain WHY the Result is expected to be a specific variant:

```typescript
// BAD: doesn't explain why
result.expect("failed");

// GOOD: explains the invariant
result.expect("config.port should always be present after validation");
```

---

_Previous: [06 - Chaining](./06-chaining.md) | Next: [08 - Combining](./08-combining.md)_
