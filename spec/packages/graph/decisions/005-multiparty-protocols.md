# ADR-GR-005: Multiparty Protocol Verification

## Status

Proposed (Tier 3 -- Long-term)

## Context

Port interfaces in `@hex-di/core` define bilateral contracts: a single port describes the interaction between one consumer and one provider. But real applications involve multi-service workflows where several adapters must coordinate according to a shared protocol. For example, an order processing flow might require:

1. `PaymentService` charges the customer.
2. `InventoryService` reserves stock (only after payment succeeds).
3. `NotificationService` sends confirmation (only after both payment and reservation succeed).
4. On failure at any step, preceding services must compensate (refund, unreserve).

Currently, these ordering and compensation constraints live in application code. Nothing in the graph verifies that all participants implement their role in the protocol. If `InventoryService` is replaced with an adapter that omits the `unreserve()` compensation method, the graph builds successfully and the protocol silently breaks at runtime.

Session type theory (see [RES-02](../../../research/RES-02-session-types-behavioral-contracts.md)) formalizes communication protocols as types. **Multiparty session types** (Finding 4: Scalas & Yoshida, 2019) extend bilateral sessions to protocols involving multiple participants. Each participant has a **local type** describing their view of the protocol. The **global type** describes the full protocol, and the system verifies that all local types are **projections** of the global type -- ensuring compatibility.

### Decidability constraints

Multiparty session type checking is decidable for **finite-control protocols** -- protocols with a bounded number of states and no unbounded recursion. General multiparty session type checking (with recursive types and parametric polymorphism) is undecidable (Scalas & Yoshida, 2019).

For `@hex-di/graph`, this means protocol verification must be restricted to:

- **Finite state protocols**: Fixed number of steps with explicit transitions.
- **Non-recursive protocols**: No unbounded loops (bounded iteration is acceptable).
- **First-order protocols**: No protocols parameterized by other protocols.

These restrictions cover the vast majority of real-world service coordination patterns (sagas, choreographies, compensation flows) while remaining decidable.

### Current behavior

```typescript
// OrderSaga defined entirely in application code
// No graph-level verification that all participants exist and implement their roles
const graph = GraphBuilder.create()
  .provide(paymentAdapter)
  .provide(inventoryAdapter)
  .provide(notificationAdapter)
  .build();

// If inventoryAdapter lacks unreserve(), this builds fine.
// Protocol violation discovered at runtime during a failed order.
```

### Desired behavior

```typescript
// Protocol declared at the graph level
const OrderProtocol = defineProtocol({
  name: "OrderProcessing",
  participants: {
    payment: PaymentServicePort,
    inventory: InventoryServicePort,
    notification: NotificationServicePort,
  },
  steps: [
    { from: "payment", action: "charge", onSuccess: "inventory" },
    { from: "inventory", action: "reserve", onSuccess: "notification" },
    { from: "notification", action: "confirm", onSuccess: "end" },
  ],
  compensation: [
    { participant: "inventory", action: "unreserve" },
    { participant: "payment", action: "refund" },
  ],
});

const graph = GraphBuilder.create()
  .provide(paymentAdapter)
  .provide(inventoryAdapter)
  .provide(notificationAdapter)
  .withProtocol(OrderProtocol) // compile-time: verifies all participants and actions
  .build();
// If inventoryAdapter lacks unreserve(), compile-time error:
// "Protocol 'OrderProcessing' requires participant 'inventory' to implement action 'unreserve'"
```

## Decision

**Introduce `ProtocolGraph<TParticipants, TProtocol>` that encodes cross-adapter communication protocols as type-level state machines. The graph builder validates that all participants implement their protocol roles at build time.**

### Protocol definition

A protocol is a finite state machine with named participants, actions, and transitions:

```typescript
interface ProtocolStep {
  readonly from: string; // participant name
  readonly action: string; // method name on the participant's port
  readonly onSuccess: string; // next participant or "end"
  readonly onFailure?: string; // compensation entry point or "abort"
}

interface CompensationStep {
  readonly participant: string; // participant name
  readonly action: string; // compensation method name
}

interface ProtocolConfig<TParticipants extends Record<string, DirectedPort<string, unknown>>> {
  readonly name: string;
  readonly participants: TParticipants;
  readonly steps: ReadonlyArray<ProtocolStep>;
  readonly compensation: ReadonlyArray<CompensationStep>;
}
```

### Type-level participant verification

When `.withProtocol()` is called, the type system verifies:

1. **Participant coverage**: Every participant named in the protocol exists as a provided port in the graph.

