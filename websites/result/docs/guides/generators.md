---
sidebar_position: 3
title: Generators & Do Notation
---

# Generators & Do Notation

`@hex-di/result` provides two powerful patterns for sequential operations: generator-based flow with `safeTry` and Do notation for building up context step-by-step.

## Generator-Based Flow with `safeTry`

### Overview

`safeTry` enables linear, imperative-style code for sequential Result operations. Each `yield*` unwraps an Ok value or short-circuits on Err.

```typescript
function safeTry<T, E>(
  generator: () => Generator<Result<unknown, E>, Result<T, E>, unknown>
): Result<T, E>;
```

### Basic Usage

```typescript
import { safeTry, ok, err } from "@hex-di/result";

const result = safeTry(function* () {
  const a = yield* ok(10); // Unwraps to 10
  const b = yield* ok(20); // Unwraps to 20
  return ok(a + b); // Must return a Result
});
// result = Ok(30)

const failed = safeTry(function* () {
  const a = yield* ok(10); // Unwraps to 10
  const b = yield* err("!"); // Short-circuits here
  return ok(a + b); // Never reached
});
// failed = Err('!')
```

### Real-World Example: Parsing User Input

```typescript
import { safeTry, ok, err, fromNullable, type Result } from "@hex-di/result";

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseUser(raw: unknown): Result<User, string> {
  return safeTry(function* () {
    // Validate input is an object
    if (!isRecord(raw)) {
      return err("Input must be an object");
    }

    // Extract and validate each field
    const id = yield* fromNullable(
      typeof raw.id === "string" ? raw.id : undefined,
      "Missing or invalid id"
    );

    const name = yield* fromNullable(
      typeof raw.name === "string" ? raw.name : undefined,
      "Missing or invalid name"
    );

    const email = yield* fromNullable(
      typeof raw.email === "string" && raw.email.includes("@") ? raw.email : undefined,
      "Missing or invalid email"
    );

    const ageStr = yield* fromNullable(
      typeof raw.age === "number" ? raw.age : undefined,
      "Missing or invalid age"
    );

    // Additional validation
    if (ageStr < 0 || ageStr > 150) {
      return err("Age must be between 0 and 150");
    }

    return ok({
      id,
      name,
      email,
      age: ageStr,
    });
  });
}

// Usage
const input = { id: "1", name: "Alice", email: "alice@example.com", age: 25 };
const user = parseUser(input);
// Ok({ id: '1', name: 'Alice', email: 'alice@example.com', age: 25 })

const invalid = parseUser({ id: "1" });
// Err('Missing or invalid name')
```

### Complex Business Logic

```typescript
import { safeTry, ok, err, type Result } from "@hex-di/result";

interface Account {
  id: string;
  balance: number;
}

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
}

class BankingService {
  transfer(fromId: string, toId: string, amount: number): Result<Transaction, string> {
    return safeTry(
      function* () {
        // Validate amount
        if (amount <= 0) {
          return err("Amount must be positive");
        }

        // Load accounts
        const fromAccount = yield* this.loadAccount(fromId);
        const toAccount = yield* this.loadAccount(toId);

        // Check balance
        if (fromAccount.balance < amount) {
          return err("Insufficient funds");
        }

        // Check daily limit
        const dailyTotal = yield* this.getDailyTransferTotal(fromId);
        if (dailyTotal + amount > 10000) {
          return err("Daily transfer limit exceeded");
        }

        // Check fraud
        const fraudCheck = yield* this.checkFraud(fromId, toId, amount);
        if (!fraudCheck) {
          return err("Transaction flagged as suspicious");
        }

        // Perform transfer
        const transaction = yield* this.executeTransfer(fromAccount, toAccount, amount);

        // Send notifications
        yield* this.notifyUser(fromId, `Sent $${amount}`);
        yield* this.notifyUser(toId, `Received $${amount}`);

        return ok(transaction);
      }.bind(this)
    );
  }

  private loadAccount(id: string): Result<Account, string> {
    // Implementation
  }

  private getDailyTransferTotal(accountId: string): Result<number, string> {
    // Implementation
  }

  private checkFraud(from: string, to: string, amount: number): Result<boolean, string> {
    // Implementation
  }

  private executeTransfer(from: Account, to: Account, amount: number): Result<Transaction, string> {
    // Implementation
  }

  private notifyUser(userId: string, message: string): Result<void, string> {
    // Implementation
  }
}
```

## Do Notation

Do notation provides a way to build up a context object step-by-step, similar to Haskell's do-notation or Scala's for-comprehensions.

### `bind(name, f)`

Adds a named Result value to the context. Short-circuits on Err.

```typescript
function bind<N extends string, Ctx extends Record<string, unknown>, T, E>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => Result<T, E>
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, E>;
```

### `let_(name, f)`

Adds a non-Result computed value to the context. Never short-circuits.

```typescript
function let_<N extends string, Ctx extends Record<string, unknown>, T>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => T
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, never>;
```

