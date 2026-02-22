# ADR-GD-011: Separate `@hex-di/guard-testing` package

> **Status:** Accepted
> **ADR Number:** 011 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Testing utilities (matchers, fixtures, `MemoryAuditTrail`) are only needed in development and test environments. Bundling them in the main package increases production bundle size and could introduce dev-only dependencies into production.

## Decision

Testing utilities live in a separate `@hex-di/guard-testing` package, following the `@hex-di/result-testing` pattern. The main `@hex-di/guard` package has no testing dependencies.

```ts
// In test files
import { createMemoryAuditTrail, expectAuditEntry } from "@hex-di/guard-testing";
// Not available in the production @hex-di/guard bundle
```

## Consequences

**Positive**:
- Production bundle stays lean
- Testing utilities can have dev-only dependencies (vitest)
- Follows the established `@hex-di/result-testing` pattern

**Negative**:
- Additional package to install in test environments
- Users must remember to add `@hex-di/guard-testing` to devDependencies

**Trade-off accepted**: Bundle size and production dependency cleanliness outweigh the minor inconvenience of a separate test package install.
