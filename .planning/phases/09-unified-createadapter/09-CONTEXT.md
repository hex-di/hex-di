# Phase 9: Unified createAdapter - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users create all adapters through a single `createAdapter()` function with object config. Supports both factory functions and class constructors. This phase implements the unified API shape; async lifetime enforcement is Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Config Structure

- Factory receives deps as object `{ PortName: instance }` (current pattern preserved)
- `class` property accepts class constructor directly: `class: UserService`
- Property name is `class` (not `ctor` or `useClass`)
- `finalizer` stays at top level: `createAdapter({ ..., finalizer: (i) => i.close() })`

### Type Inference

- TProvides inferred from `provides` port (no explicit type param needed)
- TRequires tuple inferred from `requires` array (no `as const` needed)
- Factory return type validated against provides port type (compile error on mismatch)
- Class must implement port interface (compile error if class doesn't match)

### Factory vs Class Mutual Exclusion

- Both factory and class: branded error type with message and hint
- Neither factory nor class: branded error type with message and hint
- Error format: `{ __error: 'ErrorName', __hint: 'Helpful message' }`

### Default Values

- `lifetime` defaults to `'singleton'` when omitted
- `requires` defaults to `[]` when omitted
- `clonable` defaults to `false` when omitted

### Claude's Discretion

- Whether to use overloads vs single signature with conditional types
- Exact branded error type structure
- Internal type helper organization

</decisions>

<specifics>
## Specific Ideas

- Follow the pattern established by unified `createPort()` from v2.0
- Error messages should be actionable (include what to do, not just what's wrong)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 09-unified-createadapter_
_Context gathered: 2026-02-02_
