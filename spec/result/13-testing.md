# 13 - Testing

_Previous: [12 - HexDI Integration](./12-hexdi-integration.md)_

---

## 57. Test Utilities

`@hex-di/result-testing` provides assertion helpers and utilities for testing Result-based code with Vitest.

### expectOk

Asserts that a Result is Ok and returns the value for further assertions:

```typescript
function expectOk<T, E>(result: Result<T, E>): T;
```

```typescript
import { expectOk } from "@hex-di/result-testing";

test("findUser returns the user", () => {
  const result = findUser("alice");
  const user = expectOk(result);
  expect(user.name).toBe("Alice");
  expect(user.email).toBe("alice@example.com");
});
```

If the Result is Err, `expectOk` throws with a descriptive message including the error value:

```
Expected Ok but got Err: { _tag: "NotFound", id: "alice" }
```

### expectErr

Asserts that a Result is Err and returns the error for further assertions:

```typescript
function expectErr<T, E>(result: Result<T, E>): E;
```

```typescript
test("findUser returns NotFound for unknown id", () => {
  const result = findUser("unknown");
  const error = expectErr(result);
  expect(error._tag).toBe("NotFound");
  expect(error.id).toBe("unknown");
});
```

### expectOkEqual / expectErrEqual

Asserts Ok/Err and deep-equals the value:

```typescript
function expectOkEqual<T, E>(result: Result<T, E>, expected: T): void;
function expectErrEqual<T, E>(result: Result<T, E>, expected: E): void;
```

```typescript
test("parseAge returns the parsed number", () => {
  expectOkEqual(parseAge("25"), 25);
});

test("parseAge returns ParseError for invalid input", () => {
  expectErrEqual(parseAge("abc"), { _tag: "ParseError", input: "abc" });
});
```

### expectResultAsync

Async variants that await the ResultAsync before asserting:

```typescript
async function expectOkAsync<T, E>(result: ResultAsync<T, E>): Promise<T>;
async function expectErrAsync<T, E>(result: ResultAsync<T, E>): Promise<E>;
```

```typescript
test("fetchUser returns the user", async () => {
  const user = await expectOkAsync(fetchUser("alice"));
  expect(user.name).toBe("Alice");
});
```

## 58. Assertion Helpers

### Vitest custom matchers

`@hex-di/result-testing` provides custom Vitest matchers for cleaner test syntax:

```typescript
import { resultMatchers } from "@hex-di/result-testing";

expect.extend(resultMatchers);

// Now available:
expect(result).toBeOk();
expect(result).toBeErr();
expect(result).toBeOkWith(42);
expect(result).toBeErrWith({ _tag: "NotFound" });
expect(result).toBeOkSatisfying(value => value > 0);
expect(result).toBeErrSatisfying(error => error._tag === "NotFound");
```

### Type declarations

```typescript
declare module "vitest" {
  interface Assertion<T> {
    toBeOk(): void;
    toBeErr(): void;
    toBeOkWith(expected: unknown): void;
    toBeErrWith(expected: unknown): void;
    toBeOkSatisfying(predicate: (value: unknown) => boolean): void;
    toBeErrSatisfying(predicate: (error: unknown) => boolean): void;
  }
}
```

### Error messages

Custom matchers produce clear error messages:

```
Expected Result to be Ok, but got Err:
  { _tag: "NotFound", id: "alice" }

Expected Result to be Err, but got Ok:
  { name: "Alice", email: "alice@example.com" }

Expected Ok value to deeply equal:
  Expected: 42
  Received: 41
```

## 59. Mock Error Factories

Utilities for creating test error values quickly:

### mockError

Creates a tagged error with sensible defaults:

```typescript
function mockError<Tag extends string>(
  tag: Tag,
  overrides?: Record<string, unknown>
): { readonly _tag: Tag } & Record<string, unknown>;
```

```typescript
import { mockError } from "@hex-di/result-testing";

const notFound = mockError("NotFound", { id: "test-123" });
// { _tag: "NotFound", id: "test-123" }

const dbError = mockError("Database", { cause: new Error("connection refused") });
// { _tag: "Database", cause: Error("connection refused") }
```

### mockResult

Creates Ok/Err Results for testing:

```typescript
function mockOk<T>(value: T): Result<T, never>;
function mockErr<E>(error: E): Result<never, E>;
function mockResultAsync<T>(value: T): ResultAsync<T, never>;
function mockErrAsync<E>(error: E): ResultAsync<never, E>;
```

### Error sequence mock

For testing retry/recovery logic:

```typescript
function mockResultSequence<T, E>(...outcomes: readonly Result<T, E>[]): () => Result<T, E>;
```

```typescript
const fetchMock = mockResultSequence(
  err({ _tag: "Timeout" }),
  err({ _tag: "Timeout" }),
  ok({ name: "Alice" })
);

// First call: Err(Timeout)
// Second call: Err(Timeout)
// Third call: Ok({ name: "Alice" })
```

## 60. Property-Based Testing Patterns

### Result laws

Results obey algebraic laws that can be verified with property-based testing:

#### Functor laws

```typescript
// Identity: result.map(x => x) === result
test.prop([resultArb], result => {
  expectResultEqual(
    result.map(x => x),
    result
  );
});

// Composition: result.map(f).map(g) === result.map(x => g(f(x)))
test.prop([resultArb, fnArb, fnArb], (result, f, g) => {
  expectResultEqual(
    result.map(f).map(g),
    result.map(x => g(f(x)))
  );
});
```

#### Monad laws

```typescript
// Left identity: ok(a).andThen(f) === f(a)
test.prop([valueArb, resultFnArb], (a, f) => {
  expectResultEqual(ok(a).andThen(f), f(a));
});

// Right identity: result.andThen(ok) === result
test.prop([resultArb], result => {
  expectResultEqual(result.andThen(ok), result);
});

// Associativity: result.andThen(f).andThen(g) === result.andThen(x => f(x).andThen(g))
test.prop([resultArb, resultFnArb, resultFnArb], (result, f, g) => {
  expectResultEqual(
    result.andThen(f).andThen(g),
    result.andThen(x => f(x).andThen(g))
  );
});
```

### Arbitrary generators

`@hex-di/result-testing` provides arbitrary generators for property-based testing frameworks:

```typescript
function okArb<T>(valueArb: Arbitrary<T>): Arbitrary<Ok<T, never>>;
function errArb<E>(errorArb: Arbitrary<E>): Arbitrary<Err<never, E>>;
function resultArb<T, E>(valueArb: Arbitrary<T>, errorArb: Arbitrary<E>): Arbitrary<Result<T, E>>;
```

---

_Previous: [12 - HexDI Integration](./12-hexdi-integration.md) | Next: [14 - API Reference](./14-api-reference.md)_
