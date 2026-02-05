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

- [x] **API-01**: Type-safe override API using adapter objects (via `container.override(adapter).build()`)
- [x] **API-02**: Override builder pattern with fluent `.override(adapter)` method
- [x] **API-03**: Merge `createContainer` options into single object parameter
- [x] **API-04**: ~~Backward compatible overload~~ — REMOVED (clean break, no deprecation per project policy)
- [ ] **API-05**: Remove legacy type exports (`CaptiveDependencyErrorLegacy`, etc.)

### Performance

- [x] **PERF-01**: O(1) child container unregistration (Map instead of Array)
- [x] **PERF-02**: Configurable timestamp capture (disable in production)
- [x] **PERF-03**: Performance benchmarks for resolution, scopes, and disposal

### Testing

- [x] **TEST-01**: Comprehensive resolution hook tests (20+ tests)
- [x] **TEST-02**: Hook composition tests (10+ tests)
- [x] **TEST-03**: Inspector API tests (integrated, not plugin-based)
- [x] **TEST-04**: Tracer API tests (integrated, not plugin-based)

### Error Experience

- [x] **ERR-01**: Error messages include `suggestion` property with actionable guidance
- [x] **ERR-02**: Error messages include code examples for common mistakes
- [x] **ERR-03**: "Did you mean?" suggestions for mistyped port names

### Documentation

- [x] **DOC-01**: Architecture documentation (`runtime-architecture.md`)
- [x] **DOC-02**: Container lifecycle state machine diagram
- [x] **DOC-03**: `@typeParam` documentation for Container type
- [x] **DOC-04**: Design decisions documentation (branded types, phase-dependent resolution, etc.)

### Type Safety

- [x] **TYPE-01**: Compile-time circular dependency detection (type-level DFS)
- [x] **TYPE-02**: Move context variable helpers to `@hex-di/core` package

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

| Requirement | Phase | Status   |
| ----------- | ----- | -------- |
| QUAL-01     | 15    | Pending  |
| QUAL-02     | 15    | Pending  |
| QUAL-03     | 15    | Pending  |
| QUAL-04     | 15    | Pending  |
| QUAL-05     | 15    | Pending  |
| QUAL-06     | 15    | Pending  |
| API-01      | 17    | Complete |
| API-02      | 17    | Complete |
| API-03      | 17    | Complete |
| API-04      | 17    | Removed  |
| API-05      | 15    | Pending  |
| PERF-01     | 16    | Complete |
| PERF-02     | 16    | Complete |
| PERF-03     | 16    | Complete |
| TEST-01     | 18    | Complete |
| TEST-02     | 18    | Complete |
| TEST-03     | 18    | Complete |
| TEST-04     | 18    | Complete |
| ERR-01      | 19    | Complete |
| ERR-02      | 19    | Complete |
| ERR-03      | 19    | Complete |
| DOC-01      | 19    | Complete |
| DOC-02      | 19    | Complete |
| DOC-03      | 19    | Complete |
| DOC-04      | 19    | Complete |
| TYPE-01     | 17    | Complete |
| TYPE-02     | 17    | Complete |

**Coverage:**

- v5.0 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---

_Requirements defined: 2026-02-03_
_Last updated: 2026-02-05 (Phase 19 complete: ERR-01/02/03, DOC-01/02/03/04)_
