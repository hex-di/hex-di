# 10 - Cross-Library Integration

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-10                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Functional Specification             |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [09 - Serialization](./09-serialization.md)_

---

## 34. Logger Integration

Guard emits structured log entries via `@hex-di/logger` when the logger is available. Logging is optional -- it only activates if the guard adapter's `requires` includes `LoggerPort` or if the logger is passed to the guard instrumentation function.

The logger integration is supplementary to the mandatory AuditTrailPort. Logger provides human-readable structured log entries for operational monitoring; AuditTrailPort provides the guaranteed, structured audit record for compliance. Both can coexist: the audit trail captures every decision with full provenance, while logger output may be filtered, sampled, or formatted for different audiences.

### Log Entry Format

On ALLOW:

```typescript
logger.info("guard.allow", {
  port: "UserRepository",
  subject: "viewer-1",
  policy: "hasPermission(user:read)",
  durationMs: 0.12,
});
```

On DENY:

```typescript
logger.warn("guard.deny", {
  port: "UserRepository",
  subject: "viewer-1",
  policy: "hasPermission(user:delete)",
  reason: "subject 'viewer-1' does not have permission 'user:delete'",
  durationMs: 0.08,
});
```

### Child Logger with Authorization Context

The guard creates a child logger with authorization context fields for all log entries emitted during a guarded resolution:

```typescript
import { instrumentGuard } from "@hex-di/guard";
import { LoggerPort } from "@hex-di/logger";

// The guard instrumentation creates a child logger with subject context
const cleanup = instrumentGuard(container, {
  logger: container.resolve(LoggerPort),
});

// All guard log entries include:
// {
//   subjectId: "viewer-1",
//   roles: ["viewer"],
//   guardedPort: "UserRepository",
// }
```

### Optional Dependency

Logger integration follows the same pattern as `@hex-di/tracing`'s container instrumentation. The guard does NOT hard-depend on `@hex-di/logger`. If the logger is not present, guard evaluation proceeds silently with no overhead:

```typescript
// Guard adapter WITHOUT logger -- no logging overhead
const GuardedUserRepo = guard(UserRepoAdapter, {
  resolve: hasPermission(UserPerms.read),
});

// Guard adapter WITH logger -- structured log entries emitted
const GuardedUserRepoWithLogging = guard(UserRepoAdapter, {
  resolve: hasPermission(UserPerms.read),
  logger: true, // Signals that LoggerPort should be in requires
});
```

### Complete Logger Integration Example

```typescript
import { createMemoryLogger, assertLogEntry } from "@hex-di/logger";
import { guard, hasPermission, createPermissionGroup } from "@hex-di/guard";

const UserPerms = createPermissionGroup("user", ["read", "write"]);
const logger = createMemoryLogger();

// After guard evaluation completes:
const entries = logger.getEntries();

// Verify guard.allow entry
assertLogEntry(entries, {
  level: "info",
  message: "guard.allow",
  annotations: {
    port: "UserRepository",
    subject: "admin-1",
    policy: "hasPermission(user:read)",
  },
});

// Verify guard.deny entry
assertLogEntry(entries, {
  level: "warn",
  message: "guard.deny",
  annotations: {
    port: "UserRepository",
    subject: "viewer-1",
    reason: expect.stringContaining("user:write"),
  },
});
```

```
RECOMMENDED: Guard error events SHOULD be logged via @hex-di/logger using
             structured log entries. When @hex-di/logger is co-deployed with
             @hex-di/guard, the following guard error categories SHOULD produce
             structured log entries: audit trail write failures (ACL008),
             chain break detection (ACL018), electronic signature errors (ACL009),
             and GxP subject validation failures (ACL014). Each log entry SHOULD
             include the evaluationId, error code, error category, and portName
             as structured fields to enable log-based alerting and correlation
             with audit trail entries.
             Reference: EU GMP Annex 11 §9.
```

---

## 35. Tracing Integration

Guard creates tracing spans for policy evaluations, providing visibility into authorization decisions alongside resolution and business logic spans.

### Span Structure

