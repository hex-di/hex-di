# Phase 6: Core Port API - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified `createPort()` function with object config and metadata, replacing three separate functions (`createPort(string)`, `createInboundPort`, `createOutboundPort`). All ports have direction. Old APIs are removed entirely.

</domain>

<decisions>
## Implementation Decisions

### Breaking Change Strategy

- Delete old APIs immediately — no deprecation period
- Remove `createInboundPort()`, `createOutboundPort()`, and string-only `createPort()`
- Remove undirected Port type — all ports must have direction at type level
- Update all existing tests to use new API as part of this phase
- Do NOT bump package version to 2.0.0 — version bump happens when milestone completes

### Default Direction Behavior

- Omitting direction silently defaults to 'outbound' but docs/JSDoc encourage explicit direction
- Type-level: `Port<T, 'X'>` infers to `Port<T, 'X', 'outbound'>` — no explicit required
- IDE hover always shows direction in type: `Port<Logger, 'Logger', 'outbound'>` not `Port<Logger, 'Logger'>`
- JSDoc on `createPort` encourages explicit direction — no lint rule

### Metadata Optionality

- Only `name` is required; `description`, `category`, `tags` all optional
- JSDoc/IDE hints encourage providing `description`
- `port.tags` returns empty array `[]` when not specified
- `port.description` and `port.category` return `undefined` when not specified
- Category typed as suggested union with escape hatch: `'persistence' | 'messaging' | 'external-api' | ... | string`

### Type Parameter Order

- Claude's discretion on parameter order based on TypeScript ergonomics
- Name should be inferable from config object when possible: `createPort<Logger>({ name: 'Logger' })`
- Direction should also be inferred from config: `createPort<Logger>({ name: 'Logger', direction: 'inbound' })`
- No type-level constraint to force direction — always inferred from config

### Claude's Discretion

- Exact type parameter order (`<Name, Type>` vs `<Type, Name>`)
- Suggested category values in the union type
- Internal implementation of inference mechanism

</decisions>

<specifics>
## Specific Ideas

- API should feel like single source of truth: one function, rich config object
- Direction visible in types for hexagonal architecture clarity
- Inference over explicit typing where TypeScript allows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 06-core-port-api_
_Context gathered: 2026-02-01_
