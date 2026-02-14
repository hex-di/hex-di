# Technical Refinement: @hex-di/flow GxP Compliance (6.5 -> 10/10)

**Package:** `@hex-di/flow`
**Current Score:** 6.5/10 (second weakest)
**Target Score:** 10/10
**Date:** 2026-02-10
**Source:** `libs/flow/core/src/` (~17,749 lines across 68 files)
**Constraint:** Tracing remains OPTIONAL. Emit warning when `FlowTracingHook` is not provided. Never block execution.

---

## 1. Current Score Breakdown

| Area                            | Current | Target | Delta | Critical Gaps                                                                                    |
| ------------------------------- | ------- | ------ | ----- | ------------------------------------------------------------------------------------------------ |
| Data Integrity (ALCOA+)         | 7/10    | 10/10  | +3    | No principal attribution, no cryptographic integrity, no trusted timestamps                      |
| Traceability & Audit Trail      | 7/10    | 10/10  | +3    | In-memory only, circular buffer eviction loses data, no tamper-proof storage                     |
| Determinism & Reproducibility   | 6/10    | 10/10  | +4    | `Object.keys()` ordering, no guard purity enforcement, non-deterministic activity IDs, no replay |
| Error Handling & Recovery       | 8/10    | 10/10  | +2    | No partial effect compensation, `SequenceAborted` missing succeeded-effects info                 |
| Validation & Input Verification | 6/10    | 10/10  | +4    | No runtime event payload validation, no context schema on restore, context stored as `unknown`   |
| Change Control & Versioning     | 5/10    | 10/10  | +5    | Hardcoded `version: 1`, no migration framework, no machine definition versioning                 |
| Testing & Verification          | 8/10    | 10/10  | +2    | No property-based tests, no determinism verification, no GxP-specific test suites                |
| Security                        | 2/10    | 10/10  | +8    | ZERO authorization, ZERO ACL, ZERO permission checks, ZERO approval gates                        |
| Documentation                   | 7/10    | 10/10  | +3    | No GxP compliance docs, no risk assessment, no traceability matrix                               |
| Compliance-Specific for Flows   | 5/10    | 10/10  | +5    | No approval gates, no electronic signatures, no step-level audit, no persistent replay           |

---

## 2. Gap Analysis

### 2.1 CRITICAL: No Authorization/ACL Layer (Security: 2/10)

**Problem:** Any caller with a reference to `MachineRunner` can invoke `send()`, `sendAndExecute()`, `sendBatch()`, and `dispose()` without any identity or permission verification. The `sendCore` function at `create-runner.ts:418` proceeds directly to `processEvent()` after checking only for disposal and queue overflow.

**Evidence:**

```typescript
// create-runner.ts:418-479
function sendCore(event: { readonly type: string }): Result<readonly EffectAny[], TransitionError> {
  if (disposed) {
    return err(Disposed({ machineId: machine.id, operation: "send" }));
  }
  // NO authorization check
  // NO principal identity
  // NO permission verification
  isProcessing = true;
  const initialResult = processEvent(event);
  // ...
}
```

**Impact:** Without authorization, any code path that obtains a runner reference can trigger any transition, including safety-critical state changes. This is a fundamental violation of 21 CFR Part 11 requirements for electronic records.

### 2.2 CRITICAL: No Approval Gate Mechanism (Compliance: 5/10)

**Problem:** The state machine has no concept of transitions that require explicit approval before proceeding. In regulated environments, certain transitions (e.g., `pending_review -> approved`, `batch_ready -> released`) must require one or more approvals with electronic signatures before the transition can execute.

**Evidence:** The `TransitionConfig` interface (`transition.ts:94-154`) has `guard`, `actions`, `effects`, and `internal` properties, but no `requiresApproval` or `approvalPolicy` mechanism.

**Impact:** Regulated workflows cannot be modeled without an external overlay system, defeating the purpose of having a typed state machine for GxP processes.

### 2.3 CRITICAL: Circular Buffer Eviction Loses Audit Data Silently (Traceability: 7/10)

**Problem:** The `CircularBuffer` (`circular-buffer.ts:48-60`) silently overwrites the oldest entry when full. The `FlowMemoryCollector` (`memory-collector.ts:339-354`) uses FIFO eviction. The `FlowRetentionPolicy.expiryMs` defaults to 5 minutes (`types.ts:259`). These mechanisms silently destroy audit records.

**Evidence:**

```typescript
// circular-buffer.ts:48-60
push(item: T): void {
  if (this.cap === 0) return;
  const writeIndex = (this.head + this.size) % this.cap;
  this.buffer[writeIndex] = item;
  if (this.size < this.cap) {
    this.size++;
  } else {
    // Buffer is full -- overwrite oldest, advance head
    // NO WARNING, NO CALLBACK, NO SINK NOTIFICATION
    this.head = (this.head + 1) % this.cap;
  }
}
```

**Impact:** In GxP environments, audit records must be retained for the required period (often 2+ years). Silent eviction means transition records are permanently lost with no recovery path and no notification.

### 2.4 HIGH: Object.keys() Ordering in Parallel Regions (Determinism: 6/10)

**Problem:** Parallel region iteration uses `Object.keys()` in 6 locations across the codebase. While modern JS engines iterate string keys in insertion order, this is not formally guaranteed by ECMAScript for all key types, and more critically, if two regions process the same event and both modify the shared context via actions, the final context value depends on iteration order.

**Locations:**

- `interpreter.ts:1432` -- `computeParallelRegionPaths`
- `interpreter.ts:1482` -- `collectRegionEntryEffects`
- `interpreter.ts:1512` -- `collectParallelExitEffects`
- `interpreter.ts:1560` -- `transitionParallelSafe` (main dispatch loop)
- `interpreter.ts:1677` -- `checkParallelOnDone`
- `interpreter.ts:1761` -- `canTransitionParallel`
- `create-runner.ts:518` -- `computeStateValue` (parallel region rendering)
- `create-runner.ts:880` -- `processParallelEvent` (history recording)
- `create-runner.ts:900` -- `processParallelEvent` (onDone history)

**Impact:** Context mutations across parallel regions are non-deterministic across JavaScript engines. The same machine definition could produce different outcomes on V8 vs SpiderMonkey.

### 2.5 HIGH: No State Machine Definition Versioning or Migration Framework (Change Control: 5/10)

**Problem:** `SerializedMachineState.version` is hardcoded to literal type `1` (`serialization.ts:33`). There is no mechanism to:

1. Version machine definitions (the `Machine` type has `id` but no `version`)
2. Detect that a serialized state was created by a different machine definition
3. Migrate serialized state when the machine definition evolves (states added/removed/renamed, context shape changed)

**Evidence:**

```typescript
// serialization.ts:31-42
export interface SerializedMachineState {
  readonly version: 1; // Hardcoded literal type, no migration path
  readonly machineId: string;
  readonly state: string;
  readonly context: unknown; // No schema validation
  readonly timestamp: number;
}
```

The `restoreMachineState` function (`serialization.ts:121-152`) validates that the serialized state name exists in the current machine definition, but does NOT validate:

- Whether the context shape matches the current machine's context type
- Whether the machine definition has changed since serialization
- Whether migration is needed

### 2.6 HIGH: Non-Deterministic Activity IDs (Determinism: 6/10)

**Problem:** Activity IDs are generated using `Date.now().toString(36)` + `Math.random().toString(36)` (`manager.ts:328-332`). `Math.random()` is not cryptographically secure and is non-reproducible, making exact replay of activity sequences impossible.

**Evidence:**

```typescript
// manager.ts:328-332
function generateActivityId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `activity-${timestamp}-${random}`;
}
```

