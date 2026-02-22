# ADR-GD-034: Open-source supplier qualification via GAMP 5 risk-based approach

> **Status:** Accepted
> **ADR Number:** 034 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GAMP 5 Section 10 requires supplier qualification for software used in GxP environments. Traditional supplier audit approaches (questionnaires, on-site audits, SOC 2 reports) are impractical for open-source libraries — there is no supplier organization to audit.

## Decision

Risk-based approach per GAMP 5: source code review (the spec IS the qualification document), automated IQ (integrity verification, vulnerability scanning, SBOM generation), OQ (functional verification via test suite), and periodic re-qualification on version upgrades.

```bash
# Automated supplier qualification evidence
npx @hex-di/guard-validation run-iq  # integrity + vulnerability scan + SBOM
npx @hex-di/guard-validation run-oq  # functional test suite + coverage report
```

## Consequences

**Positive**:
- Practical qualification process for open-source libraries
- Spec-as-documentation approach provides continuously updated qualification evidence
- Automated verification is reproducible

**Negative**:
- Non-traditional approach may require justification during regulatory audits
- Periodic re-qualification on version upgrades adds maintenance overhead

**Trade-off accepted**: A risk-based approach is explicitly supported by GAMP 5 Section 10 and is more rigorous than a checkbox audit for open-source software whose code is fully inspectable.