### Basic Do Notation Example

```typescript
import { ok, err, bind, let_ } from "@hex-di/result";

const result = ok({} as Record<string, never>)
  .andThen(bind("x", () => ok(10)))
  .andThen(bind("y", () => ok(20)))
  .andThen(let_("sum", ({ x, y }) => x + y))
  .andThen(bind("z", ({ sum }) => (sum > 25 ? ok(sum * 2) : err("Sum too small"))))
  .map(({ x, y, sum, z }) => ({
    inputs: [x, y],
    sum,
    result: z,
  }));
// Ok({ inputs: [10, 20], sum: 30, result: 60 })
```

### Type-Safe Context Building

The `name` parameter must be unique — TypeScript enforces this at compile time:

```typescript
const result = ok({} as Record<string, never>)
  .andThen(bind("user", () => fetchUser("123")))
  .andThen(bind("user", () => ok("duplicate"))); // TypeScript Error!
// Error: Argument of type '"user"' is not assignable to parameter
```

### Real-World Do Notation Example

```typescript
import { ok, err, bind, let_, type Result } from "@hex-di/result";

interface OrderRequest {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
}

interface OrderResult {
  orderId: string;
  total: number;
  discount: number;
  estimatedDelivery: Date;
}

class OrderService {
  processOrder(request: OrderRequest): Result<OrderResult, string> {
    return (
      ok({} as Record<string, never>)
        // Load user
        .andThen(bind("user", () => this.userService.getUser(request.userId)))

        // Check if user is eligible
        .andThen(
          bind("eligible", ({ user }) =>
            user.isActive ? ok(true) : err("User account is not active")
          )
        )

        // Load products
        .andThen(bind("products", () => this.loadProducts(request.items.map(i => i.productId))))

        // Calculate subtotal
        .andThen(
          let_("subtotal", ({ products }) =>
            request.items.reduce((sum, item) => {
              const product = products.find(p => p.id === item.productId);
              return sum + (product?.price || 0) * item.quantity;
            }, 0)
          )
        )

        // Apply coupon if provided
        .andThen(
          bind("discount", ({ subtotal }) =>
            request.couponCode ? this.applyCoupon(request.couponCode, subtotal) : ok(0)
          )
        )

        // Calculate total
        .andThen(let_("total", ({ subtotal, discount }) => Math.max(0, subtotal - discount)))

        // Check inventory
        .andThen(bind("available", () => this.checkInventory(request.items)))

        // Create order
        .andThen(
          bind("order", ({ user, total, discount }) =>
            this.createOrder({
              userId: user.id,
              items: request.items,
              total,
              discount,
            })
          )
        )

        // Calculate delivery
        .andThen(let_("estimatedDelivery", ({ user }) => this.calculateDelivery(user.address)))

        // Return final result
        .map(({ order, total, discount, estimatedDelivery }) => ({
          orderId: order.id,
          total,
          discount,
          estimatedDelivery,
        }))
    );
  }

  private userService: UserService;

  private loadProducts(ids: string[]): Result<Product[], string> {
    // Implementation
  }

  private applyCoupon(code: string, amount: number): Result<number, string> {
    // Implementation
  }

  private checkInventory(items: OrderItem[]): Result<boolean, string> {
    // Implementation
  }

  private createOrder(data: CreateOrderData): Result<Order, string> {
    // Implementation
  }

  private calculateDelivery(address: Address): Date {
    // Implementation
  }
}
```

## When to Use Each Pattern

### Use Generators (`safeTry`) when:

- You have sequential operations where each step depends on the previous
- The logic is mostly linear with occasional early returns
- You're parsing or validating complex nested data
- You prefer imperative-style code
- Each operation is relatively simple

### Use Do Notation when:

- You're building up a complex context object
- Multiple values need to be accessible throughout the computation
- You want type-safe access to all intermediate values
- You're composing many small functions
- The final result combines multiple intermediate values

### Use Method Chaining when:

- The pipeline is simple and linear
- Each step transforms the previous value
- You don't need access to intermediate values
- The logic fits naturally into map/andThen/orElse patterns

## Combining Patterns

You can combine these patterns for maximum flexibility:

```typescript
import { safeTry, ok, err, bind, let_ } from "@hex-di/result";

function complexOperation(input: Input): Result<Output, string> {
  // Use Do notation for context building
  const context = ok({} as Record<string, never>)
    .andThen(bind("config", () => loadConfig()))
    .andThen(bind("user", () => authenticateUser(input.token)));

  // Use generators for complex logic
  return context.andThen(ctx =>
    safeTry(function* () {
      const permissions = yield* checkPermissions(ctx.user);
      const data = yield* fetchData(input.query);

      if (!permissions.includes("read")) {
        return err("Insufficient permissions");
      }

      const processed = yield* processData(data, ctx.config);
      const validated = yield* validateOutput(processed);

      return ok({
        user: ctx.user.name,
        data: validated,
        timestamp: new Date(),
      });
    })
  );
}
```
