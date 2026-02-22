# 12 - Inspection

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-12                                 |
> | Revision         | 1.2                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.1 (2026-02-14): Added hash chain fields (sequenceNumber, integrityHash, previousHash, hashAlgorithm) to MetaAuditEntry interface per §48c REQUIREMENT (CCR-GUARD-005) |
> |                  | 1.1 (2026-02-19): Added BEH-GD-NNN requirement identifiers to section headings (CCR-GUARD-020) |
> |                  | 1.0 (2026-02-13): Initial controlled release |

_Previous: [11 - React Integration](./10-react-integration.md)_

---

## BEH-GD-049: GuardInspector (§47)

> **Invariant:** [INV-GD-006](../invariants.md) — Audit Trail Completeness (inspector reads audit entries)
> **See:** [ADR-GD-022](../decisions/022-mcp-a2a-concrete-schemas.md) — MCP A2A concrete schemas
> **DoD:** [DoD 12: DevTools Integration](../16-definition-of-done.md#dod-12-devtools-integration), [DoD 14: Vision Integration](../16-definition-of-done.md#dod-14-vision-integration)

Implements the `LibraryInspector` protocol from `@hex-di/core`. Follows the same pattern as `TracingInspector` and `LoggerInspector` -- a stateful inspector that collects events, maintains a snapshot, and exposes introspection methods.

> **Scope distinction:** `GuardInspector` events (`guard.evaluate`, `guard.allow`, `guard.deny`, `guard.error`) are part of the DevTools inspection protocol for real-time diagnostics and development-time visibility. They are distinct from `GuardEventSinkPort` events (10-cross-library.md section 37), which serve operational consumers like `@hex-di/logger` and SIEM systems. The two systems have different lifecycles: `GuardInspector` events feed a ring buffer for DevTools display; `GuardEventSinkPort` events are delivered to registered sink adapters for operational monitoring. Both are emitted for every guard evaluation, but they serve different audiences and have different retention guarantees.

### Interface

```typescript
import type { LibraryInspector, InspectionEvent, InspectionSnapshot } from "@hex-di/core";

/**
 * Events emitted by the GuardInspector.
 */
type GuardInspectionEvent =
  | {
      readonly kind: "guard.evaluate";
      readonly portName: string;
      readonly policy: string;
      readonly subjectId: string;
    }
  | {
      readonly kind: "guard.allow";
      readonly portName: string;
      readonly policy: string;
      readonly subjectId: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "guard.deny";
      readonly portName: string;
      readonly policy: string;
      readonly subjectId: string;
      readonly reason: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "guard.signature.capture";
      readonly signerId: string;
      readonly meaning: string;
      readonly portName: string;
    }
  | {
      readonly kind: "guard.signature.validate";
      readonly signerId: string;
      readonly meaning: string;
      readonly valid: boolean;
      readonly portName: string;
    }
  | {
      readonly kind: "guard.reauthenticate";
      readonly signerId: string;
      readonly method: string;
      readonly success: boolean;
    }
  | {
      readonly kind: "guard.relationship.check";
      readonly subjectId: string;
      readonly relation: string;
      readonly resourceId: string;
      readonly resourceType?: string;
      readonly depth: number;
      readonly result: boolean;
      readonly durationMs: number;
    }
  | {
      readonly kind: "guard.attribute.resolve";
      readonly subjectId: string;
      readonly attribute: string;
      readonly resolved: boolean;
      readonly durationMs: number;
    };

/**
 * Guard-specific snapshot data included in the unified inspection snapshot.
 */
interface GuardInspectionSnapshot {
  /** Active policies: map of port name to serialized policy string. */
  readonly activePolicies: ReadonlyMap<string, string>;
  /** Recent decisions: ring buffer of the last N evaluations. */
  readonly recentDecisions: ReadonlyArray<GuardDecisionEntry>;
  /** Permission statistics: allow/deny counts per port, per subject. */
  readonly permissionStats: GuardPermissionStats;
}

/**
 * A single entry in the recent decisions ring buffer.
 *
 * The timestamp field uses ISO 8601 format (e.g., "2024-01-15T10:30:00.000Z")
 * for audit-grade absolute time recording. This ensures consistency with
 * Decision.evaluatedAt and AuditEntry.timestamp across the system.
 */
interface GuardDecisionEntry {
  /** ISO 8601 timestamp of when the decision was recorded. */
  readonly timestamp: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly kind: "allow" | "deny";
  readonly policy: string;
  readonly reason: string;
  readonly durationMs: number;
}

/**
 * Aggregated statistics for guard evaluations.
 */
interface GuardPermissionStats {
  /** Total allow count. */
  readonly totalAllows: number;
  /** Total deny count. */
  readonly totalDenies: number;
  /** Per-port counts. */
  readonly byPort: ReadonlyMap<string, { allows: number; denies: number }>;
  /** Per-subject counts. */
  readonly bySubject: ReadonlyMap<string, { allows: number; denies: number }>;
}
```

### Implementation Pattern

Following the TracingInspector pattern:

````typescript
import type { LibraryInspector, InspectionSnapshot } from "@hex-di/core";

/**
 * Creates a GuardInspector that tracks guard evaluation events.
 *
 * @param options - Configuration options
 * @returns A LibraryInspector implementation for guard events
 *
 * @example
 * ```typescript
 * const inspector = createGuardInspector({ maxRecentDecisions: 100 });
 *
 * // Install on container
 * container.registerInspector("guard", inspector);
 *
 * // After some resolutions...
 * const snapshot = inspector.getSnapshot();
 * console.log(snapshot.recentDecisions);
 * console.log(snapshot.permissionStats);
 * ```
 */
function createGuardInspector(options?: {
  /** Maximum number of recent decisions to retain. Default: 100. */
  readonly maxRecentDecisions?: number;
}): GuardInspector;
````

### GuardInspectorPort

```typescript
import { port } from "@hex-di/core";

/**
 * Well-known port for the GuardInspector.
 *
 * Adapters providing this port deliver a GuardInspector instance that collects
 * authorization evaluation events. The GuardLibraryInspectorAdapter consumes
 * this port to bridge the GuardInspector to the container's unified inspection
 * system (category: "library-inspector" triggers auto-discovery).
 *
 * Direction: outbound — the consumer (guard wrapper) pushes events in;
 * the inspector implementation exposes them out.
 * Category: "guard/inspector" — operational tooling, not business logic.
 */
export const GuardInspectorPort = port<GuardInspector>()({
  name: "GuardInspector",
  direction: "outbound",
  category: "guard/inspector",
  tags: ["guard", "observability", "inspection"],
});
```

### Event Emission

Events are emitted in this sequence for each guard evaluation:

1. `guard.evaluate` -- emitted when evaluation begins
2. `guard.allow` OR `guard.deny` -- emitted when evaluation completes

```typescript
const inspector = createGuardInspector();

// Subscribe to events
inspector.on("guard.evaluate", event => {
  console.log(
    `Evaluating ${event.policy} for subject ${event.subjectId} on port ${event.portName}`
  );
});

inspector.on("guard.deny", event => {
  console.warn(`DENIED: ${event.portName} for ${event.subjectId} -- ${event.reason}`);
});
```

### Snapshot

The snapshot includes three sections that provide different levels of detail:

```typescript
const snapshot = inspector.getSnapshot();

// 1. Active policies: what policies are registered for which ports
snapshot.activePolicies;
// Map { "UserRepository" => "allOf(hasPermission(user:read), hasRole('admin'))" }

// 2. Recent decisions: the last N evaluations (ring buffer)
snapshot.recentDecisions;
// [
//   { portName: "UserRepository", subjectId: "admin-1", kind: "allow", timestamp: "2024-01-15T14:23:01.234Z", ... },
//   { portName: "UserRepository", subjectId: "viewer-1", kind: "deny", timestamp: "2024-01-15T14:23:01.456Z", ... },
// ]

// 3. Permission statistics: aggregated counts
snapshot.permissionStats;
// {
//   totalAllows: 42,
//   totalDenies: 7,
//   byPort: Map { "UserRepository" => { allows: 30, denies: 5 }, ... },
//   bySubject: Map { "admin-1" => { allows: 20, denies: 0 }, ... },
// }
```

### Ring Buffer

The recent decisions list is a fixed-size ring buffer. When the buffer is full, the oldest entry is evicted:

```typescript
const inspector = createGuardInspector({ maxRecentDecisions: 50 });

// After 100 evaluations, only the last 50 are retained
const snapshot = inspector.getSnapshot();
expect(snapshot.recentDecisions.length).toBeLessThanOrEqual(50);
```

> **WARNING:** The ring buffer is an **in-memory, lossy** data structure intended for real-time DevTools display and operational debugging. It is **NOT** an audit trail and **MUST NOT** be used as compliance evidence. Entries are evicted when the buffer is full and are lost on process restart. For GxP-compliant audit records, use the `AuditTrailPort` with a persistent adapter (see 07-guard-adapter.md section 25 and ../compliance/gxp.md section 61).

> **GxP Sizing Guidance:** In GxP-regulated environments, size the ring buffer (`maxRecentDecisions`) based on your monitoring cadence — it should retain enough entries to cover the interval between DevTools or operational dashboard polls. For example, if the dashboard polls every 5 seconds and peak evaluation throughput is 20 evaluations/second, a buffer of 100-200 entries is sufficient. The ring buffer is **not a substitute** for the `AuditTrailPort`; it exists solely for real-time operational visibility. Each `GuardDecisionEntry` consumes approximately 200-400 bytes of memory depending on policy label and reason string length, so a buffer of 1,000 entries uses roughly 200-400 KB.

> **RECOMMENDED minimum ring buffer size:** The `maxRecentDecisions` parameter SHOULD be set to at least **100** entries (the default). For production environments with active operational monitoring, a minimum of **200** entries is RECOMMENDED to ensure sufficient overlap between dashboard polling intervals and evaluation throughput. For high-throughput services (> 50 evaluations/second), consider **500-1,000** entries. The upper bound is constrained only by available memory — at ~400 bytes per entry, even 10,000 entries uses under 4 MB. Organizations SHOULD document the chosen buffer size and its justification in the deployment configuration.

```
REQUIREMENT: When gxp is true, the maxRecentDecisions parameter MUST be set to at
             least 200 entries. This minimum ensures sufficient overlap between
             operational monitoring poll intervals and evaluation throughput,
             preventing loss of recent decision data between dashboard refreshes.
             checkGxPReadiness() MUST validate that maxRecentDecisions >= 200 when
             gxp is true and emit a WARNING diagnostic if the configured value is
             below 200.
             Reference: EU GMP Annex 11 section 9, ALCOA+ Available principle.
```

> **Note:** The 200-entry minimum is for the real-time inspection ring buffer only. This does not replace or reduce the requirements for the persistent `AuditTrailPort` (section 61), which retains all entries.

### Clearing State

The inspector supports clearing its state for testing:

```typescript
inspector.clear();
const snapshot = inspector.getSnapshot();
expect(snapshot.recentDecisions).toHaveLength(0);
expect(snapshot.permissionStats.totalAllows).toBe(0);
```

---

## BEH-GD-050: DevTools Integration (§48)

> **Invariant:** [INV-GD-012](../invariants.md) — Evaluation Determinism (trace replay in DevTools)

Guard evaluation events appear in the unified DevTools snapshot alongside container, tracing, and logger data. The Guard data is contributed via the `LibraryInspector` protocol, so no special DevTools connector is needed -- the existing DevTools infrastructure collects guard data automatically.

### DevTools Snapshot Shape

The guard snapshot is included under the `"guard"` key in the unified DevTools snapshot:

```typescript
// Unified DevTools snapshot shape
interface DevToolsSnapshot {
  readonly container: ContainerInspectionSnapshot;
  readonly tracing: TracingInspectionSnapshot;
  readonly logger: LoggerInspectionSnapshot;
  readonly guard: GuardInspectionSnapshot;
}
```

### What DevTools Can Display

Given the guard inspection data, the DevTools panel can display:

#### Guarded Ports List

Which ports have guard policies attached, and what those policies are:

```
Port                    Policy
----                    ------
UserRepository          allOf(hasPermission(user:read))
  - .delete             hasRole('admin')
  - .update             allOf(hasPermission(user:write), hasAttribute('ownerId', eq(subject('id'))))
 SettingsStore           hasPermission(settings:read)
  - .resetToDefaults    hasPermission(settings:admin)
```

#### Recent Decisions Feed

A chronological list of recent authorization decisions, filterable by kind, port, or subject:

```
[14:23:01.234] ALLOW  UserRepository     admin-1    hasPermission(user:read)     0.12ms
[14:23:01.456] DENY   UserRepository     viewer-1   hasRole('admin')             0.08ms
[14:23:02.789] ALLOW  SettingsStore      admin-1    hasPermission(settings:read)  0.15ms
```

#### Evaluation Trace Tree

For a selected decision, the DevTools can display the full evaluation trace as a tree. This is the same trace structure that `explainPolicy` renders as text:

```
allOf [DENY]
  hasPermission(user:read) [ALLOW]
    subject 'viewer-1' has permission 'user:read'
  hasRole('admin') [DENY]
    subject 'viewer-1' does not have role 'admin'
```

When a composite policy has a non-default `fieldStrategy`, the trace label includes it:

```
anyOf[fieldStrategy=union] [ALLOW] (complete)
  hasPermission(document:read) [ALLOW] → fields: {title, content, metadata}
    subject 'user-1' has permission 'document:read'
  hasPermission(document:read) [ALLOW] → fields: {title, summary}
    subject 'user-1' has permission 'document:read'
  → merged visibleFields (union): {title, content, metadata, summary}
```

```
allOf[fieldStrategy=union] [ALLOW] (complete)
  hasPermission(user:read) [ALLOW] → fields: {name, email}
  hasAttribute(department) [ALLOW] → fields: {salary}
  → merged visibleFields (union): {name, email, salary}
```

The `fieldStrategy` annotation appears only when the strategy differs from the combinator's default ("intersection" for allOf, "first" for anyOf). This avoids visual noise for the common case.

#### Permission Statistics Dashboard

Aggregated charts showing:

- Allow/deny ratio by port
- Most-denied permissions
- Most-active subjects
- Evaluation duration distribution

### Future: Guard Panel

The DevTools Guard Panel (future) could include:

#### Policy Graph Visualization

An interactive tree visualization of composite policies, with color-coded nodes (green = allow, red = deny) for a specific subject:

```
             allOf
            /     \
   hasPermission  hasRole
   (user:read)    ('admin')
      GREEN         RED
```

#### Permission Matrix

A matrix showing subjects vs. resources with allow/deny indicators:

```
                  user:read  user:write  user:delete  settings:read
admin-1           ALLOW      ALLOW       ALLOW        ALLOW
editor-1          ALLOW      ALLOW       DENY         ALLOW
viewer-1          ALLOW      DENY        DENY         DENY
anonymous         DENY       DENY        DENY         DENY
```

#### Access Pattern Heatmap

A time-based heatmap showing authorization activity across ports and subjects, useful for identifying:

- Unauthorized access attempts (repeated denials from the same subject)
- Permission escalation patterns
- Unused permissions (never evaluated)

### DevTools Event Protocol

Guard events are sent to DevTools via the same `postMessage` / WebSocket protocol used by existing inspectors. The event format follows the `InspectionEvent` type:

```typescript
// Events sent to DevTools
type GuardDevToolsMessage =
  | { type: "guard:evaluate"; data: GuardInspectionEvent }
  | { type: "guard:snapshot"; data: GuardInspectionSnapshot };
```

The guard inspector emits events in real-time, and periodic snapshot snapshots are sent at the same cadence as other inspector snapshots (configurable, default: every 1000ms).

---

## BEH-GD-051: GuardLibraryInspectorPort (Auto-Discovery) (§48b)

Following the established pattern of `TracingLibraryInspectorPort`, `FlowLibraryInspectorPort`, `StoreLibraryInspectorPort`, and other library inspector ports, the guard library provides a `GuardLibraryInspectorPort` for automatic registration with the container's unified inspection system.

### Port Definition

```typescript
import { createLibraryInspectorPort } from "@hex-di/core";

/**
 * Well-known port for the GuardLibraryInspector.
 *
 * When an adapter providing this port is resolved, the container's
 * afterResolve hook automatically registers the inspector with the
 * unified inspection system.
 *
 * Category: "library-inspector" (triggers auto-discovery)
 */
export const GuardLibraryInspectorPort = createLibraryInspectorPort({
  name: "GuardLibraryInspector",
});
```

### Bridge Function

```typescript
/**
 * Creates a GuardLibraryInspector bridge that adapts the GuardInspector
 * to the LibraryInspector protocol.
 *
 * Follows the same pattern as createTracingLibraryInspector(),
 * createFlowLibraryInspector(), etc.
 *
 * @param guardInspector - The GuardInspector to bridge
 * @returns A LibraryInspector implementation for the guard library
 */
function createGuardLibraryInspector(guardInspector: GuardInspector): LibraryInspector;
```

The bridge function maps GuardInspector methods to the LibraryInspector protocol:

```typescript
// Internal implementation sketch
function createGuardLibraryInspector(guardInspector) {
  return {
    libraryName: "guard",
    getSnapshot() {
      return guardInspector.getSnapshot();
    },
    subscribe(listener) {
      return guardInspector.subscribe(listener);
    },
  };
}
```

### Frozen Singleton Adapter

```typescript
/**
 * Frozen singleton adapter for auto-discovery.
 *
 * Provides GuardLibraryInspectorPort with a bridge that wraps the
 * GuardInspector instance. The container's afterResolve hook detects
 * the "library-inspector" category and automatically registers it.
 */
export const GuardLibraryInspectorAdapter = Object.freeze(
  createAdapter({
    provides: GuardLibraryInspectorPort,
    requires: [GuardInspectorPort],
    lifetime: "singleton",
    factory: (deps) => createGuardLibraryInspector(deps.GuardInspector),
  })
);
```

### Usage

```typescript
import { GuardLibraryInspectorAdapter } from "@hex-di/guard";

const graph = GraphBuilder.create()
  .provide(GuardLibraryInspectorAdapter)
  // ... other adapters
  .build();

// After container creation, the guard inspector is automatically
// registered with the unified inspection system:
const snapshot = container.inspector.getUnifiedSnapshot();
console.log(snapshot.guard); // GuardInspectionSnapshot
```

---

## BEH-GD-052: MCP Resource URIs (§48c)

The guard library exposes its inspection data as MCP (Model Context Protocol) resources, following the same pattern as other HexDI libraries. Each resource has a defined URI, response schema, and content type (see [ADR #22](../decisions/022-mcp-a2a-concrete-schemas.md)).

| URI                       | Description                                | Content-Type       |
| ------------------------- | ------------------------------------------ | ------------------ |
| `hexdi://guard/snapshot`  | Full guard inspection snapshot             | `application/json` |
| `hexdi://guard/policies`  | Active policies by port                    | `application/json` |
| `hexdi://guard/decisions` | Recent authorization decisions             | `application/json` |
| `hexdi://guard/stats`     | Permission statistics (allow/deny counts)  | `application/json` |
| `hexdi://guard/audit`     | Audit trail entries (if queryable adapter) | `application/json` |

> **REQUIREMENT (GxP):** When `gxp: true`, MCP resource endpoint invocations MUST be recorded in the site's meta-audit log (access audit trail). Each request to `hexdi://guard/audit`, `hexdi://guard/decisions`, or `hexdi://guard/stats` constitutes an access to audit trail data and MUST be logged with the requestor identity (MCP client ID), timestamp (ISO 8601 UTC), query parameters, and result summary (entry count returned). This meta-audit log is subject to the same retention and access control requirements as the primary audit trail per ../compliance/gxp.md section 63 and ../compliance/gxp.md section 64. Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, PIC/S PI 011-3 §9.4.

```
REQUIREMENT: When gxp: true, the meta-audit log MUST be tamper-evident. Each
             meta-audit entry MUST include: (a) a monotonically increasing
             sequenceNumber (no gaps), (b) an integrityHash computed over the
             entry's fields using the same algorithm as the primary audit trail
             (section 61.4), and (c) a previousHash linking to the preceding
             meta-audit entry's integrityHash (empty string for genesis entry).
             This hash chain enables independent verification of meta-audit
             integrity using the same verifyAuditChain() utility used for
             the primary audit trail.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.

RECOMMENDED: Meta-audit entries SHOULD use a structure compatible with AuditEntry
             (or a subset thereof) so that the existing verifyAuditChain() utility
             can be reused for meta-audit chain verification without a separate
             verification implementation. The meta-audit entry SHOULD include at
             minimum: sequenceNumber, integrityHash, previousHash, hashAlgorithm,
             timestamp (ISO 8601 UTC), requestorId (MCP client ID or A2A agent ID),
             action (the resource URI or skill ID accessed), and resultSummary
             (entry count returned).

RECOMMENDED: Organizations deploying guard MCP resources for inspector access
             SHOULD restrict access to the MCP endpoint using network-level controls
             (e.g., VPN, IP allowlist, mutual TLS) or MCP-level authentication.
             Inspector access endpoints SHOULD NOT be exposed on the public internet
             without authentication. When time-limited inspector credentials are used
             (per section 64, G5), the MCP endpoint SHOULD enforce credential expiry
             and revocation. Access control for the MCP endpoint is a consumer
             infrastructure responsibility, not a guard library responsibility.
             Reference: 21 CFR 11.10(d) (limiting system access),
             EU GMP Annex 11 §12 (security).
```

### Resource: hexdi://guard/snapshot

Full guard inspection snapshot combining all three data sections.

**Response Schema:**

```typescript
interface GuardSnapshotResponse {
  readonly activePolicies: Record<string, string>;
  readonly recentDecisions: ReadonlyArray<GuardDecisionEntry>;
  readonly permissionStats: {
    readonly totalAllows: number;
    readonly totalDenies: number;
    readonly byPort: Record<string, { allows: number; denies: number }>;
    readonly bySubject: Record<string, { allows: number; denies: number }>;
  };
}
```

**Example Response:**

```json
{
  "activePolicies": {
    "UserRepository": "allOf(hasPermission(user:read), hasRole('admin'))",
    "SettingsStore": "hasPermission(settings:read)"
  },
  "recentDecisions": [
    {
      "timestamp": "2024-01-15T14:23:01.234Z",
      "portName": "UserRepository",
      "subjectId": "admin-1",
      "kind": "allow",
      "policy": "allOf(hasPermission(user:read), hasRole('admin'))",
      "reason": "",
      "durationMs": 0.12
    }
  ],
  "permissionStats": {
    "totalAllows": 42,
    "totalDenies": 7,
    "byPort": {
      "UserRepository": { "allows": 30, "denies": 5 },
      "SettingsStore": { "allows": 12, "denies": 2 }
    },
    "bySubject": {
      "admin-1": { "allows": 20, "denies": 0 },
      "viewer-1": { "allows": 15, "denies": 7 }
    }
  }
}
```

### Resource: hexdi://guard/policies

Returns active policies keyed by port name. Each value is the serialized policy label produced by `serializePolicy()`.

**Response Schema:**

```typescript
interface GuardPoliciesResponse {
  readonly policies: Record<
    string,
    {
      readonly portName: string;
      readonly policyLabel: string;
      readonly policyJson: string;
    }
  >;
}
```

**Example Response:**

```json
{
  "policies": {
    "UserRepository": {
      "portName": "UserRepository",
      "policyLabel": "allOf(hasPermission(user:read), hasRole('admin'))",
      "policyJson": "{\"kind\":\"allOf\",\"policies\":[{\"kind\":\"hasPermission\",\"permission\":\"user:read\"},{\"kind\":\"hasRole\",\"roleName\":\"admin\"}]}"
    }
  }
}
```

### Resource: hexdi://guard/decisions

Returns recent authorization decisions from the ring buffer. Supports query parameters for filtering.

**Query Parameters:**

| Parameter | Type                | Description                             |
| --------- | ------------------- | --------------------------------------- |
| `subject` | `string`            | Filter by subject ID                    |
| `port`    | `string`            | Filter by port name                     |
| `kind`    | `"allow" \| "deny"` | Filter by kind                          |
| `limit`   | `number`            | Maximum entries to return (default: 50) |

**Response Schema:**

```typescript
interface GuardDecisionsResponse {
  readonly decisions: ReadonlyArray<GuardDecisionEntry>;
  readonly total: number;
  readonly filtered: number;
}
```

### Resource: hexdi://guard/stats

Returns aggregated permission statistics.

**Response Schema:**

```typescript
interface GuardStatsResponse {
  readonly totalAllows: number;
  readonly totalDenies: number;
  readonly allowRate: number; // totalAllows / (totalAllows + totalDenies)
  readonly byPort: Record<string, { allows: number; denies: number; rate: number }>;
  readonly bySubject: Record<string, { allows: number; denies: number; rate: number }>;
  readonly topDeniedPorts: ReadonlyArray<{ portName: string; denies: number }>;
  readonly topDeniedSubjects: ReadonlyArray<{ subjectId: string; denies: number }>;
}
```

### Resource: hexdi://guard/audit

Returns audit trail entries when a queryable audit trail adapter is available. Returns an empty array with a warning when using `NoopAuditTrail` or a non-queryable adapter.

> **WARNING:** This resource queries data exclusively through the `AuditTrailPort` query interface (i.e., a `QueryableAuditTrail` adapter). It does **NOT** fall back to the GuardInspector ring buffer. If no queryable adapter is registered, the response contains an empty `entries` array and `chainIntegrity: "unchecked"`. The ring buffer data is available via `hexdi://guard/decisions` but carries no compliance guarantees.

**Query Parameters:**

| Parameter  | Type                | Description                    |
| ---------- | ------------------- | ------------------------------ |
| `subject`  | `string`            | Filter by subject ID           |
| `port`     | `string`            | Filter by port name            |
| `decision` | `"allow" \| "deny"` | Filter by decision             |
| `from`     | `string`            | ISO 8601 start time            |
| `to`       | `string`            | ISO 8601 end time              |
| `limit`    | `number`            | Maximum entries (default: 100) |

**Response Schema:**

```typescript
interface GuardAuditResponse {
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly total: number;
  readonly filtered: number;
  readonly chainIntegrity: "valid" | "invalid" | "unchecked";
}
```

---

## BEH-GD-053: A2A Skills (§48d)

The guard library publishes two A2A (Agent-to-Agent) skills for AI agent collaboration. Each skill has defined input/output schemas following the A2A protocol.

### Skill: guard.inspect-policies

Inspects the application's authorization model. Returns active policies, permission registries, and role hierarchies.

```json
{
  "id": "guard.inspect-policies",
  "name": "Guard Policy Inspector",
  "description": "Returns all active authorization policies, their associated ports, and recent evaluation statistics. Use this to understand the application's authorization model.",
  "examples": [
    "What authorization policies are configured?",
    "Which ports have guard policies attached?",
    "Show me the authorization model for this application"
  ]
}
```

**Input Schema:**

```typescript
interface InspectPoliciesInput {
  /** Optional: filter to a specific port. */
  readonly portName?: string;
  /** Optional: include policy JSON (verbose). Default: false. */
  readonly includePolicyJson?: boolean;
  /** Optional: include permission statistics. Default: true. */
  readonly includeStats?: boolean;
}
```

**Output Schema:**

```typescript
interface InspectPoliciesOutput {
  readonly policies: ReadonlyArray<{
    readonly portName: string;
    readonly policyLabel: string;
    readonly policyJson?: string;
    readonly stats?: { allows: number; denies: number };
  }>;
  readonly summary: {
    readonly totalGuardedPorts: number;
    readonly totalPolicies: number;
    readonly overallAllowRate: number;
  };
}
```

### Skill: guard.audit-review

> **REQUIREMENT (GxP):** When `gxp: true`, A2A skill invocations of `guard.audit-review` MUST be recorded in the site's meta-audit log, as they constitute programmatic access to audit trail data. The meta-audit entry MUST include the invoking agent identity (A2A agent ID), timestamp (ISO 8601 UTC), input parameters, and whether the response was sourced from the audit trail or ring buffer. This meta-audit log is subject to the same retention and access control requirements as the primary audit trail per ../compliance/gxp.md section 63 and ../compliance/gxp.md section 64. Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, PIC/S PI 011-3 §9.4.

> **Note:** The meta-audit log for both MCP resource accesses (section 48c) and A2A skill invocations (this section) MUST maintain its own tamper-evident hash chain per the meta-audit integrity requirement in section 48c above. This ensures that the access audit trail itself cannot be silently modified.

Reviews recent authorization decisions for compliance analysis. Supports filtering and provides summary statistics for the filtered set.

```json
{
  "id": "guard.audit-review",
  "name": "Guard Audit Trail Reviewer",
  "description": "Reviews recent authorization decisions for compliance analysis. Returns allow/deny decisions with subjects, timestamps, and reasons. Supports filtering by subject, port, kind, and time range.",
  "examples": [
    "Show me all denied access attempts in the last hour",
    "Which subjects have been denied access to UserRepository?",
    "Review the audit trail for compliance"
  ]
}
```

**Input Schema:**

```typescript
interface AuditReviewInput {
  /** Optional: filter by subject ID. */
  readonly subjectId?: string;
  /** Optional: filter by port name. */
  readonly portName?: string;
  /** Optional: filter by kind. */
  readonly kind?: "allow" | "deny";
  /** Optional: ISO 8601 start time. */
  readonly from?: string;
  /** Optional: ISO 8601 end time. */
  readonly to?: string;
  /** Optional: maximum entries to return. Default: 50. */
  readonly limit?: number;
  /** Optional: verify audit chain integrity. Default: false. */
  readonly verifyIntegrity?: boolean;
}
```

**Output Schema:**

```typescript
interface AuditReviewOutput {
  /** Indicates the data source used for this review. */
  readonly dataSource: {
    /** "audit-trail" when AuditTrailPort query interface is available, "ring-buffer" when falling back to GuardInspector. */
    readonly source: "audit-trail" | "ring-buffer";
    /** Present when source is "ring-buffer". Warns that data is in-memory, lossy, and NOT suitable for compliance evidence. */
    readonly warning?: string;
  };
  readonly decisions: ReadonlyArray<{
    readonly timestamp: string;
    readonly subjectId: string;
    readonly portName: string;
    readonly kind: "allow" | "deny";
    readonly policy: string;
    readonly reason: string;
    readonly durationMs: number;
    readonly evaluationId: string;
  }>;
  readonly summary: {
    readonly total: number;
    readonly allows: number;
    readonly denies: number;
    readonly uniqueSubjects: number;
    readonly uniquePorts: number;
    readonly timeRange: { from: string; to: string };
  };
  readonly integrity?: {
    readonly status: "valid" | "invalid" | "unchecked";
    readonly firstInvalidIndex?: number;
    readonly message?: string;
  };
}
```

### Skill: guard.explain-decision

Explains a specific authorization decision in human-readable terms. Useful for debugging "why was this denied?" questions.

```json
{
  "id": "guard.explain-decision",
  "name": "Guard Decision Explainer",
  "description": "Explains why a specific authorization decision was made. Takes an evaluation ID or a subject+port combination and returns a human-readable trace of the policy evaluation.",
  "examples": [
    "Why was viewer-1 denied access to UserRepository?",
    "Explain the last authorization failure",
    "What would happen if user-1 tried to access PaymentService?"
  ]
}
```

**Input Schema:**

```typescript
interface ExplainDecisionInput {
  /** Explain a specific decision by evaluation ID. */
  readonly evaluationId?: string;
  /** Or explain the most recent decision for a subject+port combination. */
  readonly subjectId?: string;
  readonly portName?: string;
  /** Or simulate: evaluate a policy against a hypothetical subject. */
  readonly simulate?: {
    readonly portName: string;
    readonly subject: AuthSubject;
  };
}
```

**Output Schema:**

```typescript
interface ExplainDecisionOutput {
  readonly kind: "allow" | "deny";
  readonly explanation: string;
  readonly trace: EvaluationTrace;
  readonly subject: { id: string; roles: readonly string[]; permissionCount: number };
  readonly policy: string;
}
```

```
RECOMMENDED: Review interfaces displaying results from the guard.explain-decision
             skill's simulate mode SHOULD visually distinguish simulated evaluations
             from actual decisions. Acceptable methods include:
             - A prominent "SIMULATION" badge on each simulated result
             - A distinct background color or border for simulated evaluation cards
             - An icon indicator (e.g., flask or test-tube icon) next to simulated entries
             - A separate tab or section that isolates simulations from live decisions

             This prevents auditor confusion during compliance review by ensuring
             simulated evaluations cannot be mistaken for real access control decisions.
             The MetaAuditEntry already captures `simulated: true`; review UIs SHOULD
             surface this flag prominently rather than requiring users to inspect
             individual record fields.
             Reference: ALCOA+ Accurate, 21 CFR 11.10(e).
```

## Meta-Audit Trail

In GxP environments, access to the audit trail itself must be auditable. The Meta-Audit Trail records who accessed the audit trail, when, and what they viewed or exported.

### MetaAuditEntry

```typescript
/**
 * Records access to the audit trail for meta-level auditing.
 *
 * Every query, export, or inspection of audit data produces a
 * MetaAuditEntry. This satisfies the regulatory requirement that
 * audit trail access itself is logged.
 */
interface MetaAuditEntry {
  readonly _tag: "MetaAuditEntry";
  /** Unique identifier for this meta-audit event. */
  readonly metaAuditId: string;
  /** ISO 8601 UTC timestamp of the access event. */
  readonly timestamp: string;
  /** Identity of the actor who accessed the audit trail. */
  readonly actorId: string;
  /** Type of access performed. */
  readonly accessType: "query" | "export" | "view" | "verify_chain" | "simulation";
  /** Description of the access (e.g., query filter, export scope). */
  readonly description: string;
  /** Number of audit entries accessed or returned. */
  readonly entryCount: number;
  /** Whether this was a simulated evaluation (e.g., via A2A guard.explain-decision). */
  readonly simulated: boolean;
  /** Scope of access (e.g., specific scopeId, date range). */
  readonly scope: string;

  // ── Hash Chain Fields (tamper-evident meta-audit trail) ─────────
  // Required per §48c REQUIREMENT: meta-audit entries MUST form a
  // tamper-evident hash chain using the same algorithm as the primary
  // audit trail (section 61.4).

  /** Monotonically increasing sequence number (no gaps). */
  readonly sequenceNumber: number;
  /** SHA-256 hash computed over this entry's fields. */
  readonly integrityHash: string;
  /** integrityHash of the preceding meta-audit entry (empty string for genesis). */
  readonly previousHash: string;
  /** Identifier of the hash algorithm used (e.g., "sha256"). */
  readonly hashAlgorithm: string;
}
```

### MetaAuditTrailPort

```typescript
/**
 * Port for recording meta-audit trail entries.
 *
 * Outbound port. Singleton lifetime.
 */
interface MetaAuditTrailPort {
  readonly _tag: "MetaAuditTrailPort";
  /** Record an access event to the audit trail. */
  readonly recordAccess: (entry: MetaAuditEntry) => Result<void, AuditTrailWriteError>;
}
```

```
REQUIREMENT: Simulations performed via the A2A guard.explain-decision skill MUST be
             logged in the meta-audit trail with simulated: true. The meta-audit entry
             MUST include the actor who initiated the simulation and the policy/subject
             combination that was simulated. This prevents simulations from being
             confused with actual authorization decisions during compliance review.
             Reference: 21 CFR 11.10(e), ALCOA+ Attributable.
```

```
REQUIREMENT: When gxp is true, MCP tool endpoints and A2A skill endpoints that expose
             guard inspection data (policy snapshots, decision history, evaluation
             traces) MUST require authentication. Unauthenticated access to inspection
             endpoints MUST be rejected. The authentication mechanism SHOULD use the
             same SubjectProviderPort infrastructure as the guard itself.
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
RECOMMENDED: Inspection endpoint authentication SHOULD use one of the following
             mechanisms appropriate to the deployment context:

             (a) JWT (JSON Web Tokens): For web-based DevTools panels and A2A
                 skill invocations. Tokens SHOULD have a maximum lifetime of
                 1 hour and SHOULD include audience and issuer claims.
             (b) API key: For server-to-server inspection queries and automated
                 monitoring. API keys SHOULD be rotated at least annually.
             (c) OAuth 2.0: For multi-tenant deployments where inspection access
                 is managed by a centralized identity provider.

             Operations SHOULD be scoped with fine-grained permissions:
             - `guard:audit:query` — Read access to audit trail entries
             - `guard:inspection:read` — Read access to guard inspector state
             - `guard:health:read` — Read access to health check results
             - `guard:admin:write` — Write access to administrative operations

             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

### AuditQueryPort

The `AuditQueryPort` provides a structured query interface for audit trail data, enabling regulatory review workflows, compliance reporting, and export operations.

```typescript
/**
 * Structured query interface for audit trail entries.
 *
 * Provides filtered access to persisted audit data for regulatory review,
 * compliance reporting, and data export. Every query operation produces
 * a MetaAuditEntry recording the access.
 */
interface AuditQueryPort {
  readonly _tag: "AuditQueryPort";

  /** Query audit entries by evaluation ID. */
  readonly queryByEvaluationId: (
    evaluationId: string
  ) => Result<AuditEntry | undefined, AuditTrailReadError>;

  /** Query audit entries by subject ID with optional time range. */
  readonly queryBySubjectId: (
    subjectId: string,
    options?: { readonly from?: string; readonly to?: string; readonly limit?: number }
  ) => Result<readonly AuditEntry[], AuditTrailReadError>;

  /** Query audit entries within a time range. */
  readonly queryByTimeRange: (
    from: string,
    to: string,
    options?: { readonly limit?: number; readonly decision?: "allow" | "deny" }
  ) => Result<readonly AuditEntry[], AuditTrailReadError>;

  /** Query audit entries by port name. */
  readonly queryByPortName: (
    portName: string,
    options?: { readonly from?: string; readonly to?: string; readonly limit?: number }
  ) => Result<readonly AuditEntry[], AuditTrailReadError>;

  /** Export audit entries in machine-readable or human-readable format. */
  readonly exportEntries: (
    filter: AuditExportFilter,
    format: "json-lines" | "csv"
  ) => Result<AuditExportResult, AuditTrailReadError>;
}

/**
 * Filter criteria for audit trail export operations.
 */
interface AuditExportFilter {
  readonly from?: string;
  readonly to?: string;
  readonly subjectId?: string;
  readonly portName?: string;
  readonly decision?: "allow" | "deny";
  readonly scopeIds?: readonly string[];
}

/**
 * Result of an audit trail export operation.
 */
interface AuditExportResult {
  /** The exported data as a string (JSON Lines or CSV). */
  readonly data: string;
  /** Export manifest for integrity verification. */
  readonly manifest: {
    readonly format: "json-lines" | "csv";
    readonly entryCount: number;
    readonly firstHash: string;
    readonly lastHash: string;
    readonly checksum: string;
    readonly exportedAt: string;
    readonly scopeIds: readonly string[];
  };
}
```

```
REQUIREMENT: Every AuditQueryPort query method invocation MUST produce a
             MetaAuditEntry recording the access. The meta-audit entry MUST
             include the query method name, filter parameters, result count,
             and the identity of the requestor. This ensures that audit trail
             access is itself auditable per 21 CFR 11.10(e).
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

```
REQUIREMENT: AuditQueryPort query results MUST exclude quarantined entries.
             Entries flagged as quarantined (e.g., entries with detected integrity
             violations or entries under investigation) MUST NOT appear in standard
             query results. A separate administrative interface MAY provide access
             to quarantined entries for investigation purposes.
             Reference: 21 CFR 11.10(e), ALCOA+ Accurate.
```

---

_Previous: [11 - React Integration](./10-react-integration.md) | Next: [13 - Testing](./12-testing.md)_
