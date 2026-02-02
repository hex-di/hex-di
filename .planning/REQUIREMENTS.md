# Requirements: HexDI v3.0

**Defined:** 2026-02-02
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v3.0 Requirements

Requirements for the unified Adapter API. Each maps to roadmap phases.

### Unified API

- [x] **API-01**: Single `createAdapter()` function accepts object config
- [x] **API-02**: `factory` property accepts sync or async factory function
- [x] **API-03**: `class` property accepts class constructor for class-based injection
- [x] **API-04**: Either `factory` or `class` required (mutually exclusive)
- [x] **API-05**: `requires` defaults to empty array when not specified
- [x] **API-06**: `lifetime` defaults to `'singleton'` when not specified
- [x] **API-07**: Auto-detect async from factory return type (no separate function)

### Async Lifetime Enforcement

- [x] **ASYNC-01**: Async factory with `lifetime: 'scoped'` produces compile error
- [x] **ASYNC-02**: Async factory with `lifetime: 'transient'` produces compile error
- [x] **ASYNC-03**: Async factory with `lifetime: 'singleton'` compiles successfully
- [x] **ASYNC-04**: Async factory with lifetime omitted compiles (defaults to singleton)
- [x] **ASYNC-05**: Error type includes helpful message and hint

### Class-Based Injection

- [x] **CLASS-01**: `class` property accepts constructor function
- [x] **CLASS-02**: Constructor params injected in `requires` array order
- [x] **CLASS-03**: Class-based adapter supports all lifetimes (sync instantiation)

### API Removal

- [ ] **REM-01**: Remove `createAsyncAdapter()` function
- [ ] **REM-02**: Remove `defineService()` function (all overloads)
- [ ] **REM-03**: Remove `defineAsyncService()` function
- [ ] **REM-04**: Remove `ServiceBuilder` class
- [ ] **REM-05**: Remove `fromClass()` function
- [ ] **REM-06**: Remove `createClassAdapter()` function

### Migration

- [ ] **MIG-01**: All existing tests migrated to new `createAdapter()` API
- [ ] **MIG-02**: Documentation updated with new API

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Enhanced Validation

- **VAL-01**: Runtime validation that class constructor arity matches requires length
- **VAL-02**: Warning when class has more constructor params than requires

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                             | Reason                                                                |
| ----------------------------------- | --------------------------------------------------------------------- |
| Constructor order type verification | TypeScript limitation - can't verify param types match requires order |
| Decorator-based injection           | Different paradigm, would be separate package                         |
| Named parameter injection           | Too implicit, requires order is explicit                              |
| Backward compatibility shims        | v3.0 is clean break                                                   |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status    |
| ----------- | ----- | --------- |
| API-01      | 9     | Delivered |
| API-02      | 9     | Delivered |
| API-03      | 9     | Delivered |
| API-04      | 9     | Delivered |
| API-05      | 9     | Delivered |
| API-06      | 9     | Delivered |
| API-07      | 9     | Delivered |
| ASYNC-01    | 10    | Delivered |
| ASYNC-02    | 10    | Delivered |
| ASYNC-03    | 10    | Delivered |
| ASYNC-04    | 10    | Delivered |
| ASYNC-05    | 10    | Delivered |
| CLASS-01    | 9     | Delivered |
| CLASS-02    | 9     | Delivered |
| CLASS-03    | 9     | Delivered |
| REM-01      | 11    | Pending   |
| REM-02      | 11    | Pending   |
| REM-03      | 11    | Pending   |
| REM-04      | 11    | Pending   |
| REM-05      | 11    | Pending   |
| REM-06      | 11    | Pending   |
| MIG-01      | 12    | Pending   |
| MIG-02      | 12    | Pending   |

**Coverage:**

- v3.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---

_Requirements defined: 2026-02-02_
_Last updated: 2026-02-02 Phase 10 delivered (15/23 requirements)_
