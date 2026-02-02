# Phase 13: Runtime Features - Research

**Researched:** 2026-02-02
**Domain:** Runtime container inspection and resource disposal
**Confidence:** HIGH

## Summary

Phase 13 adds two runtime container features: inspection summary mode and disposal lifecycle. Both features have existing implementations in the codebase that need extension or API refinement.

**Current state:**

- Disposal lifecycle is FULLY IMPLEMENTED with comprehensive LIFO ordering, error aggregation, async support, and idempotency
- Graph inspection exists at build-time (GraphBuilder.inspect()) but NOT at runtime (Container/Scope level)
- Runtime inspection API (container.inspector) exists but returns ContainerSnapshot, not GraphInspection

**Primary recommendation:** Add summary mode to existing GraphBuilder.inspect() and expose graph inspection at runtime via container.inspector.inspectGraph().

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                   | Version | Purpose                                   | Why Standard                     |
| ------------------------- | ------- | ----------------------------------------- | -------------------------------- |
| N/A - Built-in TypeScript | 5.x     | Type-safe options objects                 | Standard TypeScript patterns     |
| Vitest                    | Latest  | Testing disposal order and async behavior | Already used throughout codebase |

### Supporting

| Library | Version | Purpose                         | When to Use                          |
| ------- | ------- | ------------------------------- | ------------------------------------ |
| N/A     | -       | No external dependencies needed | All features use built-in JavaScript |

### Alternatives Considered

| Instead of             | Could Use                 | Tradeoff                                                            |
| ---------------------- | ------------------------- | ------------------------------------------------------------------- |
| Built-in disposal      | TC39 Symbol.asyncDispose  | TC39 proposal still Stage 3; can add later without breaking changes |
| Options object pattern | Multiple method overloads | Options object more extensible                                      |

**Installation:**
No new dependencies required. All features use existing codebase patterns.

## Architecture Patterns

### Recommended Project Structure

```
packages/runtime/
├── src/
│   ├── inspection/
│   │   ├── creation.ts          # createInspector factory
│   │   ├── internal-state-types.ts  # ContainerSnapshot types
│   │   └── helpers.ts           # Snapshot building helpers
│   ├── container/
│   │   ├── factory.ts           # createContainer with .inspector property
│   │   └── disposal.ts          # Disposal logic (exists)
│   └── scope/
│       └── impl.ts              # Scope disposal (exists)
packages/graph/
├── src/
│   └── graph/inspection/
│       ├── inspector.ts         # inspectGraph() - extend with summary option
│       └── disposal.ts          # Already has disposal warning detection
```

### Pattern 1: Options Object for Variants

**What:** Use optional options parameter with mode selection
**When to use:** When a method has multiple operational modes

**Example:**

```typescript
// Source: Existing inspectGraph pattern
export interface InspectOptions {
  seed?: string;
  generator?: CorrelationIdGenerator;
  // NEW: summary mode
  summary?: boolean;
}

export function inspectGraph(
  graph: InspectableGraph,
  options: InspectOptions = {}
): GraphInspection | GraphSummary {
  if (options.summary) {
    return buildGraphSummary(graph);
  }
  // Existing full inspection logic
}
```

### Pattern 2: Discriminated Union Returns

**What:** Return type varies based on options, using discriminated union
**When to use:** When return shape fundamentally differs by mode

**Example:**

```typescript
// Option A: Overload signatures
function inspect(): GraphInspection;
function inspect(options: { summary: true }): GraphSummary;
function inspect(options?: InspectOptions): GraphInspection | GraphSummary;

// Option B: Union return (simpler, recommended)
function inspect(options?: InspectOptions): GraphInspection | GraphSummary {
  // Implementation uses runtime check
}
```

### Pattern 3: LIFO Disposal Order (Already Implemented)

**What:** Services disposed in reverse creation order
**When to use:** Always for proper resource cleanup
**Why:** Services may depend on services created before them

**Example:**

```typescript
// Source: packages/runtime/tests/disposal.test.ts
// Services resolved in order: Logger -> Database -> Cache
container.resolve(LoggerPort); // Created first
container.resolve(DatabasePort); // Created second
container.resolve(CachePort); // Created third

await container.dispose();
// Disposal order: Cache -> Database -> Logger (LIFO)
```

### Pattern 4: Error Aggregation (Already Implemented)

**What:** Continue disposal on error, aggregate all failures
**When to use:** Always - ensure all disposers run
**Why:** One failing disposer shouldn't prevent others from cleaning up

**Example:**

