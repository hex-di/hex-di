# Phase 12: API Cleanup - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove deprecated GraphBuilder methods (`provideAsync`, `provideFirstError`, `provideUnchecked`, `mergeWith`) and rename `withUnsafeDepthOverride()` to `withExtendedDepth()`. The unified `provide()` method auto-detects async via type-level Promise detection.

</domain>

<decisions>
## Implementation Decisions

### Migration approach

- Remove methods first, then fix compile errors in tests
- Clean removal — no re-exports with deprecation messages, standard TS "not exported" error is sufficient
- Direct rename for `withUnsafeDepthOverride` → `withExtendedDepth` (no alias period)
- Organize test updates by package (@hex-di/graph first, then other packages)

### Error messaging

- Standard TypeScript errors are sufficient
- No custom error types for removed methods — "Module has no exported member" is clear

### Async auto-detection

- Use `Awaited<T>` pattern to catch all promise-like types (thenables), not just native Promise
- Async detection applies to class-based adapters too (detect from constructor return type)

### Claude's Discretion

- Union types including Promise — decide based on type safety
- Runtime validation of async factories
- Async detection edge cases and error message wording

</decisions>

<specifics>
## Specific Ideas

- Async detection already implemented via `IsAsyncFactory<T>` in Phase 10 — this phase leverages that
- The spec in docs/improvements/graph-builder.md has detailed type definitions to reference

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 12-api-cleanup_
_Context gathered: 2026-02-02_
