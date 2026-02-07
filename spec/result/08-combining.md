# 08 - Combining

_Previous: [07 - Extraction](./07-extraction.md)_

---

## 35. Result.all

Combines multiple Results into a single Result containing a tuple of all success values. Short-circuits on the first Err encountered (like `Promise.all`).

```typescript
// Array overload:
function all<T, E>(results: readonly Result<T, E>[]): Result<T[], E>;

// Tuple overload (preserves individual types):
function all<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>>;
```

### Usage

```typescript
import { Result, ok, err } from "@hex-di/result";

// All succeed:
const result = Result.all(ok(1), ok("two"), ok(true));
// Type: Result<[number, string, boolean], never>
// Value: Ok([1, "two", true])

// One fails (short-circuits):
const result = Result.all(ok(1), err("bad"), ok(true));
// Type: Result<[number, string, boolean], string>
// Value: Err("bad")
```

### With arrays

```typescript
const results: Result<number, string>[] = [ok(1), ok(2), ok(3)];
const combined = Result.all(...results);
// Type: Result<number[], string>
// Value: Ok([1, 2, 3])

const mixed: Result<number, string>[] = [ok(1), err("bad"), ok(3)];
const combined = Result.all(...mixed);
// Type: Result<number[], string>
// Value: Err("bad")
```

### Preserving heterogeneous tuple types

```typescript
declare function getName(): Result<string, NameError>;
declare function getAge(): Result<number, AgeError>;
declare function getEmail(): Result<string, EmailError>;

const result = Result.all(getName(), getAge(), getEmail());
// Type: Result<[string, number, string], NameError | AgeError | EmailError>
```

## 36. Result.allSettled

Combines multiple Results. If ALL are Ok, returns Ok with the tuple of values. If ANY are Err, collects ALL errors (does not short-circuit).

```typescript
// Tuple overload:
function allSettled<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>[]>;
```

### Usage

```typescript
// All succeed:
const result = Result.allSettled(ok(1), ok(2), ok(3));
// Type: Result<[number, number, number], never[]>
// Value: Ok([1, 2, 3])

// Multiple failures -- ALL errors collected:
const result = Result.allSettled(ok(1), err("a"), err("b"), ok(4));
// Type: Result<[number, string, string, number], string[]>
// Value: Err(["a", "b"])
```

### Use case: validation

`allSettled` is the tool for validation where you want to report ALL errors at once, not just the first:

```typescript
function validateUser(input: RawUser): Result<ValidUser, ValidationError[]> {
  const nameResult = validateName(input.name);
  const emailResult = validateEmail(input.email);
  const ageResult = validateAge(input.age);

  return Result.allSettled(nameResult, emailResult, ageResult).map(([name, email, age]) => ({
    name,
    email,
    age,
  }));
}

// If name and email are invalid:
// Err([{ field: "name", ... }, { field: "email", ... }])
// Both errors reported, not just the first
```

## 37. Result.any

Returns the first Ok value found. If all are Err, returns an Err containing all errors (like `Promise.any`).

```typescript
// Tuple overload:
function any<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkUnion<R>, InferErrTuple<R>>;
```

### Usage

```typescript
// First success wins:
const result = Result.any(err("a"), ok(2), ok(3));
// Type: Result<number, [string, never, never]>
// Value: Ok(2)

// All fail:
const result = Result.any(err("a"), err("b"), err("c"));
// Type: Result<never, [string, string, string]>
// Value: Err(["a", "b", "c"])
```

### Use case: fallback strategies

```typescript
const config = Result.any(loadFromEnv(), loadFromFile(".env"), loadFromFile(".env.defaults"));
// Returns the first successful config source
// If all fail, Err contains all three failure reasons
```

## 38. Result.collect

Combines a record (object) of Results into a Result of a record. Preserves field names.

```typescript
function collect<R extends Record<string, Result<unknown, unknown>>>(
  results: R
): Result<{ [K in keyof R]: InferOk<R[K]> }, InferErrUnion<R[keyof R]>>;
```

### Usage

```typescript
const result = Result.collect({
  name: ok("Alice"),
  age: ok(30),
  email: ok("alice@example.com"),
});
// Type: Result<{ name: string; age: number; email: string }, never>
// Value: Ok({ name: "Alice", age: 30, email: "alice@example.com" })

// With errors:
const result = Result.collect({
  name: ok("Alice"),
  age: err({ _tag: "InvalidAge" }),
  email: ok("alice@example.com"),
});
// Type: Result<..., { _tag: "InvalidAge" }>
// Value: Err({ _tag: "InvalidAge" })
```

### Why collect over all

`collect` preserves field names, making the success type more readable:

```typescript
// Result.all: positional (fragile)
const result = Result.all(getName(), getAge(), getEmail());
// Ok([string, number, string]) -- which is the name? which is the email?

// Result.collect: named (clear)
const result = Result.collect({
  name: getName(),
  age: getAge(),
  email: getEmail(),
});
// Ok({ name: string, age: number, email: string }) -- unambiguous
```

## 39. Tuple & Record Overloads

### Tuple inference

When passing Results directly as arguments, TypeScript infers a tuple type:

```typescript
Result.all(ok(1), ok("two"), ok(true));
// Inferred as: Result.all<[Ok<number, never>, Ok<string, never>, Ok<boolean, never>]>
// Returns: Result<[number, string, boolean], never>
```

### Array inference

When passing a pre-existing array, TypeScript infers an array type:

```typescript
const results = [ok(1), ok(2), ok(3)]; // Result<number, never>[]
Result.all(...results);
// Returns: Result<number[], never>
```

### Record inference

`collect` preserves the record structure:

```typescript
const results = {
  x: ok(1),
  y: ok("two"),
  z: ok(true),
};
Result.collect(results);
// Returns: Result<{ x: number; y: string; z: boolean }, never>
```

### Type-level guarantees

The combinator types ensure:

1. **Tuple types preserved**: `[A, B, C]` not `(A | B | C)[]`
2. **Error types unioned**: `E1 | E2 | E3` accumulates all possible errors
3. **Empty input handled**: `Result.all()` returns `Ok([])`
4. **Record keys preserved**: Field names survive the transformation

---

_Previous: [07 - Extraction](./07-extraction.md) | Next: [09 - ResultAsync](./09-async.md)_
