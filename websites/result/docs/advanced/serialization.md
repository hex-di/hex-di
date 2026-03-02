---
sidebar_position: 1
title: Serialization & Interop
---

# Serialization & Interop

`@hex-di/result` provides built-in serialization support and type utilities for integration with other systems.

## JSON Serialization

### `toJSON()` Method

All Result instances can be serialized to JSON:

```typescript
import { ok, err } from "@hex-di/result";

const success = ok({ id: 1, name: "Alice" });
const json = success.toJSON();
// {
//   _tag: "Ok",
//   _schemaVersion: 1,
//   value: { id: 1, name: 'Alice' }
// }

const failure = err("Not found");
const errorJson = failure.toJSON();
// {
//   _tag: "Err",
//   _schemaVersion: 1,
//   error: "Not found"
// }
```

### `fromJSON(json)` Deserialization

Deserialize JSON back to Result:

```typescript
import { fromJSON } from "@hex-di/result";

const json = {
  _tag: "Ok",
  _schemaVersion: 1,
  value: 42,
};

const result = fromJSON(json); // Ok(42)

// Error case
const errorJson = {
  _tag: "Err",
  _schemaVersion: 1,
  error: "Failed",
};

const error = fromJSON(errorJson); // Err("Failed")
```

### Option Serialization

```typescript
import { some, none, fromOptionJSON } from "@hex-di/result";

// Serialize
const someValue = some(42);
const someJson = someValue.toJSON();
// { _tag: 'Some', value: 42 }

const noneValue = none();
const noneJson = noneValue.toJSON();
// { _tag: 'None' }

// Deserialize
const restored = fromOptionJSON({ _tag: "Some", value: 42 });
// some(42)
```

## Standard Schema v1

### `toSchema(result)`

Convert Results to Standard Schema v1 format for validation libraries:

```typescript
import { ok, toSchema } from "@hex-di/result";

const result = ok({ id: 1, name: "Alice" });
const schema = toSchema(result);

// Use with validation libraries that support Standard Schema
```

## Type Utilities

### Extracting Types

#### `InferOk<R>` and `InferErr<R>`

Extract the Ok or Err type from a Result:

```typescript
import type { Result, InferOk, InferErr } from "@hex-di/result";

type UserResult = Result<User, string>;

type UserType = InferOk<UserResult>; // User
type ErrorType = InferErr<UserResult>; // string
```

#### `InferAsyncOk<R>` and `InferAsyncErr<R>`

Extract types from ResultAsync:

```typescript
import type { ResultAsync, InferAsyncOk, InferAsyncErr } from "@hex-di/result";

type AsyncUserResult = ResultAsync<User, ApiError>;

type UserType = InferAsyncOk<AsyncUserResult>; // User
type ErrorType = InferAsyncErr<AsyncUserResult>; // ApiError
```

### Type Checking

#### `IsResult<R>`

Check if a type is a Result at the type level:

```typescript
import type { Result, IsResult } from "@hex-di/result";

type Test1 = IsResult<Result<number, string>>; // true
type Test2 = IsResult<number>; // false
type Test3 = IsResult<Promise<number>>; // false
```

### Type Transformations

#### `FlattenResult<R>`

Flatten nested Results:

```typescript
import type { Result, FlattenResult } from "@hex-di/result";

type Nested = Result<Result<number, string>, Error>;
type Flat = FlattenResult<Nested>; // Result<number, string | Error>
```

#### `InferOkTuple<Results>` and `InferErrUnion<Results>`

Work with tuples of Results:

```typescript
import type { Result, InferOkTuple, InferErrUnion } from "@hex-di/result";

type Results = [Result<number, string>, Result<User, ApiError>, Result<boolean, ValidationError>];

type OkTypes = InferOkTuple<Results>; // [number, User, boolean]
type ErrTypes = InferErrUnion<Results>; // string | ApiError | ValidationError
```

## Integration with GraphBuilder

`@hex-di/graph`'s `tryBuild()` returns a Result:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/core";
import type { Result } from "@hex-di/result";

const result = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).tryBuild();

if (result.isErr()) {
  console.error("Graph build failed:", result.error.message);

  // Handle specific error types
  switch (result.error.type) {
    case "CIRCULAR_DEPENDENCY":
      console.error("Circular dependency detected");
      break;
    case "MISSING_DEPENDENCY":
      console.error("Missing required dependency");
      break;
    default:
      console.error("Unknown build error");
  }

  process.exit(1);
}

