# ADR-CO-007: Effect-Capability Unification

## Status

Proposed (Tier 3)

## Context

hex-di currently treats error handling and capability/authority management as separate systems:

1. **Effects (error channels)**: `Result<T, E>` tracks what can go wrong. The error union `E` describes the set of possible failure modes. `catchTag` eliminates error variants one at a time. This is a type-and-effect system (see [RES-01](../../../research/RES-01-type-and-effect-systems.md)).

2. **Capabilities**: Port injection controls what a service can do. Guard policies constrain those capabilities at runtime (see [RES-04](../../../research/RES-04-capability-based-security.md)).

Tang and Lindley (2026, "Rows and Capabilities as Modal Effects") demonstrate that these two perspectives are **dual**: effects describe what computations DO, capabilities describe what computations CAN DO. An error channel is a capability profile -- it declares which capabilities the service exercises and how they can fail.

### The duality

Consider a `PaymentService` with this error type:

```typescript
type PaymentError =
  | { readonly _tag: "InsufficientFunds"; readonly amount: number }
  | { readonly _tag: "CardDeclined"; readonly reason: string }
  | { readonly _tag: "NetworkTimeout"; readonly endpoint: string };
```

From the **effect perspective**: these are the ways the payment operation can fail.

From the **capability perspective**: these errors reveal which capabilities the service exercises:

- `InsufficientFunds` -- the service exercises the "check balance" capability
- `CardDeclined` -- the service exercises the "card authorization" capability
- `NetworkTimeout` -- the service exercises the "network I/O" capability

A service that returns `Result<T, never>` is **pure** from both perspectives: it has no effects AND exercises no fallible capabilities.

### Current separation

```typescript
// Error channel and capabilities are declared separately
const PaymentPort = port<PaymentService>()({
  name: "Payment",
  direction: "outbound",
});

// Error type is inferred from the adapter factory's return type
const paymentAdapter = createAdapter({
  provides: [PaymentPort],
  factory: () => ok(createStripePayment()),
  // Result<PaymentService, InsufficientFunds | CardDeclined | NetworkTimeout>
});

// Guard policies are declared separately, with no connection to the error channel
const guardedPayment = withGuard(PaymentPort, {
  charge: hasPermission("billing:charge"),
});

// Nothing connects the error tags to the capabilities being exercised
```

## Decision

**Encode the duality between error channels and capabilities at the type level: a service's error type IS its capability profile, declaring what capabilities it exercises and how each can fail.**

### Capability-tagged errors

Each error tag in the `E` union is annotated with the capability it corresponds to:

```typescript
// Error tags carry capability metadata
interface CapabilityError<
  TTag extends string,
  TCapability extends string,
  TFields = Record<string, never>,
> {
  readonly _tag: TTag;
  readonly _capability: TCapability;
  readonly [K: string]: unknown;
}

// Payment errors declare their capabilities
type InsufficientFunds = CapabilityError<
  "InsufficientFunds",
  "balance-check",
  {
    readonly amount: number;
  }
>;

type CardDeclined = CapabilityError<
  "CardDeclined",
  "card-auth",
  {
    readonly reason: string;
  }
>;

type NetworkTimeout = CapabilityError<
  "NetworkTimeout",
  "network-io",
  {
    readonly endpoint: string;
  }
>;
```

### Capability profile extraction

The type system extracts the capability profile from any error union:

```typescript
// Extract capabilities from an error union
type CapabilityProfile<E> = E extends CapabilityError<string, infer C, unknown> ? C : never;

// Example:
type PaymentError = InsufficientFunds | CardDeclined | NetworkTimeout;
type PaymentCapabilities = CapabilityProfile<PaymentError>;
// = "balance-check" | "card-auth" | "network-io"
```

### Pure services have empty capability profiles

A service with `Result<T, never>` exercises no fallible capabilities:

```typescript
const ValidatorPort = port<ValidatorService>()({
  name: "Validator",
  direction: "inbound",
});

// Factory returns Result<ValidatorService, never> -- pure, no capabilities exercised
const validatorAdapter = createAdapter({
  provides: [ValidatorPort],
  factory: () => ok(createValidator()),
});

type ValidatorCapabilities = CapabilityProfile<never>; // = never (empty set)
```

### Effect elimination as capability discharge