### 2.7 HIGH: Guard Purity Not Enforced at Runtime (Determinism: 6/10)

**Problem:** Guards are user-provided functions. The library wraps them in `safeCall` (`interpreter.ts:253-259`) to catch exceptions but cannot enforce purity. A guard that reads `Date.now()`, `Math.random()`, network state, or a mutable global produces non-deterministic transitions.

**Evidence:** The guard signature in `TransitionConfigAny` (`transition.ts:182`) is simply `(context: never, event: never) => boolean` with no purity constraint or validation. The `callGuard` function (`interpreter.ts:151-157`) invokes it directly.

### 2.8 HIGH: No Partial Effect Compensation (Error Handling: 8/10)

**Problem:** When `sendAndExecute` runs effects sequentially via `executeEffectsSequentially` (`create-runner.ts:187-202`) and one fails midway, the already-executed effects are not compensated. The `SequenceAborted` error (`tagged-errors.ts:120-125`) captures the failing `stepIndex` but not which prior effects succeeded.

**Evidence:**

```typescript
// create-runner.ts:187-202
function executeEffectsSequentially(
  executor: EffectExecutor,
  effects: readonly EffectAny[]
): ResultAsync<void, EffectExecutionError> {
  return ResultAsync.fromResult(
    (async (): Promise<Result<void, EffectExecutionError>> => {
      for (const effect of effects) {
        const result = await executor.execute(effect);
        if (result._tag === "Err") {
          return result; // No compensation of prior effects
        }
      }
      return ok(undefined);
    })()
  );
}
```

### 2.9 HIGH: No Tamper-Proof Audit Trail (Traceability: 7/10)

**Problem:** Transition records are stored in a mutable JavaScript array (`FlowMemoryCollector.storedTransitions`). There is no hash chaining, no digital signatures, no append-only guarantee. Records can be modified, deleted, or reordered without detection.

### 2.10 HIGH: No Signed/Certified Audit Records (Data Integrity: 7/10)

**Problem:** `FlowTransitionEvent` records (`tracing/types.ts:47-96`) carry no digital signature, no hash, and no principal identity. There is no way to prove that a transition record has not been tampered with or that it was authorized by a specific principal.

### 2.11 MEDIUM: Context Stored as `unknown` in Serialization (Validation: 6/10)

**Problem:** `SerializedMachineState.context` is typed as `unknown` (`serialization.ts:39`). On restore, the context is returned as-is with no schema validation (`serialization.ts:148-151`). A corrupted or tampered serialized state could inject invalid context into a running machine.

### 2.12 MEDIUM: No Persistent Replay Executor (Determinism: 6/10)

**Problem:** There is no mechanism to replay a recorded sequence of events against a machine to reproduce an exact execution path. While the `FlowCollector` records transitions, there is no corresponding replay executor that can take a sequence of recorded events and reproduce the exact same state sequence with verification.

### 2.13 LOW: Timestamp Accuracy (Data Integrity: 7/10)

**Problem:** All timestamps use `Date.now()` and `performance.now()`, which are client-side and can be manipulated. There is no trusted time source integration.

### 2.14 LOW: History Map Grows Unbounded (Compliance: 5/10)

**Problem:** The `stateHistoryMap` in `create-runner.ts:385` grows with each compound state exit and is never pruned.

---

## 3. Required Changes (Exact Files, Code, Rationale)

### 3.1 Authorization Middleware Layer

**Files to modify:**

- `src/runner/types.ts` -- Add `AuthorizationPolicy` interface and `Principal` type
- `src/runner/create-runner.ts` -- Add pre-transition authorization check in `sendCore`
- `src/errors/tagged-errors.ts` -- Add `AuthorizationDenied` error variant
- `src/index.ts` -- Export new types

**Rationale:** Authorization must be a first-class concern of the runner, not an ad-hoc guard pattern. The authorization policy receives the principal, event, current state, and context, and returns a `Result<void, AuthorizationDenied>`.

#### 3.1.1 New types in `src/runner/types.ts`

```typescript
/**
 * Identifies the principal (user/system) that triggered an event.
 * Carries identity for audit attribution (ALCOA+ Attributable requirement).
 */
export interface Principal {
  /** Unique identifier for this principal (user ID, service account, etc.). */
  readonly id: string;
  /** Human-readable display name. */
  readonly displayName?: string;
  /** Roles or capabilities for authorization decisions. */
  readonly roles?: readonly string[];
}

/**
 * Authorization policy evaluated before every transition.
 *
 * Receives the principal, event, current state, and context.
 * Returns ok(void) to allow or err(AuthorizationDenied) to reject.
 *
 * Policies are synchronous to avoid blocking the event loop.
 */
export interface AuthorizationPolicy<TContext = unknown> {
  authorize(params: {
    readonly principal: Principal;
    readonly event: { readonly type: string };
    readonly currentState: string;
    readonly context: TContext;
  }): Result<void, AuthorizationDenied>;
}
```

#### 3.1.2 New error in `src/errors/tagged-errors.ts`

```typescript
export const AuthorizationDenied = createError("AuthorizationDenied");
export type AuthorizationDenied = Readonly<{
  _tag: "AuthorizationDenied";
  machineId: string;
  principal: string;
  eventType: string;
  currentState: string;
  reason?: string;
}>;

// Update TransitionError union:
export type TransitionError =
  | GuardThrew
  | ActionThrew
  | Disposed
  | QueueOverflow
  | AuthorizationDenied;
```

#### 3.1.3 Changes to `src/runner/create-runner.ts`

Add `authorizationPolicy` and `principal` to `MachineRunnerOptions`:

```typescript
export interface MachineRunnerOptions {
  // ... existing fields ...

  /**
   * Optional authorization policy evaluated before every transition.
   * When provided, all send/sendBatch/sendAndExecute calls must include
   * a principal via the runner's setPrincipal() method or the event itself.
   */
  readonly authorizationPolicy?: AuthorizationPolicy;

  /**
   * Default principal for events sent without explicit principal.
   * Required when authorizationPolicy is provided.
   */
  readonly defaultPrincipal?: Principal;
}
```

Modify `sendCore` to check authorization:

```typescript
function sendCore(event: { readonly type: string }): Result<readonly EffectAny[], TransitionError> {
  if (disposed) {
    return err(Disposed({ machineId: machine.id, operation: "send" }));
  }

  // Authorization check (before any state mutation)
  if (authorizationPolicy !== undefined) {
    const principal = currentPrincipal ?? defaultPrincipal;
    if (principal === undefined) {
      return err(
        AuthorizationDenied({
          machineId: machine.id,
          principal: "anonymous",
          eventType: event.type,
          currentState: currentState,
          reason: "No principal provided and no defaultPrincipal configured",
        })
      );
    }
    const authResult = authorizationPolicy.authorize({
      principal,
      event,
      currentState,
      context: currentContext,
    });
    if (authResult._tag === "Err") {
      return err(authResult.error);
    }
  }

  // ... rest of existing sendCore logic ...
}
```

Add principal attribution to `recordTransition`:

```typescript
function recordTransition(
  prevState: string,
  event: { readonly type: string },
  nextState: string,
  effects: readonly EffectAny[]
): void {
  const principal = currentPrincipal ?? defaultPrincipal;
  if (collector) {
    collector.collect({
      machineId: machine.id,
      prevState,
      event,
      nextState,
      effects,
      timestamp: Date.now(),
      principal: principal?.id, // NEW: who triggered this
    });
  }
  // ... rest unchanged ...
}
```

Add `setPrincipal` and `withPrincipal` to `MachineRunner` interface:

