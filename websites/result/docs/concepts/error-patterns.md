---
sidebar_position: 3
title: Error Patterns
---

# Error Patterns

`@hex-di/result` provides utilities for creating discriminated error types and ensuring exhaustive error handling.

## Creating Discriminated Errors

### `createError(tag, message?, data?)`

Creates a discriminated error type with a unique tag for pattern matching.

```typescript
function createError<TTag extends string, TData = undefined>(
  tag: TTag,
  message?: string,
  data?: TData
): ErrorType<TTag, TData>;
```

### Basic Usage

```typescript
import { createError, err, type Result } from "@hex-di/result";

// Define error types
const NotFoundError = createError("NotFound");
const ValidationError = createError("Validation");
const NetworkError = createError("Network");

// Create a union type for all app errors
type AppError = typeof NotFoundError | typeof ValidationError | typeof NetworkError;

// Use in functions
function findUser(id: string): Result<User, AppError> {
  const user = database.get(id);
  if (!user) {
    return err(NotFoundError("User not found"));
  }
  if (!isValidUser(user)) {
    return err(ValidationError("Invalid user data"));
  }
  return ok(user);
}
```

### Errors with Data

Include additional context with your errors:

```typescript
import { createError } from "@hex-di/result";

// Error with structured data
const ValidationError = createError<"Validation", { fields: string[] }>("Validation");

// Usage
const error = ValidationError("Validation failed", {
  fields: ["email", "password"],
});

console.log(error._tag); // 'Validation'
console.log(error.message); // 'Validation failed'
console.log(error.data); // { fields: ['email', 'password'] }
```

## Pattern Matching Errors

Use the discriminated `_tag` property for exhaustive error handling:

```typescript
import { createError, err, type Result } from "@hex-di/result";

const NotFoundError = createError("NotFound");
const PermissionError = createError("Permission");
const ValidationError = createError("Validation");

type ApiError = typeof NotFoundError | typeof PermissionError | typeof ValidationError;

function handleApiCall(): Result<Data, ApiError> {
  // ... implementation
}

const result = handleApiCall();

if (result.isErr()) {
  switch (result.error._tag) {
    case "NotFound":
      console.log("Resource not found");
      return redirectTo404();

    case "Permission":
      console.log("Access denied");
      return redirectToLogin();

    case "Validation":
      console.log("Invalid input");
      return showValidationErrors();

    // TypeScript ensures all cases are handled
  }
}
```

## Tagged Error Handling

Use `catchTag` and `catchTags` to handle specific errors by their `_tag`, progressively eliminating them from the error union:

```typescript
import { ok, err, type Result } from "@hex-di/result";

type NotFound = { readonly _tag: "NotFound"; readonly id: string };
type Timeout = { readonly _tag: "Timeout"; readonly ms: number };

const result: Result<string, NotFound | Timeout> = err({ _tag: "NotFound", id: "123" });

// Handle one error type — Timeout remains in the union
const handled = result.catchTag("NotFound", e => ok(`Default for ${e.id}`));

// Handle multiple at once
const allHandled = result.catchTags({
  NotFound: e => ok(`Default for ${e.id}`),
  Timeout: e => ok(`Retried after ${e.ms}ms`),
});
```

See the full [Tagged Error Handling](../guides/tagged-error-handling) guide for `catchTag`, `catchTags`, `andThenWith`, and `orDie()`.

## Grouping Related Errors

### `createErrorGroup(namespace)`

Creates error families with two-level discriminants (`_namespace` + `_tag`) for organizing errors across domains:

```typescript
import { createErrorGroup } from "@hex-di/result";

const Http = createErrorGroup("HttpError");
const NotFound = Http.create("NotFound");
const Timeout = Http.create("Timeout");

// Create error instances with custom fields
const error = NotFound({ url: "/api/users", status: 404 });
// { _namespace: "HttpError", _tag: "NotFound", url: "/api/users", status: 404 }

// Type guards
Http.is(error); // true — belongs to HttpError namespace
Http.isTag("NotFound")(error); // true — is specifically NotFound
```

