# Phase 23: Core Tracing Package Foundation - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the `@hex-di/tracing` package with a complete tracing API: port definitions (TracerPort, SpanExporterPort, SpanProcessorPort), built-in adapters (NoOp, Memory, Console), W3C Trace Context propagation, and ID generation. Zero external dependencies. This phase delivers the foundation that all subsequent tracing phases build on.

Container instrumentation (Phase 24), OTel export (Phase 25), migration (Phase 26), and framework integrations (Phase 27) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Tracer API surface

- Claude's discretion on startSpan() vs callback-only -- choose based on OTel conventions and HexDI patterns
- Claude's discretion on attribute value types -- align with OTel AttributeValue spec as appropriate
- Claude's discretion on withAttributes() child tracer method -- decide based on API ergonomics
- Claude's discretion on port granularity (separate TracerPort/SpanProcessorPort/SpanExporterPort vs consolidated) -- decide based on how backend packages will compose
- Claude's discretion on span links support -- decide based on Phase 23 scope needs
- Claude's discretion on automatic exception capture in withSpan/withSpanAsync -- decide based on DX and OTel conventions
- Claude's discretion on SpanStatus model (two-value vs three-value) -- align with OTel compatibility
- Claude's discretion on SpanKind model (OTel vs DI-specific) -- balance backend compatibility with DI semantics

### Built-in adapter behavior

- Claude's discretion on ConsoleTracer output style (structured/indented vs single-line) -- optimize for dev readability
- Claude's discretion on MemoryTracer span structure (flat vs tree vs both) -- optimize for test ergonomics
- Claude's discretion on MemoryTracer max span limit -- decide based on practical test patterns
- Claude's discretion on ConsoleTracer minimum duration filter -- decide based on dev workflow needs

### ID generation & timing

- W3C exact format: 32-char hex trace IDs (16 bytes), 16-char hex span IDs (8 bytes) -- **locked decision**
- Claude's discretion on randomness source (crypto.getRandomValues vs Math.random fallback) -- decide based on target environment support
- Claude's discretion on timing source (performance.now vs Date.now vs both) -- align with OTel conventions
- Claude's discretion on injectable clock/ID gen vs MemoryTracer-internal -- decide based on test ergonomics vs API complexity

### W3C context API design

- Claude's discretion on carrier model (direct headers vs generic carrier) -- decide based on practical usage
- Claude's discretion on tracestate depth (parsed vs opaque passthrough) -- balance utility vs complexity
- Claude's discretion on Propagator port vs standalone functions -- decide based on Phase 23 scope
- Claude's discretion on header case sensitivity handling -- decide based on robustness

### Claude's Discretion

The user delegated nearly all implementation decisions to Claude. This gives maximum flexibility during research and planning. Key constraint: all choices should align with OTel conventions where practical, since Phase 25 will bridge to OTel. The only locked decision is W3C-format IDs (32-char trace, 16-char span).

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. The user trusts Claude to make good design decisions aligned with OTel conventions and HexDI's existing patterns.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

_Phase: 23-core-tracing-foundation_
_Context gathered: 2026-02-06_
