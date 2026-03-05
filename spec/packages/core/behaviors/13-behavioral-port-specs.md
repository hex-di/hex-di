# 13 — Behavioral Port Specifications

Pre/postcondition and invariant annotations on port method contracts, enabling runtime verification that adapter implementations honor the behavioral contract beyond structural conformance. See [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md).

## BEH-CO-13-001: Pre/Postcondition Annotations on Port Methods

Ports can declare preconditions (requirements on arguments) and postconditions (guarantees on return values) for each method. These annotations are stored in the port's runtime metadata and evaluated when runtime verification mode is enabled.

```ts
type Predicate<T> = (value: T) => boolean;

interface MethodContract<TArgs extends readonly unknown[], TReturn> {
  readonly preconditions: ReadonlyArray<{
    readonly name: string;
    readonly check: Predicate<TArgs>;
    readonly message: string;
  }>;
  readonly postconditions: ReadonlyArray<{
    readonly name: string;
    readonly check: Predicate<TReturn>;
    readonly message: string;
  }>;
}

interface BehavioralPortSpec<T> {
  readonly methods: {
    readonly [K in keyof T as T[K] extends (...args: ReadonlyArray<unknown>) => unknown
      ? K
      : never]: MethodContract<
      Parameters<T[K] & ((...args: ReadonlyArray<unknown>) => unknown)>,
      ReturnType<T[K] & ((...args: ReadonlyArray<unknown>) => unknown)>
    >;
  };
}

// Port creation with behavioral spec
function portWithContract<T>(config: {
  readonly name: string;
  readonly direction?: PortDirection;
  readonly contract: BehavioralPortSpec<T>;
}): DirectedPort<typeof config.name, T, PortDirection>;
```

**Exported from**: `contracts/behavioral.ts` (proposed).

**Algorithm**:

1. Port creator defines preconditions and postconditions per method via `portWithContract()`
2. Each condition is a named predicate function with a human-readable failure message
3. The conditions are stored in the port's frozen metadata alongside the structural definition
4. At resolution time (when runtime verification is enabled), conditions are registered for interception
5. Conditions are `Object.freeze()`d at port creation time

**Behavior Table**:

| Annotation                    | Target                 | Checked When             | Failure                        |
| ----------------------------- | ---------------------- | ------------------------ | ------------------------------ |
| Precondition                  | Method arguments       | Before method invocation | `PreconditionViolation` error  |
| Postcondition                 | Method return value    | After method invocation  | `PostconditionViolation` error |
| Precondition on async method  | Method arguments       | Before `await`           | `PreconditionViolation` error  |
| Postcondition on async method | Resolved promise value | After `await`            | `PostconditionViolation` error |

**Example**:

```ts
import { portWithContract, ok } from "@hex-di/core";

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<boolean>;
}

const UserRepoPort = portWithContract<UserRepository>({
  name: "UserRepository",
  direction: "outbound",
  contract: {
    methods: {
      findById: {
        preconditions: [
          {
            name: "non-empty-id",
            check: ([id]) => id.length > 0,
            message: "User ID must be non-empty",
          },
        ],
        postconditions: [
          {
            name: "consistent-id",
            check: result => result === null || result.id.length > 0,
            message: "Returned user must have a non-empty ID",
          },
        ],
      },
      save: {
        preconditions: [
          {
            name: "valid-user",
            check: ([user]) => user.id.length > 0 && user.email.includes("@"),
            message: "User must have valid ID and email",
          },
        ],
        postconditions: [],
      },
      delete: {
        preconditions: [
          {
            name: "non-empty-id",
            check: ([id]) => id.length > 0,
            message: "User ID must be non-empty",
          },
        ],
        postconditions: [],
      },
    },
  },
});
```

**Design notes**:

- Follows Findler and Felleisen (2002) — contracts for higher-order functions. Port methods are higher-order contracts: they specify behavior at the boundary between the service consumer and the adapter implementation.
- Preconditions protect the adapter (the consumer must provide valid input). Postconditions protect the consumer (the adapter must return valid output). This asymmetry maps directly to the blame theorem from Ahmed et al. (2011).
- Contract predicates are plain functions, not type-level constructs. This is a deliberate pragmatic choice — TypeScript's type system cannot express most interesting behavioral properties (e.g., "returned user has the same ID as requested").
- Cross-ref: [BEH-CO-10](10-contract-validation.md) (structural conformance), [BEH-CO-06](06-blame-aware-errors.md) (blame attribution).

