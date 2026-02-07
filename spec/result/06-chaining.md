# 06 - Chaining

_Previous: [05 - Transformations](./05-transformations.md)_

---

## 23. andThen (flatMap)

The monadic bind operation. Chains a function that itself returns a Result. This is the primary composition mechanism for fallible operations.

```typescript
// On Result<T, E>:
andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;
```

**Ok behavior:** Applies `f` to the value, returns the Result that `f` produces.
**Err behavior:** Returns `this` unchanged (short-circuits).

The key difference from `map`: `map(f)` wraps `f`'s return in `Ok`, producing `Result<U, E>`. `andThen(f)` returns `f`'s Result directly, allowing `f` to introduce new error types. The error types union: `E | F`.

```typescript
function parseAge(input: string): Result<number, ParseError> {
  const n = Number(input);
  return Number.isNaN(n) ? err({ _tag: "ParseError", input }) : ok(n);
}

function validateAge(age: number): Result<number, ValidationError> {
  return age >= 0 && age <= 150
    ? ok(age)
    : err({ _tag: "ValidationError", field: "age", value: age });
}

// Chain: each step can introduce its own error type
const result = parseAge("25").andThen(validateAge);
// Type: Result<number, ParseError | ValidationError>
```

### Longer chains

```typescript
const savedUser = parseInput(rawData) // Result<Input, ParseError>
  .andThen(validateInput) // Result<ValidInput, ParseError | ValidationError>
  .andThen(createUser) // Result<User, ParseError | ValidationError | DbError>
  .andThen(sendWelcomeEmail); // Result<User, ParseError | ValidationError | DbError | EmailError>
// Type: Result<User, ParseError | ValidationError | DbError | EmailError>
```

Each `andThen` step adds its error type to the union. At the end, you have a complete picture of everything that can go wrong.

### map vs. andThen decision rule

- If `f` returns a plain value: use `map`
- If `f` returns a `Result`: use `andThen`

```typescript
// f returns a plain value → map
result.map(user => user.name);

// f returns a Result → andThen
result.andThen(user => validateUser(user));
```

## 24. orElse

Error recovery. Chains a function on the error side. The dual of `andThen`.

```typescript
// On Result<T, E>:
orElse<U, F>(f: (error: E) => Result<U, F>): Result<T | U, F>;
```

**Ok behavior:** Returns `this` unchanged.
**Err behavior:** Applies `f` to the error, returns the Result that `f` produces.

```typescript
function fetchFromCache(key: string): Result<Data, CacheError> { ... }
function fetchFromDb(key: string): Result<Data, DbError> { ... }
function fetchFromRemote(key: string): Result<Data, RemoteError> { ... }

// Fallback chain: try cache, then DB, then remote
const data = fetchFromCache("users")
  .orElse(() => fetchFromDb("users"))
  .orElse(() => fetchFromRemote("users"));
// Type: Result<Data, RemoteError>
// (CacheError and DbError are "recovered" -- only RemoteError remains)
```

### Error type replacement

Each `orElse` replaces the error type. In the chain above:

1. `fetchFromCache` → `Result<Data, CacheError>`
2. `.orElse(fetchFromDb)` → `Result<Data, DbError>` (CacheError replaced by DbError on recovery attempt)
3. `.orElse(fetchFromRemote)` → `Result<Data, RemoteError>` (DbError replaced by RemoteError)

The final error type is only `RemoteError` because if we reached that point, both cache and DB already failed and their errors were consumed by the recovery functions.

## 25. andTee

Executes a side-effect function on the success value without changing the Result. Errors from the side-effect function are ignored. Returns `this` unchanged.

```typescript
// On Result<T, E>:
andTee(f: (value: T) => void): Result<T, E>;
```

**Ok behavior:** Calls `f(value)`, returns `this`.
**Err behavior:** Returns `this` unchanged.

```typescript
const result = getUser(id)
  .andTee(user => console.log("Found user:", user.name))
  .andThen(validateUser)
  .andTee(user => analytics.track("user_validated", user.id));
```

### andTee swallows errors from f

If `f` throws, the exception is caught and ignored. The Result passes through unchanged. This makes `andTee` safe for non-critical side effects like logging and analytics.

