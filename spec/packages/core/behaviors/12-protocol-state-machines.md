# 12 — Protocol State Machines

Port interfaces with phantom state parameters encoding valid call ordering as type-level state machines. Methods return the port in its next valid state, making invalid call sequences compile-time errors. See [RES-02](../../../research/RES-02-session-types-behavioral-contracts.md).

## BEH-CO-12-001: Port Interface with Phantom State Parameter

Ports can carry a phantom `TState` parameter that represents the current protocol state. The service interface type is parameterized by this state, enabling conditional method availability based on the protocol phase.

```ts
declare const __protocolStateBrand: unique symbol;

// Protocol-aware port: the service type depends on the current state
type ProtocolPort<TName extends string, TService, TState extends string = "initial"> = Port<
  TName,
  TService
> & {
  readonly [__protocolStateBrand]: TState;
};

// Protocol-aware service interface example
interface Connection<TState extends ConnectionState = "disconnected"> {
  connect: TState extends "disconnected"
    ? (url: string) => Promise<Connection<"connected">>
    : never;

  query: TState extends "connected" ? (sql: string) => Promise<ReadonlyArray<unknown>> : never;

  disconnect: TState extends "connected" ? () => Promise<Connection<"disconnected">> : never;
}

type ConnectionState = "disconnected" | "connected";
```

**Exported from**: `protocols/types.ts` (proposed).

**Algorithm**:

1. Define the protocol states as a string literal union (e.g., `"disconnected" | "connected"`)
2. Parameterize the service interface with a `TState` type parameter defaulting to the initial state
3. Each method is conditionally available: `TState extends AllowedState ? MethodSignature : never`
4. Methods that cause state transitions return the interface parameterized with the new state
5. The port carries the initial state as its phantom parameter
6. The container resolves the port to a service in its initial state

**Behavior Table**:

| Current State    | `connect()`                                   | `query()`                                   | `disconnect()`                                   |
| ---------------- | --------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| `"disconnected"` | Available (returns `Connection<"connected">`) | `never` (type error)                        | `never` (type error)                             |
| `"connected"`    | `never` (type error)                          | Available (stays `Connection<"connected">`) | Available (returns `Connection<"disconnected">`) |

**Example**:

```ts
import { port, createAdapter, SINGLETON, ok } from "@hex-di/core";

// Define protocol states
type DBState = "disconnected" | "connected";

// Protocol-aware service interface
interface DatabaseService<TState extends DBState = "disconnected"> {
  connect: TState extends "disconnected"
    ? (connectionString: string) => Promise<DatabaseService<"connected">>
    : never;

  query: TState extends "connected"
    ? (sql: string) => Promise<ReadonlyArray<Record<string, unknown>>>
    : never;

  close: TState extends "connected" ? () => Promise<DatabaseService<"disconnected">> : never;

  readonly state: TState;
}

const DBPort = port<DatabaseService>()({
  name: "Database",
  direction: "outbound",
});

// Usage enforces protocol:
const db = container.resolve(DBPort);
// Type: DatabaseService<"disconnected">

db.query("SELECT 1");
// ^^^^^ Type error: query is never on "disconnected"

const connected = await db.connect("postgres://localhost/mydb");
// Type: DatabaseService<"connected">

const rows = await connected.query("SELECT * FROM users");
// OK — query is available on "connected"

connected.connect("...");
// ^^^^^^^ Type error: connect is never on "connected" (already connected)

const disconnected = await connected.close();
// Type: DatabaseService<"disconnected">
```

**Design notes**:

- Directly implements modular session types from Gay et al. (2015): the service interface is a session type, and each method is a session operation available only in the correct protocol state.
- The default state parameter (`= "disconnected"`) ensures backward compatibility — existing port definitions without state parameters continue to work.
- Protocol state is a phantom type (erased at runtime). Runtime state tracking remains the responsibility of the adapter implementation.
- Cross-ref: [BEH-CO-08](08-adapter-lifecycle-states.md) (adapter lifecycle uses the same phantom state pattern).

## BEH-CO-12-002: State Transition Types

Each protocol method's return type encodes the resulting state. The type system tracks state transitions through the call chain, ensuring the protocol is followed across multiple operations.

```ts
// State transition mapping as a type-level function
type TransitionMap<TState extends string> = {
  disconnected: {
    connect: "connected";
  };
  connected: {
    query: "connected"; // query does not change state
    close: "disconnected";
  };
};

// Generic transition type
type Transition<
  TState extends string,
  TMethod extends string,
> = TState extends keyof TransitionMap<TState>
  ? TMethod extends keyof TransitionMap<TState>[TState]
    ? TransitionMap<TState>[TState][TMethod]
    : never // method not available in this state
  : never; // invalid state

// Service method return type derived from transition map
type ProtocolMethod<
  TService,
  TState extends string,
  TMethod extends string,
  TArgs extends readonly unknown[],
  TReturn,
> = TMethod extends keyof TransitionMap<TState>[TState & keyof TransitionMap<TState>]
  ? (...args: TArgs) => TReturn & { readonly __nextState: Transition<TState, TMethod> }
  : never;
```

**Exported from**: `protocols/transitions.ts` (proposed).

**Algorithm**:

