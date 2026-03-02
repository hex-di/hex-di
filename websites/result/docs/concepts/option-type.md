---
sidebar_position: 2
title: The Option Type
---

# The Option Type

The `Option<T>` type represents a value that may or may not exist, providing a type-safe alternative to `null` and `undefined`.

## Core Structure

### `Option<T>`

A discriminated union of `Some<T> | None`:

```typescript
type Option<T> = Some<T> | None;
```

This forces explicit handling of absent values, preventing null pointer exceptions and making the code's intent clear.

## Factory Functions

### `some(value)`

Creates an Option containing a value.

```typescript
function some<T>(value: T): Some<T>;
```

```typescript
import { some } from "@hex-di/result";

const user = some({ id: 1, name: "Alice" });
user.isSome(); // true
user.value; // { id: 1, name: 'Alice' }
```

### `none()`

Creates an empty Option.

```typescript
function none(): None;
```

```typescript
import { none } from "@hex-di/result";

const missing = none();
missing.isNone(); // true
```

## Type Guard

### `isOption(value)`

Runtime type guard for `Option`.

```typescript
import { isOption } from "@hex-di/result";

if (isOption(maybeOption)) {
  // maybeOption is Option<unknown>
  if (maybeOption.isSome()) {
    console.log(maybeOption.value);
  }
}
```

## Option Methods

| Method                  | Some             | None       |
| ----------------------- | ---------------- | ---------- |
| `isSome()`              | `true`           | `false`    |
| `isNone()`              | `false`          | `true`     |
| `map(f)`                | `some(f(value))` | `none()`   |
| `andThen(f)`            | `f(value)`       | `none()`   |
| `unwrapOr(default)`     | `value`          | `default`  |
| `match(onSome, onNone)` | `onSome(value)`  | `onNone()` |

### Example Usage

```typescript
import { some, none, type Option } from "@hex-di/result";

function findUser(id: string): Option<User> {
  const user = database.get(id);
  return user ? some(user) : none();
}

const maybeUser = findUser("123");

// Pattern matching
const greeting = maybeUser.match(
  user => `Hello, ${user.name}!`,
  () => "User not found"
);

// Transformation
const maybeName = maybeUser.map(user => user.name).map(name => name.toUpperCase());

// Chaining
const maybeProfile = maybeUser.andThen(user => findProfile(user.id));

// Extracting with default
const userName = maybeUser.map(user => user.name).unwrapOr("Anonymous");
```

## Serialization

### `fromOptionJSON(json)`

Deserializes an `OptionJSON` back to `Option<T>`.

```typescript
import { fromOptionJSON } from "@hex-di/result";

const someJson = { _tag: "Some", value: 42 };
const option = fromOptionJSON(someJson); // some(42)

const noneJson = { _tag: "None" };
const empty = fromOptionJSON(noneJson); // none()
```

## When to Use Option vs Nullable

### Use Option when:

- **Explicit absence handling is important** — The type system should enforce handling of missing values
- **Chaining operations** — You need to chain multiple operations that may produce absent values
- **API boundaries** — Public APIs benefit from explicit Option types
- **Domain modeling** — When absence has specific meaning in your domain

### Use nullable (`T | null | undefined`) when:

- **JavaScript interop** — Working with existing JavaScript APIs
- **Simple checks** — The logic is straightforward and doesn't benefit from Option methods
- **Performance critical paths** — Option adds a small overhead
- **Framework conventions** — Your framework expects nullable values

### Example: Option in Practice

```typescript
import { some, none, type Option, fromNullable, ok, err } from "@hex-di/result";

interface UserPreferences {
  theme?: string;
  language?: string;
  notifications?: boolean;
}

class PreferencesService {
  getTheme(userId: string): Option<string> {
    const prefs = this.loadPreferences(userId);
    return prefs.theme ? some(prefs.theme) : none();
  }

  setTheme(userId: string, theme: string): Result<void, string> {
    if (!this.isValidTheme(theme)) {
      return err("Invalid theme");
    }

    this.savePreference(userId, "theme", theme);
    return ok(undefined);
  }

  getEffectiveTheme(userId: string): string {
    return this.getTheme(userId).unwrapOr("light"); // Default to light theme
  }

  // Convert from nullable API
  getLanguageFromAPI(userId: string): Option<string> {
    const apiResponse = this.api.getUserLanguage(userId); // Returns string | null
    return apiResponse ? some(apiResponse) : none();
  }
}
```

## Combining with Result

Option and Result work together seamlessly:

```typescript
import { ok, err, some, none, type Result, type Option } from "@hex-di/result";

// Convert Option to Result
function requireUser(maybeUser: Option<User>): Result<User, string> {
  return maybeUser.match(
    user => ok(user),
    () => err("User not found")
  );
}

// Result method returns Option
const result: Result<number, string> = ok(42);
const option: Option<number> = result.toOption(); // Some(42)

// Chain Option and Result operations
function processUser(id: string): Result<string, string> {
  return findUser(id) // Returns Option<User>
    .andThen(user => some(user.email)) // Extract email if user exists
    .match(
      email => ok(`Email: ${email}`),
      () => err("No email found")
    );
}
```
