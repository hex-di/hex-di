# Roadmap: HexDI

## Milestones

- v1.1 Bugfix Verification - Phases 1-2 (shipped 2026-02-01)
- v1.2 DX Improvements - Phases 3-5 (shipped 2026-02-01)
- v2.0 Unified Port API - Phases 6-8 (shipped 2026-02-02)
- v3.0 Unified Adapter API - Phases 9-11 (shipped 2026-02-02)
- v4.0 Runtime API Simplification - Phases 12-14 (shipped 2026-02-03)
- v5.0 Runtime Package Improvements - Phases 15-19 (shipped 2026-02-05)
- v6.0 Monorepo Reorganization - Phases 20-22 (in progress)

## Phases

<details>
<summary>v1.1 Bugfix Verification (Phases 1-2) - SHIPPED 2026-02-01</summary>

Phases 1-2: Verification of merge operation bugs and runtime captive detection.

</details>

<details>
<summary>v1.2 DX Improvements (Phases 3-5) - SHIPPED 2026-02-01</summary>

Phases 3-5: Scoped overrides, enhanced defineService, port directions and metadata.

</details>

<details>
<summary>v2.0 Unified Port API (Phases 6-8) - SHIPPED 2026-02-02</summary>

Phases 6-8: Unified createPort(), InboundPorts/OutboundPorts utilities, graph inspection filtering.

</details>

<details>
<summary>v3.0 Unified Adapter API (Phases 9-11) - SHIPPED 2026-02-02</summary>

Phases 9-11: Unified createAdapter(), auto-detect async, compile-time async lifetime enforcement.

</details>

<details>
<summary>v4.0 Runtime API Simplification (Phases 12-14) - SHIPPED 2026-02-03</summary>

Phases 12-14: Unified provide(), merge() safety, disposal lifecycle, GraphSummary.

</details>

<details>
<summary>v5.0 Runtime Package Improvements (Phases 15-19) - SHIPPED 2026-02-05</summary>

Phases 15-19: Type file split, tracing/inspection consolidation, override builder, performance benchmarks, documentation.

</details>

### v6.0 Monorepo Reorganization (In Progress)

**Milestone Goal:** Restructure the monorepo to cleanly separate core packages, integrations, tooling, and higher-level libraries -- preparing for store, saga, and query libraries.

**Phase Numbering:**

- Integer phases (20, 21, 22): Planned milestone work
- Decimal phases (20.1, 20.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 20: Integration Migration** - Create new directory structure, move react and hono integrations, update workspace and build configs
- [ ] **Phase 21: Tooling & Library Migration** - Move testing, visualization, and graph-viz to tooling; move flow packages to libs
- [ ] **Phase 22: Verification & References** - Full build verification, example and website reference updates

## Phase Details

### Phase 20: Integration Migration

**Goal**: Integrations (react, hono) live in their own top-level directory, workspace recognizes the new structure, and the full build pipeline passes
**Depends on**: Nothing (first phase of v6.0)
**Requirements**: MIG-01, MIG-02, MIG-03, CFG-01, CFG-02, CFG-03, CFG-04, CFG-05
**Plans:** 2 plans

Plans:

- [x] 20-01-PLAN.md -- Move react and hono to integrations/, update pnpm-workspace.yaml
- [x] 20-02-PLAN.md -- Update root configs (vitest, eslint, example tsconfigs), full pipeline verification

### Phase 21: Tooling & Library Migration

**Goal**: All remaining packages are in their target locations -- tooling packages under `tooling/`, flow packages under `libs/flow/` -- and the full build pipeline passes
**Depends on**: Phase 20
**Requirements**: MIG-04, MIG-05, MIG-06, MIG-07, MIG-08
**Success Criteria** (what must be TRUE):

1. `tooling/testing`, `tooling/visualization`, and `tooling/graph-viz` directories exist with their full package contents; corresponding `packages/` directories no longer exist
2. `libs/flow/core` and `libs/flow/react` directories exist with their full package contents; `packages/flow` and `packages/flow-react` no longer exist
3. All inter-package workspace dependencies (`workspace:*` protocol) resolve correctly across the new paths
4. `pnpm install && pnpm build && pnpm typecheck && pnpm test && pnpm lint` all pass

**Plans:** 2 plans

Plans:

- [ ] 21-01-PLAN.md — Move all packages to new locations with git mv, verify workspace recognition
- [ ] 21-02-PLAN.md — Update root configs and package metadata, full pipeline verification

### Phase 22: Verification & References

**Goal**: Examples, website, and all workspace consumers work correctly with the reorganized monorepo; full verification confirms zero regressions
**Depends on**: Phase 21
**Requirements**: VER-01, VER-02, VER-03, VER-04, VER-05, REF-01, REF-02, REF-03
**Success Criteria** (what must be TRUE):

1. hono-todo example builds and its workspace dependencies resolve to the new `integrations/hono` location
2. react-showcase example builds and its workspace dependencies resolve to the new `integrations/react` location
3. Website workspace configuration resolves correctly
4. `pnpm test` passes with 1,816+ tests across all packages
5. `pnpm build && pnpm typecheck && pnpm lint` all pass cleanly (no warnings, no errors)
   **Plans**: TBD

Plans:

- [ ] 22-01: Update example and website workspace references
- [ ] 22-02: Full verification sweep and fix any remaining issues

## Progress

**Execution Order:**
Phases execute in numeric order: 20 -> 21 -> 22

| Phase                           | Plans Complete | Status      | Completed  |
| ------------------------------- | -------------- | ----------- | ---------- |
| 20. Integration Migration       | 2/2            | Complete    | 2026-02-06 |
| 21. Tooling & Library Migration | 0/2            | Not started | -          |
| 22. Verification & References   | 0/2            | Not started | -          |
