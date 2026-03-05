# 08 — Well-Founded Cycles

Allow circular dependencies when the cycle contains at least one lazy edge. Lazy edges break the initialization-time dependency, permitting cycles that are well-founded (every service can be fully constructed before any lazy accessor is invoked). See [RES-05](../../../research/RES-05-module-systems-compositional-verification.md) Finding 5 (Dreyer, Rossberg — Mixin Modules).

## BEH-GR-08-001: Lazy Edge Annotation via lazyPort()

Adapters declare lazy dependencies using `lazyPort(P)` in their `requires` tuple. A lazy dependency provides a thunk `() => TService` instead of a direct reference. The dependency graph records the edge as "lazy" for cycle analysis.

```ts
import { lazyPort, type LazyPort, type IsLazyPort } from "@hex-di/core";

// lazyPort wraps a port to indicate lazy resolution
type LazyPort<TPort> = {
  readonly __portName: `Lazy${TPort extends { __portName: infer N } ? N & string : string}`;
  readonly __portService: () => TPort extends { __portService: infer S } ? S : unknown;
  readonly __lazy: true;
  readonly __originalPort: TPort;
};

// Type guard for lazy ports
type IsLazyPort<T> = T extends { readonly __lazy: true } ? true : false;
```

**Algorithm**:

1. When `lazyPort(P)` is called:
   a. Create a new port descriptor with `__lazy: true` and `__originalPort: P`
   b. The port name is prefixed with `"Lazy"` (e.g., `"LazyAuthService"`)
   c. The service type is wrapped in a thunk: `() => TService`
2. When the adapter is registered via `.provide()`:
   a. The `requires` tuple is scanned for lazy ports via `IsLazyPort<T>`
   b. Lazy ports are recorded as lazy edges in the dependency graph
   c. The original port name (without `"Lazy"` prefix) is used for dependency tracking
3. At factory invocation time:
   a. Lazy dependencies are injected as thunks that resolve on first call
   b. The thunk captures a reference to the container's resolution function

**Behavior Table**:

| Requires Entry              | Injected Type                       | Edge Type       | Port Name in Graph |
| --------------------------- | ----------------------------------- | --------------- | ------------------ |
| `UserServicePort`           | `UserService`                       | Eager (direct)  | `"UserService"`    |
| `lazyPort(UserServicePort)` | `() => UserService`                 | Lazy (deferred) | `"UserService"`    |
| `lazyPort(lazyPort(P))`     | Type error: nested lazy not allowed | N/A             | N/A                |

**Example**:

```ts
import { port, createAdapter, lazyPort, SINGLETON, ok } from "@hex-di/core";

interface AuthService {
  authenticate(token: string): Promise<boolean>;
}
interface UserRepo {
  getUser(id: string): Promise<User>;
}

const AuthPort = port<AuthService>()({ name: "AuthService" });
const UserPort = port<UserRepo>()({ name: "UserRepository" });

// AuthService eagerly depends on UserRepository
const authAdapter = createAdapter({
  provides: [AuthPort],
  requires: [UserPort],
  factory: ({ UserRepository }) =>
    ok({
      authenticate: async token => {
        const user = await UserRepository.getUser(token);
        return !!user;
      },
    }),
  lifetime: SINGLETON,
});

// UserRepository lazily depends on AuthService (breaks the cycle)
const userAdapter = createAdapter({
  provides: [UserPort],
  requires: [lazyPort(AuthPort)],
  factory: ({ LazyAuthService }) =>
    ok({
      getUser: async id => {
        // LazyAuthService is a thunk — AuthService is resolved on first call
        const auth = LazyAuthService();
        // ... use auth for audit logging
        return { id, name: "Alice" };
      },
    }),
  lifetime: SINGLETON,
});
```

**Design notes**:

