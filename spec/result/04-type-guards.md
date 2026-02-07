# 04 - Type Guards & Narrowing

_Previous: [03 - Constructors](./03-constructors.md)_

---

## 15. isOk / isErr

Instance methods that act as TypeScript type guards, narrowing the Result to its specific variant.

```typescript
// On Ok<T, E>:
isOk(): true;
isErr(): false;

// On Err<T, E>:
isOk(): false;
isErr(): true;
```

### Usage

```typescript
const result: Result<number, string> = divide(10, 3);

if (result.isOk()) {
  // TypeScript narrows: result is Ok<number, string>
  console.log(result.value); // number -- accessible
}

if (result.isErr()) {
  // TypeScript narrows: result is Err<number, string>
  console.log(result.error); // string -- accessible
}
```

### Predicate overloads

Extended type guards with predicates for conditional narrowing:

```typescript
isOkAnd(predicate: (value: T) => boolean): boolean;
isErrAnd(predicate: (error: E) => boolean): boolean;
```

```typescript
const result: Result<number, string> = ok(42);

result.isOkAnd(n => n > 0); // true
result.isOkAnd(n => n > 100); // false
result.isErrAnd(e => e === "oops"); // false (it's Ok)
```

## 16. isResult / isResultAsync

Standalone type guard functions for checking if an unknown value is a Result or ResultAsync.

```typescript
function isResult(value: unknown): value is Result<unknown, unknown>;
function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown>;
```

### Implementation

`isResult` checks for the presence of `_tag` property with value `"Ok"` or `"Err"` and the corresponding `value` or `error` property. This uses structural typing -- it doesn't require `instanceof`.

```typescript
import { isResult, isResultAsync } from "@hex-di/result";

function processResponse(response: unknown): void {
  if (isResult(response)) {
    // TypeScript narrows: response is Result<unknown, unknown>
    response.match(
      value => console.log("Success:", value),
      error => console.log("Failure:", error)
    );
  }
}
```

## 17. Discriminated Union Narrowing

The `_tag` discriminant enables native TypeScript narrowing without calling methods:

```typescript
const result: Result<User, AppError> = getUser(id);

// Method-based narrowing (preferred for method chaining):
if (result.isOk()) {
  result.value; // User
}

// Tag-based narrowing (preferred in switch/if statements):
if (result._tag === "Ok") {
  result.value; // User
}

if (result._tag === "Err") {
  result.error; // AppError
}

// Switch expression:
switch (result._tag) {
  case "Ok":
    return result.value; // User
  case "Err":
    return handleError(result.error); // AppError
}
```

### Narrowing in destructuring

```typescript
const result: Result<number, string> = ok(42);

// Destructuring with tag check:
const { _tag } = result;
if (_tag === "Ok") {
  // Note: destructured _tag doesn't narrow the original result
  // Use the result directly for narrowing:
  const value = result.value; // Narrowed
}
```

### Narrowing in array operations

```typescript
const results: Result<number, string>[] = [ok(1), err("bad"), ok(3)];

// Filter to only Ok values:
const successes = results.filter((r): r is Ok<number, string> => r.isOk());
// Type: Ok<number, string>[]
successes.map(r => r.value); // number[]

// Filter to only Err values:
const failures = results.filter((r): r is Err<number, string> => r.isErr());
// Type: Err<number, string>[]
failures.map(r => r.error); // string[]
```

### Exhaustive handling with match

The `match` method guarantees exhaustive handling -- both Ok and Err must be addressed:

```typescript
const result: Result<User, NotFoundError | ValidationError> = getUser(id);

// Both branches required -- compile error if one is missing
const response = result.match(
  user => ({ status: 200, body: user }),
  error => {
    switch (error._tag) {
      case "NotFound":
        return { status: 404, body: { error: "User not found" } };
      case "Validation":
        return { status: 400, body: { errors: error.fields } };
    }
    // TypeScript exhaustiveness: if a new error variant is added,
    // this becomes a compile error (unreachable code detected)
  }
);
```

---

_Previous: [03 - Constructors](./03-constructors.md) | Next: [05 - Transformations](./05-transformations.md)_
