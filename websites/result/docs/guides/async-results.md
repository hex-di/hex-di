---
sidebar_position: 2
title: Async Results
---

# Async Results

`ResultAsync<T, E>` provides first-class support for asynchronous operations that can fail, wrapping a `Promise<Result<T, E>>` with the same rich API as synchronous Results.

## Creating Async Results

### `ResultAsync.fromPromise(promise, mapError?)`

Create from a Promise that may reject:

```typescript
import { ResultAsync } from "@hex-di/result";

const result = ResultAsync.fromPromise(
  fetch("/api/users"),
  error => new Error(`Network error: ${error}`)
);

// With async/await
const users = await result
  .andThen(response => ResultAsync.fromPromise(response.json(), () => new Error("Invalid JSON")))
  .map(data => data.users)
  .unwrapOr([]);
```

### `ResultAsync.fromSafePromise(promise)`

Create from a Promise that never rejects:

```typescript
const result = ResultAsync.fromSafePromise(Promise.resolve(42));
// ResultAsync<number, never>
```

### `ResultAsync.ok(value)` and `ResultAsync.err(error)`

Create resolved async Results:

```typescript
const success = ResultAsync.ok(42); // Resolved Ok(42)
const failure = ResultAsync.err("failed"); // Resolved Err("failed")
```

## Standalone Constructors

### `fromPromise(promise, mapError?)`

Standalone function for converting Promises:

```typescript
import { fromPromise } from "@hex-di/result";

const result = fromPromise(fetch("/api/data"), e => ({ type: "NetworkError", cause: e }));
```

### `fromSafePromise(promise)`

Standalone function for safe Promises:

```typescript
import { fromSafePromise } from "@hex-di/result";

const result = fromSafePromise(Promise.resolve("safe value"));
```

### `fromAsyncThrowable(fn, mapError?)`

Wrap an async function that may throw:

```typescript
import { fromAsyncThrowable } from "@hex-di/result";

const safeFetch = fromAsyncThrowable(
  async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
  error => new Error(`Request failed: ${error}`)
);

// Usage
const result = await safeFetch("/api/users");
if (result.isOk()) {
  console.log("Users:", result.value);
}
```

## Chaining Async Operations

`ResultAsync` provides the same method API as `Result`, but all methods return `ResultAsync` or `Promise`:

```typescript
import { ResultAsync } from "@hex-di/result";

interface User {
  id: string;
  name: string;
}

interface Profile {
  userId: string;
  bio: string;
  avatar: string;
}

async function fetchUser(id: string): Promise<Result<User, string>> {
  // Implementation
}

async function fetchProfile(userId: string): Promise<Result<Profile, string>> {
  // Implementation
}

const enrichedUser = await ResultAsync.fromPromise(fetchUser("123"), () => "Failed to fetch user")
  .andThen(user =>
    ResultAsync.fromPromise(fetchProfile(user.id), () => "Failed to fetch profile").map(
      profile => ({ ...user, profile })
    )
  )
  .map(data => ({
    ...data,
    displayName: `${data.name} (${data.profile.bio})`,
  }))
  .andTee(user => console.log("Fetched user:", user))
  .unwrapOr(null);
```

## Async Bridges from Sync Results

### `toAsync()`

Convert a synchronous Result to ResultAsync:

```typescript
import { ok } from "@hex-di/result";

const sync = ok(42);
const async = sync.toAsync(); // ResultAsync<number, never>

await async.map(n => n * 2); // Ok(84)
```

### `asyncMap(f)`

Map with an async function:

```typescript
const result = ok("/api/users").asyncMap(async url => {
  const response = await fetch(url);
  return response.json();
});
// ResultAsync<any, never>
```

### `asyncAndThen(f)`

Chain with a function returning ResultAsync:

```typescript
import { ok, ResultAsync } from "@hex-di/result";

function validateId(id: string): Result<string, string> {
  return id.length > 0 ? ok(id) : err("Invalid ID");
}

async function fetchUserAsync(id: string): Promise<Result<User, string>> {
  // Async implementation
}

const user = await validateId("123")
  .asyncAndThen(id => ResultAsync.fromPromise(fetchUserAsync(id), () => "Fetch failed"))
  .map(user => user.name);
```

## Comparison: When to Use What

### Use `Result` when:

