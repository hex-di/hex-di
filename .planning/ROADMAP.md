# Roadmap: HexDI

## Milestones

- ✅ **v1.0 MVP** - Phases 1-2 (shipped 2025-12-xx)
- ✅ **v1.1 Scoped Overrides** - Phases 3-4 (shipped 2026-01-xx)
- ✅ **v1.2 Port Directions** - Phase 5 (shipped 2026-02-01)
- ✅ **v2.0 Unified Port API** - Phases 6-8 (shipped 2026-02-02)

## Phases

<details>
<summary>v1.0-v1.2 (Phases 1-5) - SHIPPED</summary>

Phase 1-5 completed across milestones v1.0, v1.1, and v1.2.
See git history for details.

</details>

<details>
<summary>v2.0 Unified Port API (Phases 6-8) - SHIPPED</summary>

**Milestone Goal:** Single createPort() function with rich metadata, replacing three separate functions.

- [x] **Phase 6: Core Port API** - Unified createPort with metadata support
- [x] **Phase 7: Type Helpers** - Direction filtering and type aliases
- [x] **Phase 8: Graph Inspection** - Filtering by direction, category, tags

</details>

<details>
<summary>Phase Details (v2.0 - Completed)</summary>

### Phase 6: Core Port API

**Goal**: Users create all ports through a single createPort() function with object config and optional metadata
**Status**: ✅ Complete (2026-02-02)

Plans completed:

- [x] 06-01-PLAN.md — Unified createPort implementation with overloads and metadata support

### Phase 7: Type Helpers

**Goal**: Users can filter and infer port directions at the type level
**Status**: ✅ Complete (2026-02-02)

Plans completed:

- [x] 07-01-PLAN.md — InboundPorts and OutboundPorts filter utilities

### Phase 8: Graph Inspection

**Goal**: Users can inspect and filter registered ports by direction, category, and tags
**Status**: ✅ Complete (2026-02-02)

Plans completed:

- [x] 08-01-PLAN.md — Enhanced graph inspection with filtering

</details>

## Progress

All milestones through v2.0 are complete.

---

_Roadmap created: 2026-02-01_
_Last updated: 2026-02-02_