```
guard.evaluate(UserRepository)
  |-- hex-di.guard.policy: "allOf(hasPermission(user:read), hasRole('editor'))"
  |-- hex-di.guard.subject: "viewer-1"
  |-- hex-di.guard.decision: "deny"
  |-- hex-di.guard.reason: "hasRole('editor') failed"
  |-- status: ERROR (on denial)
```

### Span Attributes

| Attribute                   | Type     | Description                                      |
| --------------------------- | -------- | ------------------------------------------------ |
| `hex-di.guard.policy`       | `string` | Serialized policy label                          |
| `hex-di.guard.subject`      | `string` | Subject ID                                       |
| `hex-di.guard.decision`     | `string` | `"allow"` or `"deny"`                            |
| `hex-di.guard.reason`       | `string` | Human-readable reason (empty on allow)           |
| `hex-di.guard.port`         | `string` | Port name being guarded                          |
| `hex-di.guard.durationMs`   | `number` | Evaluation duration in milliseconds              |
| `hex-di.guard.evaluationId` | `string` | UUID v4 evaluationId for audit trail correlation |

### createGuardTracingBridge

For libraries that do not hard-depend on `@hex-di/tracing`, a bridge function provides tracing integration:

```typescript
import { createGuardTracingBridge } from "@hex-di/guard";
import { createMemoryTracer } from "@hex-di/tracing";

const tracer = createMemoryTracer();
const bridge = createGuardTracingBridge(tracer);

// Install the bridge as a guard evaluation listener
const cleanup = instrumentGuard(container, {
  tracingBridge: bridge,
});
```

### Resolution Hooks Pattern

Guard tracing follows the same `instrumentContainer` + resolution hooks pattern used by `@hex-di/tracing`:

```typescript
import { instrumentContainer } from "@hex-di/tracing";
import { instrumentGuard } from "@hex-di/guard";

// Tracing instrumentation for all resolutions
const cleanupTracing = instrumentContainer(container, tracer);

// Guard instrumentation adds guard-specific spans
const cleanupGuard = instrumentGuard(container, {
  tracingBridge: createGuardTracingBridge(tracer),
});

// Span tree for a guarded resolution:
// resolve(UserRepository)                    [tracing]
//   guard.evaluate(UserRepository)           [guard]
//     hex-di.guard.decision: "allow"
//   factory(UserRepository)                  [tracing]
```

### Denial Span Status

On denial, the guard span's status is set to error. This makes denied resolutions visible in trace visualization tools (Jaeger, Zipkin, etc.):

```typescript
// Span tree for a denied resolution:
// resolve(UserRepository)                    [tracing, status: ERROR]
//   guard.evaluate(UserRepository)           [guard, status: ERROR]
//     hex-di.guard.decision: "deny"
//     hex-di.guard.reason: "subject 'viewer-1' does not have permission 'user:delete'"
```

### Complete Tracing Integration Example

```typescript
import { createMemoryTracer } from "@hex-di/tracing";
import { instrumentGuard, createGuardTracingBridge, guard, hasPermission } from "@hex-di/guard";

const tracer = createMemoryTracer();
const bridge = createGuardTracingBridge(tracer);
const cleanup = instrumentGuard(container, { tracingBridge: bridge });

// Resolve a guarded port
const scope = container.createScope();
scope.resolve(UserRepoPort);

// Inspect spans
const spans = tracer.getCollectedSpans();
const guardSpan = spans.find(s => s.name.startsWith("guard.evaluate"));

expect(guardSpan).toBeDefined();
expect(guardSpan.attributes["hex-di.guard.decision"]).toBe("allow");
expect(guardSpan.attributes["hex-di.guard.subject"]).toBe("admin-1");
expect(guardSpan.attributes["hex-di.guard.port"]).toBe("UserRepository");
```

### Audit-Tracing Correlation

Guard evaluations produce both an `AuditEntry` (via `AuditTrailPort`) and a tracing span (via `createGuardTracingBridge`). These two records can be correlated bidirectionally using the `evaluationId`:

| Artifact     | Correlation Field                     | Direction                                                                            |
| ------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `AuditEntry` | `evaluationId`                        | Audit → Tracing: look up span by `hex-di.guard.evaluationId` attribute               |
| `AuditEntry` | `traceDigest`                         | Audit → Tracing: the digest summarizes the same evaluation tree captured by the span |
| Tracing Span | `hex-di.guard.evaluationId` attribute | Tracing → Audit: query audit trail by `evaluationId`                                 |
| Tracing Span | `spanId` / `traceId`                  | Tracing → Audit: propagate via AuditEntry metadata (see RECOMMENDED below)           |

```
REQUIREMENT: The guard tracing bridge (createGuardTracingBridge) MUST set the
             hex-di.guard.evaluationId attribute on every guard evaluation span.
             This enables tracing backends (Jaeger, Zipkin, etc.) to cross-reference
             individual spans with their corresponding AuditEntry records.
             Reference: 10-cross-library.md Span Attributes table.

RECOMMENDED: When both tracing and audit trail are active, the guard wrapper SHOULD
             propagate the active traceId and spanId into the AuditEntry. This can be
             achieved by: (a) including traceId/spanId in the AuditEntry.traceDigest
             as a prefix (e.g., "trace:abc123/span:def456 > allOf[allow] > ..."), or
             (b) storing traceId/spanId in a supplementary metadata field on the
             AuditEntry (if the adapter supports extension fields). This enables
             bidirectional lookup: given a trace, find the audit entry; given an
             audit entry, find the distributed trace.
```

Example bidirectional lookup:

```typescript
// Tracing → Audit: find the audit entry for a specific span
const span = tracer.getCollectedSpans().find(s => s.name === "guard.evaluate(UserRepository)");
const evaluationId = span.attributes["hex-di.guard.evaluationId"];
const auditEntry = auditTrail.findEntry(e => e.evaluationId === evaluationId);

// Audit → Tracing: find the span for a specific audit entry
const entry = auditTrail.getEntries()[0];
const matchingSpan = tracer
  .getCollectedSpans()
  .find(s => s.attributes["hex-di.guard.evaluationId"] === entry.evaluationId);
```

---

## 36. Query and Store Integration

Queries and mutations can be guarded at the port level using the standard `guard()` wrapper. The subject flows through the DI scope, so the query observer and mutation execution happen in a scoped container that provides the subject.

### Guarded Query Adapter

```typescript
import { guard, hasPermission, createPermissionGroup } from "@hex-di/guard";
import { createQueryAdapter, QueryPort } from "@hex-di/query";

const UserPerms = createPermissionGroup("user", ["read", "write"]);

// Define the query adapter
const UsersQueryAdapter = createQueryAdapter({
  provides: UsersQueryPort,
  requires: [UserRepoPort],
  lifetime: "scoped",
  factory: ({ UserRepository }) => ({
    queryKey: ["users"],
    queryFn: () => UserRepository.findAll(),
  }),
});

// Guard the query: only subjects with user:read can execute
const GuardedUsersQuery = guard(UsersQueryAdapter, {
  resolve: hasPermission(UserPerms.read),
});

// Usage in graph:
const graph = createGraphBuilder()
  .provide(GuardedUsersQuery)
  .provide(UserRepoAdapter)
  .provide(SubjectAdapter)
  .build();
```

### Guarded Store Adapter

```typescript
import { guard, hasPermission, createPermissionGroup } from "@hex-di/guard";
import { createStoreAdapter } from "@hex-di/store";

const SettingsPerms = createPermissionGroup("settings", ["read", "write", "admin"]);

// Guard the entire store adapter at resolve time
const GuardedSettings = guard(SettingsStoreAdapter, {
  resolve: hasPermission(SettingsPerms.read),
});
```

### Fine-Grained Per-Action Store Guards

For stores that need different policies for different actions (read vs write vs admin), use `createGuardedStateAdapter`:

```typescript
import { createGuardedStateAdapter } from "@hex-di/guard";

const GuardedSettingsStore = createGuardedStateAdapter(SettingsStoreAdapter, {
  // Default policy for resolve
  resolve: hasPermission(SettingsPerms.read),
  // Per-action policies
  actions: {
    updateTheme: hasPermission(SettingsPerms.write),
    resetToDefaults: hasPermission(SettingsPerms.admin),
    exportData: hasPermission(SettingsPerms.read),
  },
});
```