```typescript
// Source: packages/runtime/tests/disposal.test.ts
// Multiple finalizers fail
LoggerAdapter.finalizer = () => {
  throw new Error("Logger failed");
};
DatabaseAdapter.finalizer = () => {
  throw new Error("Database failed");
};

try {
  await container.dispose();
} catch (error) {
  // AggregateError containing both errors
  expect(error).toBeInstanceOf(AggregateError);
  expect(error.errors).toHaveLength(2);
}
```

### Anti-Patterns to Avoid

- **Stopping disposal on first error:** All disposers must run, aggregate errors
- **Modifying frozen inspection objects:** GraphInspection and GraphSummary must be deeply frozen
- **Creating new inspection format:** Reuse GraphInspection fields for consistency
- **Synchronous disposal with async finalizers:** Always return Promise<void>

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                 | Don't Build           | Use Instead                    | Why                                              |
| ----------------------- | --------------------- | ------------------------------ | ------------------------------------------------ |
| Disposal lifecycle      | Custom cleanup system | Existing container.dispose()   | Already handles LIFO, errors, async, idempotency |
| Graph inspection        | New inspection API    | GraphBuilder.inspect() pattern | Consistent with build-time inspection            |
| Frozen immutability     | Manual Object.freeze  | Existing deep freeze pattern   | Already used in inspectGraph()                   |
| Disposal order tracking | Manual order tracking | Creation order in memo maps    | Container already tracks creation order          |

**Key insight:** Phase 13 requirements are mostly about exposing/extending existing functionality rather than building new systems from scratch.

## Common Pitfalls

### Pitfall 1: Summary Mode Breaking Type Safety

**What goes wrong:** Summary mode returns different type but TypeScript can't distinguish
**Why it happens:** Function overloads with optional parameters don't narrow properly
**How to avoid:** Use discriminated union or mandatory options parameter
**Warning signs:** User code requires runtime type guards to use summary result

**Solution:**

```typescript
// Good: Overloads with distinct signatures
function inspect(): GraphInspection;
function inspect(options: { summary: true }): GraphSummary;
function inspect(options: { summary?: false }): GraphInspection;

// Or: Discriminated union with type guard
type InspectResult =
  | { mode: "full"; data: GraphInspection }
  | { mode: "summary"; data: GraphSummary };
```

### Pitfall 2: Forgetting Child Container Cascade

**What goes wrong:** Disposing parent doesn't dispose children, leaving resources open
**Why it happens:** Child containers tracked separately from scopes
**How to avoid:** Ensure container.dispose() walks child container hierarchy
**Warning signs:** Memory leaks when child containers exist

**Current implementation:** Tests verify this works correctly:

```typescript
// Source: packages/runtime/tests/disposal.test.ts:326
// "container disposal propagates to all child scopes first"
```

### Pitfall 3: Disposal Idempotency Violations

**What goes wrong:** Second dispose() call runs finalizers again or throws error
**Why it happens:** No disposed state tracking
**How to avoid:** Check disposed flag before running disposal logic
**Warning signs:** Finalizers called multiple times, or errors on second dispose

**Current implementation:** Already handles this:

```typescript
// Source: packages/runtime/tests/disposal.test.ts:654
test("container disposal is idempotent (second call is no-op)", async () => {
  await container.dispose();
  await container.dispose(); // No-op, finalizers not called again
});
```

### Pitfall 4: Summary Missing Critical Fields

**What goes wrong:** Summary too minimal, users need full inspection anyway
**Why it happens:** Over-optimization without understanding usage patterns
**How to avoid:** Include enough fields for common health checks (errors, completeness, counts)
**Warning signs:** Users always falling back to full inspection

**Recommended summary fields (from requirements):**

- adapterCount
- asyncAdapterCount
- isComplete
- missingPorts (same as unsatisfiedRequirements)
- isValid (derived: isComplete && errors.length === 0)
- errors (validation errors, not inspection errors)
- provides (list of provided port names)

## Code Examples

Verified patterns from official sources:

### Disposal LIFO Order (Existing Implementation)

```typescript
// Source: packages/runtime/tests/disposal.test.ts:84-136
const disposalOrder: string[] = [];

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "singleton",
  factory: () => ({ log: vi.fn() }),
  finalizer: () => {
    disposalOrder.push("Logger");
  },
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  lifetime: "singleton",
  factory: () => ({ query: vi.fn() }),
  finalizer: () => {
    disposalOrder.push("Database");
  },
});

container.resolve(LoggerPort); // Created first
container.resolve(DatabasePort); // Created second

await container.dispose();

// LIFO: Database (last) -> Logger (first)
expect(disposalOrder).toEqual(["Database", "Logger"]);
```

### Error Aggregation (Existing Implementation)

