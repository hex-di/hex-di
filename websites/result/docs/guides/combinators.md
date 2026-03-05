---
sidebar_position: 5
title: Combinators
---

# Combinators

Functions for working with multiple Results using different short-circuit and error accumulation strategies.

## Overview

| Combinator        | Short-circuits? | Returns                              | Use when                         |
| ----------------- | --------------- | ------------------------------------ | -------------------------------- |
| `all`             | Yes (first Err) | `Result<[T1, T2, ...], E>`           | All must succeed                 |
| `any`             | Yes (first Ok)  | `Result<T, E[]>`                     | Any can succeed                  |
| `collect`         | Yes (first Err) | `Result<T[], E>`                     | Array of same-typed Results      |
| `allSettled`      | No              | `Result<Result<T, E>[], never>`      | Need all outcomes                |
| `partition`       | No              | `[T[], E[]]`                         | Separate successes from failures |
| `forEach`         | Yes (first Err) | `Result<U[], E>`                     | Map items through fallible fn    |
| `zipOrAccumulate` | No              | `Result<[T1, T2, ...], [E, ...E[]]>` | Collect all errors               |

## Short-Circuit Combinators

### `all` — All Must Succeed

Combines a tuple of Results. Returns Ok with all values if every Result is Ok, or the first Err encountered:

```typescript
import { ok, err, all } from "@hex-di/result";

const success = all(ok(1), ok("hello"), ok(true));
// Ok<[number, string, boolean]>

const failure = all(ok(1), err("oops"), ok(true));
// Err<"oops"> — stops at first error
```

### `any` — First Success Wins

Returns the first Ok, or an array of all errors if every Result is Err:

```typescript
import { ok, err, any } from "@hex-di/result";

const result = any(err("a"), ok(42), err("b"));
// Ok<42> — first Ok wins

const allFailed = any(err("a"), err("b"), err("c"));
// Err<["a", "b", "c"]>
```

### `collect` — Array of Same-Typed Results

Like `all` but for an array of Results with the same type:

```typescript
import { ok, err, collect } from "@hex-di/result";

const results = [ok(1), ok(2), ok(3)];
const collected = collect(results);
// Ok<number[]>
```

### `forEach` — Map Items Through a Fallible Function

Applies a Result-returning function to each item, short-circuiting on the first Err:

```typescript
import { ok, err, forEach } from "@hex-di/result";

function validateRow(row: string): Result<{ name: string }, string> {
  if (row.trim() === "") return err("empty row");
  return ok({ name: row });
}

const allValid = forEach(["Alice", "Bob"], row => validateRow(row));
// Ok<[{ name: "Alice" }, { name: "Bob" }]>

const shortCircuited = forEach(["Alice", "", "Charlie"], row => validateRow(row));
// Err<"empty row"> — "Charlie" is never processed
```

The callback receives `(item, index)`:

```typescript
const indexed = forEach([10, 20, 30], (item, idx) => ok(`[${idx}]: ${item}`));
// Ok<["[0]: 10", "[1]: 20", "[2]: 30"]>
```

## Non-Short-Circuit Combinators

### `allSettled` — Get All Outcomes

Always returns Ok with an array of all Results (both Ok and Err):

```typescript
import { ok, err, allSettled } from "@hex-di/result";

const result = allSettled(ok(1), err("a"), ok(3));
// Ok<[Ok<1>, Err<"a">, Ok<3>]> — always Ok, wraps all results
```

### `partition` — Separate Successes and Failures

Splits an array of Results into two arrays — Ok values and Err values:

```typescript
import { ok, err, partition } from "@hex-di/result";

const results = [ok("Alice"), err("bad row"), ok("Bob"), err("invalid")];
const [successes, failures] = partition(results);
// successes: ["Alice", "Bob"]
// failures:  ["bad row", "invalid"]
```

`partition` returns a plain tuple `[T[], E[]]`, not a Result. It processes every element.

### `zipOrAccumulate` — Collect All Errors

Combines a tuple of Results. If all are Ok, returns Ok with all values. If any are Err, collects **all** errors into a `NonEmptyArray<E>` (guaranteed at least one error):

```typescript
import { ok, err, zipOrAccumulate } from "@hex-di/result";

function validateName(name: string): Result<string, string> {
  if (name.length < 2) return err("name too short");
  return ok(name);
}

function validateAge(age: number): Result<number, string> {
  if (age < 0) return err("age negative");
  return ok(age);
}

function validateEmail(email: string): Result<string, string> {
  if (!email.includes("@")) return err("invalid email");
  return ok(email);
}

// All pass
const success = zipOrAccumulate(
  validateName("Alice"),
  validateAge(25),
  validateEmail("alice@example.com")
);
// Ok<[string, number, string]>

// Multiple failures — all errors collected
const failures = zipOrAccumulate(validateName("A"), validateAge(-5), validateEmail("bad"));
// Err<["name too short", "age negative", "invalid email"]>
```

## Choosing the Right Combinator

**Use `forEach` when** you have a list of items and want to map them through a fallible function, stopping at the first error.

**Use `zipOrAccumulate` when** you have independent validations and want to report all errors at once (e.g., form validation).

**Use `partition` when** you need to process both successes and failures independently (e.g., batch import with error report).

**Use `all` when** you have a fixed tuple of different-typed Results that must all succeed.

**Use `collect` when** you have an array of same-typed Results that must all succeed.

```typescript
// forEach: stops at first error
const feResult = forEach([-1, -2, 3], n => (n >= 0 ? ok(n * 2) : err(`${n} is negative`)));
// Err("-1 is negative")

// zipOrAccumulate: collects all errors
const zaResult = zipOrAccumulate(check(-1), check(-2), check(3));
// Err(["-1 is negative", "-2 is negative"])
```
