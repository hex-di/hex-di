# ADR-CK-008: Progressive API Disclosure

## Status

Accepted

## Context

`@hex-di/clock` exports 80+ symbols from its main entry point. This is a consequence of the library's design-for-completeness approach: it serves both simple use cases (get the current time, measure a duration) and complex regulated environments (GxP audit trails, electronic signatures, record integrity verification).

Competitors like `java.time.Clock` and `System.TimeProvider` export a small, focused API surface. New consumers of those libraries encounter 3-5 types and immediately understand the core abstraction. `@hex-di/clock` requires consumers to navigate 6 ports, 30+ factory functions, and 8 error types before finding the 3 they actually need.

The risk is that `@hex-di/clock` appears over-engineered to its target audience (TypeScript application developers), reducing adoption before consumers experience the benefits of injectable, testable time.

The question was whether to: (a) split the library into multiple packages (`@hex-di/clock`, `@hex-di/clock-gxp`, `@hex-di/clock-timers`), (b) add multiple entry points (`@hex-di/clock/core`, `@hex-di/clock/gxp`), or (c) classify the single flat API surface into documented tiers without changing the package structure.

## Decision

Classify all exports into three progressive tiers — Essential (Tier 1), Extended (Tier 2), and GxP & Advanced (Tier 3) — documented in the API Reference (§8.0) and Quick Start (§1.5). The package structure and entry points remain unchanged.

**Tier 1 — Essential (12 exports):** `ClockPort`, `SequenceGeneratorPort`, branded timestamp types, `SystemClockAdapter`, `SystemSequenceGeneratorAdapter`, core errors, `createVirtualClock`, `createVirtualSequenceGenerator`. This is the "30-second setup" surface.

**Tier 2 — Extended (21 exports):** Timer scheduling, cached clock, platform-specific adapters (edge runtime, host bridge), and their testing counterparts.

**Tier 3 — GxP & Advanced (38 exports):** Diagnostics, audit trail timestamps, electronic signatures, record integrity, deserialization, retention policies, and compliance utilities.

## Rationale

### Why not multiple packages?

Splitting into `@hex-di/clock` and `@hex-di/clock-gxp` creates a dependency management problem. GxP consumers need both packages with version-synchronized releases. The overhead of coordinating releases, managing peer dependency ranges, and publishing two packages exceeds the benefit of a smaller default install size, especially since the library has zero runtime dependencies and the GxP code is tree-shakeable.

### Why not multiple entry points?

Adding `@hex-di/clock/core` and `@hex-di/clock/gxp` (beyond the existing `@hex-di/clock/testing`) is a viable alternative but introduces a migration tax. Consumers who start with `@hex-di/clock/core` and later need GxP features must change import paths throughout their codebase. A single `@hex-di/clock` entry point with documented tiers avoids this.

### Why documentation-level tiers?

Tiers are a discovery and onboarding tool, not an access control mechanism. Any consumer can import any export. The tiers guide _where to start_ and _what to learn next_, not _what you're allowed to use_. This matches the approach of `@tanstack/react-query` (simple `useQuery` → complex `QueryClient` configuration) and `zod` (simple `z.string()` → complex `z.discriminatedUnion()`).

### Tier boundary rules

Tier 1 exports never reference Tier 2/3 types in their signatures. A consumer who only reads Tier 1 documentation never encounters `CachedClockPort`, `TemporalContextFactory`, or `SignatureValidationError`. This is enforced by the port design: `ClockPort` has three methods returning branded `number` subtypes — no downstream types leak into the essential surface.

## Consequences

- **Positive:** New consumers encounter a 12-export surface comparable to `java.time.Clock` (1 interface, 2 implementations, 3 factory methods). The full 80+ API surface is available but not in their face.
- **Positive:** Quick Start (§1.5) provides copy-paste examples for the 4 most common use cases in under 50 lines of code.
- **Positive:** No package restructuring, no entry point changes, no breaking changes.
- **Negative:** Tiers are advisory. Nothing prevents a consumer from importing Tier 3 exports without understanding Tier 1. IDE auto-import will suggest all 80+ symbols.
- **Negative:** The tier classification must be maintained as exports are added. A new export without a tier assignment is a documentation debt.
