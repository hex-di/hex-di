---
sidebar_position: 4
title: Tagged Error Handling
---

# Tagged Error Handling

Handle specific error types by their `_tag` discriminant, progressively eliminating errors from the union type.

## `catchTag` — Handle a Single Error

`catchTag(tag, handler)` matches errors with a specific `_tag` and removes them from the error union:

```typescript
import { ok, err, type Result } from "@hex-di/result";

type NotFound = { readonly _tag: "NotFound"; readonly resource: string };
type RateLimited = { readonly _tag: "RateLimited"; readonly retryAfterMs: number };
type ServerError = { readonly _tag: "ServerError"; readonly code: number };

type ApiError = NotFound | RateLimited | ServerError;

function fetchResource(id: string): Result<string, ApiError> {
  if (id === "missing") return err({ _tag: "NotFound", resource: id });
  if (id === "busy") return err({ _tag: "RateLimited", retryAfterMs: 5000 });
  if (id === "broken") return err({ _tag: "ServerError", code: 500 });
  return ok(`Data for ${id}`);
}

// Handle NotFound, narrowing the error to RateLimited | ServerError
const result = fetchResource("missing").catchTag("NotFound", e => ok(`Fallback for ${e.resource}`));
// Type: Result<string, RateLimited | ServerError>
```

The handler receives the fully-typed error (with access to `e.resource`) and must return `Result<T2, never>` — a Result with no remaining error. The matched tag is removed from the error union at the type level.

## `catchTags` — Handle Multiple Errors at Once

`catchTags(handlers)` handles several tagged errors in a single call:

```typescript
const result = fetchResource("busy").catchTags({
  NotFound: e => ok(`Default for ${e.resource}`),
  RateLimited: e => ok(`Queued, retry in ${e.retryAfterMs}ms`),
});
// Type: Result<string, ServerError>
```

All matched tags are removed from the error union. Handlers are type-safe — each receives the correctly narrowed error type.

## `andThenWith` — Chain with Error Recovery

`andThenWith(onOk, onErr)` provides both a success path and an error recovery path:

```typescript
import { ok, err, type Result } from "@hex-di/result";

function riskyOperation(input: number): Result<number, { _tag: "Overflow" }> {
  if (input > 100) return err({ _tag: "Overflow" });
  return ok(input * 2);
}

// Success path: chains into riskyOperation
// Error path: recovers with a default
const result = ok(10).andThenWith(
  value => riskyOperation(value),
  error => ok(0) // recovery
);
```

Unlike `andThen` + `orElse` (which are separate calls), `andThenWith` applies both handlers in a single step.

## `createErrorGroup` — Two-Level Discriminated Errors

`createErrorGroup(namespace)` creates error families with both `_namespace` and `_tag` fields, enabling two-level discrimination across multiple error groups:

```typescript
import { createErrorGroup } from "@hex-di/result";

const Http = createErrorGroup("HttpError");
const NotFound = Http.create("NotFound");
const Timeout = Http.create("Timeout");

const Db = createErrorGroup("DbError");
const Connection = Db.create("Connection");

// Create error instances with custom fields
const error = NotFound({ url: "/api/users", status: 404 });
// { _namespace: "HttpError", _tag: "NotFound", url: "/api/users", status: 404 }

// Type guards
Http.is(error); // true — belongs to HttpError namespace
Http.isTag("NotFound")(error); // true — is specifically NotFound
Http.isTag("Timeout")(error); // false
Db.is(error); // false — not a DbError
```

### Error Group API

| Method                    | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `group.create(tag)`       | Returns a constructor function `(fields) => FrozenError` |
| `group.is(value)`         | Type guard: checks `_namespace` matches                  |
| `group.isTag(tag)(value)` | Curried type guard: checks both `_namespace` and `_tag`  |

Error objects are frozen (`Object.freeze`) and carry both `_namespace` and `_tag` discriminants.

## Progressive Error Elimination

Chain `catchTag` calls to progressively eliminate errors until the type is fully handled:

```typescript
function handleAllErrors(result: Result<string, ApiError>): Result<string, never> {
  return result
    .catchTag("NotFound", e => ok(`Not found: ${e.resource}`))
    .catchTag("RateLimited", e => ok(`Retry in ${e.retryAfterMs}ms`))
    .catchTag("ServerError", e => ok(`Server error ${e.code}`));
  // All error types eliminated — Result<string, never>
}
```

## `orDie` — Extract or Throw

`orDie()` extracts the value from an Ok, or throws the error if it's an Err. Use this at program boundaries where you've eliminated all recoverable errors:

```typescript
const value = fetchResource("valid")
  .catchTag("NotFound", e => ok("default"))
  .catchTag("RateLimited", e => ok("queued"))
  .orDie(); // throws if ServerError, returns string otherwise
```

:::caution
`orDie()` throws at runtime. Only use it after you've handled all recoverable error types and want to crash on truly unexpected errors.
:::