1. Define a `TransitionMap` type mapping `(State, Method) -> NextState`
2. For each method call, look up the transition: `Transition<CurrentState, MethodName>`
3. If the transition exists, the method is available and returns the service in the next state
4. If the transition does not exist (`never`), the method is unavailable (type error)
5. Chained calls propagate state: `db.connect(...).then(c => c.query(...))` tracks `disconnected -> connected -> connected`

**Behavior Table**:

| State            | Method      | `Transition<State, Method>` | Return Type                                      |
| ---------------- | ----------- | --------------------------- | ------------------------------------------------ |
| `"disconnected"` | `"connect"` | `"connected"`               | `DatabaseService<"connected">`                   |
| `"connected"`    | `"query"`   | `"connected"`               | `DatabaseService<"connected">` (state preserved) |
| `"connected"`    | `"close"`   | `"disconnected"`            | `DatabaseService<"disconnected">`                |
| `"disconnected"` | `"query"`   | `never`                     | Type error                                       |
| `"disconnected"` | `"close"`   | `never`                     | Type error                                       |

**Example**:

```ts
// Type-safe protocol chain
async function useDatabase(db: DatabaseService<"disconnected">): Promise<void> {
  const connected = await db.connect("postgres://localhost/mydb");
  // Transition: "disconnected" -> "connected"

  const rows = await connected.query("SELECT * FROM users");
  // Transition: "connected" -> "connected" (query preserves state)

  const disconnected = await connected.close();
  // Transition: "connected" -> "disconnected"

  // Protocol complete — db is back in initial state
}

// Type error: wrong order
async function wrongOrder(db: DatabaseService<"disconnected">): Promise<void> {
  await db.query("SELECT 1");
  // ^^^^^ Type error: query is never on "disconnected"
  // Must call connect() first
}
```

**Design notes**:

- The `TransitionMap` type is defined per-protocol, not globally. Each service interface defines its own state machine.
- Self-transitions (e.g., `query` on `"connected"` returning `"connected"`) are valid and represent operations that do not change the protocol state.
- Inspired by Wadler (2012) — propositions as sessions. Each state-method pair is a proposition; the transition map is the proof that the protocol is followed.
- Cross-ref: [BEH-CO-12-001](#beh-co-12-001-port-interface-with-phantom-state-parameter), [BEH-CO-08-003](08-adapter-lifecycle-states.md).

## BEH-CO-12-003: Invalid Sequence Detection

Attempting to call a method that is not valid in the current protocol state produces a compile-time type error. The error message indicates which state the port is in and which methods are available.

```ts
// Error type for invalid protocol sequences
type ProtocolError<TState extends string, TMethod extends string, TAvailable extends string> = {
  readonly __errorBrand: "ProtocolSequenceError";
  readonly __message: `Method '${TMethod}' is not available in state '${TState}'`;
  readonly __availableMethods: TAvailable;
  readonly __currentState: TState;
};

// Available methods helper
type AvailableMethods<TState extends string> = TState extends keyof TransitionMap<TState>
  ? keyof TransitionMap<TState>[TState]
  : never;
```

**Exported from**: `protocols/errors.ts` (proposed).

**Algorithm**:

1. When a method is accessed on a protocol-typed service, evaluate the conditional type
2. If the method is `never` (not in the transition map for the current state), TypeScript reports a type error
3. The error type includes:
   a. The current state (`TState`)
   b. The attempted method (`TMethod`)
   c. The list of methods available in the current state (`AvailableMethods<TState>`)
4. IDE tooltips display the structured error for developer guidance

**Behavior Table**:

| Protocol State   | Attempted Call      | Type Error Message                                          |
| ---------------- | ------------------- | ----------------------------------------------------------- |
| `"disconnected"` | `db.query("...")`   | `"Method 'query' is not available in state 'disconnected'"` |
| `"disconnected"` | `db.close()`        | `"Method 'close' is not available in state 'disconnected'"` |
| `"connected"`    | `db.connect("...")` | `"Method 'connect' is not available in state 'connected'"`  |
| `"connected"`    | `db.query("...")`   | (no error — method is available)                            |

**Example**:

```ts
// IDE shows descriptive error on hover
const db = container.resolve(DBPort);
// Type: DatabaseService<"disconnected">

db.close();
// Hover shows:
// {
//   __errorBrand: "ProtocolSequenceError";
//   __message: "Method 'close' is not available in state 'disconnected'";
//   __availableMethods: "connect";
//   __currentState: "disconnected";
// }

// Available methods in current state
type Methods = AvailableMethods<"disconnected">;
// Methods = "connect"

type ConnectedMethods = AvailableMethods<"connected">;
// ConnectedMethods = "query" | "close"
```

**Design notes**:

- The `ProtocolError` type follows the same pattern as `NotAPortError` in `ports/types.ts` — a branded error type that produces informative IDE tooltips instead of opaque `never`.
- This pattern pushes the error discovery to the earliest possible point (the IDE, before compilation), following the gradual guarantee from New, Licata, and Ahmed (2019): adding type annotations only catches more errors, never changes runtime behavior.
- For protocols with many states, the error message becomes particularly valuable since it lists available methods, guiding the developer to the correct call sequence.
- Cross-ref: [BEH-CO-12-001](#beh-co-12-001-port-interface-with-phantom-state-parameter), [BEH-CO-12-002](#beh-co-12-002-state-transition-types).