```typescript
type VerifyParticipants<
  TProvides extends string,
  TParticipants extends Record<string, DirectedPort<string, unknown>>,
> = {
  [K in keyof TParticipants]: TParticipants[K] extends DirectedPort<infer TName, unknown>
    ? TName extends TProvides
      ? true
      : MissingParticipantError<K & string, TName>
    : never;
};
```

2. **Action coverage**: Every action named in the protocol steps and compensation steps exists as a method on the corresponding participant's port interface.

```typescript
type VerifyActions<
  TParticipants extends Record<string, DirectedPort<string, unknown>>,
  TSteps extends ReadonlyArray<ProtocolStep>,
> = {
  [I in keyof TSteps]: TSteps[I] extends {
    from: infer P extends string;
    action: infer A extends string;
  }
    ? TParticipants[P] extends DirectedPort<string, infer TService>
      ? A extends keyof TService
        ? true
        : MissingActionError<P, A>
      : never
    : never;
};
```

3. **Protocol well-formedness**: The step graph is acyclic (no infinite loops), every `onSuccess` target is either a valid participant or `"end"`, and compensation steps are reachable.

### Projection to local types

Following multiparty session type theory, the global protocol is projected onto each participant to produce a **local type** describing only the actions that participant must perform. Each participant's adapter is verified against its local projection, not the full global type. This reduces the verification scope and keeps error messages focused.

```typescript
type ProjectProtocol<
  TProtocol extends ProtocolConfig<Record<string, DirectedPort<string, unknown>>>,
  TParticipant extends string,
> = {
  readonly actions: Extract<TProtocol["steps"][number], { from: TParticipant }> extends {
    action: infer A extends string;
  }
    ? A
    : never;
  readonly compensations: Extract<
    TProtocol["compensation"][number],
    { participant: TParticipant }
  > extends { action: infer C extends string }
    ? C
    : never;
};
```

### Integration with graph builder

Protocol verification composes with existing graph validation. Multiple protocols can coexist in a single graph -- each is verified independently. A port can participate in multiple protocols as long as it implements all required actions from all protocols.

```typescript
const graph = GraphBuilder.create()
  .provide(adapter1)
  .provide(adapter2)
  .withProtocol(protocol1) // adds protocol constraints
  .withProtocol(protocol2) // multiple protocols supported
  .build();
// build() checks: dependencies + cycles + captive + protocols
```

## Consequences

### Positive

1. **Protocol safety**: Cross-service coordination protocols are verified at compile time. Missing compensation methods, absent participants, and incomplete workflows are caught before runtime.
2. **Documentation**: Protocol definitions serve as executable documentation of service interactions. New team members can read the protocol to understand the workflow without tracing application code.
3. **Refactoring confidence**: Changing a port interface that participates in a protocol immediately surfaces all protocol violations as type errors.
4. **Decidable verification**: The restriction to finite-control protocols ensures that verification always terminates and produces definite results.

### Negative

1. **Protocol definition overhead**: Developers must explicitly define protocols as data structures. For simple two-service interactions, this overhead may not be justified.
2. **TypeScript recursion limits**: Protocol state machine verification adds to the type-level computation budget. Complex protocols with many steps compete with graph cycle detection for recursion depth.
3. **Limited expressiveness**: The restriction to finite, non-recursive, first-order protocols excludes some patterns (e.g., protocols with dynamic participant sets or unbounded retry loops).
4. **Learning curve**: Multiparty session types are an advanced concept. The protocol definition API must be intuitive enough for developers unfamiliar with the theory.

### Neutral

1. **Optional feature**: Protocol verification is opt-in via `.withProtocol()`. Graphs without protocols behave exactly as before.
2. **Runtime validation**: Protocol constraints can also be verified at runtime during `.build()`, providing a fallback when type-level verification hits depth limits.
3. **Composable with templates**: Parametric adapter templates ([ADR-GR-004](./004-parametric-adapter-templates.md)) can be constrained by protocol roles, ensuring that a template instantiation satisfies the protocol requirements of its target port.

## References

- [BEH-CO-12](../../core/behaviors/12-protocol-state-machines.md): Protocol State Machines behavior
- [BEH-GR-05](../behaviors/05-operation-completeness.md): Operation Completeness behavior
- [ADR-GR-004](./004-parametric-adapter-templates.md): Parametric Adapter Templates
- [RES-02](../../../research/RES-02-session-types-behavioral-contracts.md): Session Types & Behavioral Contracts (Finding 4: Multiparty Session Types)
