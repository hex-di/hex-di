# 10 - Guard Integration Contracts

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-10                                 |
> | Revision         | 2.1                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 2.0 (2026-02-14): Decoupled guard from ecosystem libraries (CCR-GUARD-008). Replaced bridge functions (instrumentGuard, createGuardTracingBridge, createGuardedStateAdapter, createGuardContext) with guard-owned sink ports (GuardEventSinkPort, GuardSpanSinkPort). Moved library-specific types (SagaAuditSummary, GuardContext) to consuming libraries. Reduced integration test scenarios from 16 to 13. See ADR #55, ADR #56 |
> |                  | 1.1 (2026-02-19): Added BEH-GD-NNN requirement identifiers to section headings (CCR-GUARD-020) |
> |                  | 1.1 (2026-02-14): Elevated GxP incident event handling from RECOMMENDED to REQUIREMENT when gxp: true (CCR-GUARD-007). Adds mandatory structured alert events for ACL008, ACL018, ACL009, ACL014 via guard graph event emitter per EU GMP Annex 11 §13 |
> |                  | 1.0 (2026-02-13): Initial controlled release |

_Previous: [09 - Serialization](./08-serialization.md)_

---

> **Invariant:** [INV-GD-006](../invariants.md) — Audit Trail Completeness (cross-library event and span emission is part of the guard evaluation lifecycle)
> **DoD:** [DoD 18: Guard Integration Contracts](../16-definition-of-done.md#dod-18-guard-integration-contracts)

## BEH-GD-038: Guard Event Emission (§37)

Guard emits structured events through `GuardEventSinkPort` when an adapter is registered (see [ADR-GD-055](../decisions/055-guard-owned-sink-ports.md)). Event emission is optional -- when no adapter is registered, guard evaluation proceeds with zero overhead (no allocation, no function call). The sink port is guard's own outbound port; consuming libraries (`@hex-di/logger`, SIEM systems, custom consumers) provide adapters.

The event sink is supplementary to the mandatory `AuditTrailPort`. `AuditTrailPort` provides the guaranteed, structured audit record for compliance; `GuardEventSinkPort` provides a lightweight notification channel for operational consumers that do not need the full audit entry structure.

### GuardEventSinkPort

```typescript
/**
 * Optional outbound port for guard event emission.
 *
 * Direction: outbound
 * Category: guard/event-sink
 * Lifetime: singleton
 *
 * When no adapter is registered, guard evaluation proceeds with
 * zero overhead. The NoopGuardEventSink default is never instantiated
 * — guard checks for the port's presence before emitting.
 */
const GuardEventSinkPort: Port<GuardEventSink, "GuardEventSink">;
```

### GuardEventSink Interface

```typescript
interface GuardEventSink {
  /** Emit a guard event. Implementations MUST NOT throw. */
  readonly emit: (event: GuardEvent) => void;
}
```

### GuardEvent Union

Guard events are a discriminated union on the `kind` field:

```typescript
type GuardEvent = GuardAllowEvent | GuardDenyEvent | GuardErrorEvent;

interface GuardAllowEvent {
  readonly kind: "guard.allow";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly policy: string;
  readonly durationMs: number;
  readonly timestamp: string; // ISO 8601
}

interface GuardDenyEvent {
  readonly kind: "guard.deny";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly policy: string;
  readonly reason: string;
  readonly durationMs: number;
  readonly timestamp: string; // ISO 8601
}

interface GuardErrorEvent {
  readonly kind: "guard.error";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly errorCode: string; // ACL008, ACL018, ACL009, ACL014, etc.
  readonly errorCategory: string;
  readonly message: string;
  readonly timestamp: string; // ISO 8601
}
```

### Emission Behavior

Guard emits events at the following points in the evaluation lifecycle:

1. **After successful evaluation (allow):** A `GuardAllowEvent` is emitted after the `AuditTrail.record()` call completes.
2. **After denial:** A `GuardDenyEvent` is emitted after the `AuditTrail.record()` call completes.
3. **On compliance-critical errors:** A `GuardErrorEvent` is emitted for audit trail write failures (ACL008), chain break detection (ACL018), electronic signature errors (ACL009), and GxP subject validation failures (ACL014).

Events are emitted synchronously. If the sink's `emit` method throws, the exception is swallowed — event emission failures MUST NOT affect the guard evaluation outcome or the audit trail.

### NoopGuardEventSink

```typescript
/**
 * Default no-op implementation. Never instantiated at runtime —
 * guard checks for GuardEventSinkPort presence before emitting.
 * Provided for testing and explicit opt-in to silent mode.
 */
const NoopGuardEventSink: GuardEventSink = {
  emit: () => {},
};
```

### Memory Event Sink (Testing)

```typescript
/**
 * In-memory event collector for testing. Ships in @hex-di/guard-testing.
 */
interface MemoryGuardEventSink extends GuardEventSink {
  readonly getEvents: () => ReadonlyArray<GuardEvent>;
  readonly clear: () => void;
}
```

```
REQUIREMENT: When gxp is true, guard error events MUST be emitted as structured
             GuardErrorEvent instances through GuardEventSinkPort for the following
             compliance-critical error categories: audit trail write failures
             (ACL008), chain break detection (ACL018), electronic signature errors
             (ACL009), and GxP subject validation failures (ACL014). Each event
             MUST include the evaluationId, errorCode, errorCategory, portName,
             and ISO 8601 timestamp as structured fields to enable automated
             alerting, SIEM integration, and correlation with audit trail entries.
             These events MUST be emitted regardless of whether a GuardEventSinkPort
             adapter is registered — when no adapter is present, the event is
             constructed but not delivered (zero-cost check). This ensures that
             compliance-critical incidents are never silently dropped due to
             optional dependency configuration.
             Reference: EU GMP Annex 11 §13 (incident management), §9 (audit trails),
             21 CFR 11.10(e) (audit trail completeness).

RECOMMENDED: In non-GxP environments, guard events SHOULD be emitted through
             GuardEventSinkPort for operational monitoring. Consuming libraries
             (e.g., @hex-di/logger) provide adapters that translate GuardEvent
             instances into structured log entries.

RECOMMENDED: When gxp is true, GuardEventSinkPort adapters SHOULD NOT sample
             guard events. Guard allow/deny events are part of the operational
             audit trail complement and MUST be emitted for every evaluation.
             Adapter-level sampling rules (rate limiting, probabilistic sampling)
             SHOULD exclude events with the "guard." prefix to prevent
             compliance-critical events from being dropped.
             Reference: ALCOA+ Complete.
```

---

## BEH-GD-039: Guard Span Emission (§38)

Guard creates tracing spans through `GuardSpanSinkPort` for policy evaluations, providing visibility into authorization decisions alongside resolution and business logic spans.

### GuardSpanSinkPort

```typescript
/**
 * Optional outbound port for guard span emission.
 *
 * Direction: outbound
 * Category: guard/span-sink
 * Lifetime: singleton
 *
 * When no adapter is registered, guard evaluation proceeds with
 * zero overhead. Consuming libraries (e.g., @hex-di/tracing) provide
 * adapters that translate guard spans into OTel-compatible spans.
 */
const GuardSpanSinkPort: Port<GuardSpanSink, "GuardSpanSink">;
```

### GuardSpanSink Interface

```typescript
interface GuardSpanSink {
  /** Start a named span with attributes. Returns a handle to end the span. */
  readonly startSpan: (
    name: string,
    attributes: GuardSpanAttributes
  ) => GuardSpanHandle;
}
```

### GuardSpanHandle

```typescript
interface GuardSpanHandle {
  /** Mark the span as completed successfully. */
  readonly end: () => void;
  /** Mark the span as completed with an error status. */
  readonly setError: (message: string) => void;
  /** Add or update a span attribute after creation. */
  readonly setAttribute: (key: string, value: string | number | boolean) => void;
}
```

### GuardSpanAttributes

```typescript
interface GuardSpanAttributes {
  readonly "hex-di.guard.policy": string;
  readonly "hex-di.guard.subject": string;
  readonly "hex-di.guard.port": string;
  readonly "hex-di.guard.evaluationId": string;
  /** Set after evaluation completes. */
  readonly "hex-di.guard.decision"?: string;
  /** Set after evaluation completes. */
  readonly "hex-di.guard.reason"?: string;
  /** Set after evaluation completes. */
  readonly "hex-di.guard.durationMs"?: number;
  /** Set for async evaluations only. */
  readonly "hex-di.guard.asyncResolution"?: boolean;
  /** Set for async evaluations only. */
  readonly "hex-di.guard.resolutionDurationMs"?: number;
  /** Set for ReBAC evaluations only. */
  readonly "hex-di.guard.relationshipChecks"?: number;
}
```

### Span Structure

```
guard.evaluate(UserRepository)
  |-- hex-di.guard.policy: "allOf(hasPermission(user:read), hasRole('editor'))"
  |-- hex-di.guard.subject: "viewer-1"
  |-- hex-di.guard.decision: "deny"
  |-- hex-di.guard.reason: "hasRole('editor') failed"
  |-- status: ERROR (on denial)
```

### Relationship Check Spans

When `hasRelationship` policies are evaluated, each relationship check produces a child span for observability:

```
guard.evaluate(DocumentRepository)
  |-- hex-di.guard.policy: "allOf(hasRelationship(owner), ...)"
  |-- hex-di.guard.decision: "allow"
  +-- guard.relationship.check
        |-- hex-di.guard.relation: "owner"
        |-- hex-di.guard.resourceId: "doc-123"
        |-- hex-di.guard.resourceType: "document"
        |-- hex-di.guard.depth: 1
        |-- hex-di.guard.result: true
        |-- hex-di.guard.durationMs: 0.05
```

### Denial Span Status

On denial, the guard span's status is set to error via `handle.setError(reason)`. This makes denied resolutions visible in trace visualization tools:

```
// Span tree for a denied resolution:
// resolve(UserRepository)                    [tracing, status: ERROR]
//   guard.evaluate(UserRepository)           [guard, status: ERROR]
//     hex-di.guard.decision: "deny"
//     hex-di.guard.reason: "subject 'viewer-1' does not have permission 'user:delete'"
```

### Audit-Span Correlation

Guard evaluations produce both an `AuditEntry` (via `AuditTrailPort`) and a span (via `GuardSpanSinkPort`). These two records can be correlated bidirectionally using the `evaluationId`:

| Artifact     | Correlation Field                     | Direction                                                                            |
| ------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `AuditEntry` | `evaluationId`                        | Audit -> Span: look up span by `hex-di.guard.evaluationId` attribute                 |
| `AuditEntry` | `traceDigest`                         | Audit -> Span: the digest summarizes the same evaluation tree captured by the span   |
| Span         | `hex-di.guard.evaluationId` attribute | Span -> Audit: query audit trail by `evaluationId`                                   |
| Span         | `spanId` / `traceId`                  | Span -> Audit: propagate via AuditEntry metadata (see RECOMMENDED below)             |

```
REQUIREMENT: GuardSpanSinkPort adapters MUST set the hex-di.guard.evaluationId
             attribute on every guard evaluation span. This enables tracing backends
             (Jaeger, Zipkin, etc.) to cross-reference individual spans with their
             corresponding AuditEntry records.
             Reference: 10-cross-library.md Span Attributes table.

RECOMMENDED: When both span emission and audit trail are active, the guard wrapper
             SHOULD propagate the active traceId and spanId into the AuditEntry.
             This can be achieved by: (a) including traceId/spanId in the
             AuditEntry.traceDigest as a prefix (e.g.,
             "trace:abc123/span:def456 > allOf[allow] > ..."), or (b) storing
             traceId/spanId in a supplementary metadata field on the AuditEntry
             (if the adapter supports extension fields). This enables bidirectional
             lookup: given a trace, find the audit entry; given an audit entry,
             find the distributed trace.

RECOMMENDED: When span emission creates spans for guard evaluations, span
             attributes SHOULD be validated against size limits. Attribute values
             exceeding 256 characters SHOULD be truncated with a "[TRUNCATED]" marker.
             Attribute keys SHOULD follow OpenTelemetry semantic conventions where
             applicable (e.g., "authz.decision", "authz.policy", "authz.subject_id").
             This prevents oversized spans from being rejected by tracing backends.
```

### Memory Span Sink (Testing)

```typescript
/**
 * In-memory span collector for testing. Ships in @hex-di/guard-testing.
 */
interface MemoryGuardSpanSink extends GuardSpanSink {
  readonly getSpans: () => ReadonlyArray<{
    readonly name: string;
    readonly attributes: Readonly<Record<string, string | number | boolean>>;
    readonly status: "ok" | "error";
    readonly errorMessage?: string;
  }>;
  readonly clear: () => void;
}
```

---

## BEH-GD-040: Guard Composition Patterns (§39)

Guard's `guard()` wrapper works with any adapter regardless of library origin. The `methodPolicies` option is the canonical pattern for per-method authorization. This section documents composition patterns that apply generically across all consuming libraries.

### Guarded Adapter at Resolve Time

```typescript
import { guard, hasPermission, createPermissionGroup } from "@hex-di/guard";

const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);

// Guard the entire adapter at resolve time
const GuardedUserRepo = guard(UserRepoAdapter, {
  resolve: hasPermission(UserPerms.read),
});
```

### Per-Method Policies

For adapters that need different policies for different methods (read vs write vs admin), use `methodPolicies`:

```typescript
const GuardedSettings = guard(SettingsAdapter, {
  // Default policy for resolve
  resolve: hasPermission(SettingsPerms.read),
  // Per-method policies checked at method invocation
  methodPolicies: {
    updateTheme: hasPermission(SettingsPerms.write),
    resetToDefaults: hasPermission(SettingsPerms.admin),
    exportData: hasPermission(SettingsPerms.read),
  },
});
```

### Subject Flow Through Scope

The subject flows through the DI scope. When a guarded adapter is resolved inside a scoped container, it automatically has access to the subject:

```typescript
// Server-side: subject comes from the request
app.use(async (ctx, next) => {
  const subject = await extractSubject(ctx.req);
  const scope = container.createScope();

  // Register subject for this request scope
  scope.provide(SubjectProviderPort, () => subject);

  // All guarded resolutions in this scope use this subject
  const repo = scope.resolve(UserRepoPort);
  // If subject lacks user:read, resolution throws AccessDeniedError

  await next();
});
```

### Child Scope Inherits Guard Configuration

```typescript
// Parent scope with admin subject
const parentScope = container.createScope();
parentScope.provide(SubjectProviderPort, () => adminSubject);

// Child scope with viewer subject
const childScope = parentScope.createChildScope();
childScope.provide(SubjectProviderPort, () => viewerSubject);

// Each scope's guard evaluations use that scope's subject
// Audit entries record the correct subjectId per scope
```

### Guarded Saga Steps (Consumer Responsibility)

Guard can be applied to individual saga step adapters. Each step is independently guarded, and if any step denies authorization, the saga orchestrator handles compensation. The saga integration logic (compensation on denial, aggregated audit records) is owned by `@hex-di/saga`, not by guard:

```typescript
// Each step has its own guard — standard guard() usage
const GuardedValidateStep = guard(ValidateTradeAdapter, {
  resolve: hasPermission(TradePerms.validate),
});

const GuardedReserveStep = guard(ReserveFundsAdapter, {
  resolve: hasPermission(TradePerms.reserve),
});

// Saga orchestration is @hex-di/saga's responsibility
// Guard only provides per-step policy enforcement
```

### Flow Transition Gating (Consumer Responsibility)

Guard's permission checking can be used within flow machine transition guards. The `createGuardContext()` helper and `GuardContext` interface are owned by `@hex-di/flow` (or consumer code), not by guard. Guard provides the building blocks (`AuthSubject`, permission tokens, `evaluate()`) that consumers compose:

```typescript
// Consumer code creates a permission-checking context from an AuthSubject
// This is NOT a guard-owned function — consumers define it
const guardContext = {
  can: (permission: PermissionConstraint) =>
    subject.permissions.has(`${permission.resource}:${permission.action}`),
};
```

### Electronic Signatures in Cross-Library Flows

When audit entries carry electronic signatures (via `AuditEntry.signature`), consumers that forward or log audit entries should **preserve** the signature data. Libraries that consume guard audit data should not strip the `signature` field, as this would break the audit chain integrity and signature binding.

For libraries that aggregate audit entries (e.g., saga compensations that roll up step-level audit data), the original per-step signatures should be preserved in the aggregated record rather than re-signed at the aggregate level.

---

## BEH-GD-041: Consumer Integration Guidelines (§40)

Guard defines authorization ports and evaluation contracts. Consuming libraries provide the adapters and integration-specific types. This section documents the responsibility boundary.

### Consumer Responsibility Matrix

| Concern | Guard Owns | Consumer Owns |
| ------- | ---------- | ------------- |
| **Event emission** | `GuardEventSinkPort`, `GuardEvent` union, emission timing | Adapter implementation (e.g., logger adapter, SIEM adapter) |
| **Span emission** | `GuardSpanSinkPort`, `GuardSpanSink`, `GuardSpanHandle` | Adapter implementation (e.g., OTel tracing adapter) |
| **Per-method authorization** | `guard()` with `methodPolicies` | Per-library convenience wrappers (e.g., `createGuardedStateAdapter` in `@hex-di/store`) |
| **Saga compensation on denial** | Per-step `guard()` enforcement | Compensation orchestration, `SagaAuditSummary` type (`@hex-di/saga`) |
| **Flow transition gating** | `AuthSubject`, permission tokens, `evaluate()` | `GuardContext` interface, `createGuardContext()` helper (`@hex-di/flow`) |
| **Structured logging** | `GuardAllowEvent`, `GuardDenyEvent` shapes | Log entry formatting, child logger creation, sampling rules (`@hex-di/logger`) |
| **Tracing spans** | `GuardSpanAttributes`, span structure docs | Span lifecycle management, OTel export, trace context propagation (`@hex-di/tracing`) |
| **Audit trail** | `AuditTrailPort`, `AuditEntry`, hash chain | Persistence adapters, query implementations |

### What Guard Exposes

- **Ports:** `GuardEventSinkPort`, `GuardSpanSinkPort` (optional), `AuditTrailPort` (mandatory), `SubjectProviderPort`, `PolicyEnginePort`, `SignatureServicePort` (optional), `FieldMaskContextPort`, `GuardLibraryInspectorPort`
- **Events:** `GuardEvent` discriminated union (`guard.allow`, `guard.deny`, `guard.error`)
- **Span contract:** `GuardSpanSink`, `GuardSpanHandle`, `GuardSpanAttributes` interfaces
- **Evaluation:** `evaluate()`, `evaluateAsync()`, `Decision`, `EvaluationTrace`
- **Guard wrapper:** `guard()`, `guardAsync()` with `methodPolicies`
- **Testing:** `MemoryGuardEventSink`, `MemoryGuardSpanSink` in `@hex-di/guard-testing`

### What Consumers Provide

- **`@hex-di/logger`:** Adapter for `GuardEventSinkPort` that translates `GuardEvent` into structured log entries via `LoggerPort`. Handles child logger creation, context fields (subjectId, roles, guardedPort), and log level mapping (allow -> info, deny -> warn, error -> error).
- **`@hex-di/tracing`:** Adapter for `GuardSpanSinkPort` that translates guard spans into OTel-compatible spans via the tracer. Handles span lifecycle, status propagation, and trace context.
- **`@hex-di/store`:** Convenience wrapper `createGuardedStateAdapter()` over `guard()` + `methodPolicies` for per-action store guards.
- **`@hex-di/saga`:** `SagaAuditSummary` type for aggregated saga audit records. Compensation-on-denial orchestration.
- **`@hex-di/flow`:** `GuardContext` interface, `createGuardContext()` helper for permission-gated state transitions. Per-transition audit entry emission.

### GxP Cross-Library Requirements

```
REQUIREMENT: When gxp is true, flow machines that use permission-gated state
             transitions MUST produce an AuditEntry for each state transition,
             not just for the initial permission check. Each state transition
             represents a discrete authorization decision point and MUST be
             individually auditable. The AuditEntry MUST include the flow machine
             name, the source state, the target state, and the transition event.
             This requirement is owned by @hex-di/flow and enforced at the
             flow adapter level, not by guard.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

---

## Integration Test Scenarios

The following test scenarios validate guard's integration contracts. These scenarios are owned by `@hex-di/guard-testing` and use memory sink adapters exclusively (no external services). Each scenario is a self-contained integration test.

### Guard + Event Sink (GE)

| ID   | Scenario                                  | Setup                                                                                                | Assert                                                                                                                                           | GxP Path                                                 |
| ---- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| GE-1 | Event emission on guard evaluation        | Create `MemoryGuardEventSink` + guarded adapter; resolve the guarded port as admin subject           | Sink contains `guard.allow` event with `portName`, `subjectId`, `policy`, `durationMs`, `evaluationId`                                           | Yes: verify `guard.deny` also emitted for denied subject |
| GE-2 | Credential redaction in guard events      | Create guarded adapter with subject containing sensitive attributes; resolve and deny                 | `guard.deny` event's `reason` field does NOT contain raw sensitive attribute values                                                               | Yes: verify redaction applies to both allow and deny     |
| GE-3 | GxP error events emitted for ACL008       | Configure `MemoryGuardEventSink`; trigger audit trail write failure with `gxp: true`                 | Sink contains `guard.error` event with `errorCode: "ACL008"`, `errorCategory`, `evaluationId`                                                    | Yes (required)                                           |

### Guard + Span Sink (GS)

| ID   | Scenario                                         | Setup                                                                   | Assert                                                                                                                                                                          | GxP Path                                        |
| ---- | ------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| GS-1 | Span creation for guard evaluation               | Create `MemoryGuardSpanSink` + guarded adapter; resolve guarded port    | Sink contains span named `guard.evaluate({portName})` with all required attributes (`hex-di.guard.policy`, `.subject`, `.decision`, `.reason`, `.port`, `.durationMs`, `.evaluationId`) | Yes: verify span exists for both allow and deny |
| GS-2 | Error status on denial                           | Resolve guarded port as unauthorized subject with span sink active      | Guard evaluation span has `status: "error"`; error message matches denial reason                                                                                                | Yes: verify error status propagates correctly   |
| GS-3 | evaluationId correlation between audit and span  | Resolve guarded port with both audit trail and span sink active         | `AuditEntry.evaluationId` matches span's `hex-di.guard.evaluationId` attribute for the same evaluation                                                                          | Yes (required): bidirectional lookup verified   |

### Guard + Composition (GC)

| ID   | Scenario                                         | Setup                                                                                                          | Assert                                                                                                                                       | GxP Path                                                           |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| GC-1 | Guarded adapter denies unauthorized subject      | Create guarded adapter with `hasPermission(read)` policy; resolve as subject without `read` permission         | Resolution returns `Err(AccessDeniedError)`; audit trail contains `deny` entry for the port                                                  | Yes: verify audit entry fields                                     |
| GC-2 | Guarded adapter allows authorized subject        | Same setup as GC-1; resolve as subject with `read` permission                                                  | Resolution succeeds; audit trail contains `allow` entry                                                                                      | Yes: verify audit entry fields                                     |
| GC-3 | Per-method policy evaluates correct policy        | Create guarded adapter with different `methodPolicies` for `updateTheme` (write) and `resetToDefaults` (admin) | `updateTheme` allowed (editor has write); `resetToDefaults` denied (editor lacks admin); separate audit entries for each                      | Yes: verify per-method audit entries                               |
| GC-4 | Child scope inherits guard configuration         | Create guarded adapter in parent scope; create child scope with different subject                               | Child scope's guard evaluations use the child scope's subject; audit entries record correct subjectId per scope                               | Yes: verify scopeId differs between parent and child audit entries |

### Multi-Sink (MS)

| ID   | Scenario                                       | Setup                                                                                                                                              | Assert                                                                                                                                          | GxP Path                                             |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| MS-1 | Combined span sink + event sink + audit trail  | Create `MemoryGuardSpanSink`, `MemoryGuardEventSink`, `MemoryAuditTrail`; wire all three to a guarded adapter; resolve as admin then as viewer     | All three systems record data: span sink has 2 spans, event sink has 2 events, audit trail has 2 entries; `evaluationId` correlates across all  | Yes: verify all three contain matching evaluationIds |
| MS-2 | GxP integrity across guard + audit + signature | Create guarded adapter with `hasSignature("approved")` policy; provide `MemorySignatureService`; capture signature and evaluate with `gxp: true`   | Audit entry has non-empty `integrityHash`, `previousHash`, `signature`; hash chain validates; signature validates against the audit entry data  | Yes (required)                                       |

> **Note:** Three scenarios from the previous revision (GSF-1: saga compensation on guard denial, GSF-3: flow `can()` transition gating, GSF-4: per-transition audit entries in flow machines) have been moved to their respective consuming libraries (`@hex-di/saga` and `@hex-di/flow`). Guard's integration tests focus on guard-owned ports and contracts.

```
REQUIREMENT: The 13 integration test scenarios defined above (GE-1 through GE-3,
             GS-1 through GS-3, GC-1 through GC-4, MS-1 through MS-2) MUST be
             implemented in @hex-di/guard-testing and included in the OQ test suite.
             All 13 scenarios MUST use memory adapters only (MemoryAuditTrail,
             MemoryGuardEventSink, MemoryGuardSpanSink, MemoryPolicyEngine,
             MemorySignatureService) — no external services or network dependencies.

             Coverage requirements:
             (a) All 13 scenarios MUST pass.
             (b) Each scenario group (GE, GS, GC, MS) MUST include at least one
                 scenario executed with gxp: true to validate GxP-specific behavior.
             (c) Scenario results MUST be included in the OQ report as integration
                 contract evidence.

             Reference: GAMP 5 Category 5 (integration testing),
             21 CFR 11.10(e) (audit trail completeness across system boundaries).
```

### Cross-Library Version Compatibility

```
REQUIREMENT: When deploying @hex-di/guard and @hex-di/http-client together in a
             GxP environment (gxp: true), the deployed versions MUST be listed in
             a validated version compatibility matrix maintained by the organization.
             Deploying unlisted version combinations in GxP environments MUST trigger
             re-validation per section 64a (../compliance/gxp.md).
             The compatibility matrix MUST document, for each validated combination:
             (a) The exact package versions (e.g., @hex-di/guard@0.2.0 +
                 @hex-di/http-client@0.2.0).
             (b) The shared infrastructure verified: ClockSource instance, hash chain
                 algorithm, audit trail adapter.
             (c) The OQ evidence reference (OQ-25 results).
             Reference: EU GMP Annex 11 Section 5 (interface verification),
             GAMP 5 §D.4 (validation scope).
```

---

_Previous: [09 - Serialization](./08-serialization.md) | Next: [11 - React Integration](./10-react-integration.md)_
