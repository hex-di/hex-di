# Requirements: HexDI

**Defined:** 2026-02-01
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v1.1 Requirements

Requirements for bug fix milestone. Each maps to roadmap phases.

### Build Validation

- [ ] **BUILD-01**: `buildGraph()` and `buildGraphFragment()` run `detectCaptiveAtRuntime()` unconditionally as defense-in-depth, not just when `depthLimitExceeded=true`

### Merge Operations

- [ ] **MERGE-01**: `UnifiedMergeInternals` type merges `parentProvides` from both graphs using union type, enabling override of ports from either parent after merge
- [ ] **MERGE-02**: Merge operations preserve `UnsafeDepthOverride` flag using OR semantics — if either graph has the flag, merged result has it

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Performance

- **PERF-01**: Document type complexity limits and when to split graphs
- **PERF-02**: Add optional MemoMap eviction policy for long-lived scopes

### Developer Experience

- **DX-01**: CLI tool to pretty-print type errors with suggested fixes
- **DX-02**: Better error messages for deeply nested generic type failures

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                | Reason                      |
| -------------------------------------- | --------------------------- |
| Type checking performance optimization | Fix correctness bugs first  |
| New validation features                | Focus on existing bug fixes |
| Test coverage gaps                     | Address after bugs fixed    |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| BUILD-01    | —     | Pending |
| MERGE-01    | —     | Pending |
| MERGE-02    | —     | Pending |

**Coverage:**

- v1.1 requirements: 3 total
- Mapped to phases: 0
- Unmapped: 3 (roadmap pending)

---

_Requirements defined: 2026-02-01_
_Last updated: 2026-02-01 after initial definition_
