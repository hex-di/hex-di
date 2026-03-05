# ADR-CO-006: Unified Capability Model

## Status

Proposed (Tier 3)

## Context

hex-di currently has two independent authorization mechanisms:

1. **Port injection**: A service can only access the ports injected into it. The DI container controls which ports each service receives.
2. **Guard policies**: The guard system (`hasPermission`, `hasRole`, `hasAttribute`, etc.) applies runtime access-control checks on top of port injection.

These two mechanisms address the same underlying concern -- controlling what a service can do -- but are designed and implemented separately. Object-capability theory (see [RES-04](../../../research/RES-04-capability-based-security.md)) argues that authority should flow through object references, not through a separate access-control layer. Miller, Tulloh, and Shapiro (2012) formalize this as "The Structure of Authority": security is not a separable concern.

### Current dual-model

```typescript
// Layer 1: Port injection controls WHAT services are available
const OrderService = createAdapter({
  provides: [OrderPort],
  requires: [PaymentPort, InventoryPort], // capabilities granted by injection
  factory: (payment, inventory) => ok(createOrderService(payment, inventory)),
});

// Layer 2: Guard policies control WHO can invoke operations
const guardedOrderPort = withGuard(OrderPort, {
  placeOrder: hasPermission("orders:write"),
  cancelOrder: allOf(hasPermission("orders:write"), hasRole("admin")),
});

// These two layers don't know about each other.
// Port injection doesn't know about guard constraints.
// Guard policies don't know about the dependency graph.
```

### Theoretical unification

Capability theory says: having a reference to an object IS the authorization to use it. In hex-di terms:

- Receiving `PaymentPort` through injection IS the capability to make payments
- Guard policies should be understood as **capability constraints** -- they narrow what the capability holder can do, not as a separate authorization layer

This unification aligns with Tang and Lindley (2026, "Rows and Capabilities as Modal Effects"): capabilities and effects are dual perspectives on the same structure.

## Decision

**Unify port injection and guard policies into a single capability model where ports are capabilities, guards are capability constraints, and the graph builder verifies capability flow.**

### Ports as capabilities

A port reference is a capability token. Receiving a port through constructor injection grants the authority to use the service behind that port. This is already true in hex-di's architecture but is made explicit:

```typescript
// A port IS a capability. Holding this reference authorizes use.
const PaymentCapability = port<PaymentService>()({
  name: "Payment",
  direction: "outbound",
  category: "billing/payment",
});

// Declaring a dependency IS requesting a capability
const OrderAdapter = createAdapter({
  provides: [OrderPort],
  requires: [PaymentCapability], // "I need the payment capability"
  factory: payment => ok(createOrderService(payment)),
});
```

### Guards as capability constraints

Guard policies are reframed as constraints on capabilities. Instead of being a separate authorization layer, they narrow the authority granted by port injection:

```typescript
// A constrained capability: PaymentPort with restrictions
const RestrictedPayment = constrainCapability(PaymentCapability, {
  // Only charge() is available; refund() requires escalated authority
  charge: hasPermission("billing:charge"),
  refund: allOf(hasPermission("billing:refund"), hasRole("billing-admin")),
});

// The adapter receives the constrained capability
const OrderAdapter = createAdapter({
  provides: [OrderPort],
  requires: [RestrictedPayment], // receives Payment with constraints
  factory: payment => {
    // payment.charge() -- allowed if caller has billing:charge
    // payment.refund() -- allowed only if caller also has billing-admin role
    return ok(createOrderService(payment));
  },
});
```

### Capability attenuation

Capability theory requires that capabilities can only be **attenuated** (narrowed), never **amplified** (expanded). Decorators and guards must satisfy this invariant:

```typescript
// Valid: narrowing a capability (removing authority)
const readOnlyUser = attenuate(UserRepositoryCapability, {
  findById: always, // allowed
  create: never, // removed
  delete: never, // removed
});

// Invalid: amplifying a capability (adding authority not in the original)
// This would be a type error:
// const adminUser = amplify(UserRepositoryCapability, {
//   ...allMethods,
//   dropDatabase: always, // NOT in the original port interface
// });
```