```typescript
ok(42)
  .andTee(() => {
    throw new Error("logging failed");
  })
  .map(n => n * 2);
// Ok(84) -- the throw was caught and ignored
```

## 26. orTee

Executes a side-effect function on the error value without changing the Result. The error-side counterpart of `andTee`.

```typescript
// On Result<T, E>:
orTee(f: (error: E) => void): Result<T, E>;
```

**Ok behavior:** Returns `this` unchanged.
**Err behavior:** Calls `f(error)`, returns `this`.

```typescript
const result = getUser(id)
  .orTee(error => console.error("User lookup failed:", error))
  .orTee(error => errorTracker.report(error));
```

Like `andTee`, exceptions from `f` are caught and ignored.

## 27. andThrough

Like `andTee`, but propagates errors from the side-effect function. The success value passes through unchanged, but if the side-effect returns an `Err`, that error replaces the Result.

```typescript
// On Result<T, E>:
andThrough<F>(f: (value: T) => Result<unknown, F>): Result<T, E | F>;
```

**Ok behavior:** Calls `f(value)`. If `f` returns `Ok`, returns `this`. If `f` returns `Err`, returns that `Err`.
**Err behavior:** Returns `this` unchanged.

```typescript
const result = createUser(data)
  .andThrough(user => auditLog.record("user_created", user.id))
  .andThrough(user => sendNotification(user.email));
// Type: Result<User, CreateError | AuditError | NotificationError>
// The user value passes through, but audit/notification errors can fail the chain
```

### andTee vs. andThrough decision rule

- **andTee**: Side effect is non-critical. Logging, analytics, telemetry. Errors are swallowed.
- **andThrough**: Side effect is critical. Audit logs, notifications that must succeed. Errors propagate.

```typescript
result
  .andTee(user => console.log("Created:", user.id)) // non-critical: swallow errors
  .andThrough(user => auditLog.record("create", user.id)) // critical: propagate errors
  .andTee(user => analytics.track("signup", user.id)); // non-critical: swallow errors
```

## 28. Error Type Accumulation

One of the most important features: error types accumulate through `andThen` chains automatically. This gives you a compile-time manifest of everything that can go wrong.

### How accumulation works

```typescript
declare function step1(): Result<A, E1>;
declare function step2(a: A): Result<B, E2>;
declare function step3(b: B): Result<C, E3>;

const result = step1().andThen(step2).andThen(step3);
// Type: Result<C, E1 | E2 | E3>
```

TypeScript infers the union `E1 | E2 | E3` automatically. At the consumption point, you have the complete error type and can handle each variant exhaustively.

### Exhaustive error handling at the end of a chain

```typescript
type ParseError = { readonly _tag: "Parse"; readonly input: string };
type ValidationError = { readonly _tag: "Validation"; readonly field: string };
type DbError = { readonly _tag: "Database"; readonly cause: Error };

const result: Result<User, ParseError | ValidationError | DbError> = parseInput(raw)
  .andThen(validate)
  .andThen(save);

result.match(
  user => respond(200, user),
  error => {
    switch (error._tag) {
      case "Parse":
        return respond(400, { error: `Invalid input: ${error.input}` });
      case "Validation":
        return respond(422, { error: `Invalid field: ${error.field}` });
      case "Database":
        return respond(500, { error: "Internal error" });
    }
  }
);
```

### Error accumulation with andThrough

`andThrough` also accumulates error types:

```typescript
const result = createUser(data) // Result<User, CreateError>
  .andThrough(validatePermissions) // Result<User, CreateError | PermError>
  .andThrough(auditLog) // Result<User, CreateError | PermError | AuditError>
  .andTee(logSuccess); // Result<User, CreateError | PermError | AuditError>
// andTee does NOT add error types (it swallows them)
```

### No accumulation with orElse

`orElse` replaces rather than accumulates, because it represents recovery:

```typescript
const result = fetchFromCache(key) // Result<Data, CacheError>
  .orElse(() => fetchFromDb(key)); // Result<Data, DbError>
// CacheError is gone -- it was handled by the recovery
```

---

_Previous: [05 - Transformations](./05-transformations.md) | Next: [07 - Extraction](./07-extraction.md)_