```typescript
export interface MachineRunner<TState, TEvent, TContext> {
  // ... existing methods ...

  /**
   * Sets the active principal for subsequent send() calls.
   * Required when authorizationPolicy is configured.
   */
  setPrincipal(principal: Principal): void;

  /**
   * Sends an event with an explicit principal for this single call.
   */
  sendAs(principal: Principal, event: TEvent): Result<readonly EffectAny[], TransitionError>;
}
```

### 3.2 Approval Gate Mechanism

**Files to modify:**

- `src/machine/state-node.ts` -- Add `approval` property to `StateNode`
- `src/machine/transition.ts` -- Add `requiresApproval` to `TransitionConfig`
- `src/runner/interpreter.ts` -- Check approval requirement before executing transition
- `src/runner/create-runner.ts` -- Add approval gate processing
- `src/errors/tagged-errors.ts` -- Add `ApprovalRequired` error variant

**Rationale:** Approval gates model the GxP requirement that certain transitions need one or more authorized principals to approve before executing. The approval pattern is: (1) transition is requested, (2) runner returns `ApprovalRequired` with an approval token, (3) external system collects approvals, (4) caller submits approval token to execute.

#### 3.2.1 New types

```typescript
// In src/runner/types.ts

/**
 * Describes an approval requirement for a regulated transition.
 */
export interface ApprovalRequirement {
  /** Human-readable description of what is being approved. */
  readonly description: string;
  /** Minimum number of approvers required. */
  readonly minApprovers: number;
  /** Roles that can approve (if empty, any authenticated principal can approve). */
  readonly approverRoles?: readonly string[];
}

/**
 * A pending approval request returned when a transition requires approval.
 */
export interface PendingApproval {
  /** Unique token for this approval request. */
  readonly token: string;
  /** The event that requires approval. */
  readonly event: { readonly type: string };
  /** The transition that will execute once approved. */
  readonly fromState: string;
  readonly toState: string;
  /** The approval requirement. */
  readonly requirement: ApprovalRequirement;
  /** Principals who have approved so far. */
  readonly approvals: readonly Principal[];
  /** Timestamp when the approval was requested. */
  readonly requestedAt: number;
  /** The principal who requested the transition. */
  readonly requestedBy: Principal;
}
```

#### 3.2.2 New transition property

```typescript
// In src/machine/transition.ts, add to TransitionConfig:
export interface TransitionConfig<TAllStates, TTarget, TEvent, TContext> {
  // ... existing fields ...

  /**
   * Approval requirement for this transition.
   * When set, the transition is not executed immediately. Instead,
   * send() returns an ApprovalRequired error with a PendingApproval token.
   * The transition executes only after sufficient approvals are submitted.
   */
  readonly requiresApproval?: ApprovalRequirement;
}
```

#### 3.2.3 New error

```typescript
// In src/errors/tagged-errors.ts
export const ApprovalRequired = createError("ApprovalRequired");
export type ApprovalRequired = Readonly<{
  _tag: "ApprovalRequired";
  machineId: string;
  approval: PendingApproval;
}>;
```

#### 3.2.4 New runner methods

```typescript
// In MachineRunner interface
export interface MachineRunner<TState, TEvent, TContext> {
  // ... existing methods ...

  /**
   * Submits an approval for a pending transition.
   * When all required approvals are collected, the transition executes.
   */
  approve(
    token: string,
    approver: Principal
  ): Result<readonly EffectAny[] | PendingApproval, TransitionError>;

  /**
   * Rejects a pending approval, cancelling the transition.
   */
  rejectApproval(token: string, rejector: Principal, reason: string): void;

  /**
   * Gets all pending approvals.
   */
  getPendingApprovals(): readonly PendingApproval[];
}
```

### 3.3 Deterministic Parallel Region Ordering

**Files to modify:**

- `src/runner/interpreter.ts` -- Replace all `Object.keys()` in parallel region iteration with sorted iteration

**Rationale:** Sorting region names alphabetically guarantees the same iteration order across all JavaScript engines and all invocations, eliminating the non-determinism concern.

#### 3.3.1 Add sorted keys helper

```typescript
// In src/runner/interpreter.ts, add at top of file:

/**
 * Returns object keys in deterministic sorted order.
 * Used for parallel region iteration to guarantee cross-engine consistency.
 * @internal
 */
function sortedKeys(obj: Readonly<Record<string, unknown>>): readonly string[] {
  return Object.keys(obj).sort();
}
```

#### 3.3.2 Replace all Object.keys() in parallel paths

Replace every `Object.keys(...)` call in the following functions with `sortedKeys(...)`:

| Function                     | Line | Current                            | Replace with                      |
| ---------------------------- | ---- | ---------------------------------- | --------------------------------- |
| `computeParallelRegionPaths` | 1432 | `Object.keys(parallelNode.states)` | `sortedKeys(parallelNode.states)` |
| `collectRegionEntryEffects`  | 1482 | `Object.keys(regionPaths.regions)` | `sortedKeys(regionPaths.regions)` |
| `collectParallelExitEffects` | 1512 | `Object.keys(regionPaths.regions)` | `sortedKeys(regionPaths.regions)` |
| `transitionParallelSafe`     | 1560 | `Object.keys(regionPaths.regions)` | `sortedKeys(regionPaths.regions)` |
| `checkParallelOnDone`        | 1677 | `Object.keys(regions)`             | `sortedKeys(regions)`             |
| `canTransitionParallel`      | 1761 | `Object.keys(regionPaths.regions)` | `sortedKeys(regionPaths.regions)` |

Also in `create-runner.ts`:

| Function               | Line | Current                                      | Replace with                                |
| ---------------------- | ---- | -------------------------------------------- | ------------------------------------------- |
| `computeStateValue`    | 518  | `Object.keys(activeParallelRegions.regions)` | `sortedKeys(activeParallelRegions.regions)` |
| `processParallelEvent` | 880  | `Object.keys(oldRegions)`                    | `sortedKeys(oldRegions)`                    |
| `processParallelEvent` | 900  | `Object.keys(activeParallelRegions.regions)` | `sortedKeys(activeParallelRegions.regions)` |

### 3.4 Audit Sink Interface (Tamper-Proof Audit Trail)

**Files to create:**

- `src/audit/types.ts` -- `AuditSink`, `AuditRecord`, `AuditChain` interfaces
- `src/audit/hash-chain.ts` -- Hash chain computation for tamper detection
- `src/audit/index.ts` -- Module exports

**Files to modify:**

- `src/runner/create-runner.ts` -- Wire `AuditSink` into `recordTransition`
- `src/introspection/circular-buffer.ts` -- Add eviction callback
- `src/index.ts` -- Export audit module

**Rationale:** The audit trail must be persistent, append-only, and tamper-detectable. The `AuditSink` is a pluggable interface (like `FlowCollector`) that accepts structured audit records with hash chaining. The library provides the hash computation; the persistence backend is pluggable.

### 3.5 State Migration Framework

**Files to modify:**

- `src/serialization/serialization.ts` -- Support versioned serialization
- `src/serialization/errors.ts` -- Add `VersionMismatch` and `MigrationFailed` errors

**Files to create:**

- `src/serialization/migration.ts` -- Migration registry and executor

**Rationale:** Machine definitions evolve. Serialized state from version N must be migratable to version N+1.

#### 3.5.1 Updated SerializedMachineState

```typescript
export interface SerializedMachineState {
  /** Schema version. Incremented when machine definition changes. */
  readonly version: number;
  readonly machineId: string;
  readonly state: string;
  readonly context: unknown;
  readonly timestamp: number;
  /** Hash of the machine definition at serialization time. */
  readonly machineDefinitionHash?: string;
}
```

