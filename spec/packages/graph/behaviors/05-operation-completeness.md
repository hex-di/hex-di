# 05 — Operation Completeness

Verify at build time that adapters provide implementations for all methods declared by their port interfaces. Inspired by ML module system signature matching. See [ADR-GR-001](../decisions/001-operation-completeness-strategy.md) and [RES-05](../../../research/RES-05-module-systems-compositional-verification.md).

## BEH-GR-05-001: Type-Level Operation Completeness

The `createAdapter()` type signature verifies that the factory return type implements all operations declared by the provided port interfaces.

```ts
// Type-level constraint added to createAdapter
type VerifyOperationCompleteness<
  TProvides extends ReadonlyArray<DirectedPort<string, unknown>>,
  TFactory extends (...args: ReadonlyArray<unknown>) => Result<unknown, unknown>,
> = {
  [I in keyof TProvides]: TProvides[I] extends DirectedPort<string, infer TService>
    ? Exclude<keyof TService, keyof ExtractOk<ReturnType<TFactory>>> extends never
      ? true
      : MissingOperationsError<
          TProvides[I] extends DirectedPort<infer N, unknown> ? N : string,
          Exclude<keyof TService, keyof ExtractOk<ReturnType<TFactory>>>
        >
    : never;
};
```

**Algorithm**:

1. For each port in the adapter's `provides` tuple:
   a. Extract the port's service interface `TService`
   b. Extract the factory's `Ok` return type
   c. Compute `Exclude<keyof TService, keyof FactoryReturn>` — the missing operations
   d. If the exclusion is `never`, all operations are present
   e. Otherwise, emit a type error listing the missing operations
2. The constraint is applied as a conditional type on `createAdapter()`'s overload signatures

**Behavior Table**:

| Port Interface                  | Factory Return                                 | Result                           |
| ------------------------------- | ---------------------------------------------- | -------------------------------- |
| `{ get(): T; set(v: T): void }` | `{ get(): T; set(v: T): void }`                | Valid — all operations present   |
| `{ get(): T; set(v: T): void }` | `{ get(): T }`                                 | Type error: missing `set`        |
| `{ get(): T; set(v: T): void }` | `{ get(): T; set(v: T): void; extra(): void }` | Valid — extra operations allowed |
| `{ get(): T }`                  | `{}`                                           | Type error: missing `get`        |

**Example**:

```ts
import { port, createAdapter, SINGLETON, ok } from "@hex-di/core";

interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: UserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

const UserServicePort = port<UserService>()({ name: "UserService" });

// Type error: Missing operations 'createUser' | 'deleteUser'
// on adapter providing port "UserService"
const incomplete = createAdapter({
  provides: [UserServicePort],
  factory: () =>
    ok({
      getUser: async (id: string) => ({ id, name: "Alice" }),
    }),
  lifetime: SINGLETON,
});

// Valid: all operations present
const complete = createAdapter({
  provides: [UserServicePort],
  factory: () =>
    ok({
      getUser: async (id: string) => ({ id, name: "Alice" }),
      createUser: async (data: UserData) => ({ id: "new", ...data }),
      deleteUser: async (id: string) => {
        /* ... */
      },
    }),
  lifetime: SINGLETON,
});
```

**Design notes**:

- Extra operations (beyond what the port declares) are allowed — adapters can provide a superset.
- Method signature compatibility is checked by TypeScript's structural typing; this check only verifies key presence.
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## BEH-GR-05-002: Runtime Operation Completeness Check

During `.build()`, the builder performs a runtime verification that adapter factories produce objects with all expected methods. This catches cases where the type system cannot verify completeness (e.g., dynamic factories, `unknown` return types).

```ts
// Build-time verification
function verifyOperationCompleteness(
  adapter: AdapterRegistration,
  resolvedInstance: unknown
): ReadonlyArray<string>; // Returns missing operation names
```

**Algorithm**:

1. For each port in the adapter's `provides` tuple:
   a. Get the port's expected method names (from port metadata or runtime interface descriptor)
   b. Check that each expected method exists on the resolved instance
   c. Collect any missing method names
2. If any methods are missing, produce a `GraphBuildError` with:
   - Adapter name
   - Port name
   - List of missing operation names
3. The error is included in the aggregated build errors

**Behavior Table**:

| Expected Methods | Instance Methods           | Result                  |
| ---------------- | -------------------------- | ----------------------- |
| `["get", "set"]` | `["get", "set"]`           | Pass                    |
| `["get", "set"]` | `["get"]`                  | Fail: missing `["set"]` |
| `["get"]`        | `["get", "set", "delete"]` | Pass: superset allowed  |
| `[]`             | `["anything"]`             | Pass: no requirements   |

**Design notes**:

- Runtime check requires method names to be available at runtime. Port metadata (`tags`, `description`) can include an operation manifest, or runtime reflection via `Object.keys()` can enumerate expected methods.
- This check is a fallback for cases where type-level verification is insufficient. When both checks are available, the type-level check is preferred.
- Cross-ref: [BEH-GR-01-004](01-builder-api.md) (build validation pipeline).