### Subject Flow Through Scope

The subject flows through the DI scope. When a query observer or mutation executes inside a scoped container, it automatically has access to the subject:

```typescript
// Server-side: subject comes from the request
app.use(async (ctx, next) => {
  const subject = await extractSubject(ctx.req);
  const scope = container.createScope();

  // Register subject for this request scope
  scope.provide(SubjectProviderPort, () => subject);

  // All guarded resolutions in this scope use this subject
  const query = scope.resolve(UsersQueryPort);
  // If subject lacks user:read, resolution throws AccessDeniedError

  await next();
});
```

---

## 37. Saga and Flow Integration

### Guarded Saga Step Ports

In sagas, each step port is independently guarded. The subject propagates through the scope, and if any step denies authorization, the saga fails and compensation runs for previously completed steps:

```typescript
import { guard, hasPermission, createPermissionGroup } from "@hex-di/guard";
import { createSagaAdapter } from "@hex-di/saga";

const TradePerms = createPermissionGroup("trade", ["validate", "reserve", "execute", "settle"]);

// Each step has its own guard
const GuardedValidateStep = guard(ValidateTradeAdapter, {
  resolve: hasPermission(TradePerms.validate),
});

const GuardedReserveStep = guard(ReserveFundsAdapter, {
  resolve: hasPermission(TradePerms.reserve),
});

const GuardedExecuteStep = guard(ExecuteTradeAdapter, {
  resolve: hasPermission(TradePerms.execute),
});

const GuardedSettleStep = guard(SettleTradeAdapter, {
  resolve: hasPermission(TradePerms.settle),
});

// Saga definition with guarded steps
const TradeSaga = createSagaAdapter({
  provides: TradeSagaPort,
  steps: [
    { port: GuardedValidateStep.provides, compensate: RollbackValidation },
    { port: GuardedReserveStep.provides, compensate: ReleaseFunds },
    { port: GuardedExecuteStep.provides, compensate: ReverseTrade },
    { port: GuardedSettleStep.provides, compensate: ReverseSettlement },
  ],
});

// If step 3 (execute) denies because the subject lacks trade:execute,
// compensation runs for steps 1 and 2 (rollback validation, release funds)
```

### Subject Propagation Through Scope

The subject propagates through the saga's scope. Each step executes in the same scoped container, so all steps share the same subject:

```typescript
const scope = container.createScope();
scope.provide(SubjectProviderPort, () => traderSubject);

// All saga steps resolve within this scope
// traderSubject is the subject for every guard check
const result = scope.resolve(TradeSagaPort).execute(tradeOrder);
```

### Flow: Permission-Gated State Transitions

Flow machines can use guard context to gate state transitions based on the subject's permissions:

```typescript
import { createFlowAdapter } from "@hex-di/flow";
import { hasPermission, createPermissionGroup } from "@hex-di/guard";

const OrderPerms = createPermissionGroup("order", ["create", "approve", "cancel", "ship"]);

// Flow machine definition with guard-aware transitions
const orderMachine = {
  id: "order",
  initial: "draft",
  context: {
    guardContext: undefined, // Injected at runtime
  },
  states: {
    draft: {
      on: {
        SUBMIT: {
          target: "pending_approval",
          guard: (ctx: { guardContext: { can: (p: PermissionConstraint) => boolean } }) =>
            ctx.guardContext.can(OrderPerms.create),
        },
      },
    },
    pending_approval: {
      on: {
        APPROVE: {
          target: "approved",
          guard: (ctx: { guardContext: { can: (p: PermissionConstraint) => boolean } }) =>
            ctx.guardContext.can(OrderPerms.approve),
        },
        REJECT: {
          target: "rejected",
          guard: (ctx: { guardContext: { can: (p: PermissionConstraint) => boolean } }) =>
            ctx.guardContext.can(OrderPerms.approve),
        },
      },
    },
    approved: {
      on: {
        SHIP: {
          target: "shipped",
          guard: (ctx: { guardContext: { can: (p: PermissionConstraint) => boolean } }) =>
            ctx.guardContext.can(OrderPerms.ship),
        },
        CANCEL: {
          target: "cancelled",
          guard: (ctx: { guardContext: { can: (p: PermissionConstraint) => boolean } }) =>
            ctx.guardContext.can(OrderPerms.cancel),
        },
      },
    },
    shipped: { type: "final" },
    cancelled: { type: "final" },
    rejected: { type: "final" },
  },
};
```

