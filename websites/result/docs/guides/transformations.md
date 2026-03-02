---
sidebar_position: 1
title: Transformations & Chaining
---

# Transformations & Chaining

Result types provide a rich set of methods for transforming values, chaining operations, and handling both success and failure cases elegantly.

## Mapping Values

### `map(f)`

Transform the success value while preserving errors:

```typescript
import { ok, err } from "@hex-di/result";

const result = ok(5)
  .map(n => n * 2) // Ok(10)
  .map(n => n + 1) // Ok(11)
  .map(n => `Result: ${n}`); // Ok("Result: 11")

const failed = err("error").map(n => n * 2); // Err("error") - unchanged
```

### `mapErr(f)`

Transform the error value while preserving success:

```typescript
const result = err("not found")
  .mapErr(e => e.toUpperCase()) // Err("NOT FOUND")
  .mapErr(e => ({ message: e })); // Err({ message: "NOT FOUND" })

const success = ok(42).mapErr(e => e.toUpperCase()); // Ok(42) - unchanged
```

### `mapBoth(onOk, onErr)`

Transform both success and error values:

```typescript
const result = divide(10, 2).mapBoth(
  value => `Success: ${value}`,
  error => `Error: ${error}`
);
// Ok("Success: 5") or Err("Error: ...")
```

## Chaining Operations

### `andThen(f)`

Chain operations that return Results (railway-oriented programming):

```typescript
import { ok, err, type Result } from "@hex-di/result";

function parseNumber(s: string): Result<number, string> {
  const n = Number(s);
  return isNaN(n) ? err("Not a number") : ok(n);
}

function divide(a: number, b: number): Result<number, string> {
  return b === 0 ? err("Division by zero") : ok(a / b);
}

const result = parseNumber("10")
  .andThen(n => divide(n, 2)) // Ok(5)
  .andThen(n => ok(n * 3)); // Ok(15)

const failed = parseNumber("abc")
  .andThen(n => divide(n, 2)) // Err("Not a number") - short-circuits
  .andThen(n => ok(n * 3)); // Err("Not a number") - skipped
```

### `orElse(f)`

Recover from errors by providing an alternative:

```typescript
const result = parseNumber("abc")
  .orElse(e => ok(0)) // Ok(0) - recovered
  .andThen(n => divide(100, n)); // Err("Division by zero")

// Chain multiple recovery strategies
const recovered = err("primary failed")
  .orElse(() => err("backup failed"))
  .orElse(() => ok("default value")); // Ok("default value")
```

## Side Effects

### `andTee(f)` and `orTee(f)`

Execute side effects without changing the Result:

```typescript
const result = ok(5)
  .andTee(n => console.log(`Got value: ${n}`)) // Logs: "Got value: 5"
  .map(n => n * 2) // Ok(10)
  .orTee(e => console.error(`Error: ${e}`)); // Not called

const failed = err("failed")
  .andTee(n => console.log(`Value: ${n}`)) // Not called
  .orTee(e => console.error(`Error: ${e}`)); // Logs: "Error: failed"
```

### `andThrough(f)`

Execute a side effect that may fail, propagating any errors:

```typescript
function validatePositive(n: number): Result<void, string> {
  return n > 0 ? ok(undefined) : err("Must be positive");
}

const result = ok(5)
  .andThrough(n => validatePositive(n)) // Passes validation
  .map(n => n * 2); // Ok(10)

const invalid = ok(-5)
  .andThrough(n => validatePositive(n)) // Fails validation
  .map(n => n * 2); // Err("Must be positive")
```

### `inspect(f)` and `inspectErr(f)`

Debug by inspecting values without affecting the chain:

```typescript
const result = parseNumber("42")
  .inspect(n => console.log(`Parsed: ${n}`)) // Logs: "Parsed: 42"
  .andThen(n => divide(100, n))
  .inspectErr(e => console.error(`Failed: ${e}`)) // Not called
  .map(n => Math.round(n));
```

## Flattening and Flipping

### `flatten()`

Unwrap nested Results:

```typescript
const nested: Result<Result<number, string>, string> = ok(ok(42));
const flattened = nested.flatten(); // Ok(42)

const nestedErr: Result<Result<number, string>, string> = ok(err("inner"));
const flattenedErr = nestedErr.flatten(); // Err("inner")
```

### `flip()`

Swap Ok and Err variants:

```typescript
const success = ok(42).flip(); // Err(42)
const failure = err("error").flip(); // Ok("error")

// Useful for inverting logic
function isNotEmpty(s: string): Result<void, string> {
  return s.length === 0 ? err("String is empty") : ok(undefined);
}

// Invert to check if empty
const isEmpty = (s: string) => isNotEmpty(s).flip();
```

