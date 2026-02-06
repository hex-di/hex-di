# Phase 24: Container Instrumentation and Context Propagation - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Instrument containers with tracing hooks so that every resolution creates spans with parent-child relationships. Covers single-container instrumentation, tree-wide instrumentation with live subscription, span context propagation across container boundaries, and cleanup lifecycle. Does NOT cover export backends (Phase 25), framework integrations (Phase 27), or removal of old tracing system (Phase 26).

</domain>

<decisions>
## Implementation Decisions

### Filtering and options

- portFilter accepts a union type: either a predicate function `(portName: string) => boolean` OR a declarative `{ include?: string[], exclude?: string[] }` object
- Cached resolutions (singletons already resolved) are traced by default with `hex-di.resolution.cached=true`, but suppressed via `traceCachedResolutions: boolean` option (default: true)
- minDurationMs filtering: Claude's discretion on whether to filter at span-end or export time

### Span attributes and naming

- Span names use a concise format — Claude decides the exact pattern based on OTel best practices and tracing UI compatibility (Jaeger, Zipkin, Grafana Tempo)
- All resolution context captured as rich attributes: container name, scope ID, port name, adapter name, lifetime, cached status
- Attributes follow OTel semantic conventions with `hex-di.*` namespace (as defined in INST-06)
- additionalAttributes shape: Claude's discretion, aligned with OTel attribute conventions (likely flat `Record<string, AttributeValue>`)

### Cleanup and lifecycle

- Double-instrumentation: replace previous (auto-cleanup old hooks, install new ones via internal WeakMap tracking) — consistent with hex-di's adapter registry replace-on-conflict pattern
- instrumentContainerTree uses live subscription: auto-instruments new child containers added after the initial call, cleanup removes the subscription
- Full tree cleanup: calling cleanup on instrumentContainerTree removes hooks from ALL containers (root + every child) and stops the subscription
- Cleanup function idempotency: Claude's discretion, consistent with existing disposal patterns in hex-di

### Error recording

- Resolution errors recorded as OTel-convention span events ('exception' event) with status=ERROR
- Error detail depth is configurable: default captures status + message, `includeStackTrace: true` option adds full stack traces
- Error propagation in dependency chains: Claude's discretion (whether parent spans reflect child failures)
- Async rejection handling: Claude's discretion, ensuring consistent treatment regardless of sync/async

### Claude's Discretion

- Default values for traceSyncResolutions, traceAsyncResolutions toggles
- minDurationMs filtering strategy (span-end vs export-time)
- Exact span name format (following OTel best practices)
- additionalAttributes type shape
- Cleanup idempotency behavior
- Error cascade behavior in dependency chains
- Async vs sync error parity

</decisions>

<specifics>
## Specific Ideas

- User wants maximum resolution context visible: container, scope, port, and adapter information must all be accessible per span
- Live subscription for tree instrumentation was explicitly preferred over snapshot-only — dynamic container hierarchies should be fully covered
- Architecture review confirmed replace-over-throw for double-instrumentation, aligned with hex-di's existing adapter registry pattern and cross-cutting infrastructure philosophy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 24-container-instrumentation_
_Context gathered: 2026-02-06_