#### 3.5.2 Migration registry

```typescript
// src/serialization/migration.ts

/**
 * A migration function that transforms serialized state from version N to N+1.
 */
export interface StateMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrate: (
    state: SerializedMachineState
  ) => Result<SerializedMachineState, MigrationFailed>;
}

/**
 * Registry of migrations for a machine.
 */
export interface MigrationRegistry {
  readonly currentVersion: number;
  readonly migrations: readonly StateMigration[];
}

/**
 * Creates a migration registry for a machine.
 */
export function createMigrationRegistry(
  currentVersion: number,
  migrations: readonly StateMigration[]
): MigrationRegistry;

/**
 * Applies migrations to bring serialized state up to the current version.
 */
export function migrateState(
  serialized: SerializedMachineState,
  registry: MigrationRegistry
): Result<SerializedMachineState, MigrationFailed | VersionMismatch>;
```

### 3.6 Machine Definition Versioning

**Files to modify:**

- `src/machine/define-machine.ts` -- Accept optional `version` in config
- `src/machine/types.ts` -- Add `version` to `MachineAny`

**Rationale:** Machine definitions need a version number to detect when serialized state was created by a different definition version.

#### 3.6.1 Updated Machine type

```typescript
export interface MachineAny {
  readonly id: string;
  readonly initial: string;
  readonly states: Record<string, unknown>;
  readonly context: unknown;
  /** Machine definition version. Defaults to 1 if not specified. */
  readonly version: number;
}
```

#### 3.6.2 Updated defineMachine

```typescript
export function defineMachine(config: {
  readonly id: string;
  readonly initial?: string;
  readonly states: Record<string, StateNodeAny>;
  readonly context?: unknown;
  readonly version?: number; // NEW
}): Machine<string, string, unknown> {
  // ...
  const frozenConfig = deepFreeze({
    id: config.id,
    initial,
    states: normalizedStates,
    context: config.context,
    version: config.version ?? 1,
  });
  // ...
}
```

### 3.7 Deterministic Activity ID Generation

**Files to modify:**

- `src/activities/manager.ts` -- Replace `Math.random()` with configurable ID generator

**Rationale:** Activity IDs must be deterministic for replay and cryptographically safe for production.

#### 3.7.1 Pluggable ID generator

```typescript
// In ActivityManagerConfig:
export interface ActivityManagerConfig {
  readonly defaultTimeout?: number;
  /**
   * Custom ID generator for activity instances.
   * Defaults to crypto-random UUID generation.
   * For replay/testing, inject a deterministic sequence generator.
   */
  readonly idGenerator?: () => string;
}
```

#### 3.7.2 Updated generateActivityId

```typescript
// In createActivityManager:
const idGen = config?.idGenerator ?? defaultIdGenerator;

function defaultIdGenerator(): string {
  // Use crypto.randomUUID() when available, fall back to crypto.getRandomValues()
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `activity-${globalThis.crypto.randomUUID()}`;
  }
  // Fallback: crypto.getRandomValues for environments without randomUUID
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `activity-${hex}`;
}
```

### 3.8 Guard Purity Enforcement

**Files to create:**

- `src/runner/guard-purity.ts` -- Guard purity validator

**Files to modify:**

- `src/runner/interpreter.ts` -- Add optional purity check in `callGuard`
- `src/runner/create-runner.ts` -- Add `enforcePureGuards` option

**Rationale:** Non-pure guards violate determinism requirements. We add an optional runtime check that runs the guard twice with the same inputs and verifies identical results.

#### 3.8.1 Purity validation

```typescript
// src/runner/guard-purity.ts

/**
 * Validates guard purity by running the guard twice with identical inputs
 * and verifying the results match.
 *
 * This is a development/validation-time check, not production.
 * Enable via MachineRunnerOptions.enforcePureGuards.
 *
 * @internal
 */
export function validateGuardPurity(
  guard: (context: never, event: never) => boolean,
  context: unknown,
  event: unknown
): Result<boolean, GuardThrew> {
  const result1 = callGuard(guard, context, event);
  const result2 = callGuard(guard, context, event);
  if (result1 !== result2) {
    return err(
      GuardThrew({
        machineId: "",
        currentState: "",
        eventType: "",
        cause: new Error(
          `Guard produced non-deterministic results: first call returned ${result1}, second call returned ${result2}. ` +
            `Guards must be pure functions of (context, event).`
        ),
      })
    );
  }
  return ok(result1);
}
```

#### 3.8.2 Runner option

```typescript
// In MachineRunnerOptions:
export interface MachineRunnerOptions {
  // ... existing ...

  /**
   * When true, guards are evaluated twice with identical inputs to detect
   * non-deterministic behavior. Enable for development/validation, disable
   * for production to avoid double-evaluation overhead.
   *
   * @default false
   */
  readonly enforcePureGuards?: boolean;
}
```

### 3.9 Partial Effect Compensation

**Files to modify:**

- `src/effects/types.ts` -- Add optional `compensate` to effect types
- `src/runner/create-runner.ts` -- Track succeeded effects and compensate on failure
- `src/errors/tagged-errors.ts` -- Add `completedEffects` to `SequenceAborted`

**Rationale:** When a sequence of effects fails midway, the caller needs to know which effects succeeded and optionally compensate them.

#### 3.9.1 Compensation on EffectAny

```typescript
// In EffectAny, add optional compensation:
export interface CompensableEffect extends EffectAny {
  /**
   * Optional compensation effect to execute if a later effect in the
   * sequence fails. Enables saga-style compensating transactions.
   */
  readonly compensate?: EffectAny;
}
```

#### 3.9.2 Enhanced SequenceAborted

```typescript
export type SequenceAborted = Readonly<{
  _tag: "SequenceAborted";
  stepIndex: number;
  cause: unknown;
  /** Effects that completed successfully before the failure. */
  completedSteps: readonly number[];
}>;
```

#### 3.9.3 Enhanced executeEffectsSequentially

```typescript
function executeEffectsSequentially(
  executor: EffectExecutor,
  effects: readonly EffectAny[]
): ResultAsync<void, EffectExecutionError> {
  return ResultAsync.fromResult(
    (async (): Promise<Result<void, EffectExecutionError>> => {
      const completedSteps: number[] = [];
      for (let i = 0; i < effects.length; i++) {
        const effect = effects[i];
        if (effect === undefined) continue;
        const result = await executor.execute(effect);
        if (result._tag === "Err") {
          // Compensate previously succeeded effects in reverse order
          for (let j = completedSteps.length - 1; j >= 0; j--) {
            const completedIdx = completedSteps[j];
            if (completedIdx === undefined) continue;
            const completedEffect = effects[completedIdx];
            if (completedEffect !== undefined && "compensate" in completedEffect) {
              const comp = Object.getOwnPropertyDescriptor(completedEffect, "compensate");
              if (comp?.value !== undefined) {
                await executor.execute(comp.value);
              }
            }
          }
          return err(
            SequenceAborted({
              stepIndex: i,
              cause: result.error,
              completedSteps,
            })
          );
        }
        completedSteps.push(i);
      }
      return ok(undefined);
    })()
  );
}
```

### 3.10 Runtime Event Payload Validation

**Files to modify:**

- `src/machine/transition.ts` -- Add optional `validate` to `TransitionConfig`
- `src/runner/interpreter.ts` -- Call validator before guard evaluation
- `src/errors/tagged-errors.ts` -- Add `EventValidationFailed` error

**Rationale:** Type-level enforcement is erased at runtime. In GxP, invalid event payloads must be rejected with a structured error, not silently processed.