- `lazyPort()` is a compile-time annotation. At runtime, the container injects a closure that defers resolution.
- Nested `lazyPort(lazyPort(P))` is rejected at the type level — `IsLazyPort<T> extends true ? never : LazyPort<T>` prevents wrapping.
- Cross-ref: [BEH-GR-06-002](06-enhanced-cycle-errors.md#beh-gr-06-002-refactoring-suggestions) (the `LazyEdge` suggestion directs users to this pattern).

## BEH-GR-08-002: Well-Foundedness Verification

A cycle with lazy edges is well-founded if and only if removing all lazy edges from the cycle eliminates it. The builder verifies this property: every cycle must contain at least one lazy edge, and every lazy edge must point to a service that can be fully constructed without the lazy reference.

```ts
interface WellFoundednessCheck {
  readonly _tag: "WellFounded" | "IllFounded";
  readonly cycle: ReadonlyArray<string>;
  readonly lazyEdges: ReadonlyArray<{ from: string; to: string }>;
  readonly reason?: string; // Present when ill-founded
}

function verifyWellFoundedness(
  cycle: ReadonlyArray<string>,
  graph: GraphRegistrations,
  lazyEdges: ReadonlySet<string> // Port names with lazy edges
): WellFoundednessCheck;
```

**Algorithm**:

1. Given a cycle `[A, B, C, A]` and a set of lazy edges:
   a. Identify which edges in the cycle are lazy: `lazyEdgesInCycle`
   b. If `lazyEdgesInCycle` is empty, the cycle is ill-founded (no lazy edge to break it)
2. Remove lazy edges from the cycle graph and re-run cycle detection on the remaining eager edges
   a. If the reduced graph still contains the cycle, it is ill-founded (lazy edges do not break the cycle)
   b. If the reduced graph is acyclic, proceed to construction order verification
3. For each lazy edge `A --lazy--> B`:
   a. Verify that B can be fully constructed without resolving A
   b. B's eager transitive dependencies must not include A
   c. If B's eager construction requires A, the cycle is ill-founded
4. Return `WellFounded` if all checks pass, `IllFounded` with reason otherwise

**Behavior Table**:

| Cycle           | Lazy Edges                       | Eager Subgraph        | Result                                         |
| --------------- | -------------------------------- | --------------------- | ---------------------------------------------- |
| `A → B → A`     | `B --lazy--> A`                  | `A → B` (acyclic)     | Well-founded                                   |
| `A → B → A`     | none                             | `A → B → A` (cyclic)  | Ill-founded: no lazy edges                     |
| `A → B → C → A` | `C --lazy--> A`                  | `A → B → C` (acyclic) | Well-founded                                   |
| `A → B → C → A` | `A --lazy--> B`                  | `B → C → A` (cyclic)  | Ill-founded: lazy edge doesn't break the cycle |
| `A → B → A`     | `A --lazy--> B`, `B --lazy--> A` | empty (acyclic)       | Well-founded (both edges lazy)                 |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, lazyPort, SINGLETON, ok } from "@hex-di/core";

const APort = port<A>()({ name: "A" });
const BPort = port<B>()({ name: "B" });
const CPort = port<C>()({ name: "C" });

// Ill-founded: lazy edge from A→B does not break the cycle B→C→A
const aAdapter = createAdapter({
  provides: [APort],
  requires: [lazyPort(BPort)], // lazy
  factory: ({ LazyB }) => ok(new AImpl(LazyB)),
  lifetime: SINGLETON,
});
const bAdapter = createAdapter({
  provides: [BPort],
  requires: [CPort], // eager
  factory: ({ C }) => ok(new BImpl(C)),
  lifetime: SINGLETON,
});
const cAdapter = createAdapter({
  provides: [CPort],
  requires: [APort], // eager — creates eager cycle B→C→A
  factory: ({ A }) => ok(new CImpl(A)),
  lifetime: SINGLETON,
});

const result = GraphBuilder.create()
  .provide(aAdapter)
  .provide(bAdapter)
  .provide(cAdapter)
  .tryBuild();

// result.isErr() === true
// Ill-founded: eager subgraph B→C→A still contains a cycle
```

**Design notes**:

- Well-foundedness is inspired by well-founded recursion in type theory: every recursive reference must go through a "guard" (the lazy thunk) that ensures termination.
- The verification runs at `build()` time, not at each `provide()` call, because the full cycle structure is only known when all adapters are registered.
- Cross-ref: [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph) (relaxed: cycles are permitted if well-founded).

## BEH-GR-08-003: Cycle Relaxation

When `.build()` or `.tryBuild()` detects a cycle, it first checks whether the cycle is well-founded before reporting an error. Well-founded cycles pass validation and produce a valid graph.

```ts
// Modified build validation pipeline
function validateGraph(
  adapters: ReadonlyArray<AdapterRegistration>,
  lazyEdges: ReadonlySet<string>
): ReadonlyArray<GraphValidationError> {
  const cycles = detectCycles(adapters);
  const errors: GraphValidationError[] = [];

  for (const cycle of cycles) {
    const check = verifyWellFoundedness(cycle, adapters, lazyEdges);
    if (check._tag === "IllFounded") {
      errors.push(
        CyclicDependencyBuild({
          cyclePath: cycle,
          message: `Ill-founded cycle: ${check.reason}`,
          lazyEdges: check.lazyEdges,
        })
      );
    }
    // Well-founded cycles are silently accepted
  }

  return errors;
}
```

**Algorithm**:

1. Run cycle detection (Tarjan's algorithm) on the full graph (including lazy edges)
2. For each detected cycle:
   a. Run well-foundedness verification ([BEH-GR-08-002](#beh-gr-08-002-well-foundedness-verification))
   b. If well-founded, record the cycle as "accepted with lazy edges" (for inspection/debugging)
   c. If ill-founded, produce a `CyclicDependencyBuild` error with the lazy edge information
3. At the type level:
   a. Lazy edges are excluded from cycle detection DFS traversal
   b. `IsReachable` skips lazy edges, so `WouldCreateCycle` only detects eager cycles
   c. A cycle that exists only via lazy edges does not trigger a compile error

**Behavior Table**:

| Graph Structure | Lazy Edges      | Build Result                                   |
| --------------- | --------------- | ---------------------------------------------- |
| `A → B → A`     | `B --lazy--> A` | Success (well-founded)                         |
| `A → B → A`     | none            | Error: cyclic dependency                       |
| `A → B → C → A` | `C --lazy--> A` | Success (well-founded)                         |
| `A → B → C → A` | `A --lazy--> B` | Error: ill-founded (eager cycle B→C→A remains) |
| No cycle        | any             | Success                                        |

**Design notes**:

- Cycle relaxation is conservative: only cycles that are provably well-founded are accepted. Ambiguous cases (e.g., mutual lazy references without clear construction order) are rejected with a diagnostic message.
- The type-level implementation skips lazy edges during DFS, which means compile-time cycle detection is already "relaxed" for lazy edges. Runtime verification provides the additional well-foundedness check.
- Cross-ref: [BEH-GR-06-001](06-enhanced-cycle-errors.md#beh-gr-06-001-ascii-cycle-diagram) (error messages include lazy edge annotations).

## BEH-GR-08-004: Initialization Ordering with Lazy Edges

When a graph contains well-founded cycles with lazy edges, the initialization order is determined by the eager-only subgraph. Lazy edges are resolved after the initial construction phase.

```ts
interface InitializationPlan {
  readonly eagerOrder: ReadonlyArray<string>; // Topological sort of eager edges
  readonly lazyResolutions: ReadonlyArray<{
    readonly port: string; // Port that is lazily resolved
    readonly dependentPort: string; // Port that lazily depends on it
    readonly resolvedAfter: string; // Port after which the lazy resolution becomes safe
  }>;
}

