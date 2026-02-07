# Phase 23: Core Tracing Package Foundation

**Goal:** Developers can import @hex-di/tracing and use a complete tracing API with port definitions, built-in adapters (NoOp, Memory, Console), W3C Trace Context propagation, and ID generation -- all with zero external dependencies.

## Plans

| Plan  | Description                         | Wave | Files                                             | Status  |
| ----- | ----------------------------------- | ---- | ------------------------------------------------- | ------- |
| 23-01 | Package Setup and Port Definitions  | 1    | package.json, ports/\*.ts [CREATE]                | PLANNED |
| 23-02 | Core Types and Interfaces           | 1    | types/\*.ts [CREATE]                              | PLANNED |
| 23-03 | NoOp Adapter Implementation         | 2    | adapters/noop/\*.ts [CREATE]                      | PLANNED |
| 23-04 | Memory Adapter Implementation       | 2    | adapters/memory/\*.ts [CREATE]                    | PLANNED |
| 23-05 | Console Adapter Implementation      | 2    | adapters/console/\*.ts [CREATE]                   | PLANNED |
| 23-06 | W3C Trace Context Propagation       | 3    | context/propagation.ts, context/parse.ts [CREATE] | PLANNED |
| 23-07 | ID Generation and Utilities         | 3    | utils/\*.ts [CREATE]                              | PLANNED |
| 23-08 | Integration Tests and Documentation | 4    | tests/\*.test.ts, index.ts [CREATE]               | PLANNED |

## Execution Strategy

### Wave 1 (Parallel)

- **23-01**: Set up package structure with proper configuration and port definitions
- **23-02**: Define all core types and interfaces for tracing system

Both plans establish the foundation types and can execute in parallel.

### Wave 2 (Parallel)

- **23-03**: Implement NoOpTracer with zero overhead
- **23-04**: Implement MemoryTracer for testing
- **23-05**: Implement ConsoleTracer for development

All three adapter implementations can proceed in parallel once types are defined.

### Wave 3 (Parallel)

- **23-06**: Implement W3C Trace Context header parsing and injection
- **23-07**: Implement ID generation and utility functions

Context propagation and utilities can be developed independently.

### Wave 4 (Sequential)

- **23-08**: Write comprehensive tests and export public API

Final integration requires all components to be complete.

## Requirements Coverage

### Core Types and Ports

- **CORE-01**: Tracer port with all methods ✓ Plan 23-01
- **CORE-02**: Span interface ✓ Plan 23-02
- **CORE-03**: SpanContext type ✓ Plan 23-02
- **CORE-04**: SpanData type ✓ Plan 23-02
- **CORE-05**: SpanExporter port ✓ Plan 23-01
- **CORE-06**: SpanProcessor port ✓ Plan 23-01
- **CORE-07**: AttributeValue type with guards ✓ Plan 23-02
- **CORE-08**: SpanKind type ✓ Plan 23-02
- **CORE-09**: SpanStatus type ✓ Plan 23-02
- **CORE-10**: Port definitions via createPort() ✓ Plan 23-01

### Built-in Adapters

- **ADPT-01**: NoOpTracer adapter ✓ Plan 23-03
- **ADPT-02**: MemoryTracer adapter ✓ Plan 23-04
- **ADPT-03**: ConsoleTracer adapter ✓ Plan 23-05
- **ADPT-04**: Adapter registration ✓ Plans 23-03, 23-04, 23-05

### Context Propagation

- **CTX-01**: W3C traceparent parsing ✓ Plan 23-06
- **CTX-02**: W3C traceparent serialization ✓ Plan 23-06
- **CTX-03**: tracestate parsing/serialization ✓ Plan 23-06
- **CTX-04**: extractTraceContext function ✓ Plan 23-06
- **CTX-05**: injectTraceContext function ✓ Plan 23-06
- **CTX-06**: Trace/span ID generation ✓ Plan 23-07
- **CTX-07**: Correlation ID propagation ✓ Plan 23-07

### Performance and Quality

- **PERF-03**: Zero external dependencies ✓ All plans
- **PERF-04**: JSDoc documentation ✓ All plans

## Total Deliverables

- New package: @hex-di/tracing
- New files: ~25
- Estimated code: ~2500 lines
- Test coverage: 100% of public API

## Success Metrics

1. ✅ All port types exported and usable with createPort()
2. ✅ NoOpTracer has zero allocations and timing calls
3. ✅ MemoryTracer collects spans for test assertions
4. ✅ ConsoleTracer provides readable development output
5. ✅ W3C Trace Context headers correctly parsed and injected
6. ✅ Zero external dependencies in package.json

## Dependencies

- Phase 23 has no dependencies (first phase of v7.0)
- Required for Phase 24 (Container Instrumentation)