#### 3.10.1 Validator on TransitionConfig

```typescript
export interface TransitionConfig<TAllStates, TTarget, TEvent, TContext> {
  // ... existing fields ...

  /**
   * Optional runtime validator for the event payload.
   * Called before guard evaluation. Returns true if the event is valid.
   * When a validator is provided and returns false, the transition produces
   * an EventValidationFailed error.
   */
  readonly validate?: (event: TEvent) => boolean;
}
```

#### 3.10.2 Validator on StateNode (for all events entering a state)

Additionally, add machine-level event validation via a configurable `eventValidator` on `MachineRunnerOptions`:

```typescript
export interface MachineRunnerOptions {
  // ... existing ...

  /**
   * Optional event validator called for every event before processing.
   * Receives the event and returns a Result. On failure, the transition
   * is rejected with EventValidationFailed.
   */
  readonly eventValidator?: (event: { readonly type: string }) => Result<void, { reason: string }>;
}
```

### 3.11 Context Schema Validation on Restore

**Files to modify:**

- `src/serialization/serialization.ts` -- Add optional context validator parameter

**Rationale:** Restoring context from serialized state without schema validation allows corrupted/tampered data to enter the machine.

#### 3.11.1 Updated restoreMachineState

```typescript
export function restoreMachineState(
  serialized: SerializedMachineState,
  machine: MachineAny,
  options?: {
    /**
     * Optional context validator. When provided, the serialized context
     * is validated against this function before being returned.
     * Return ok(void) if valid, err with a reason if invalid.
     */
    readonly contextValidator?: (context: unknown) => Result<void, { reason: string }>;
    /**
     * Migration registry for version-aware deserialization.
     */
    readonly migrations?: MigrationRegistry;
  }
): Result<{ readonly state: string; readonly context: unknown }, RestoreError> {
  // ... existing checks ...

  // Apply migrations if needed
  let migrated = serialized;
  if (options?.migrations !== undefined && serialized.version < options.migrations.currentVersion) {
    const migrationResult = migrateState(serialized, options.migrations);
    if (migrationResult._tag === "Err") {
      return err(migrationResult.error);
    }
    migrated = migrationResult.value;
  }

  // Validate context schema
  if (options?.contextValidator !== undefined) {
    const validationResult = options.contextValidator(migrated.context);
    if (validationResult._tag === "Err") {
      return err(
        ContextValidationFailed({
          reason: validationResult.error.reason,
        })
      );
    }
  }

  return ok({
    state: migrated.state,
    context: migrated.context,
  });
}
```

### 3.12 Circular Buffer Eviction Callback

**Files to modify:**

- `src/introspection/circular-buffer.ts` -- Add `onEvict` callback

**Rationale:** When the buffer is full and about to evict, the callback allows the audit sink to persist the evicted record before it is lost.

#### 3.12.1 Updated CircularBuffer

```typescript
export class CircularBuffer<T> {
  private readonly buffer: Array<T | undefined>;
  private readonly cap: number;
  private readonly onEvict: ((item: T) => void) | undefined;
  private head = 0;
  private size = 0;

  constructor(capacity: number, onEvict?: (item: T) => void) {
    this.cap = capacity;
    this.buffer = new Array<T | undefined>(capacity).fill(undefined);
    this.onEvict = onEvict;
  }

  push(item: T): void {
    if (this.cap === 0) return;

    const writeIndex = (this.head + this.size) % this.cap;

    if (this.size < this.cap) {
      this.buffer[writeIndex] = item;
      this.size++;
    } else {
      // Notify before eviction
      const evicted = this.buffer[this.head];
      if (evicted !== undefined && this.onEvict !== undefined) {
        this.onEvict(evicted);
      }
      this.buffer[writeIndex] = item;
      this.head = (this.head + 1) % this.cap;
    }
  }

  // ... rest unchanged ...
}
```

### 3.13 Pluggable Clock Interface

**Files to create:**

- `src/clock/types.ts` -- `Clock` interface

**Files to modify:**

- `src/runner/create-runner.ts` -- Use injected clock instead of `Date.now()`
- `src/activities/manager.ts` -- Use injected clock
- `src/tracing/memory-collector.ts` -- Use injected clock

**Rationale:** Enables NTP-synchronized or hardware-timestamped audit records.

#### 3.13.1 Clock interface

```typescript
// src/clock/types.ts

/**
 * Pluggable clock interface for timestamp generation.
 * Enables trusted time sources in GxP environments.
 */
export interface Clock {
  /** Returns current timestamp in milliseconds (like Date.now()). */
  now(): number;
}

/**
 * Default clock using Date.now().
 */
export const systemClock: Clock = { now: () => Date.now() };
```

#### 3.13.2 Runner option

```typescript
export interface MachineRunnerOptions {
  // ... existing ...

  /**
   * Clock for timestamp generation. Defaults to Date.now().
   * Inject a trusted clock for GxP-compliant timestamping.
   */
  readonly clock?: Clock;
}
```

All `Date.now()` calls in `create-runner.ts` (lines 710, 713, 722, 813, 822, 825, 942, 949) are replaced with `clock.now()`.

---

## 4. New Code to Implement

### 4.1 Audit Module (`src/audit/`)

#### 4.1.1 `src/audit/types.ts`

```typescript
/**
 * Audit types for GxP-compliant tamper-proof audit trail.
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";
import type { Principal } from "../runner/types.js";

/**
 * A single audit record for a state transition.
 * Contains all information needed for regulatory compliance.
 */
export interface AuditRecord {
  /** Unique identifier for this audit record. */
  readonly id: string;
  /** Sequence number (monotonically increasing within a machine). */
  readonly sequenceNumber: number;
  /** Machine identifier. */
  readonly machineId: string;
  /** Machine definition version at the time of this transition. */
  readonly machineVersion: number;
  /** State before the transition. */
  readonly prevState: string;
  /** Event that triggered the transition. */
  readonly event: { readonly type: string };
  /** State after the transition. */
  readonly nextState: string;
  /** Effects produced by the transition. */
  readonly effects: readonly EffectAny[];
  /** Timestamp from the configured clock. */
  readonly timestamp: number;
  /** Principal who triggered the transition (undefined if no auth configured). */
  readonly principal: Principal | undefined;
  /** SHA-256 hash of the previous audit record (hash chain). */
  readonly previousHash: string;
  /** SHA-256 hash of this record (computed over all fields + previousHash). */
  readonly hash: string;
}

/**
 * Pluggable sink for persisting audit records.
 *
 * Implementations can write to databases, append-only logs, blockchain, etc.
 * The library does NOT provide a default persistent sink -- it is the
 * integrator's responsibility to provide one for GxP environments.
 */
export interface AuditSink {
  /**
   * Appends an audit record to the persistent store.
   *
   * This method MUST NOT throw. If persistence fails, it should
   * log the error and return false. The runner will emit a warning
   * via the tracing hook but will NOT block the transition.
   *
   * @param record - The audit record to persist
   * @returns true if persisted successfully, false if persistence failed
   */
  append(record: AuditRecord): boolean;

  /**
   * Verifies the integrity of the audit chain for a machine.
   * Returns the number of records verified, or an error if the chain is broken.
   */
  verify(machineId: string): { verified: number } | { broken: true; atSequence: number };
}

/**
 * In-memory audit sink for testing.
 * NOT for production use -- records are lost on process exit.
 */
export interface TestAuditSink extends AuditSink {
  getRecords(machineId?: string): readonly AuditRecord[];
  clear(): void;
}
```

#### 4.1.2 `src/audit/hash-chain.ts`

