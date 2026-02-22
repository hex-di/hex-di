# Appendix R: Operational Log Event Schema

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-R                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix Q: Data Dictionary](./data-dictionary.md) | Next: [Appendix S: Consolidated Error Recovery Runbook](./error-recovery-runbook.md)_

---

This appendix defines structured schemas for operational (non-audit-trail) log events emitted by the guard pipeline. These events use WARNING or INFO severity and are emitted via the logger integration (section 37). Unlike `AuditEntry` records (which have a formal schema in Appendix Q), operational log events previously lacked a documented schema, making SIEM integration harder than necessary.

All operational log events share the following base structure:

```typescript
/**
 * Base structure for all guard operational log events.
 *
 * Every operational event carries these fields to enable
 * consistent SIEM ingestion, filtering, and correlation.
 */
interface GuardOperationalEvent {
  /** Discriminant tag identifying the event type. */
  readonly _tag: GuardOperationalEventTag;
  /** ISO 8601 UTC timestamp of when the event was emitted. */
  readonly timestamp: string;
  /** Log severity level. */
  readonly severity: "WARNING" | "INFO";
  /** The scope ID in which the event occurred (if applicable). */
  readonly scopeId?: string;
  /** The port name associated with the event (if applicable). */
  readonly portName?: string;
  /** Structured event source identifier for SIEM routing. */
  readonly source: "hex-di/guard";
  /** Event category for SIEM filtering. */
  readonly category:
    | "rate-limit"
    | "scope-lifecycle"
    | "clock"
    | "audit-trail"
    | "field-validation"
    | "wal-recovery"
    | "configuration";
}

type GuardOperationalEventTag =
  | "guard.rate_limit_activated"
  | "guard.rate_limit_summary"
  | "guard.scope_expired"
  | "guard.clock_drift_warning"
  | "guard.ntp_unavailable"
  | "guard.audit_write_failure"
  | "guard.field_truncated"
  | "guard.wal_recovery_started"
  | "guard.wal_orphan_detected"
  | "guard.wal_recovery_completed"
  | "guard.completeness_discrepancy"
  | "guard.capacity_threshold"
  | "guard.gxp_readiness_warning";
```

### Event Type Definitions

#### Rate Limiting Events

```typescript
interface RateLimitActivatedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.rate_limit_activated";
  readonly severity: "WARNING";
  readonly category: "rate-limit";
  readonly currentRate: number; // evaluations per second at activation
  readonly maxRate: number; // configured maxEvaluationsPerSecond
  readonly subjectId?: string; // subject that triggered the limit
}

interface RateLimitSummaryEvent extends GuardOperationalEvent {
  readonly _tag: "guard.rate_limit_summary";
  readonly severity: "WARNING";
  readonly category: "rate-limit";
  readonly windowStartTimestamp: string;
  readonly windowEndTimestamp: string;
  readonly rejectedCount: number; // evaluations rejected in window
  readonly acceptedCount: number; // evaluations accepted in window
  readonly maxRate: number;
}
```

#### Scope Lifecycle Events

```typescript
interface ScopeExpiredEvent extends GuardOperationalEvent {
  readonly _tag: "guard.scope_expired";
  readonly severity: "WARNING";
  readonly category: "scope-lifecycle";
  readonly scopeId: string;
  readonly elapsedMs: number; // how long the scope was alive
  readonly maxLifetimeMs: number; // configured maxScopeLifetimeMs
  readonly evaluationCount: number; // evaluations performed in scope before expiry
}
```

#### Clock Events

```typescript
interface ClockDriftWarningEvent extends GuardOperationalEvent {
  readonly _tag: "guard.clock_drift_warning";
  readonly severity: "WARNING";
  readonly category: "clock";
  readonly driftMs: number; // measured drift in milliseconds
  readonly thresholdMs: number; // configured drift threshold
  readonly ntpServer?: string; // NTP server address (if known)
}

interface NtpUnavailableEvent extends GuardOperationalEvent {
  readonly _tag: "guard.ntp_unavailable";
  readonly severity: "WARNING";
  readonly category: "clock";
  readonly lastSyncTimestamp?: string; // last successful NTP sync
  readonly retryCount: number; // consecutive failed NTP queries
}
```

#### Audit Trail Events