```typescript
// Source: packages/runtime/tests/disposal.test.ts:478-533
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  finalizer: () => {
    throw new Error("Logger failed");
  },
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  finalizer: () => {
    throw new Error("Database failed");
  },
});

try {
  await container.dispose();
} catch (error) {
  expect(error).toBeInstanceOf(AggregateError);
  expect(error.errors).toHaveLength(2);
  const messages = error.errors.map(e => e.message);
  expect(messages).toContain("Logger failed");
  expect(messages).toContain("Database failed");
}
```

### Async Finalizer Support (Existing Implementation)

```typescript
// Source: packages/runtime/tests/disposal.test.ts:541-577
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "singleton",
  factory: () => ({ log: vi.fn() }),
  finalizer: async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    disposalOrder.push("Logger");
  },
});

await container.dispose();
// All async finalizers awaited in LIFO order
```

### Graph Inspection Pattern (To Extend)

```typescript
// Source: packages/graph/src/builder/builder.ts:612-617
// Existing full inspection (no options parameter yet)
inspect(): GraphInspection {
  return inspectGraph({
    adapters: this.adapters,
    overridePortNames: this.overridePortNames,
  });
}

// Proposed extension for summary mode
inspect(options?: InspectOptions): GraphInspection | GraphSummary {
  const graph = {
    adapters: this.adapters,
    overridePortNames: this.overridePortNames,
  };
  return inspectGraph(graph, options);
}
```

## State of the Art

| Old Approach                 | Current Approach                     | When Changed     | Impact                             |
| ---------------------------- | ------------------------------------ | ---------------- | ---------------------------------- |
| Manual disposal tracking     | Container-managed disposal           | v3.0 (estimated) | Automatic LIFO ordering            |
| Sync-only disposal           | Async disposal support               | v3.0 (estimated) | Handles async cleanup properly     |
| Build-time inspection only   | Runtime inspection via inspector API | v3.0 (estimated) | DevTools integration possible      |
| Try/finally for each service | Automatic error aggregation          | v3.0 (estimated) | All disposers run even on failures |

**Deprecated/outdated:**

- Manual try/finally for disposal: Use container.dispose() which handles LIFO and errors
- Symbol.asyncDispose integration: TC39 proposal still Stage 3, not yet standardized (can add later)

## Open Questions

1. **Should summary mode be on GraphBuilder.inspect() or container.inspector?**
   - What we know: GraphBuilder.inspect() exists, container.inspector exists but returns ContainerSnapshot
   - What's unclear: Where users expect to find summary mode
   - Recommendation: Add to both for consistency - GraphBuilder.inspect({ summary: true }) and container.inspector.getSnapshot({ summary: true })

2. **What exact fields should GraphSummary include?**
   - What we know: Requirements specify 7 fields (adapterCount, asyncAdapterCount, isComplete, missingPorts, isValid, errors, provides)
   - What's unclear: Whether "errors" means validation errors or inspection metadata
   - Recommendation: Start with requirements spec fields; "errors" means validation errors (empty array for built graphs)

3. **Should GraphSummary be a subset type or separate interface?**
   - What we know: TypeScript supports Pick<> utility type for subsets
   - What's unclear: Whether to maintain separate interface or derive from GraphInspection
   - Recommendation: Separate interface for clarity, but share field names with GraphInspection

4. **Should disposal support Symbol.asyncDispose now?**
   - What we know: TC39 proposal is Stage 3 but not finalized; TypeScript 5.2+ has lib support
   - What's unclear: Whether to implement now or wait for wider adoption
   - Recommendation: Wait for Stage 4 and wider adoption; can add later without breaking changes (out of scope per requirements)

## Sources

### Primary (HIGH confidence)

- packages/runtime/tests/disposal.test.ts - Comprehensive disposal tests covering all requirements
- packages/runtime/src/container/factory.ts - Container disposal implementation
- packages/graph/src/graph/inspection/inspector.ts - inspectGraph() implementation
- packages/graph/src/graph/types/inspection.ts - GraphInspection type definition
- packages/core/src/inspection/inspector-types.ts - InspectorAPI type definition

### Secondary (MEDIUM confidence)

- TC39 explicit resource management proposal (Stage 3) - Symbol.dispose/asyncDispose specification
- https://github.com/tc39/proposal-explicit-resource-management - Official proposal repository

### Tertiary (LOW confidence)

- None required - all features documented in codebase

## Metadata

**Confidence breakdown:**

- Disposal lifecycle: HIGH - Fully implemented and tested, just needs API exposure
- Inspection summary: HIGH - Pattern exists in GraphBuilder.inspect(), needs extension
- TC39 integration: LOW - Proposal not finalized, out of scope for Phase 13

**Research date:** 2026-02-02
**Valid until:** 90 days (stable features, unlikely to change)