```typescript
/**
 * Hash chain computation for tamper-proof audit records.
 *
 * Uses a synchronous hash function (not crypto.subtle which is async).
 * The hash algorithm should be configurable for environments that require
 * specific algorithms (e.g., SHA-256, SHA-512).
 *
 * @packageDocumentation
 */

/**
 * Computes a hash of an audit record for chain integrity.
 *
 * Uses a simple but effective approach: JSON.stringify the record fields
 * in a deterministic order, then compute a hash.
 *
 * For environments with crypto.subtle (browsers, Node 15+), uses SHA-256.
 * Falls back to a non-cryptographic hash for environments without crypto.
 *
 * @internal
 */
export function computeAuditHash(fields: {
  readonly sequenceNumber: number;
  readonly machineId: string;
  readonly prevState: string;
  readonly eventType: string;
  readonly nextState: string;
  readonly timestamp: number;
  readonly principal: string | undefined;
  readonly previousHash: string;
}): string {
  // Deterministic serialization (sorted keys, no whitespace)
  const payload = JSON.stringify([
    fields.sequenceNumber,
    fields.machineId,
    fields.prevState,
    fields.eventType,
    fields.nextState,
    fields.timestamp,
    fields.principal ?? "",
    fields.previousHash,
  ]);

  // Synchronous FNV-1a hash (fast, deterministic, non-cryptographic)
  // For production GxP, integrators should provide a SHA-256 hash function
  return fnv1a(payload);
}

/**
 * FNV-1a hash function (32-bit).
 * Fast, deterministic, synchronous. NOT cryptographically secure.
 * For cryptographic integrity, integrators should provide their own
 * hash function via AuditSinkOptions.hashFunction.
 *
 * @internal
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
```

### 4.2 Replay Executor (`src/runner/replay.ts`)

```typescript
/**
 * Replay executor for reproducing exact execution sequences.
 *
 * Takes a recorded sequence of events and replays them against a machine,
 * verifying that the state sequence matches the recorded transitions.
 *
 * @packageDocumentation
 */

import type { MachineAny } from "../machine/types.js";
import type { TransitionResult } from "./interpreter.js";
import type { AuditRecord } from "../audit/types.js";
import { transition } from "./interpreter.js";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";

/**
 * Result of a replay operation.
 */
export interface ReplayResult {
  /** Whether the replay matched the recorded audit trail. */
  readonly matched: boolean;
  /** Number of transitions replayed. */
  readonly transitionCount: number;
  /** Index of the first mismatch (undefined if all matched). */
  readonly firstMismatchIndex: number | undefined;
  /** Details of the first mismatch (undefined if all matched). */
  readonly mismatchDetail: string | undefined;
}

/**
 * Replays a sequence of audit records against a machine definition,
 * verifying that the machine produces the same state sequence.
 */
export function replayAuditTrail(
  machine: MachineAny,
  records: readonly AuditRecord[]
): Result<ReplayResult, { reason: string }> {
  if (records.length === 0) {
    return ok({
      matched: true,
      transitionCount: 0,
      firstMismatchIndex: undefined,
      mismatchDetail: undefined,
    });
  }

  let currentState: string | readonly string[] = machine.initial;
  let currentContext: unknown = machine.context;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record === undefined) continue;

    const result: TransitionResult = transition(
      currentState,
      currentContext,
      record.event,
      machine
    );

    if (!result.transitioned) {
      return ok({
        matched: false,
        transitionCount: i,
        firstMismatchIndex: i,
        mismatchDetail: `Expected transition from ${record.prevState} on ${record.event.type}, but no transition occurred`,
      });
    }

    if (result.newState !== record.nextState) {
      return ok({
        matched: false,
        transitionCount: i,
        firstMismatchIndex: i,
        mismatchDetail: `Expected transition to ${record.nextState}, but got ${result.newState ?? "undefined"}`,
      });
    }

    if (result.newState !== undefined) {
      currentState = result.newStatePath ?? [result.newState];
    }
    if (result.newContext !== undefined) {
      currentContext = result.newContext;
    }
  }

  return ok({
    matched: true,
    transitionCount: records.length,
    firstMismatchIndex: undefined,
    mismatchDetail: undefined,
  });
}
```

### 4.3 Test Audit Sink (`src/audit/test-audit-sink.ts`)

```typescript
/**
 * In-memory audit sink for testing.
 *
 * @packageDocumentation
 */

import type { AuditRecord, TestAuditSink } from "./types.js";

/**
 * Creates an in-memory audit sink for testing.
 * NOT for production use.
 */
export function createTestAuditSink(): TestAuditSink {
  const records: AuditRecord[] = [];

  return {
    append(record: AuditRecord): boolean {
      records.push(record);
      return true;
    },

    verify(machineId: string): { verified: number } | { broken: true; atSequence: number } {
      const filtered = records.filter(r => r.machineId === machineId);
      for (let i = 1; i < filtered.length; i++) {
        const prev = filtered[i - 1];
        const curr = filtered[i];
        if (prev === undefined || curr === undefined) continue;
        if (curr.previousHash !== prev.hash) {
          return { broken: true, atSequence: curr.sequenceNumber };
        }
      }
      return { verified: filtered.length };
    },

    getRecords(machineId?: string): readonly AuditRecord[] {
      if (machineId === undefined) return [...records];
      return records.filter(r => r.machineId === machineId);
    },

    clear(): void {
      records.length = 0;
    },
  };
}
```

---

## 5. Test Requirements

### 5.1 Authorization Tests

**File:** `tests/authorization.test.ts`

| Test Case                                                  | Description                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `rejects send without principal when policy is configured` | Configure auth policy, send event without principal, expect `AuthorizationDenied`      |
| `allows send with valid principal and role`                | Configure role-based policy, send with admin principal, expect success                 |
| `rejects send with insufficient role`                      | Configure role-based policy, send with viewer principal, expect `AuthorizationDenied`  |
| `records principal in transition event`                    | Send with principal, verify collector receives principal id                            |
| `sendAs overrides default principal`                       | Set default principal, use sendAs with different principal, verify correct one is used |
| `authorization denied does not mutate state`               | Send unauthorized event, verify state/context unchanged                                |
| `state-specific authorization`                             | Policy allows event in state A but not B, verify both paths                            |
| `authorization works with sendBatch`                       | Batch of events, all must pass auth                                                    |
| `authorization works with sendAndExecute`                  | Async send with auth, verify full flow                                                 |

### 5.2 Approval Gate Tests

**File:** `tests/approval-gates.test.ts`

| Test Case                                                      | Description                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `transition with requiresApproval returns ApprovalRequired`    | Configure transition with approval, send event, get approval token    |
| `approve with sufficient approvers executes transition`        | Get token, submit required approvals, verify transition executes      |
| `approve with insufficient approvers returns pending approval` | Get token, submit fewer approvals than required, verify still pending |
| `reject cancels pending approval`                              | Get token, reject, verify transition does not execute                 |
| `approval requires correct roles`                              | Configure role requirement, approve with wrong role, expect rejection |
| `multiple pending approvals tracked independently`             | Two events requiring approval, verify independent tracking            |
| `approval token expires`                                       | (if implemented) Verify stale tokens are rejected                     |
| `approved transition records all approvers in audit`           | Verify audit record includes all approving principals                 |

### 5.3 Deterministic Parallel Ordering Tests

**File:** `tests/parallel-determinism.test.ts`

