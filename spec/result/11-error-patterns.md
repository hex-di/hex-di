# 11 - Error Patterns

_Previous: [10 - Generator-Based Early Return](./10-generators.md)_

---

## 49. Tagged Error Unions

The recommended pattern for errors in `@hex-di/result` is tagged unions using a `_tag` discriminant. This aligns with HexDI's `ContainerError` pattern and enables TypeScript's exhaustiveness checking.

### The pattern

```typescript
// Define error types with _tag discriminant:
interface NotFoundError {
  readonly _tag: "NotFound";
  readonly resource: string;
  readonly id: string;
}

interface ValidationError {
  readonly _tag: "Validation";
  readonly field: string;
  readonly message: string;
}

interface DatabaseError {
  readonly _tag: "Database";
  readonly operation: string;
  readonly cause: Error;
}

// Union type:
type UserError = NotFoundError | ValidationError | DatabaseError;
```

### Why `_tag` and not `type` or `kind`

- `_tag` is the convention used by Effect, `@hex-di/store` (AsyncDerivedSnapshot), and fp-ts
- The underscore prefix signals "this is a discriminant for pattern matching, not a domain field"
- `type` conflicts with TypeScript's `typeof` and common domain fields
- `kind` conflicts with GraphQL and other ecosystems

### Readonly fields

Error types should have all `readonly` fields. Errors are immutable values -- they describe what happened and should never be mutated after creation.

## 50. Error Factories

Helper functions for creating tagged errors with proper types. These reduce boilerplate and ensure consistency.

### createError

A type-safe factory for creating tagged error constructors:

```typescript
function createError<Tag extends string>(
  tag: Tag
): <Fields extends Record<string, unknown>>(
  fields: Fields
) => { readonly _tag: Tag } & { readonly [K in keyof Fields]: Fields[K] };
```

### Usage

```typescript
import { createError } from "@hex-di/result";

const NotFound = createError("NotFound");
const Validation = createError("Validation");
const Database = createError("Database");

// Create error instances:
const error = NotFound({ resource: "User", id: "123" });
// Type: { readonly _tag: "NotFound"; readonly resource: string; readonly id: string }

const validationErr = Validation({ field: "email", message: "invalid format" });
// Type: { readonly _tag: "Validation"; readonly field: string; readonly message: string }
```

### With Result:

```typescript
function findUser(id: string): Result<User, ReturnType<typeof NotFound>> {
  const user = db.get(id);
  return user ? ok(user) : err(NotFound({ resource: "User", id }));
}
```

### Branded error factories

For domain-specific errors that need to be distinguishable at the type level:

```typescript
// Define the error shape once:
interface NotFoundError {
  readonly _tag: "NotFound";
  readonly resource: string;
  readonly id: string;
}

// Create a typed factory:
function notFound(resource: string, id: string): NotFoundError {
  return { _tag: "NotFound", resource, id };
}

// Usage:
function findUser(id: string): Result<User, NotFoundError> {
  return user ? ok(user) : err(notFound("User", id));
}
```

## 51. Error Discrimination & Exhaustive Handling

### switch exhaustiveness

TypeScript's `switch` statement provides exhaustive checking when all union members are handled:

```typescript
type AppError = NotFoundError | ValidationError | DatabaseError;

function toHttpStatus(error: AppError): number {
  switch (error._tag) {
    case "NotFound":
      return 404;
    case "Validation":
      return 422;
    case "Database":
      return 500;
  }
  // If a new error type is added to AppError and not handled,
  // TypeScript reports: "Not all code paths return a value"
}
```

### assertNever helper

For explicit exhaustiveness checking with a clear error message:

```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

function toHttpStatus(error: AppError): number {
  switch (error._tag) {
    case "NotFound":
      return 404;
    case "Validation":
      return 422;
    case "Database":
      return 500;
    default:
      return assertNever(error);
    // If AppError gains a new variant, TypeScript errors:
    // "Argument of type 'NewError' is not assignable to parameter of type 'never'"
  }
}
```

### Error discrimination in match

```typescript
const result: Result<User, AppError> = getUser(id);

result.match(
  user => respond(200, user),
  error => {
    switch (error._tag) {
      case "NotFound":
        return respond(404, { message: `${error.resource} ${error.id} not found` });
      case "Validation":
        return respond(422, { field: error.field, message: error.message });
      case "Database":
        return respond(500, { message: "Internal error" });
      default:
        return assertNever(error);
    }
  }
);
```

### Narrowing after andThen chains

Error types accumulate through chains, and TypeScript tracks the full union:

```typescript
const result = parseInput(raw) // Result<Input, ParseError>
  .andThen(validate) // Result<Valid, ParseError | ValidationError>
  .andThen(save); // Result<Saved, ParseError | ValidationError | DbError>

// At the consumption point, error is ParseError | ValidationError | DbError
result.match(
  saved => saved,
  error => {
    // TypeScript knows all three variants:
    switch (error._tag) {
      case "Parse":
        return handleParseError(error);
      case "Validation":
        return handleValidationError(error);
      case "Database":
        return handleDatabaseError(error);
      default:
        return assertNever(error);
    }
  }
);
```

## 52. Error Hierarchy & Composition

### Layered error types

Different layers of an application produce different error types. `mapErr` converts between layers:

```typescript
// Infrastructure layer:
type InfraError =
  | { readonly _tag: "ConnectionFailed"; readonly host: string }
  | { readonly _tag: "Timeout"; readonly ms: number }
  | { readonly _tag: "QueryFailed"; readonly sql: string; readonly cause: Error };

// Domain layer:
type DomainError =
  | { readonly _tag: "NotFound"; readonly entity: string; readonly id: string }
  | { readonly _tag: "BusinessRuleViolation"; readonly rule: string }
  | { readonly _tag: "InfraFailure"; readonly cause: InfraError };

// Application layer:
type AppError =
  | { readonly _tag: "BadRequest"; readonly details: string }
  | { readonly _tag: "NotFound"; readonly message: string }
  | { readonly _tag: "InternalError"; readonly message: string };
```

### Layer boundary conversion

```typescript
// Infrastructure → Domain
function findUser(id: string): Result<User, DomainError> {
  return queryDb(`SELECT * FROM users WHERE id = $1`, [id])
    .mapErr(
      (infraErr): DomainError => ({
        _tag: "InfraFailure",
        cause: infraErr,
      })
    )
    .andThen(rows =>
      rows.length > 0 ? ok(rows[0]) : err({ _tag: "NotFound" as const, entity: "User", id })
    );
}

// Domain → Application
function handleGetUser(id: string): Result<User, AppError> {
  return findUser(id).mapErr((domainErr): AppError => {
    switch (domainErr._tag) {
      case "NotFound":
        return { _tag: "NotFound", message: `${domainErr.entity} ${domainErr.id} not found` };
      case "BusinessRuleViolation":
        return { _tag: "BadRequest", details: domainErr.rule };
      case "InfraFailure":
        return { _tag: "InternalError", message: "Service temporarily unavailable" };
    }
  });
}
```

### Error cause chains

Errors can carry their cause for debugging while presenting a clean interface to callers:

```typescript
interface DomainError {
  readonly _tag: "DomainError";
  readonly message: string;
  readonly cause?: InfraError; // Preserved for debugging/tracing
}
```

This aligns with JavaScript's native `Error.cause` pattern and HexDI's tracing integration where the full cause chain can be recorded in spans.

---

_Previous: [10 - Generator-Based Early Return](./10-generators.md) | Next: [12 - HexDI Integration](./12-hexdi-integration.md)_