The type system enforces attenuation-only:

```typescript
type ConstrainCapability<TPort extends Port<string, unknown>, TConstraints> = {
  [K in keyof TConstraints]: K extends keyof PortService<TPort> ? GuardPolicy : never; // Error: constraint on non-existent method
};
```

### Graph-level capability verification

The graph builder verifies capability flow across the entire dependency graph:

```typescript
const graph = GraphBuilder.create()
  .provide(OrderAdapter) // requires RestrictedPayment
  .provide(PaymentAdapter) // provides PaymentCapability
  .constrain(RestrictedPayment) // applies constraints to Payment
  .build();

// Graph builder verifies:
// 1. Every required capability has a provider
// 2. Every constraint references an existing capability
// 3. Constraints only attenuate (never amplify)
// 4. No ambient authority leaks (all dependencies come through the graph)
```

### Ambient authority detection

The graph builder can optionally verify that adapters receive all authority through constructor injection, detecting ambient authority leaks:

```typescript
// Adapter factory signature reveals its authority requirements
const BadAdapter = createAdapter({
  provides: [NotificationPort],
  requires: [], // claims no dependencies
  factory: () => {
    // Ambient authority leak: accessing global directly
    const apiKey = process.env.SENDGRID_API_KEY; // not injected!
    return ok(createNotificationService(apiKey));
  },
});

// The graph builder's ambient authority analyzer flags this:
// Warning: NotificationAdapter declares no dependencies but appears to
// access ambient state. Consider injecting a ConfigPort instead.
```

This analysis cannot be fully static in TypeScript (it would require analyzing function bodies), but can be approximated through linting rules and runtime instrumentation in dev mode.

## Consequences

### Positive

1. **Conceptual simplicity**: One model (capabilities) instead of two (injection + guards). Developers learn one concept.
2. **Formal foundation**: Object-capability theory provides decades of research validating this approach (Miller et al. 2003, 2012, 2013)
3. **Attenuation safety**: The type system enforces that capabilities can only be narrowed, preventing accidental authority escalation
4. **Graph-level security reasoning**: Security properties are visible in the dependency graph structure, not hidden in runtime guard configurations
5. **Compositionality**: Constrained capabilities compose naturally -- `allOf`, `anyOf`, `not` on constraints produce new constraints

### Negative

1. **Migration cost**: Existing guard configurations must be reframed as capability constraints. The runtime behavior is identical, but the mental model and API surface change.
2. **Ambient authority detection limits**: Full ambient authority detection requires analyzing adapter factory bodies, which is impossible in TypeScript's type system. The analyzer can only flag suspicious patterns heuristically.
3. **Ergonomic overhead**: Explicit capability constraints add verbosity compared to separate guard annotations. For simple cases (one permission per endpoint), the unified model is more ceremony than necessary.
4. **Guard system coupling**: The guard library (`@hex-di/guard`) and core library (`@hex-di/core`) become more tightly coupled, potentially complicating independent evolution.

### Neutral

1. **Backward compatible at runtime**: Existing guard policies continue to work as-is. The unification is primarily a type-level and conceptual change.
2. **Incremental adoption**: Teams can adopt the unified model for new services while keeping existing guard configurations unchanged.

## References

- [RES-04](../../../research/RES-04-capability-based-security.md): Capability-Based Security (Finding 1: Capability Myths Demolished; Finding 2: The Structure of Authority)
- [RES-04](../../../research/RES-04-capability-based-security.md): Capability-Based Security (Finding 4: Distributed Electronic Rights in JavaScript)
- [RES-04](../../../research/RES-04-capability-based-security.md): Capability-Based Security (Finding 5: Rows and Capabilities as Modal Effects)
- [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md): Contracts, Blame & Gradual Typing
- [ADR-CO-002](./002-blame-context-model.md): Blame Context Model