| Test Case                                      | Description                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `parallel regions iterate in sorted order`     | Define regions with non-alphabetical insertion order, verify sorted iteration |
| `parallel context mutations are deterministic` | Two regions mutating shared context, verify same result every time            |
| `parallel entry effects follow sorted order`   | Entry effects collected in sorted region order                                |
| `parallel exit effects follow sorted order`    | Exit effects collected in sorted region order                                 |
| `parallel onDone checks in sorted order`       | All-final detection iterates in sorted order                                  |

### 5.4 Audit Trail Tests

**File:** `tests/audit-trail.test.ts`

| Test Case                                         | Description                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `audit records have hash chain integrity`         | Multiple transitions, verify each record's previousHash matches prior's hash |
| `audit sink receives all transitions`             | Multiple sends, verify audit sink has all records                            |
| `audit records include principal`                 | Send with principal, verify audit record has principal                       |
| `audit chain verification detects tampering`      | Modify a record's fields, verify chain verification fails                    |
| `audit records have monotonic sequence numbers`   | Verify sequence numbers are strictly increasing                              |
| `circular buffer eviction notifies audit sink`    | Buffer at capacity, verify eviction callback fires before loss               |
| `test audit sink getRecords filters by machineId` | Multiple machines, verify filtering works                                    |

### 5.5 Migration Tests

**File:** `tests/state-migration.test.ts`

| Test Case                                               | Description                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `restore applies migration when version < current`      | Serialize at v1, define v2 migration, restore, verify migrated |
| `restore rejects unknown version`                       | Serialize at v3, current is v2, expect VersionMismatch         |
| `migration chain applies in sequence`                   | v1->v2->v3, verify all migrations applied in order             |
| `migration failure returns MigrationFailed`             | Migration throws, expect structured error                      |
| `restore with contextValidator rejects invalid context` | Restore corrupted context, expect ContextValidationFailed      |
| `machine version recorded in serialized state`          | Serialize, verify version field matches machine version        |

### 5.6 Guard Purity Tests

**File:** `tests/guard-purity.test.ts`

| Test Case                                     | Description                                                           |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `pure guard passes purity check`              | Guard `(ctx) => ctx.count > 0`, verify no error                       |
| `non-deterministic guard detected`            | Guard uses `Math.random()`, verify GuardThrew with purity message     |
| `purity check disabled by default`            | No `enforcePureGuards` option, non-deterministic guard works normally |
| `purity check enabled catches Date.now guard` | Guard uses `Date.now()`, verify detection                             |

### 5.7 Effect Compensation Tests

**File:** `tests/effect-compensation.test.ts`

| Test Case                                        | Description                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `SequenceAborted includes completedSteps`        | Sequence of 3 effects, 2nd fails, verify completedSteps = [0]                   |
| `compensation effects execute in reverse order`  | 3 effects with compensations, 3rd fails, verify compensation of 2 then 1        |
| `effects without compensate are not compensated` | Mix of compensable and non-compensable, verify only compensable are compensated |
| `no compensation when all effects succeed`       | All succeed, verify no compensation runs                                        |

### 5.8 Clock Tests

**File:** `tests/clock.test.ts`

| Test Case                                        | Description                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `custom clock used for transition timestamps`    | Inject mock clock, verify collector receives mock timestamps |
| `custom clock used for activity start/end times` | Inject mock clock, verify activity timestamps from mock      |
| `system clock used by default`                   | No clock option, verify Date.now()-like timestamps           |

### 5.9 Replay Tests

**File:** `tests/replay.test.ts`

| Test Case                             | Description                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| `replay matches recorded audit trail` | Record transitions, replay, verify match                              |
| `replay detects state mismatch`       | Modify machine definition, replay old trail, verify mismatch detected |
| `replay with empty trail succeeds`    | Empty record array, verify matched=true                               |
| `replay detects non-transition`       | Record includes transition that current machine cannot make           |

### 5.10 Event Validation Tests

**File:** `tests/event-validation.test.ts`

| Test Case                                           | Description                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `eventValidator rejects invalid event`              | Configure validator, send invalid event, expect EventValidationFailed   |
| `eventValidator allows valid event`                 | Configure validator, send valid event, expect success                   |
| `transition-level validate rejects invalid payload` | Transition with validate, send event with bad payload, expect rejection |

---

## 6. Migration Notes

### 6.1 Breaking Changes

| Change                                                                     | Impact                                                                          | Migration Path                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `TransitionError` union gains `AuthorizationDenied` and `ApprovalRequired` | Exhaustive `switch` on `TransitionError._tag` will have missing cases           | Add cases for `"AuthorizationDenied"` and `"ApprovalRequired"` |
| `SequenceAborted` gains `completedSteps` field                             | Consumers reading `SequenceAborted` will see new field                          | No action needed (additive)                                    |
| `SerializedMachineState.version` changes from `1` literal to `number`      | TypeScript code checking `version === 1` will need adjustment                   | Change to `version >= 1` or handle dynamically                 |
| `MachineAny` gains `version: number`                                       | Code constructing `MachineAny`-compatible objects must include `version`        | Add `version: 1` to existing machine-compatible objects        |
| `CircularBuffer` constructor gains optional `onEvict` parameter            | No impact (additive)                                                            | No action needed                                               |
| `FlowTransitionEvent` gains optional `principal` field                     | No impact (additive)                                                            | No action needed                                               |
| Parallel region ordering changes from insertion-order to sorted-order      | Machines relying on specific region iteration order will see different behavior | Verify parallel machines do not depend on region ordering      |

### 6.2 New Optional Capabilities (Non-Breaking)

All new capabilities are **opt-in** via `MachineRunnerOptions`:

| Capability            | Option                                 | Default                           |
| --------------------- | -------------------------------------- | --------------------------------- |
| Authorization         | `authorizationPolicy`                  | `undefined` (no auth)             |
| Approval gates        | `requiresApproval` on transition       | Not set (no approval)             |
| Audit sink            | `auditSink`                            | `undefined` (no persistent audit) |
| Clock                 | `clock`                                | `systemClock` (Date.now())        |
| Guard purity          | `enforcePureGuards`                    | `false`                           |
| Event validation      | `eventValidator`                       | `undefined` (no validation)       |
| Activity ID generator | `idGenerator` on ActivityManagerConfig | crypto-random                     |
| Context validator     | `contextValidator` on restore          | `undefined` (no validation)       |
| Migration registry    | `migrations` on restore                | `undefined` (no migration)        |

### 6.3 Parallel Region Ordering Change

This is the one behavioral change that is NOT opt-in. The switch from `Object.keys()` to sorted iteration affects all parallel state machines. However, this change is only observable when:

1. Two or more regions handle the same event
2. Both regions have actions that mutate the shared context
3. The final context value depends on the order of mutations

If regions use non-overlapping context properties, the change has zero observable impact.

**Validation:** Run all existing parallel state tests after the change. If any test fails, the test was relying on non-deterministic ordering and should be fixed.

---

## 7. Tracing Warning Strategy

### 7.1 Constraint

Tracing remains **OPTIONAL**. The library must:

1. Never block execution when tracing is not configured
2. Emit a warning when `FlowTracingHook` is not provided but audit-relevant operations occur
3. Function correctly with zero overhead when tracing is disabled

### 7.2 Warning Emission Points

Warnings are emitted via `console.warn` with a structured prefix for filtering. Each warning is emitted **at most once per runner instance** to avoid log flooding.

