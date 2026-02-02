# Requirements: HexDI v3.0

**Defined:** 2026-02-02
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v3.0 Requirements

Requirements for the unified Adapter API. Each maps to roadmap phases.

### Unified API

- [ ] **API-01**: Single `createAdapter()` function accepts object config
- [ ] **API-02**: `factory` property accepts sync or async factory function
- [ ] **API-03**: `class` property accepts class constructor for class-based injection
- [ ] **API-04**: Either `factory` or `class` required (mutually exclusive)
- [ ] **API-05**: `requires` defaults to empty array when not specified
- [ ] **API-06**: `lifetime` defaults to `'singleton'` when not specified
- [ ] **API-07**: Auto-detect async from factory return type (no separate function)

### Async Lifetime Enforcement

- [ ] **ASYNC-01**: Async factory with `lifetime: 'scoped'` produces compile error
- [ ] **ASYNC-02**: Async factory with `lifetime: 'transient'` produces compile error
- [ ] **ASYNC-03**: Async factory with `lifetime: 'singleton'` compiles successfully
- [ ] **ASYNC-04**: Async factory with lifetime omitted compiles (defaults to singleton)
- [ ] **ASYNC-05**: Error type includes helpful message and hint

### Class-Based Injection

- [ ] **CLASS-01**: `class` property accepts constructor function
- [ ] **CLASS-02**: Constructor params injected in `requires` array order
- [ ] **CLASS-03**: Class-based adapter supports all lifetimes (sync instantiation)

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

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| API-01      | TBD   | Pending |
| API-02      | TBD   | Pending |
| API-03      | TBD   | Pending |
| API-04      | TBD   | Pending |
| API-05      | TBD   | Pending |
| API-06      | TBD   | Pending |
| API-07      | TBD   | Pending |
| ASYNC-01    | TBD   | Pending |
| ASYNC-02    | TBD   | Pending |
| ASYNC-03    | TBD   | Pending |
| ASYNC-04    | TBD   | Pending |
| ASYNC-05    | TBD   | Pending |
| CLASS-01    | TBD   | Pending |
| CLASS-02    | TBD   | Pending |
| CLASS-03    | TBD   | Pending |
| REM-01      | TBD   | Pending |
| REM-02      | TBD   | Pending |
| REM-03      | TBD   | Pending |
| REM-04      | TBD   | Pending |
| REM-05      | TBD   | Pending |
| REM-06      | TBD   | Pending |
| MIG-01      | TBD   | Pending |
| MIG-02      | TBD   | Pending |

**Coverage:**

- v3.0 requirements: 23 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 23

---

_Requirements defined: 2026-02-02_
_Last updated: 2026-02-02 after initial definition_
