# Appendix O: Condensed Clock Specification Summary

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-O                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix N: STRIDE Threat Model](./stride-threat-model.md) | Next: [Appendix Q: Data Dictionary](./data-dictionary.md)_

---

This appendix provides a standalone summary of the clock infrastructure requirements for the guard library. The authoritative clock specification is `spec/clock/`, and this summary enables auditing the guard spec as a standalone document without cross-referencing.

### ClockSource Interface

```typescript
interface ClockSource {
  now(): string; // Returns ISO 8601 UTC timestamp (e.g., "2024-01-15T10:30:00.000Z")
}
```

`ClockSource.now()` bridges over `ClockPort.wallClockNow()` from `@hex-di/clock`. The `createClockSourceBridge()` function adapts `ClockPort` to `ClockSource` by converting epoch-millisecond to ISO 8601 UTC via `new Date(clock.wallClockNow()).toISOString()`.

### Dual-Clock Architecture

| Property            | `ClockSource.now()`                                      | `performance.now()`                   |
| ------------------- | -------------------------------------------------------- | ------------------------------------- |
| **Type**            | Absolute wall-clock time                                 | Relative monotonic counter            |
| **Source**          | `ClockPort.wallClockNow()` via bridge (NTP-synchronized) | Browser/Node.js high-resolution timer |
| **Format**          | ISO 8601 UTC string                                      | Floating-point milliseconds           |
| **Use in guard**    | `evaluatedAt`, `timestamp`, `signedAt`                   | `durationMs`                          |
| **NTP-sensitive**   | Yes (requires synchronization)                           | No (hardware counter)                 |
| **Monotonic**       | No (can jump forward/backward with NTP corrections)      | Yes (always increases)                |
| **GxP requirement** | NTP sync within 1-second tolerance (§62)                 | No NTP requirement                    |

### Timestamp Fields in Guard

| Field                          | Location          | Source                | Purpose                                         |
| ------------------------------ | ----------------- | --------------------- | ----------------------------------------------- |
| `Decision.evaluatedAt`         | Policy evaluator  | Guard ClockSource     | When the authorization decision was made        |
| `AuditEntry.timestamp`         | Guard wrapper     | Guard ClockSource     | When the audit entry was recorded               |
| `AuthSubject.authenticatedAt`  | Subject adapter   | Authentication system | When the subject authenticated                  |
| `ElectronicSignature.signedAt` | Signature capture | Signing system        | When the signature was applied                  |
| `GuardDecisionEntry.timestamp` | GuardInspector    | Guard ClockSource     | When the decision was recorded in the inspector |

### NTP Synchronization Requirements (GxP)

| Requirement                  | Value                                                  | Reference                            |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------ |
| NTP sync tolerance           | <= 1 second drift from stratum-1 source                | §62, ALCOA+ Contemporaneous          |
| Clock drift monitoring       | REQUIRED when `gxp: true`                              | §62, FM-09, FM-12                    |
| Drift detection threshold    | Configurable; default 500ms for warning, 1s for error  | ACL019 (warning), ACL021 (violation) |
| NTP unavailability handling  | Three modes: `fail-fast`, `degraded`, `warn-only`      | `spec/clock/07-integration.md` §24   |
| Multi-region clock agreement | MUST use same NTP hierarchy; variance documented in PQ | §62, multi-region guidance           |

### Startup Self-Tests

Before guard operations begin, the clock infrastructure performs four startup self-tests (from `spec/clock/04-platform-adapters.md` §13):

| Test | Description                                                    | Failure Behavior            |
| ---- | -------------------------------------------------------------- | --------------------------- |
| ST-1 | Wall clock in plausible range (not year 1970 or 2099+)         | Block startup               |
| ST-2 | RTC/NTP agreement (delta within configured tolerance)          | Warning or block per config |
| ST-3 | Monotonic clock advancing (two reads return increasing values) | Block startup               |
| ST-4 | ISO 8601 formatting produces valid UTC string                  | Block startup               |

### Authoritative Ordering: sequenceNumber

The `sequenceNumber` field (monotonically increasing per scope) is the authoritative ordering mechanism for audit entries. Timestamps are informational (for human review and cross-region approximate ordering). This design ensures correct ordering even when NTP corrections cause wall-clock time to jump backward.

> **Cross-reference:** Full clock specification in `spec/clock/`. NTP adapter contracts (NC-1 through NC-7) in `spec/clock/compliance/gxp.md` §18. Guard clock integration in `spec/clock/07-integration.md` §24.

---

_Previous: [Appendix N: STRIDE Threat Model](./stride-threat-model.md) | Next: [Appendix Q: Data Dictionary](./data-dictionary.md)_