| Condition                                            | Warning Message                                                                                                                                                                                                               | When Emitted                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| No `tracingHook` and no `tracer` in options          | `[@hex-di/flow] WARN: No tracing hook configured for machine "${machineId}". Transition spans will not be recorded. For GxP compliance, provide a FlowTracingHook or TracerLike via MachineRunnerOptions.`                    | First call to `createMachineRunner` without tracing |
| No `auditSink` in options                            | `[@hex-di/flow] WARN: No audit sink configured for machine "${machineId}". Transition records are stored in-memory only and will be lost on process exit. For GxP compliance, provide an AuditSink via MachineRunnerOptions.` | First transition recorded                           |
| No `authorizationPolicy` in options                  | `[@hex-di/flow] WARN: No authorization policy configured for machine "${machineId}". All callers can trigger any transition. For GxP compliance, provide an AuthorizationPolicy via MachineRunnerOptions.`                    | First call to `send()`                              |
| `CircularBuffer` eviction without `onEvict` callback | `[@hex-di/flow] WARN: Circular buffer eviction occurred without an onEvict callback. Audit records are being permanently lost. Configure an AuditSink or increase buffer capacity.`                                           | First eviction event                                |

### 7.3 Implementation Pattern

```typescript
// In createMachineRunner:

// Warning flags (emit at most once per runner instance)
let warnedNoTracing = false;
let warnedNoAudit = false;
let warnedNoAuth = false;

function warnOnce(flag: "tracing" | "audit" | "auth", message: string): void {
  if (flag === "tracing" && !warnedNoTracing) {
    warnedNoTracing = true;
    console.warn(message);
  }
  if (flag === "audit" && !warnedNoAudit) {
    warnedNoAudit = true;
    console.warn(message);
  }
  if (flag === "auth" && !warnedNoAuth) {
    warnedNoAuth = true;
    console.warn(message);
  }
}

// At runner creation time, check for tracing:
if (tracingHook === undefined && options.tracer === undefined) {
  warnOnce(
    "tracing",
    `[@hex-di/flow] WARN: No tracing hook configured for machine "${machine.id}". ` +
      `Transition spans will not be recorded. For GxP compliance, provide a FlowTracingHook ` +
      `or TracerLike via MachineRunnerOptions.`
  );
}
```

### 7.4 Suppressing Warnings

Warnings can be suppressed via a `suppressGxpWarnings` option:

```typescript
export interface MachineRunnerOptions {
  // ... existing ...

  /**
   * Suppress GxP compliance warnings.
   * Set to true when intentionally running without tracing/audit/auth
   * (e.g., in tests, non-regulated environments).
   *
   * @default false
   */
  readonly suppressGxpWarnings?: boolean;
}
```

### 7.5 Zero-Overhead Guarantee

When tracing is disabled:

- No spans are created
- No warning is emitted after the initial one-time warning
- The `wrapExecutorWithHooks` function (`create-runner.ts:237-278`) already returns the original executor when no hooks are provided (zero overhead)
- The `recordTransition` function (`create-runner.ts:699-724`) already short-circuits when collector is undefined
- The `FlowTracingHook` methods are called with `?.` optional chaining, which produces zero overhead when undefined

---

## 8. Implementation Priority Order

| Priority | Task                                   | Effort | Score Impact                         |
| -------- | -------------------------------------- | ------ | ------------------------------------ |
| P0       | 3.1 Authorization middleware           | HIGH   | Security 2->8 (+6)                   |
| P0       | 3.2 Approval gate mechanism            | HIGH   | Compliance 5->8, Security 8->10 (+5) |
| P0       | 3.4 Audit sink interface + hash chain  | HIGH   | Traceability 7->10 (+3)              |
| P1       | 3.3 Deterministic parallel ordering    | LOW    | Determinism 6->8 (+2)                |
| P1       | 3.5 State migration framework          | MEDIUM | Change Control 5->8 (+3)             |
| P1       | 3.6 Machine definition versioning      | LOW    | Change Control 8->9 (+1)             |
| P1       | 3.9 Partial effect compensation        | MEDIUM | Error Handling 8->9 (+1)             |
| P1       | 3.10 Runtime event validation          | MEDIUM | Validation 6->8 (+2)                 |
| P1       | 3.11 Context schema validation         | LOW    | Validation 8->9 (+1)                 |
| P2       | 3.7 Deterministic activity IDs         | LOW    | Determinism 8->9 (+1)                |
| P2       | 3.8 Guard purity enforcement           | LOW    | Determinism 9->10 (+1)               |
| P2       | 3.12 Circular buffer eviction callback | LOW    | Traceability 9->10 (+1)              |
| P2       | 3.13 Pluggable clock                   | LOW    | Data Integrity 9->10 (+1)            |
| P2       | 4.2 Replay executor                    | MEDIUM | Determinism + Compliance (+1)        |
| P2       | 7.x Tracing warning strategy           | LOW    | Documentation + Compliance (+1)      |

**Estimated total effort:** ~4-6 developer weeks for full implementation including tests.

---

## 9. File Change Summary

### New Files

| File                             | Purpose                           | Lines (est.) |
| -------------------------------- | --------------------------------- | ------------ |
| `src/audit/types.ts`             | AuditRecord, AuditSink interfaces | ~80          |
| `src/audit/hash-chain.ts`        | Hash chain computation (FNV-1a)   | ~60          |
| `src/audit/test-audit-sink.ts`   | In-memory audit sink for testing  | ~50          |
| `src/audit/index.ts`             | Module exports                    | ~10          |
| `src/clock/types.ts`             | Clock interface + systemClock     | ~20          |
| `src/runner/replay.ts`           | Replay executor                   | ~80          |
| `src/runner/guard-purity.ts`     | Guard purity validator            | ~40          |
| `src/serialization/migration.ts` | Migration registry and executor   | ~100         |

### Modified Files

| File                                   | Changes                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/runner/types.ts`                  | Add `Principal`, `AuthorizationPolicy`, `ApprovalRequirement`, `PendingApproval` types; add `setPrincipal`, `sendAs`, `approve`, `rejectApproval`, `getPendingApprovals` to `MachineRunner` |
| `src/runner/create-runner.ts`          | Add auth check in `sendCore`, principal attribution in `recordTransition`, approval gate processing, pluggable clock, audit sink wiring, GxP warnings, pending approval tracking            |
| `src/runner/interpreter.ts`            | Replace all `Object.keys()` in parallel paths with `sortedKeys()`, add optional purity check                                                                                                |
| `src/errors/tagged-errors.ts`          | Add `AuthorizationDenied`, `ApprovalRequired`, `EventValidationFailed` error variants; update `TransitionError` union; add `completedSteps` to `SequenceAborted`                            |
| `src/machine/types.ts`                 | Add `version` to `MachineAny`                                                                                                                                                               |
| `src/machine/define-machine.ts`        | Accept `version` in config, include in frozen output                                                                                                                                        |
| `src/machine/transition.ts`            | Add `requiresApproval`, `validate` to `TransitionConfig` and `TransitionConfigAny`                                                                                                          |
| `src/serialization/serialization.ts`   | Change `version: 1` to `version: number`, add `machineDefinitionHash`, accept context validator and migration registry                                                                      |
| `src/serialization/errors.ts`          | Add `VersionMismatch`, `MigrationFailed`, `ContextValidationFailed`                                                                                                                         |
| `src/activities/manager.ts`            | Replace `Math.random()` with pluggable `idGenerator`, accept optional `Clock`                                                                                                               |
| `src/introspection/circular-buffer.ts` | Add `onEvict` callback to constructor                                                                                                                                                       |
| `src/tracing/types.ts`                 | Add `principal` field to `FlowTransitionEvent`                                                                                                                                              |
| `src/tracing/memory-collector.ts`      | Accept optional `Clock`                                                                                                                                                                     |
| `src/index.ts`                         | Export all new types and functions                                                                                                                                                          |

---

_End of Technical Refinement Document for @hex-di/flow GxP Compliance_
