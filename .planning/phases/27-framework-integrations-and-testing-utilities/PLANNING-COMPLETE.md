# Phase 27: Framework Integrations and Testing Utilities - Planning Complete

**Planned:** 2026-02-06
**Plans:** 5
**Waves:** 4

## Summary

Phase 27 completes the v7.0 Distributed Tracing milestone by adding first-class tracing support to framework integrations and providing test utilities for span verification.

## Plans Created

### Wave 1 (Parallel Execution)

- **27-01**: Test Utilities Foundation (TEST-02, TEST-03)
  - Create assertion helpers and span matchers
  - Pure functions for span verification
  - Tree-shakeable testing exports

- **27-02**: Hono Tracing Middleware (FRMW-01, FRMW-02)
  - W3C Trace Context extraction/injection
  - Configurable middleware with options
  - Error handling and span lifecycle

### Wave 2

- **27-03**: React Tracing Provider and Hooks (FRMW-03..06)
  - TracingProvider component
  - useTracer, useSpan, useTracedCallback hooks
  - React Context integration

### Wave 3

- **27-04**: Performance Benchmarks (PERF-01, PERF-02)
  - NoOp overhead < 5% verification
  - Memory overhead < 10% verification
  - Vitest bench configuration

### Wave 4

- **27-05**: Documentation and Final Integration
  - Complete documentation updates
  - Example integrations
  - Final requirements verification

## Requirements Coverage

All 12 requirements addressed:

- FRMW-01..06: Framework integration (Hono, React)
- TEST-01..04: Testing utilities (TEST-01, TEST-04 already complete from Phase 23)
- PERF-01..02: Performance benchmarks
- PERF-05: Code quality (no any, no casts, no eslint-disable)

## Execution Strategy

1. **Wave 1**: Test utilities and Hono middleware can be developed in parallel
2. **Wave 2**: React integration builds on established patterns
3. **Wave 3**: Benchmarks depend on test utilities for setup
4. **Wave 4**: Documentation and verification after all implementation

## Key Decisions

- Test utilities in @hex-di/tracing/testing subpath export
- Follow existing middleware/provider patterns from integrations
- Use Vitest bench for performance verification
- Pure functions for all test utilities
- W3C Trace Context for HTTP propagation

## Risk Mitigation

- Using established patterns reduces implementation risk
- TEST-01 and TEST-04 already complete reduces scope
- Parallel wave 1 allows faster iteration
- Benchmarks in wave 3 allow early performance validation

Ready for execution with `gsd:execute-phase`.