// Type-safe access to the graph
const container = createContainer({
  graph: result.value,
  name: "App",
});
```

## API Response Handling

### Express.js Integration

```typescript
import { type Result } from "@hex-di/result";
import express from "express";

class ApiController {
  async getUser(req: express.Request, res: express.Response) {
    const result = await this.userService.getUser(req.params.id);

    result.match(
      user => res.json({ success: true, data: user }),
      error => {
        const status = this.errorToStatus(error);
        res.status(status).json({
          success: false,
          error: error._tag,
          message: error.message,
        });
      }
    );
  }

  private errorToStatus(error: AppError): number {
    switch (error._tag) {
      case "NotFound":
        return 404;
      case "Unauthorized":
        return 401;
      case "Validation":
        return 400;
      default:
        return 500;
    }
  }
}
```

### GraphQL Integration

```typescript
import { type Result } from "@hex-di/result";

const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      const result = await context.userService.getUser(id);

      return result.match(
        user => user,
        error => {
          throw new GraphQLError(error.message, {
            extensions: {
              code: error._tag,
              details: error.data,
            },
          });
        }
      );
    },
  },

  Mutation: {
    createUser: async (_, { input }, context) => {
      const result = await context.userService.createUser(input);

      if (result.isErr()) {
        return {
          __typename: "CreateUserError",
          code: result.error._tag,
          message: result.error.message,
        };
      }

      return {
        __typename: "CreateUserSuccess",
        user: result.value,
      };
    },
  },
};
```

## Database Transaction Example

```typescript
import { safeTry, ok, err, type Result } from "@hex-di/result";

class OrderRepository {
  async createOrderWithItems(
    order: Order,
    items: OrderItem[]
  ): Promise<Result<string, DatabaseError>> {
    const trx = await this.db.transaction();

    return safeTry(
      function* () {
        // Insert order
        const orderId = yield* this.insertOrder(trx, order).mapErr(
          e => new DatabaseError("Failed to insert order", e)
        );

        // Insert items
        for (const item of items) {
          yield* this.insertOrderItem(trx, orderId, item).mapErr(
            e => new DatabaseError(`Failed to insert item ${item.id}`, e)
          );
        }

        // Update inventory
        yield* this.updateInventory(trx, items).mapErr(
          e => new DatabaseError("Failed to update inventory", e)
        );

        // Commit transaction
        yield* this.commitTransaction(trx).mapErr(
          e => new DatabaseError("Failed to commit transaction", e)
        );

        return ok(orderId);
      }.bind(this)
    ).orElse(async error => {
      // Rollback on any error
      await trx.rollback();
      return err(error);
    });
  }
}
```

## Testing with Results

```typescript
import { ok, err, type Result } from "@hex-di/result";
import { describe, it, expect } from "vitest";

describe("UserService", () => {
  it("should return user when found", async () => {
    const service = new UserService(mockDb);
    const result = await service.getUser("123");

    expect(result.isOk()).toBe(true);
    expect(result.unwrapOr(null)).toEqual({
      id: "123",
      name: "Alice",
    });
  });

  it("should return error when user not found", async () => {
    const service = new UserService(mockDb);
    const result = await service.getUser("unknown");

    expect(result.isErr()).toBe(true);
    expect(result.isErrAnd(e => e._tag === "NotFound")).toBe(true);
  });

  it("should accumulate validation errors", () => {
    const results = validateForm({
      email: "invalid",
      password: "123",
      age: -1,
    });

    expect(results.isErr()).toBe(true);
    expect(results.error).toEqual([
      "Invalid email format",
      "Password too short",
      "Age must be positive",
    ]);
  });
});
```

## Migration Guide

### From try-catch to Result

Before:

```typescript
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
}
```

After:

```typescript
import { fromPromise, err, type Result } from "@hex-di/result";

async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  return fromPromise(fetch(`/api/users/${id}`), e => ({
    type: "NetworkError",
    message: String(e),
  })).andThen(response => {
    if (!response.ok) {
      return err({
        type: "HttpError",
        status: response.status,
      });
    }
    return fromPromise(response.json() as Promise<User>, () => ({
      type: "ParseError",
      message: "Invalid JSON",
    }));
  });
}
```
