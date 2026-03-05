---
sidebar_position: 2
title: Effect System
---

# Effect System

`@hex-di/result` provides a type-level effect system for tracking, manipulating, and enforcing error types across function boundaries. Effects are the error types (`E` in `Result<T, E>`) — they represent the "side effects" a computation may produce.

All effect types are **pure TypeScript types with zero runtime cost**.

## Effect Types

### `PureResult<T>` — No Effects

A Result that is guaranteed to succeed — its error type is `never`:

```typescript
import type { PureResult } from "@hex-di/result";

type SafeValue = PureResult<number>;
// Equivalent to: Result<number, never>
```

### `EffectfulResult<T, E>` — Has Effects

A Result that has at least one error type. Returns `never` if the error type is `never`:

```typescript
import type { EffectfulResult } from "@hex-di/result";

type HasEffects = EffectfulResult<number, Error>;
// Result<number, Error>

type NoEffects = EffectfulResult<number, never>;
// never — not effectful
```

### `EffectOf<T>` — Extract Effects

Extracts the error type from a Result or ResultAsync:

```typescript
import type { EffectOf } from "@hex-di/result";

type Errors = EffectOf<Result<string, NotFound | Timeout>>;
// NotFound | Timeout
```

### `IsEffectFree<R>` — Check for Purity

Boolean type that checks whether a Result has no effects:

```typescript
import type { IsEffectFree } from "@hex-di/result";

type Pure = IsEffectFree<Result<number, never>>; // true
type Effectful = IsEffectFree<Result<number, Error>>; // false
```

## Type-Level Manipulation

### `MaskEffects<R, Mask>` — Remove Effects

Removes specific error types from a Result's error union without handling them:

```typescript
import type { MaskEffects } from "@hex-di/result";

type Original = Result<string, NotFound | Timeout | ServerError>;
type Masked = MaskEffects<Original, Timeout>;
// Result<string, NotFound | ServerError>
```

:::caution
`MaskEffects` is a type-level operation only. It does not handle errors at runtime — it simply removes them from the type. Use `catchTag` for runtime error handling.
:::

### `LiftEffect<R, NewEffect>` — Add Effects

Adds an error type to a Result's error union:

```typescript
import type { LiftEffect } from "@hex-di/result";

type Original = Result<string, NotFound>;
type WithTimeout = LiftEffect<Original, Timeout>;
// Result<string, NotFound | Timeout>
```

### `EffectUnion<Rs>` — Merge Effects from Multiple Results

Computes the union of all error types from a tuple of Results:

```typescript
import type { EffectUnion } from "@hex-di/result";

type AllErrors = EffectUnion<
  [Result<string, NotFound>, Result<number, Timeout>, Result<boolean, ServerError>]
>;
// NotFound | Timeout | ServerError
```

This is useful when orchestrating multiple operations:

```typescript
function checkout(sku: string, payment: string, region: string) {
  return all(checkInventory(sku), validatePayment(payment), checkShipping(region));
  // Error type is automatically: OutOfStock | PaymentFailed | ShippingUnavailable
}
```

## Effect Contracts

Type-level function contracts that declare input, output, and effects as part of the function signature.

### `EffectContract<In, Out, Effects>`

Declares what a function takes, returns on success, and what errors it may produce:

```typescript
import type { EffectContract, TaggedError } from "@hex-di/result";

type NotFound = TaggedError<"NotFound", { patientId: string }>;
type Unauthorized = TaggedError<"Unauthorized", { requiredRole: string }>;

type ReadRecordContract = EffectContract<
  string, // Input: patient ID
  { name: string }, // Output: patient record
  NotFound | Unauthorized // Effects: possible errors
>;
```

### `SatisfiesContract<Fn, Contract>` — Verify Compliance

Checks at compile time that a function's signature matches a contract:

```typescript
import type { SatisfiesContract } from "@hex-di/result";

function readRecord(patientId: string): Result<{ name: string }, NotFound | Unauthorized> {
  // implementation...
}

// Compile-time check — resolves to `true`
type Check = SatisfiesContract<typeof readRecord, ReadRecordContract>;
```

If the function violates the contract, you get a descriptive type error:

- `EffectViolation` — function produces effects not declared in the contract
- `OutputViolation` — function output type doesn't match
- `InputViolation` — function input type doesn't match

### `ComposeContracts<C1, C2>` — Sequential Composition

Composes two contracts where the output of the first feeds the input of the second. Effects are merged:

```typescript
import type { ComposeContracts, EffectContract } from "@hex-di/result";

type CreditCheckContract = EffectContract<
  string,
  { score: number; history: string[] },
  CreditCheckFailed | DataUnavailable
>;

type RiskAssessmentContract = EffectContract<
  { score: number; history: string[] },
  { approved: boolean; riskLevel: string },
  RiskTooHigh | ModelError
>;

// Composed: string -> { approved, riskLevel }
// Effects: CreditCheckFailed | DataUnavailable | RiskTooHigh | ModelError
type LoanPipeline = ComposeContracts<CreditCheckContract, RiskAssessmentContract>;
```

If the output of C1 is not assignable to the input of C2, you get a `ContractCompositionError`.

## Effect Handlers

Runtime machinery for processing tagged errors through composable handlers.

### `EffectHandler<TIn, TOut>`

A handler that processes errors of type `TIn` and produces recovery values of type `TOut`:

```typescript
import { ok, type EffectHandler } from "@hex-di/result";

type EmailBounced = { readonly _tag: "EmailBounced"; readonly address: string };

const emailHandler: EffectHandler<EmailBounced, string> = Object.freeze({
  _tag: "emailHandler",
  tags: ["EmailBounced"],
  handle(error: EmailBounced) {
    return ok(`Fallback for bounced: ${error.address}`);
  },
});
```

Each handler declares:

- `tags` — array of `_tag` values it can process
- `handle` — function that returns `Result<TOut, never>` (fully eliminating the error)

### `composeHandlers` — Combine Handlers

Merges two handlers into one. Left-biased — when both declare the same tag, the first handler takes precedence:

```typescript
import { composeHandlers } from "@hex-di/result";

const channelHandler = composeHandlers(composeHandlers(emailHandler, smsHandler), pushHandler);
// Handles: EmailBounced | SmsFailed | PushExpired
```

### `identityHandler` — No-Op Handler

Handles nothing, passes all errors through. Serves as the identity element for composition:

```typescript
import { identityHandler, composeHandlers } from "@hex-di/result";

// These are equivalent to just `emailHandler`:
composeHandlers(identityHandler, emailHandler);
composeHandlers(emailHandler, identityHandler);
```

### `transformEffects` — Apply Handlers to a Result

Applies a chain of handlers to a Result:

```typescript
import { err, transformEffects } from "@hex-di/result";

const result = err({ _tag: "EmailBounced", address: "user@old.com" });

const handled = transformEffects(result, emailHandler, smsHandler, pushHandler);
// Matched errors are recovered; unmatched errors pass through
```

- If the Result is Ok, it's returned unchanged
- If it's Err, each handler is tried in order; the first matching handler is applied
- If no handler matches, the original Err is returned

### `NarrowedError<E, Tags>` — Type-Level Error Elimination

Removes from error union `E` any members whose `_tag` appears in `Tags`:

```typescript
import type { NarrowedError } from "@hex-di/result";

type Original = NotFound | Timeout | ServerError;
type AfterHandling = NarrowedError<Original, "NotFound" | "Timeout">;
// ServerError
```

This is used internally by `transformEffects` to compute the resulting error type after handler application.
