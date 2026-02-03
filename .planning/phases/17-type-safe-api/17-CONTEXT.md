# Phase 17: Type-Safe API - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Compile-time validation for container override configurations and simplified container creation. Users get type-safe override API using adapters, with clear error messages when configuration is invalid. String-based override API is removed entirely.

</domain>

<decisions>
## Implementation Decisions

### Override API ergonomics

- Short chain pattern: `.override(adapter).build()` — mirrors GraphBuilder pattern
- Port-reference-based validation via adapter's `provides` port
- Compile-time error when adapter's port not in graph
- createContainer options object shape: Claude's discretion (likely `{ graph, hooks?, options? }`)
- Chainable `.override()` calls: Claude's discretion (likely yes, mirrors GraphBuilder)

### Port reference syntax

- **Adapter-only API**: `.override(MockLoggerAdapter)` — no port+factory shorthand
- Adapters created with standard `createAdapter()` — no special mock adapter type
- Compile-time validation that adapter's provided port exists in graph
- Compile-time validation that adapter's required ports exist in graph
- Override adapters can depend on other overrides in same chain
- No "did you mean" suggestions for invalid ports — just clear error type
- Lifetime mismatch warning: Claude's discretion
- Class-based override support: Claude's discretion (createAdapter already supports both)

### Compile error messages

- Detailed error types: `PortNotInGraph<'Logger', ['Config', 'Database']>` shows context
- Template literal strings for readability: `` `Port '${Name}' not found in graph` ``
- Include fix suggestions in error types
- Circular dependency errors show full path: `CircularDependency<'A -> B -> C -> A'>`

### Deprecation / Migration

- Remove string-based override API entirely — no backward compatibility
- No deprecation period — clean break
- No migration documentation needed (dev phase, not prod)

### Claude's Discretion

- createContainer options object exact shape
- Whether `.override()` is chainable or requires `.overrideMany()`
- Lifetime mismatch warning behavior
- Class-based pattern support in overrides (createAdapter already has both)

</decisions>

<specifics>
## Specific Ideas

- Override API should feel like GraphBuilder's `.override(adapter)` method
- Same `createAdapter()` for production and test adapters — no special mock helpers
- Type errors should be actionable — user knows what to fix without digging

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 17-type-safe-api_
_Context gathered: 2026-02-03_
