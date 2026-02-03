# Requirements: HexDI v5.0

**Defined:** 2026-02-03
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v5.0 Requirements

Requirements for runtime package improvements (8.7/10 → 9.5/10). Each maps to roadmap phases.

### Code Quality

- [ ] **QUAL-01**: Extract shared wrapper logic to `wrapper-utils.ts` (~200 LOC reduction)
- [ ] **QUAL-02**: Split `types.ts` (1,271 lines) into 6 files (<400 lines each)
- [ ] **QUAL-03**: Consolidate inspector exports to single `createInspector` function
- [ ] **QUAL-04**: Split `inspection/helpers.ts` (546 lines) into focused modules
- [ ] **QUAL-05**: Add explicit return types to internal functions

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
- [ ] **TEST-03**: Plugin system tests for HOOKS_ACCESS (15+ tests)
- [ ] **TEST-04**: Inspector API tests
- [ ] **TEST-05**: Tracer API tests

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

None for v5.0 — all 20 improvements in scope.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                          | Reason                                           |
| -------------------------------- | ------------------------------------------------ |
| Decorator-based registration     | Optional future package, not core                |
| Convention-based auto-wiring     | Too implicit for core library philosophy         |
| Runtime override factory caching | Adds complexity, overrides should be lightweight |
| Async override factories         | Complicates override context lifecycle           |
| Mutable hook lists after sealing | Violates hook immutability guarantee             |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| QUAL-01     | TBD   | Pending |
| QUAL-02     | TBD   | Pending |
| QUAL-03     | TBD   | Pending |
| QUAL-04     | TBD   | Pending |
| QUAL-05     | TBD   | Pending |
| API-01      | TBD   | Pending |
| API-02      | TBD   | Pending |
| API-03      | TBD   | Pending |
| API-04      | TBD   | Pending |
| API-05      | TBD   | Pending |
| PERF-01     | TBD   | Pending |
| PERF-02     | TBD   | Pending |
| PERF-03     | TBD   | Pending |
| TEST-01     | TBD   | Pending |
| TEST-02     | TBD   | Pending |
| TEST-03     | TBD   | Pending |
| TEST-04     | TBD   | Pending |
| TEST-05     | TBD   | Pending |
| ERR-01      | TBD   | Pending |
| ERR-02      | TBD   | Pending |
| ERR-03      | TBD   | Pending |
| DOC-01      | TBD   | Pending |
| DOC-02      | TBD   | Pending |
| DOC-03      | TBD   | Pending |
| DOC-04      | TBD   | Pending |
| TYPE-01     | TBD   | Pending |
| TYPE-02     | TBD   | Pending |

**Coverage:**

- v5.0 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27 ⚠️

---

_Requirements defined: 2026-02-03_
_Last updated: 2026-02-03 after initial definition_
