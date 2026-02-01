# Roadmap: HexDI v1.1 Bug Fixes

## Overview

Fix 3 critical bugs in the graph builder type-state machine: forward reference validation gap in build operations, and two merge type issues that lose type information during graph composition.

## Phases

**Phase Numbering:**

- Integer phases (1, 2): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Build Validation** - Add defense-in-depth runtime captive detection
- [ ] **Phase 2: Merge Type Fixes** - Preserve parentProvides and UnsafeDepthOverride during merges

## Phase Details

### Phase 1: Build Validation

**Goal**: Runtime captive detection runs unconditionally as defense-in-depth for all graph builds

**Depends on**: Nothing (first phase)

**Requirements**: BUILD-01

**Success Criteria** (what must be TRUE):

1. `buildGraph()` calls `detectCaptiveAtRuntime()` unconditionally, not just when `depthLimitExceeded=true`
2. `buildGraphFragment()` calls `detectCaptiveAtRuntime()` unconditionally
3. Runtime validation catches forward references that escape compile-time detection
4. Type-level validation remains primary defense, runtime acts as safety net

**Plans**: 1 plan

Plans:

- [x] 01-01-PLAN.md — Verification of BUILD-01

### Phase 2: Merge Type Fixes

**Goal**: Graph merge operations preserve all type-level metadata from both input graphs

**Depends on**: Nothing (independent of Phase 1)

**Requirements**: MERGE-01, MERGE-02

**Success Criteria** (what must be TRUE):

1. `UnifiedMergeInternals` type merges `parentProvides` from both graphs using union type
2. After merge, ports from either parent graph can be overridden
3. `UnsafeDepthOverride` flag preserved using OR semantics (flag present if either input has it)
4. Existing test files pass: `merge-parent-provides.test-d.ts` and `merge-unsafe-override-preservation.test-d.ts`

**Plans**: 1 plan

Plans:

- [ ] 02-01-PLAN.md — Verification of MERGE-01 and MERGE-02

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase               | Plans Complete | Status      | Completed  |
| ------------------- | -------------- | ----------- | ---------- |
| 1. Build Validation | 1/1            | Complete    | 2026-02-01 |
| 2. Merge Type Fixes | 0/1            | Not started | -          |