function computeInitializationPlan(
  adapters: ReadonlyArray<AdapterRegistration>,
  lazyEdges: ReadonlySet<string>
): InitializationPlan;
```

**Algorithm**:

1. Build the eager-only subgraph by removing all lazy edges
2. Compute topological sort on the eager subgraph → `eagerOrder`
3. For each lazy edge `A --lazy--> B`:
   a. Find B's position in `eagerOrder`
   b. Record that the lazy thunk for B (injected into A) becomes safe to invoke after B is initialized
   c. Produce a `lazyResolution` entry: `{ port: B, dependentPort: A, resolvedAfter: B }`
4. Verify safety: for every lazy resolution, `B` must appear before `A` in `eagerOrder`, or `B` must be in a parallel initialization tier that completes before `A`'s lazy accessor is first called
5. Return the combined plan

**Behavior Table**:

| Eager Graph            | Lazy Edges      | Eager Order          | Lazy Resolutions                                      |
| ---------------------- | --------------- | -------------------- | ----------------------------------------------------- |
| `C → B → A`            | `A --lazy--> C` | `[A, B, C]`          | `{port: "C", dependentPort: "A", resolvedAfter: "C"}` |
| `B → A`, `C → A`       | `A --lazy--> B` | `[A, C, B]`          | `{port: "B", dependentPort: "A", resolvedAfter: "B"}` |
| `A`, `B` (independent) | `A --lazy--> B` | `[A, B]` or `[B, A]` | `{port: "B", dependentPort: "A", resolvedAfter: "B"}` |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, lazyPort, SINGLETON, ok } from "@hex-di/core";

const EventBusPort = port<EventBus>()({ name: "EventBus" });
const AuthPort = port<AuthService>()({ name: "AuthService" });
const UserPort = port<UserRepo>()({ name: "UserRepository" });

// EventBus → (lazy) AuthService
const eventAdapter = createAdapter({
  provides: [EventBusPort],
  requires: [lazyPort(AuthPort)],
  factory: ({ LazyAuthService }) => ok(new EventBusImpl(LazyAuthService)),
  lifetime: SINGLETON,
});

// AuthService → UserRepository
const authAdapter = createAdapter({
  provides: [AuthPort],
  requires: [UserPort],
  factory: ({ UserRepository }) => ok(new AuthServiceImpl(UserRepository)),
  lifetime: SINGLETON,
});

// UserRepository → EventBus
const userAdapter = createAdapter({
  provides: [UserPort],
  requires: [EventBusPort],
  factory: ({ EventBus }) => ok(new UserRepoImpl(EventBus)),
  lifetime: SINGLETON,
});

// Well-founded cycle: EventBus --lazy--> AuthService → UserRepository → EventBus
// Eager subgraph: AuthService → UserRepository → EventBus (acyclic)
// Initialization order:
//   1. EventBus (no eager deps — lazy dep on Auth is deferred)
//   2. UserRepository (depends on EventBus, now initialized)
//   3. AuthService (depends on UserRepository, now initialized)
// After step 3: EventBus's lazy thunk for AuthService becomes safe to invoke
const graph = GraphBuilder.create()
  .provide(eventAdapter)
  .provide(authAdapter)
  .provide(userAdapter)
  .build();
```

**Design notes**:

- The initialization plan is a runtime artifact computed during `build()`. It extends the existing topological sort to account for lazy edges.
- Lazy thunks are injected as closures that capture the container's resolution mechanism. They do not trigger initialization — they wait for the first invocation.
- The plan is available via `graph.inspect()` for debugging initialization order issues.
- Cross-ref: [BEH-GR-09](09-init-order-verification.md) (initialization order verification builds on this plan).