### createFlowAdapter with Guard Context

The `createFlowAdapter` function accepts a `guardContext` that injects the subject's permissions into the machine's meta:

```typescript
import { createFlowAdapter } from "@hex-di/flow";
import type { AuthSubject, PermissionConstraint } from "@hex-di/guard";

interface GuardContext {
  readonly can: (permission: PermissionConstraint) => boolean;
}

/**
 * Creates a guard context from an AuthSubject.
 *
 * The `can` function performs an O(1) set lookup against the
 * subject's precomputed permission set.
 */
function createGuardContext(subject: AuthSubject): GuardContext {
  return {
    can: (permission: PermissionConstraint) =>
      subject.permissions.has(`${permission.resource}:${permission.action}`),
  };
}

// Wire into a flow adapter
const OrderFlowAdapter = createFlowAdapter({
  provides: OrderFlowPort,
  requires: [SubjectProviderPort],
  lifetime: "scoped",
  factory: ({ SubjectProvider }) => {
    const subject = SubjectProvider.getSubject();
    const guardContext = createGuardContext(subject);
    return createFlow(orderMachine, { context: { guardContext } });
  },
});
```

---

## Integration Summary

| Library | Integration Point               | Guard's Role                                |
| ------- | ------------------------------- | ------------------------------------------- |
| logger  | Structured log entries          | Emits `guard.allow` / `guard.deny` entries  |
| tracing | Spans with decision attributes  | Creates child spans per evaluation          |
| query   | Guarded query/mutation adapters | Policy checked before fetch/mutate          |
| store   | Guarded state adapters          | Policy checked on resolve and per-action    |
| saga    | Guarded step ports              | Each step independently guarded             |
| flow    | Guard context in transitions    | `meta.can(permission)` gates transitions    |
| react   | SubjectProvider + Can + useCan  | Subject in context, permission gates in JSX |

### Electronic Signatures in Cross-Library Flows

When audit entries carry electronic signatures (via `AuditEntry.signature`), cross-library consumers (logger, tracing, saga, flow) should **preserve** the signature data when forwarding or logging audit entries. Libraries that consume guard audit data should not strip the `signature` field, as this would break the audit chain integrity and signature binding.

For libraries that aggregate audit entries (e.g., saga compensations that roll up step-level audit data), the original per-step signatures should be preserved in the aggregated record rather than re-signed at the saga level.

### GxP Cross-Library Requirements

```
REQUIREMENT: When gxp is true, flow machines that use guardContext.can() for state
             transition gates MUST produce an AuditEntry for each state transition,
             not just for the initial guardContext.can() call. Each state transition
             represents a discrete authorization decision point and MUST be
             individually auditable. The AuditEntry MUST include the flow machine
             name, the source state, the target state, and the transition event.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

### Saga Aggregated Audit Record

When a saga orchestrates multiple guarded steps, each step produces its own `AuditEntry`. Additionally, the saga SHOULD produce an aggregated audit record summarizing the overall saga outcome:

```typescript
interface SagaAuditSummary {
  readonly _tag: "SagaAuditSummary";
  /** Unique identifier for the saga execution. */
  readonly sagaId: string;
  /** Name of the saga definition. */
  readonly sagaName: string;
  /** evaluationIds of all step-level AuditEntry records. */
  readonly stepEvaluationIds: ReadonlyArray<string>;
  /** Overall saga outcome: "completed", "compensated", "failed". */
  readonly outcome: "completed" | "compensated" | "failed";
  /** ISO 8601 UTC timestamp of saga start. */
  readonly startedAt: string;
  /** ISO 8601 UTC timestamp of saga completion. */
  readonly completedAt: string;
  /** Total number of steps executed. */
  readonly stepCount: number;
  /** Number of steps that were denied by guard. */
  readonly deniedStepCount: number;
}
```

```
RECOMMENDED: When gxp is true, the logger integration SHOULD NOT sample guard events.
             Guard allow/deny log entries are part of the operational audit trail
             complement and MUST be emitted for every evaluation. Logger sampling
             rules (rate limiting, probabilistic sampling) SHOULD exclude events
             with the "guard." prefix to prevent compliance-critical log entries
             from being dropped.
             Reference: ALCOA+ Complete.