## BEH-CO-13-002: Invariant Declarations on Port State

Ports that model stateful services can declare invariants — conditions that must hold before and after every method call on the service. Invariants are checked on the service instance itself, not on individual method arguments.

```ts
interface StateInvariant<T> {
  readonly name: string;
  readonly check: Predicate<T>;
  readonly message: string;
}

interface StatefulPortSpec<T> extends BehavioralPortSpec<T> {
  readonly invariants: ReadonlyArray<StateInvariant<T>>;
}

function portWithInvariants<T>(config: {
  readonly name: string;
  readonly direction?: PortDirection;
  readonly contract: StatefulPortSpec<T>;
}): DirectedPort<typeof config.name, T, PortDirection>;
```

**Exported from**: `contracts/invariants.ts` (proposed).

**Algorithm**:

1. Invariants are declared alongside method contracts in the port spec
2. Each invariant is a predicate over the service instance `T`
3. When runtime verification is enabled, invariants are checked:
   a. Before each method call (pre-invariant check)
   b. After each method call (post-invariant check)
4. If an invariant fails before a method call, the adapter has left the service in an invalid state from a prior operation — blame falls on the adapter
5. If an invariant fails after a method call, the current method has violated the invariant — blame falls on the adapter
6. Invariant violations produce `InvariantViolation` errors with blame context

**Behavior Table**:

| Check Point        | Invariant Holds | Blame                                            |
| ------------------ | --------------- | ------------------------------------------------ |
| Before method call | `true`          | N/A (continue)                                   |
| Before method call | `false`         | Adapter blamed (prior method left invalid state) |
| After method call  | `true`          | N/A (continue)                                   |
| After method call  | `false`         | Adapter blamed (current method broke invariant)  |

**Example**:

```ts
import { portWithInvariants } from "@hex-di/core";

interface ConnectionPool {
  readonly size: number;
  readonly activeCount: number;
  acquire(): Promise<Connection>;
  release(conn: Connection): void;
}

const PoolPort = portWithInvariants<ConnectionPool>({
  name: "ConnectionPool",
  direction: "outbound",
  contract: {
    invariants: [
      {
        name: "active-within-bounds",
        check: pool => pool.activeCount >= 0 && pool.activeCount <= pool.size,
        message: "Active connection count must be between 0 and pool size",
      },
      {
        name: "positive-size",
        check: pool => pool.size > 0,
        message: "Pool size must be positive",
      },
    ],
    methods: {
      acquire: {
        preconditions: [],
        postconditions: [],
      },
      release: {
        preconditions: [
          {
            name: "valid-connection",
            check: ([conn]) => conn !== null && conn !== undefined,
            message: "Released connection must not be null",
          },
        ],
        postconditions: [],
      },
    },
  },
});

// If an adapter's release() method decrements activeCount below 0:
// InvariantViolation {
//   _tag: "InvariantViolation",
//   invariantName: "active-within-bounds",
//   message: "Active connection count must be between 0 and pool size",
//   checkedAt: "post-method",
//   methodName: "release",
//   blame: { adapterFactory: { name: "poolAdapter" }, ... }
// }
```

**Design notes**:

- Invariants correspond to Hoare-style class invariants. The combination of preconditions + postconditions + invariants gives a full Design by Contract specification.
- Checking invariants on every method call has O(I \* M) overhead where I is the number of invariants and M is the number of method calls. This is acceptable in development mode but should be disabled in production.
- Invariants that require reading the service's internal state work best with services that expose read-only state properties (e.g., `readonly size`, `readonly activeCount`). Truly opaque services cannot have meaningful external invariants.
- Cross-ref: [BEH-CO-13-001](#beh-co-13-001-prepostcondition-annotations-on-port-methods), [INV-CO-2](../invariants.md#inv-co-2-frozen-resolved-services).

## BEH-CO-13-003: Runtime Verification Mode

When the container is configured with `runtimeVerification: true`, resolved services are wrapped in a Proxy that intercepts method calls to check preconditions, postconditions, and invariants. The proxy is transparent to the consumer.

```ts
interface VerificationConfig {
  readonly runtimeVerification?: boolean;
  readonly verificationMode?: "all" | "preconditions" | "postconditions" | "invariants";
  readonly onViolation?: "error" | "warn" | "log";
}

interface VerificationViolation {
  readonly _tag: "PreconditionViolation" | "PostconditionViolation" | "InvariantViolation";
  readonly contractName: string;
  readonly message: string;
  readonly portName: string;
  readonly methodName: string;
  readonly blame: BlameContext;
}

// Internal: proxy wrapper
function wrapWithVerification<T extends object>(
  instance: T,
  spec: StatefulPortSpec<T>,
  blameContext: Partial<BlameContext>
): T;
```

**Exported from**: `contracts/verification.ts` (proposed).

**Algorithm**:

1. When `runtimeVerification: true`, the container wraps resolved services in a Proxy
2. The Proxy's `get` trap intercepts property access
3. For function properties, return a wrapper function that:
   a. Checks all invariants on the current service state (pre-call)
   b. Checks all preconditions for this method against the arguments
   c. Invokes the original method
   d. For async methods, `await` the result before continuing
   e. Checks all postconditions for this method against the return value
   f. Checks all invariants on the service state (post-call)
   g. If any check fails, handle per `onViolation` config (`"error"` throws, `"warn"` logs warning, `"log"` logs info)
   h. Return the original method's return value
4. For non-function properties, pass through without interception
5. The Proxy preserves the service's identity (`instanceof` checks still work via `Symbol.hasInstance`)

**Behavior Table**:

| `runtimeVerification` | `onViolation`       | Violation Detected  | Behavior                                  |
| --------------------- | ------------------- | ------------------- | ----------------------------------------- |
| `false` (default)     | N/A                 | N/A                 | No proxy wrapping, zero overhead          |
| `true`                | `"error"` (default) | Precondition fails  | Throws `PreconditionViolation` error      |
| `true`                | `"warn"`            | Postcondition fails | `console.warn()` with violation details   |
| `true`                | `"log"`             | Invariant fails     | `console.log()` with violation details    |
| `true`                | `"error"`           | All checks pass     | Method executes normally, result returned |

**Example**:

```ts
import { buildContainer, GraphBuilder } from "@hex-di/core";

const container = buildContainer(graph, {
  runtimeVerification: true,
  onViolation: "error",
});

const userRepo = container.resolve(UserRepoPort);
// userRepo is a Proxy wrapping the real adapter instance

// Precondition violation:
await userRepo.findById("");
// Throws: PreconditionViolation {
//   _tag: "PreconditionViolation",
//   contractName: "non-empty-id",
//   message: "User ID must be non-empty",
//   portName: "UserRepository",
//   methodName: "findById",
//   blame: {
//     adapterFactory: { name: "pgUserRepoAdapter" },
//     portContract: { name: "UserRepository", direction: "outbound" },
//     violationType: { _tag: "ContractViolation", details: "Precondition 'non-empty-id' failed" },
//     resolutionPath: ["UserService", "UserRepository"]
//   }
// }

// Production: disable verification for zero overhead
const prodContainer = buildContainer(graph, {
  runtimeVerification: false, // default
});
```

**Design notes**:

- The Proxy-based approach is inspired by chaperones from Strickland et al. (2012): the verification proxy is a chaperone that observes method calls without changing the underlying service's behavior or return values.
- Verification is dev-mode only by default. The Proxy adds overhead for every method call (invariant checks, precondition checks, postcondition checks). For a service with 3 invariants and 2 conditions per method, each call incurs 7 predicate evaluations.
- `onViolation: "warn"` mode is useful during migration — adapters that violate contracts produce warnings but do not break the application.
- The verification proxy does NOT check structural conformance (that is [BEH-CO-10](10-contract-validation.md)). It only checks behavioral contracts (pre/post/invariants).
- Cross-ref: [BEH-CO-10-003](10-contract-validation.md) (contract violation errors), [BEH-CO-06-001](06-blame-aware-errors.md) (blame context).
