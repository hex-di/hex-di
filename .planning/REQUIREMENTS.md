# Requirements: HexDI v1.2

**Defined:** 2026-02-01
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v1.2 Requirements

Requirements for Developer Experience milestone. Each maps to roadmap phases.

### Scoped Overrides

- [ ] **SCOPE-01**: Container supports `withOverrides()` for temporary override contexts
- [ ] **SCOPE-02**: `withOverrides()` accepts port-to-adapter map for type-safe overrides
- [ ] **SCOPE-03**: Override context isolates instance memoization from parent container
- [ ] **SCOPE-04**: Lifetime type includes `'request'` as first-class option
- [ ] **SCOPE-05**: Request-scoped instances are isolated per request context
- [ ] **SCOPE-06**: `createRequestScope()` creates request-bound resolution context

### API Ergonomics

- [ ] **API-01**: `defineService()` supports builder pattern with method chaining
- [ ] **API-02**: Builder supports `.singleton()`, `.scoped()`, `.transient()` lifetime methods
- [ ] **API-03**: Builder supports `.requires(...ports)` for dependency declaration
- [ ] **API-04**: Builder supports `.factory(fn)` to complete service definition
- [ ] **API-05**: `fromClass()` helper creates adapter from class constructor
- [ ] **API-06**: `fromClass()` infers service type from class instance type

### Port System

- [ ] **PORT-01**: `createInboundPort()` factory creates ports with `"inbound"` direction
- [ ] **PORT-02**: `createOutboundPort()` factory creates ports with `"outbound"` direction
- [ ] **PORT-03**: Port metadata supports description, category, and tags
- [ ] **PORT-04**: `isDirectedPort()` type guard distinguishes directed from legacy ports
- [ ] **PORT-05**: Directed ports maintain backward compatibility with existing `Port` type

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Testing Enhancements

- **TEST-01**: `TestContainer` with built-in override/restore methods
- **TEST-02**: `overrideWithMock()` creates mock implementations
- **TEST-03**: `expectGraph()` DSL for declarative graph assertions

### Documentation

- **DOCS-01**: Interactive examples in documentation
- **DOCS-02**: Port direction visualization in dependency graphs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                | Reason                                                   |
| -------------------------------------- | -------------------------------------------------------- |
| Decorator-based registration           | Optional future package (`@hex-di/decorators`), not core |
| Convention-based auto-wiring           | Too implicit for core library philosophy                 |
| Context propagation through resolution | Advanced feature, defer to v1.3                          |
| Type-level port dependency validation  | Complex, needs more design work                          |
| JIT compilation for performance        | Optimization milestone, not DX                           |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| SCOPE-01    | Phase 3 | Pending |
| SCOPE-02    | Phase 3 | Pending |
| SCOPE-03    | Phase 3 | Pending |
| SCOPE-04    | Phase 3 | Pending |
| SCOPE-05    | Phase 3 | Pending |
| SCOPE-06    | Phase 3 | Pending |
| API-01      | Phase 4 | Pending |
| API-02      | Phase 4 | Pending |
| API-03      | Phase 4 | Pending |
| API-04      | Phase 4 | Pending |
| API-05      | Phase 4 | Pending |
| API-06      | Phase 4 | Pending |
| PORT-01     | Phase 5 | Pending |
| PORT-02     | Phase 5 | Pending |
| PORT-03     | Phase 5 | Pending |
| PORT-04     | Phase 5 | Pending |
| PORT-05     | Phase 5 | Pending |

**Coverage:**

- v1.2 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---

_Requirements defined: 2026-02-01_
_Last updated: 2026-02-01 after initial definition_
