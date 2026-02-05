# Requirements: HexDI v6.0 Monorepo Reorganization

**Defined:** 2026-02-05
**Core Value:** Catch dependency graph errors at compile time, not runtime

## v6.0 Requirements

Requirements for monorepo restructuring. Each maps to roadmap phases.

### Package Migration

- [ ] **MIG-01**: Core packages (core, graph, runtime) remain at `packages/{core,graph,runtime}`
- [ ] **MIG-02**: React integration moved to `integrations/react`
- [ ] **MIG-03**: Hono integration moved to `integrations/hono`
- [ ] **MIG-04**: Testing utilities moved to `tooling/testing`
- [ ] **MIG-05**: Visualization package moved to `tooling/visualization`
- [ ] **MIG-06**: Graph-viz package moved to `tooling/graph-viz`
- [ ] **MIG-07**: Flow package moved to `libs/flow/core`
- [ ] **MIG-08**: Flow-react package moved to `libs/flow/react`

### Workspace Configuration

- [ ] **CFG-01**: pnpm-workspace.yaml updated with new workspace globs (`packages/*`, `integrations/*`, `tooling/*`, `libs/*/*`)
- [ ] **CFG-02**: Root tsconfig.json project references updated for all new paths
- [ ] **CFG-03**: Per-package tsconfig.json paths and references updated
- [ ] **CFG-04**: Per-package eslint.config.js paths updated (shared config imports)
- [ ] **CFG-05**: Root package.json scripts work with new structure

### Build Verification

- [ ] **VER-01**: `pnpm install` resolves all workspace dependencies
- [ ] **VER-02**: `pnpm build` succeeds for all packages
- [ ] **VER-03**: `pnpm typecheck` passes across all packages
- [ ] **VER-04**: `pnpm test` passes (1,816+ tests)
- [ ] **VER-05**: `pnpm lint` passes across all packages

### Example & Website References

- [ ] **REF-01**: hono-todo example workspace dependencies resolve correctly
- [ ] **REF-02**: react-showcase example workspace dependencies resolve correctly
- [ ] **REF-03**: website workspace configuration updated

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### New Libraries

- **LIB-01**: @hex-di/store package scaffolded at `libs/store/core`
- **LIB-02**: @hex-di/saga package scaffolded at `libs/saga/core`
- **LIB-03**: @hex-di/query package scaffolded at `libs/query/core`
- **LIB-04**: Per-library React integrations (store-react, saga-react, query-react)

## Out of Scope

| Feature                             | Reason                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| Merging core/graph/runtime packages | Architectural separation of compile-time vs runtime preserved |
| New library implementations         | Separate milestones per library                               |
| npm package name changes            | @hex-di/\* scope names stay the same                          |
| CI/GitHub Actions updates           | Separate follow-up work                                       |
| README/documentation updates        | Separate follow-up work                                       |
| Functional code changes             | Purely structural reorganization                              |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| MIG-01      | 20    | Pending |
| MIG-02      | 20    | Pending |
| MIG-03      | 20    | Pending |
| MIG-04      | 21    | Pending |
| MIG-05      | 21    | Pending |
| MIG-06      | 21    | Pending |
| MIG-07      | 21    | Pending |
| MIG-08      | 21    | Pending |
| CFG-01      | 20    | Pending |
| CFG-02      | 20    | Pending |
| CFG-03      | 20    | Pending |
| CFG-04      | 20    | Pending |
| CFG-05      | 20    | Pending |
| VER-01      | 22    | Pending |
| VER-02      | 22    | Pending |
| VER-03      | 22    | Pending |
| VER-04      | 22    | Pending |
| VER-05      | 22    | Pending |
| REF-01      | 22    | Pending |
| REF-02      | 22    | Pending |
| REF-03      | 22    | Pending |

**Coverage:**

- v6.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---

_Requirements defined: 2026-02-05_
_Last updated: 2026-02-05 after roadmap creation_
