# Phase 18: Testing - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive test coverage for hook APIs and core tracing/inspection APIs, documenting expected behavior of the consolidated runtime from Phases 15-17. Resolution hooks, hook composition, inspector API, and tracer API. No new features or API changes.

</domain>

<decisions>
## Implementation Decisions

### Hook test scenarios

- Test both error propagation chain AND cleanup guarantees when hooks throw
- beforeResolve throw: error bubbles up, subsequent hooks don't fire, container remains usable
- Include scoped container interactions: hooks tested across parent/child containers, override containers, and disposal
- Parity tests: hooks added via addHook at runtime must behave identically to hooks passed at container creation time
- Explicit tests proving both registration paths produce the same behavior

### Async hooks

- Claude's Discretion: whether to include timeout behavior tests (based on current API surface)

### Composition & ordering

- Strict FIFO ordering guarantee: registration order = execution order, this is a documented contract
- Full lifecycle tests: beforeResolve and afterResolve hooks tested together on same resolution, verifying correct sequence, shared context, and cross-phase error handling
- Mid-resolution edge case: test behavior when a hook calls removeHook on another hook during active resolution

### Hook chaining

- Claude's Discretion: whether hooks can modify resolution results (determine from current API design and test accordingly)

### Inspector coverage

- All lifecycle stages: inspect returns accurate data pre-resolve, mid-resolve, and post-dispose
- Cross-scope: inspector correctly reports across container hierarchies (parent/child, overrides)

### Tracer coverage

- Full filter coverage: test all supported filter dimensions (by port, by adapter, by time, by container)
- Overhead test: verify disabled tracing adds negligible cost to resolution
- Cross-scope: tracer correctly reports resolution across parent/child container boundaries

### Claude's Discretion

- Async hook timeout testing (determine if API supports/warrants it)
- Hook result chaining model (determine from existing API whether hooks mutate or observe)
- Test file organization (one file per API vs one file per concern — pick what fits the scenario counts)
- Test naming convention (match existing test conventions in the codebase)
- Whether existing test files need reorganization (read existing tests, decide if overlap warrants restructuring)

</decisions>

<specifics>
## Specific Ideas

- Use real adapters and ports (createPort/createAdapter) to create realistic dependency graphs — not minimal test doubles
- Reorganize existing test files in packages/runtime/tests if they overlap with Phase 18 coverage
- The 20+ resolution hook scenario target from success criteria should span: error cases, async, scoped containers, runtime-added hooks, and parity tests
- The 10+ composition scenario target should span: FIFO ordering, lifecycle sequencing, mid-resolution removal, and cross-event interactions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 18-testing_
_Context gathered: 2026-02-05_