`catchTag` doesn't just eliminate an error variant -- it **discharges a capability**:

```typescript
// Start: service exercises three capabilities
const result: Result<Invoice, InsufficientFunds | CardDeclined | NetworkTimeout> =
  paymentService.charge(amount);

// Discharge "balance-check" capability by handling InsufficientFunds
const afterBalanceCheck = result.catchTag("InsufficientFunds", e =>
  ok(createPendingInvoice(e.amount))
);
// afterBalanceCheck: Result<Invoice, CardDeclined | NetworkTimeout>
// Remaining capabilities: "card-auth" | "network-io"

// Discharge "card-auth" capability
const afterCardAuth = afterBalanceCheck.catchTag("CardDeclined", e =>
  ok(createManualReviewInvoice(e.reason))
);
// afterCardAuth: Result<Invoice, NetworkTimeout>
// Remaining capabilities: "network-io"

// Discharge all capabilities -> pure result
const pure = afterCardAuth.catchTag("NetworkTimeout", e => ok(createOfflineInvoice(e.endpoint)));
// pure: Result<Invoice, never>
// CapabilityProfile<never> = never -- all capabilities discharged
```

### Graph-level capability analysis

The graph builder can analyze the aggregate capability profile of the entire system:

```typescript
const graph = GraphBuilder.create()
  .provide(paymentAdapter) // exercises: balance-check, card-auth, network-io
  .provide(inventoryAdapter) // exercises: database-read, database-write
  .provide(validatorAdapter) // exercises: never (pure)
  .build();

// Graph-level capability report:
// Total capabilities exercised: balance-check, card-auth, network-io,
//                               database-read, database-write
// Pure services: Validator
// Highest-authority service: Payment (3 capabilities)
```

### Integration with guard policies

Guard policies constrain capabilities. The unified model connects guard policies to the error channel:

```typescript
// Guard policy: only services with "billing:charge" permission
// can exercise the "card-auth" capability
const billingGuard = constrainCapability("card-auth", hasPermission("billing:charge"));

// If a service without "billing:charge" tries to call a method
// that could produce CardDeclined, the guard rejects the call
// BEFORE the capability is exercised
```

## Consequences

### Positive

1. **Unified mental model**: Effects and capabilities are one concept, not two. "What can go wrong" and "what capabilities are used" are the same question.
2. **Formal foundation**: Tang and Lindley (2026) prove this duality is sound. The unification is not ad-hoc but grounded in modal effect theory.
3. **Capability auditing**: The error types of a service immediately reveal its authority requirements. Code review can assess capability usage by examining error types.
4. **Precise guards**: Guard policies target specific capabilities (error tags), not entire methods. A method that exercises multiple capabilities can have per-capability guards.
5. **Discharge tracking**: `catchTag` chains make capability discharge visible in the code. A function that catches all error tags is provably pure (exercises no remaining capabilities).

### Negative

1. **Error type verbosity**: Adding `_capability` metadata to every error tag increases the size of error type definitions. For services with many error variants, this is significant boilerplate.
2. **Capability naming convention**: Teams must agree on capability names (e.g., `"network-io"` vs `"network"` vs `"external-api"`). Inconsistent naming undermines the unified model.
3. **Not all errors are capabilities**: Some errors are truly internal (e.g., `"ParseError"` from malformed input). Forcing a capability annotation on these is artificial. The model must allow "uncapable" errors.
4. **Gradual typing tension**: Existing code with plain `_tag` errors (no `_capability`) must coexist with capability-annotated errors. The type system must handle both.

### Neutral

1. **Opt-in enrichment**: Existing `_tag`-only errors continue to work with `catchTag`. The `_capability` annotation is opt-in -- teams add it when they want capability analysis.
2. **Compatible with ADR-CO-006**: This ADR extends the Unified Capability Model by connecting capabilities to the error channel. The two ADRs are complementary.
3. **Capability profile is static**: The capability profile is extracted entirely at the type level. No runtime overhead.

## References

- [RES-01](../../../research/RES-01-type-and-effect-systems.md): Type & Effect Systems for Error Handling Ergonomics
- [RES-04](../../../research/RES-04-capability-based-security.md): Capability-Based Security (Finding 5: Rows and Capabilities as Modal Effects)
- [ADR-CO-006](./006-unified-capability-model.md): Unified Capability Model
