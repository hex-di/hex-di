# Requirements: HexDI v5.0

**Defined:** 2026-02-03
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v5.0 Requirements

Requirements for runtime package improvements (8.7/10 -> 9.5/10). Each maps to roadmap phases.

### Code Quality

- [ ] **QUAL-01**: Extract shared wrapper logic to `wrapper-utils.ts` (~200 LOC reduction)
- [ ] **QUAL-02**: Split `types.ts` (1,271 lines) into 6 files (<400 lines each)
- [ ] **QUAL-03**: Consolidate inspection code into core runtime (remove plugin indirection)
- [ ] **QUAL-04**: Consolidate tracing code into core runtime (remove plugin indirection)
- [ ] **QUAL-05**: Add explicit return types to internal functions
- [ ] **QUAL-06**: Remove HOOKS_ACCESS plugin system (tracing/inspection are core features)

### API Design

- [ ] **API-01**: Type-safe `withOverrides()` API using port objects as keys
- [ ] **API-02**: Override builder pattern with fluent `.override(adapter, config)` method
- [ ] **API-03**: Merge `createContainer` options into single object parameter
- [ ] **API-04**: Backward compatible overload for existing string-based overrides (deprecated)
- [ ] **API-05**: Remove legacy type exports (`CaptiveDependencyErrorLegacy`, etc.)

### Performance

- [ ] **PERF-01**: O(1) child container unregistration (Map instead of Array)
- [ ] **PERF-02**: Configurable timestamp capture (disable in production)
- [ ] **PERF-03**: Performance benchmarks for resolution, scopes, and disposal

### Testing

- [ ] **TEST-01**: Comprehensive resolution hook tests (20+ tests)
- [ ] **TEST-02**: Hook composition tests (10+ tests)
- [ ] **TEST-03**: Inspector API tests (integrated, not plugin-based)
- [ ] **TEST-04**: Tracer API tests (integrated, not plugin-based)

### Error Experience

- [ ] **ERR-01**: Error messages include `suggestion` property with actionable guidance
- [ ] **ERR-02**: Error messages include code examples for common mistakes
- [ ] **ERR-03**: "Did you mean?" suggestions for mistyped port names

### Documentation

- [ ] **DOC-01**: Architecture documentation (`runtime-architecture.md`)
- [ ] **DOC-02**: Container lifecycle state machine diagram
- [ ] **DOC-03**: `@typeParam` documentation for Container type
- [ ] **DOC-04**: Design decisions documentation (branded types, phase-dependent resolution, etc.)

### Type Safety

- [ ] **TYPE-01**: Compile-time circular dependency detection (type-level DFS)
- [ ] **TYPE-02**: Move context variable helpers to `@hex-di/core` or dedicated package

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

None for v5.0 - all improvements in scope.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                          | Reason                                           |
| -------------------------------- | ------------------------------------------------ |
| Decorator-based registration     | Optional future package, not core                |
| Convention-based auto-wiring     | Too implicit for core library philosophy         |
| Runtime override factory caching | Adds complexity, overrides should be lightweight |
| Async override factories         | Complicates override context lifecycle           |
| Plugin system for tracing        | Consolidating into core runtime (v5.0 decision)  |
| HOOKS_ACCESS symbol              | Removing plugin indirection (v5.0 decision)      |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| QUAL-01     | 15    | Pending |
| QUAL-02     | 15    | Pending |
| QUAL-03     | 15    | Pending |
| QUAL-04     | 15    | Pending |
| QUAL-05     | 15    | Pending |
| QUAL-06     | 15    | Pending |
| API-01      | 17    | Pending |
| API-02      | 17    | Pending |
| API-03      | 17    | Pending |
| API-04      | 17    | Pending |
| API-05      | 15    | Pending |
| PERF-01     | 16    | Pending |
| PERF-02     | 16    | Pending |
| PERF-03     | 16    | Pending |
| TEST-01     | 18    | Pending |
| TEST-02     | 18    | Pending |
| TEST-03     | 18    | Pending |
| TEST-04     | 18    | Pending |
| ERR-01      | 19    | Pending |
| ERR-02      | 19    | Pending |
| ERR-03      | 19    | Pending |
| DOC-01      | 19    | Pending |
| DOC-02      | 19    | Pending |
| DOC-03      | 19    | Pending |
| DOC-04      | 19    | Pending |
| TYPE-01     | 17    | Pending |
| TYPE-02     | 17    | Pending |

**Coverage:**

- v5.0 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---

_Requirements defined: 2026-02-03_
_Last updated: 2026-02-03 (traceability complete, plugin consolidation reflected)_