```typescript
interface AuditWriteFailureEvent extends GuardOperationalEvent {
  readonly _tag: "guard.audit_write_failure";
  readonly severity: "WARNING";
  readonly category: "audit-trail";
  readonly evaluationId: string; // the evaluation whose audit write failed
  readonly errorCode: string; // ACL error code (e.g., "ACL008")
  readonly errorMessage: string; // human-readable error description
  readonly failOnAuditError: boolean; // whether this will halt operations
}

interface FieldTruncatedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.field_truncated";
  readonly severity: "WARNING";
  readonly category: "field-validation";
  readonly fieldName: string; // "reason" (only field subject to truncation)
  readonly originalLength: number; // original string length in code points
  readonly truncatedLength: number; // length after truncation (2048)
  readonly evaluationId: string; // affected evaluation
}

interface CompletenessDiscrepancyEvent extends GuardOperationalEvent {
  readonly _tag: "guard.completeness_discrepancy";
  readonly severity: "WARNING";
  readonly category: "audit-trail";
  readonly portName: string;
  readonly resolutionCount: number; // guard evaluations performed
  readonly auditEntryCount: number; // audit entries recorded
  readonly discrepancy: number; // resolutionCount - auditEntryCount
}

interface CapacityThresholdEvent extends GuardOperationalEvent {
  readonly _tag: "guard.capacity_threshold";
  readonly severity: "WARNING";
  readonly category: "audit-trail";
  readonly utilizationPercent: number; // current storage utilization
  readonly thresholdPercent: number; // threshold that was crossed (70, 85, or 95)
  readonly estimatedRemainingHours?: number;
}
```

#### WAL Recovery Events

```typescript
interface WalRecoveryStartedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.wal_recovery_started";
  readonly severity: "INFO";
  readonly category: "wal-recovery";
  readonly pendingIntentCount: number; // orphaned intents found
}

interface WalOrphanDetectedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.wal_orphan_detected";
  readonly severity: "WARNING";
  readonly category: "wal-recovery";
  readonly evaluationId: string; // orphaned intent's evaluationId
  readonly intentTimestamp: string; // when the intent was written
  readonly ageMs: number; // how old the orphan is
}

interface WalRecoveryCompletedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.wal_recovery_completed";
  readonly severity: "INFO";
  readonly category: "wal-recovery";
  readonly recoveredCount: number; // intents successfully replayed
  readonly failedCount: number; // intents that could not be recovered
  readonly durationMs: number; // total recovery time
}
```

#### Configuration Events

```typescript
interface GxPReadinessWarningEvent extends GuardOperationalEvent {
  readonly _tag: "guard.gxp_readiness_warning";
  readonly severity: "WARNING";
  readonly category: "configuration";
  readonly checkId: string; // e.g., "item-11", "item-13"
  readonly checkDescription: string; // human-readable check description
  readonly recommendation: string; // recommended remediation
}
```

### SIEM Integration Guidance

```
REQUIREMENT: When the logger integration is active (section 37), all guard operational
             events MUST be emitted as structured JSON objects conforming to the schemas
             defined above. The _tag field MUST be used as the primary event type
             discriminant for SIEM routing rules and alerting configuration.
             Reference: EU GMP Annex 11 §9 (audit trail), PIC/S PI 011-3 §6.3.

RECOMMENDED: Organizations SHOULD configure SIEM alerting rules for the following
             operational events:
             - guard.audit_write_failure (category: audit-trail): Immediate alert
             - guard.wal_orphan_detected (category: wal-recovery): Immediate alert
             - guard.completeness_discrepancy (category: audit-trail): 1-minute alert
             - guard.clock_drift_warning (category: clock): 5-minute alert
             - guard.capacity_threshold at 95% (category: audit-trail): Immediate alert
             - guard.scope_expired with high frequency: Pattern-based alert
```

### CEF (Common Event Format) Mapping

For organizations using CEF-compatible SIEMs:

| GuardOperationalEvent Field | CEF Field             | CEF Key              |
| --------------------------- | --------------------- | -------------------- |
| `_tag`                      | Name                  | `name`               |
| `severity` WARNING          | Severity              | `7` (High)           |
| `severity` INFO             | Severity              | `3` (Low)            |
| `source`                    | Device Product        | `deviceProduct`      |
| `timestamp`                 | Receipt Time          | `rt`                 |
| `scopeId`                   | Source User ID        | `suid`               |
| `category`                  | Device Event Class ID | `deviceEventClassId` |

---

_Previous: [Appendix Q: Data Dictionary](./data-dictionary.md) | Next: [Appendix S: Consolidated Error Recovery Runbook](./error-recovery-runbook.md)_