```

```
RECOMMENDED: When the tracing integration creates spans for guard evaluations, span
             attributes SHOULD be validated against size limits. Attribute values
             exceeding 256 characters SHOULD be truncated with a "[TRUNCATED]" marker.
             Attribute keys SHOULD follow OpenTelemetry semantic conventions where
             applicable (e.g., "authz.decision", "authz.policy", "authz.subject_id").
             This prevents oversized spans from being rejected by tracing backends.
```

### Cross-Library Integration Test Scenarios

The following test scenarios validate guard's integration with other `@hex-di/*` libraries. These scenarios are owned by `@hex-di/guard-testing` and use memory adapters exclusively (no external services). Each scenario is a self-contained integration test that verifies cross-library behavior in a single `describe` block.

#### Guard + Logger (GL)

| ID   | Scenario                                   | Setup                                                                                                     | Assert                                                                                                                                            | GxP Path                                                   |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GL-1 | Audit log emission on guard evaluation     | Create `MemoryLogger` + guarded adapter; resolve the guarded port as admin subject                        | Logger contains `guard.allow` entry with `port`, `subject`, `policy`, `durationMs` annotations                                                    | Yes: verify `guard.deny` also emitted for denied subject   |
| GL-2 | Credential redaction in guard log entries  | Create guarded adapter with subject containing sensitive attributes (`ssn`, `password`); resolve and deny | Logger `guard.deny` entry's `reason` field does NOT contain raw sensitive attribute values; attributes are redacted per logger sanitization rules | Yes: verify redaction applies to both allow and deny paths |
| GL-3 | Guard events excluded from logger sampling | Configure `MemoryLogger` with sampling rate 0.0 (drop all); resolve guarded port                          | Logger still contains `guard.allow`/`guard.deny` entries because `guard.*` prefix events bypass sampling when `gxp: true`                         | Yes (required)                                             |

#### Guard + Tracing (GT)

| ID   | Scenario                                         | Setup                                                                    | Assert                                                                                                                                                                                  | GxP Path                                        |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| GT-1 | Span creation for guard evaluation               | Create `MemoryTracer` + `createGuardTracingBridge`; resolve guarded port | Tracer contains span named `guard.evaluate({portName})` with all 7 span attributes (`hex-di.guard.policy`, `.subject`, `.decision`, `.reason`, `.port`, `.durationMs`, `.evaluationId`) | Yes: verify span exists for both allow and deny |
| GT-2 | Error status on denial                           | Resolve guarded port as unauthorized subject with tracing bridge active  | Guard evaluation span has `status: ERROR`; parent resolution span also has `status: ERROR`                                                                                              | Yes: verify error status propagates correctly   |
| GT-3 | evaluationId correlation between audit and trace | Resolve guarded port with both audit trail and tracing bridge active     | `AuditEntry.evaluationId` matches `span.attributes["hex-di.guard.evaluationId"]` for the same evaluation                                                                                | Yes (required): bidirectional lookup verified   |

#### Guard + Query/Store (GQS)

| ID    | Scenario                                          | Setup                                                                                                                                         | Assert                                                                                                                                        | GxP Path                                                           |
| ----- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| GQS-1 | Guarded query adapter denies unauthorized subject | Create guarded `QueryAdapter` with `hasPermission(read)` policy; resolve as subject without `read` permission                                 | Resolution returns `Err(AccessDeniedError)`; audit trail contains `deny` entry for the query port                                             | Yes: verify audit entry fields                                     |
| GQS-2 | Guarded query adapter allows authorized subject   | Same setup as GQS-1; resolve as subject with `read` permission                                                                                | Resolution succeeds; audit trail contains `allow` entry                                                                                       | Yes: verify audit entry fields                                     |
| GQS-3 | Per-action store guard evaluates correct policy   | Create `createGuardedStateAdapter` with different policies for `updateTheme` (write) and `resetToDefaults` (admin); resolve as editor subject | `updateTheme` action allowed (editor has write); `resetToDefaults` action denied (editor lacks admin); separate audit entries for each action | Yes: verify per-action audit entries                               |
| GQS-4 | Child scope inherits guard configuration          | Create guarded adapter in parent scope; create child scope with different subject                                                             | Child scope's guard evaluations use the child scope's subject, not the parent's; audit entries record the correct subjectId per scope         | Yes: verify scopeId differs between parent and child audit entries |

#### Guard + Saga/Flow (GSF)

| ID    | Scenario                                          | Setup                                                                                                                                   | Assert                                                                                                                                                      | GxP Path                                       |
| ----- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| GSF-1 | Saga compensation triggers on guard denial        | Create 3-step saga with guarded steps; subject authorized for steps 1-2 but not step 3                                                  | Steps 1-2 complete successfully; step 3 denied; compensation runs for steps 1-2; audit trail contains allow entries for steps 1-2 and deny entry for step 3 | Yes: verify all audit entries present          |
| GSF-2 | Subject propagation through saga scope            | Create saga with guarded steps; provide subject via scope                                                                               | All step-level guard evaluations use the same subjectId; audit entries for all steps share the same scopeId                                                 | Yes: verify subjectId consistency across steps |
| GSF-3 | Flow `can()` gates block unauthorized transitions | Create order flow machine with `guardContext.can(OrderPerms.approve)` on APPROVE transition; provide subject without approve permission | `APPROVE` transition blocked; flow remains in `pending_approval` state                                                                                      | Yes: verify audit entry for blocked transition |
| GSF-4 | Per-transition audit entries in flow machine      | Create flow machine with 3 transitions; subject authorized for all; execute all transitions with `gxp: true`                            | Audit trail contains one entry per state transition (3 total), each with flow machine name, source state, target state, and transition event                | Yes (required)                                 |

#### Multi-Library (ML)

| ID   | Scenario                                       | Setup                                                                                                                                            | Assert                                                                                                                                           | GxP Path                                             |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| ML-1 | Combined tracing + logger + audit trail        | Create `MemoryTracer`, `MemoryLogger`, `MemoryAuditTrail`; wire all three to a guarded adapter; resolve as admin then as viewer                  | All three systems record events: tracer has 2 spans, logger has 2 entries, audit trail has 2 entries; `evaluationId` correlates across all three | Yes: verify all three contain matching evaluationIds |
| ML-2 | GxP integrity across guard + audit + signature | Create guarded adapter with `hasSignature("approved")` policy; provide `MemorySignatureService`; capture signature and evaluate with `gxp: true` | Audit entry has non-empty `integrityHash`, `previousHash`, `signature`; hash chain validates; signature validates against the audit entry data   | Yes (required)                                       |

```
REQUIREMENT: The 16 cross-library integration test scenarios defined above (GL-1
             through GL-3, GT-1 through GT-3, GQS-1 through GQS-4, GSF-1 through
             GSF-4, ML-1 through ML-2) MUST be implemented in
             @hex-di/guard-testing and included in the OQ test suite. All 16
             scenarios MUST use memory adapters only (MemoryAuditTrail,
             MemoryLogger, MemoryTracer, MemoryPolicyEngine, MemorySignatureService)
             — no external services or network dependencies.

             Coverage requirements:
             (a) All 16 scenarios MUST pass.
             (b) Each scenario group (GL, GT, GQS, GSF, ML) MUST include at least
                 one scenario executed with gxp: true to validate GxP-specific
                 cross-library behavior.
             (c) Scenario results MUST be included in the OQ report as cross-library
                 integration evidence.

             Reference: GAMP 5 Category 5 (integration testing),
             21 CFR 11.10(e) (audit trail completeness across system boundaries).
```

---

_Previous: [09 - Serialization](./09-serialization.md) | Next: [11 - React Integration](./11-react-integration.md)_