- Operations are synchronous
- You need immediate access to values
- Working with CPU-bound computations
- Transforming data that's already loaded

### Use `ResultAsync` when:

- Making network requests
- Reading from databases
- File system operations
- Any I/O bound operations
- Chaining multiple async operations

### Comparison Table

| Aspect             | Result                    | ResultAsync                                          |
| ------------------ | ------------------------- | ---------------------------------------------------- |
| **Creation**       | `ok(value)`, `err(error)` | `ResultAsync.ok(value)`, `ResultAsync.fromPromise()` |
| **Method returns** | `Result<U, E>`            | `ResultAsync<U, E>`                                  |
| **Extraction**     | `unwrapOr(default)`       | `await unwrapOr(default)`                            |
| **Pattern match**  | `match(onOk, onErr)`      | `await match(onOk, onErr)`                           |
| **Chaining**       | `andThen(f)`              | `andThen(f)` (async-aware)                           |
| **Conversion**     | `toAsync()`               | `await` to get `Result`                              |

## Practical Examples

### API Client with Error Handling

```typescript
import { ResultAsync, type Result } from "@hex-di/result";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get<T>(endpoint: string): Promise<Result<T, ApiError>> {
    return ResultAsync.fromPromise(fetch(`${this.baseURL}${endpoint}`), error => ({
      type: "NetworkError",
      message: String(error),
    }))
      .andThen(response => {
        if (!response.ok) {
          return ResultAsync.err({
            type: "HttpError",
            status: response.status,
            message: response.statusText,
          });
        }
        return ResultAsync.ok(response);
      })
      .andThen(response =>
        ResultAsync.fromPromise(response.json() as Promise<T>, () => ({
          type: "ParseError",
          message: "Invalid JSON",
        }))
      );
  }

  async post<T>(endpoint: string, data: unknown): Promise<Result<T, ApiError>> {
    return ResultAsync.fromPromise(
      fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      error => ({ type: "NetworkError", message: String(error) })
    ).andThen(response => this.handleResponse<T>(response));
  }

  private async handleResponse<T>(response: Response): Promise<Result<T, ApiError>> {
    if (!response.ok) {
      return err({
        type: "HttpError",
        status: response.status,
        message: response.statusText,
      });
    }

    return fromPromise(response.json() as Promise<T>, () => ({
      type: "ParseError",
      message: "Invalid JSON",
    }));
  }
}

// Usage
const client = new ApiClient("https://api.example.com");

const user = await client
  .get<User>("/users/123")
  .map(user => ({ ...user, lastFetched: Date.now() }))
  .andTee(user => cache.set(user.id, user))
  .orElse(() => {
    console.log("Fetch failed, trying cache...");
    return cache.get("123").toResult("User not in cache");
  })
  .unwrapOr(null);
```

### Parallel Operations with Error Accumulation

```typescript
import { ResultAsync, zipOrAccumulate } from "@hex-di/result";

async function validateUserData(input: UserInput): Promise<Result<ValidatedUser, string[]>> {
  // Run validations in parallel
  const results = await Promise.all([
    validateNameAsync(input.name),
    validateEmailAsync(input.email),
    validateAgeAsync(input.age),
    validateAddressAsync(input.address),
  ]);

  // Accumulate all errors instead of short-circuiting
  return zipOrAccumulate(results).map(([name, email, age, address]) => ({
    name,
    email,
    age,
    address,
    id: generateId(),
  }));
}

// Usage
const result = await validateUserData(input);
if (result.isErr()) {
  // result.error is string[] with all validation errors
  console.error("Validation errors:", result.error);
} else {
  // All validations passed
  await saveUser(result.value);
}
```

### Sequential Operations with Retry

```typescript
import { ResultAsync, err } from "@hex-di/result";

async function fetchWithRetry<T>(url: string, maxRetries: number = 3): Promise<Result<T, string>> {
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await ResultAsync.fromPromise(
      fetch(url),
      e => `Attempt ${attempt} failed: ${e}`
    ).andThen(response => {
      if (!response.ok) {
        return ResultAsync.err(`HTTP ${response.status}`);
      }
      return ResultAsync.fromPromise(response.json() as Promise<T>, () => "Invalid JSON");
    });

    if (result.isOk()) {
      return result;
    }

    lastError = result.error;
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return err(`All ${maxRetries} attempts failed. Last error: ${lastError}`);
}
```
