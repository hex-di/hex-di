# ADR-GD-033: Shipping IQ/OQ/PQ as `@hex-di/guard-validation`

> **Status:** Accepted
> **ADR Number:** 033 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP qualification (IQ/OQ/PQ) traditionally relies on manual checklists. Manual processes are unreliable, hard to reproduce, and produce evidence that is difficult to audit. The design question: how to make qualification automated, reproducible, and auditable?

## Decision

Programmatic validation runners in a separate `@hex-di/guard-validation` package produce timestamped, structured qualification reports. `runIQ()`, `runOQ()`, and `generateTraceabilityMatrix()` return typed result structures.

```ts
// Automated IQ/OQ evidence generation
import { runIQ, runOQ, generateTraceabilityMatrix } from "@hex-di/guard-validation";

const iqResult = await runIQ({ packageVersion: "1.0.0" });
// Returns: { passed: true, timestamp: "...", checks: [...], sbom: {...} }
```

## Consequences

**Positive**:
- Reproducible qualification evidence
- Automated, auditable reports with timestamps
- Separate package keeps the core guard bundle lean

**Negative**:
- Separate package to install
- Validation suite must be kept in sync with core functionality as the library evolves

**Trade-off accepted**: Automated qualification is more reliable and auditable than manual checklists; the synchronization maintenance overhead is justified by the compliance benefits.