## Logical Combinators

### `and(other)`

Returns the second Result if the first is Ok:

```typescript
ok(5).and(ok(10)); // Ok(10)
ok(5).and(err("fail")); // Err("fail")
err("first").and(ok(10)); // Err("first")
```

### `or(other)`

Returns the first Ok or the second Result:

```typescript
ok(5).or(ok(10)); // Ok(5)
ok(5).or(err("fail")); // Ok(5)
err("first").or(ok(10)); // Ok(10)
err("first").or(err("second")); // Err("second")
```

## Extraction Methods

### `match(onOk, onErr)`

Pattern match to handle both cases:

```typescript
const message = result.match(
  value => `Success: ${value}`,
  error => `Failed: ${error}`
);
```

### `unwrapOr(default)` and `unwrapOrElse(f)`

Extract the value with a fallback:

```typescript
const value = ok(5).unwrapOr(0); // 5
const fallback = err("fail").unwrapOr(0); // 0

const computed = err("fail").unwrapOrElse(
  error => error.length // 4
);
```

### `mapOr(default, f)` and `mapOrElse(defaultF, f)`

Map and extract in one operation:

```typescript
const doubled = ok(5).mapOr(0, n => n * 2); // 10
const fallback = err("x").mapOr(0, n => n * 2); // 0

const result = err("error").mapOrElse(
  e => e.length, // Called: returns 5
  n => n * 2 // Not called
);
```

### `contains(value)` and `containsErr(error)`

Check for specific values:

```typescript
ok(5).contains(5); // true
ok(5).contains(10); // false
err("fail").containsErr("fail"); // true
```

## Conversion Methods

### `toNullable()` and `toUndefined()`

Convert to nullable types:

```typescript
ok(5).toNullable(); // 5
err("fail").toNullable(); // null

ok(5).toUndefined(); // 5
err("fail").toUndefined(); // undefined
```

### `intoTuple()`

Convert to error-first tuple pattern:

```typescript
ok(5).intoTuple(); // [null, 5]
err("fail").intoTuple(); // ["fail", null]

// Useful for Node.js callback style
const [error, value] = await fetchUser(id).intoTuple();
if (error) {
  handleError(error);
} else {
  processUser(value);
}
```

### `merge()`

Extract either value or error as the same type:

```typescript
const okResult: Result<string, string> = ok("success");
const errResult: Result<string, string> = err("failure");

okResult.merge(); // "success"
errResult.merge(); // "failure"
```

### `toOption()` and `toOptionErr()`

Convert to Option type:

```typescript
import { type Option } from "@hex-di/result";

const some: Option<number> = ok(5).toOption(); // Some(5)
const none: Option<number> = err("x").toOption(); // None

const errOpt: Option<string> = err("x").toOptionErr(); // Some("x")
```

## Practical Examples

### Building a Pipeline

```typescript
import { ok, err, type Result } from "@hex-di/result";

interface UserInput {
  name: string;
  email: string;
  age: string;
}

interface ValidatedUser {
  name: string;
  email: string;
  age: number;
}

function validateName(name: string): Result<string, string> {
  return name.length >= 2 ? ok(name.trim()) : err("Name too short");
}

function validateEmail(email: string): Result<string, string> {
  return email.includes("@") ? ok(email.toLowerCase()) : err("Invalid email");
}

function validateAge(age: string): Result<number, string> {
  const n = Number(age);
  return !isNaN(n) && n >= 18 ? ok(n) : err("Must be 18 or older");
}

function validateUser(input: UserInput): Result<ValidatedUser, string> {
  return validateName(input.name).andThen(name =>
    validateEmail(input.email).andThen(email =>
      validateAge(input.age).map(age => ({ name, email, age }))
    )
  );
}

// Usage
const input = { name: "Alice", email: "alice@example.com", age: "25" };
const result = validateUser(input)
  .map(user => ({ ...user, id: generateId() }))
  .andTee(user => console.log("User validated:", user))
  .mapErr(error => ({ type: "ValidationError", message: error }));
```

### Error Recovery Chain

```typescript
async function fetchWithFallbacks(url: string): Promise<Result<Data, string>> {
  return fetchFromPrimary(url)
    .orElse(() => {
      console.log("Primary failed, trying cache...");
      return fetchFromCache(url);
    })
    .orElse(() => {
      console.log("Cache failed, trying backup...");
      return fetchFromBackup(url);
    })
    .orElse(() => {
      console.log("All sources failed, using default...");
      return ok(getDefaultData());
    });
}
```