## Ensuring Exhaustive Handling

### `assertNever(value)`

Ensures exhaustive handling at compile time. TypeScript will error if not all cases are covered.

```typescript
import { assertNever } from "@hex-di/result";

type AppError =
  | { _tag: "NotFound"; message: string }
  | { _tag: "Permission"; message: string }
  | { _tag: "Validation"; fields: string[] };

function handleError(error: AppError): string {
  switch (error._tag) {
    case "NotFound":
      return `404: ${error.message}`;

    case "Permission":
      return `403: ${error.message}`;

    case "Validation":
      return `400: Invalid fields: ${error.fields.join(", ")}`;

    default:
      // TypeScript error if any case is missing
      return assertNever(error);
  }
}
```

If you add a new error type to `AppError` but forget to handle it in the switch statement, TypeScript will produce a compile-time error at the `assertNever` call.

## Error Pattern Examples

### Service Layer Errors

```typescript
import { createError, ok, err, type Result } from "@hex-di/result";

// Define domain-specific errors
const UserNotFound = createError("UserNotFound");
const EmailTaken = createError("EmailTaken");
const InvalidPassword = createError("InvalidPassword");
const DatabaseError = createError<"DatabaseError", { query: string }>("DatabaseError");

type UserServiceError =
  | typeof UserNotFound
  | typeof EmailTaken
  | typeof InvalidPassword
  | typeof DatabaseError;

class UserService {
  async createUser(email: string, password: string): Promise<Result<User, UserServiceError>> {
    // Check if email exists
    const existing = await this.db.findByEmail(email);
    if (existing) {
      return err(EmailTaken(`Email ${email} is already registered`));
    }

    // Validate password
    if (password.length < 8) {
      return err(InvalidPassword("Password must be at least 8 characters"));
    }

    // Create user
    try {
      const user = await this.db.create({ email, password });
      return ok(user);
    } catch (error) {
      return err(
        DatabaseError("Failed to create user", {
          query: "INSERT INTO users...",
        })
      );
    }
  }

  async authenticate(email: string, password: string): Promise<Result<User, UserServiceError>> {
    const user = await this.db.findByEmail(email);
    if (!user) {
      return err(UserNotFound(`No user with email ${email}`));
    }

    const valid = await this.checkPassword(user, password);
    if (!valid) {
      return err(InvalidPassword("Incorrect password"));
    }

    return ok(user);
  }
}
```

### HTTP Error Mapping

```typescript
import { type Result } from "@hex-di/result";

function errorToHttpStatus(error: AppError): number {
  switch (error._tag) {
    case "NotFound":
    case "UserNotFound":
      return 404;

    case "Permission":
    case "InvalidPassword":
      return 403;

    case "Validation":
    case "EmailTaken":
      return 400;

    case "DatabaseError":
    case "Network":
      return 500;

    default:
      return assertNever(error);
  }
}

function sendErrorResponse(res: Response, error: AppError): void {
  const status = errorToHttpStatus(error);
  const body = {
    error: error._tag,
    message: error.message,
    ...(error.data && { details: error.data }),
  };

  res.status(status).json(body);
}
```

### Composing Error Types

```typescript
import { type Result } from "@hex-di/result";

// Service-specific errors
type UserError = UserNotFound | InvalidPassword;
type PaymentError = InsufficientFunds | PaymentGatewayError;
type NotificationError = EmailServiceDown | InvalidTemplate;

// Compose for operations that span multiple services
type CheckoutError = UserError | PaymentError | NotificationError;

async function checkout(userId: string, items: CartItem[]): Promise<Result<Order, CheckoutError>> {
  // Authenticate user
  const user = await userService.getUser(userId);
  if (user.isErr()) return user;

  // Process payment
  const payment = await paymentService.charge(user.value, items);
  if (payment.isErr()) return payment;

  // Send confirmation
  const notification = await notificationService.sendOrderConfirmation(user.value, payment.value);
  if (notification.isErr()) return notification;

  return ok(createOrder(user.value, payment.value));
}
```
