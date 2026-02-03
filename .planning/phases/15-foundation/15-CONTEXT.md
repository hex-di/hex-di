# Phase 15: Foundation - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Reorganize runtime package code for maintainability: split large files (~200 lines each), extract shared logic, consolidate tracing/inspection into core runtime (removing plugin system), and clean up exports. No new user-facing features — this is internal code organization.

</domain>

<decisions>
## Implementation Decisions

### Types File Split Strategy

- Split by entity (Claude's discretion on exact organization)
- Target ~200 lines per file (granular, many small files)
- Remove types.ts entirely (update all imports to new locations)
- Use types/ subdirectory with one central index.ts for re-exports
- Peer imports between type files, structured to prevent circular dependencies
- Type guards stay with the types they guard (not separate file)
- Internal vs public type separation at Claude's discretion

### Inspector/Tracer API Surface

- **Standalone functions**: `inspect(container)`, `trace(container, fn)`
- **Main export**: Import from '@hex-di/runtime' (not subpath)
- **Tracing modes**: Both global enable AND scoped `trace(container, () => { ... })`
- **Inspect output**: Full snapshot by default (all adapters, instances, scopes, lifetimes)
- **Remove factory functions**: No createInspector/createTracer — standalone functions only

### Plugin Removal Approach

- **Keep hooks**: Resolution hooks (beforeResolve, afterResolve) remain
- **Mutable hooks**: `container.addHook('beforeResolve', fn)` after creation
- **Removable hooks**: `container.removeHook('beforeResolve', fn)` supported
- **Remove HOOKS_ACCESS completely**: No symbol-based access, public API only
- **Hook inheritance**: Configurable — `inheritHooks: true/false` on child creation
- **Rich hook context**: portName, lifetime, duration, depth, parentPort, containerId

### Claude's Discretion

- Types file location (types/ subdirectory structure)
- Internal vs public type separation
- Cache hit behavior for hooks (fire always vs first resolution)
- Hook error handling (propagate vs catch)
- Export type syntax (`export type` vs regular)
- Error class export strategy

### Export Organization

- **Flat exports**: All public items directly from index.ts
- No namespace grouping
- Legacy exports removed (CaptiveDependencyErrorLegacy, etc.)

</decisions>

<specifics>
## Specific Ideas

- Standalone functions like `inspect(container)` instead of `container.inspector.snapshot()`
- Hooks should receive rich debugging context (duration, depth, parent chain)
- Target very granular files (~200 lines) for easier navigation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 15-foundation_
_Context gathered: 2026-02-03_
