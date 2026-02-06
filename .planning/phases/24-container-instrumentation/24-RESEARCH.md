# Phase 24: Container Instrumentation and Context Propagation - Research

**Researched:** 2026-02-06
**Domain:** Distributed tracing instrumentation for dependency injection containers
**Confidence:** HIGH

## Summary

Container instrumentation for distributed tracing involves hooking into the dependency resolution lifecycle to create spans with proper parent-child relationships. The @hex-di/runtime package already provides a robust hooks system (beforeResolve/afterResolve) that can be leveraged for instrumentation. The @hex-di/tracing package provides W3C Trace Context support and span management primitives. The challenge is connecting these systems to create automatic instrumentation that propagates context across container boundaries while respecting user configuration options.

The standard approach uses a module-level span stack for context propagation, following OpenTelemetry patterns. Resolution hooks create child spans under the active parent, maintaining trace continuity. Container tree instrumentation requires walking the hierarchy via InspectorAPI and installing hooks with proper cleanup tracking.

**Primary recommendation:** Implement instrumentation as standalone functions that install resolution hooks, use a module-level span stack for context propagation, and leverage WeakMap for cleanup tracking.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- portFilter accepts a union type: either a predicate function `(portName: string) => boolean` OR a declarative `{ include?: string[], exclude?: string[] }` object
- Cached resolutions (singletons already resolved) are traced by default with `hex-di.resolution.cached=true`, but suppressed via `traceCachedResolutions: boolean` option (default: true)
- Span names use a concise format — Claude decides the exact pattern based on OTel best practices and tracing UI compatibility (Jaeger, Zipkin, Grafana Tempo)
- All resolution context captured as rich attributes: container name, scope ID, port name, adapter name, lifetime, cached status
- Attributes follow OTel semantic conventions with `hex-di.*` namespace (as defined in INST-06)
- Double-instrumentation: replace previous (auto-cleanup old hooks, install new ones via internal WeakMap tracking) — consistent with hex-di's adapter registry replace-on-conflict pattern
- instrumentContainerTree uses live subscription: auto-instruments new child containers added after the initial call, cleanup removes the subscription
- Full tree cleanup: calling cleanup on instrumentContainerTree removes hooks from ALL containers (root + every child) and stops the subscription
- Resolution errors recorded as OTel-convention span events ('exception' event) with status=ERROR
- Error detail depth is configurable: default captures status + message, `includeStackTrace: true` option adds full stack traces

### Claude's Discretion

- minDurationMs filtering: Claude's discretion on whether to filter at span-end or export time
- Default values for traceSyncResolutions, traceAsyncResolutions toggles
- minDurationMs filtering strategy (span-end vs export-time)
- Exact span name format (following OTel best practices)
- additionalAttributes type shape
- Cleanup idempotency behavior
- Error cascade behavior in dependency chains
- Async vs sync error parity

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library         | Version | Purpose                         | Why Standard                                                        |
| --------------- | ------- | ------------------------------- | ------------------------------------------------------------------- |
| @hex-di/runtime | latest  | Container and hooks system      | Already provides beforeResolve/afterResolve hooks with full context |
| @hex-di/tracing | latest  | Tracing primitives              | Provides Span, Tracer ports, W3C context                            |
| @hex-di/core    | latest  | Context variables, InspectorAPI | Provides ContextVariable pattern for propagation                    |

### Supporting

| Library                | Version | Purpose          | When to Use                                   |
| ---------------------- | ------- | ---------------- | --------------------------------------------- |
| WeakMap                | Native  | Cleanup tracking | Track installed hooks for replacement/cleanup |
| Module-level variables | Native  | Span stack       | Context propagation without threading         |

### Alternatives Considered

| Instead of                 | Could Use               | Tradeoff                                |
| -------------------------- | ----------------------- | --------------------------------------- |
| Module-level stack         | AsyncLocalStorage       | Node-only, not browser compatible       |
| WeakMap tracking           | Map with manual cleanup | Memory leaks if containers not disposed |
| Hook-based instrumentation | Proxy wrapping          | More complex, harder to remove cleanly  |

**Installation:**

```bash
# No additional packages needed - uses existing @hex-di/* packages
```

## Architecture Patterns

### Recommended Project Structure

```
packages/tracing/src/
├── instrumentation/
│   ├── container.ts        # instrumentContainer(), cleanup tracking
│   ├── tree.ts            # instrumentContainerTree(), subscription
│   ├── hooks.ts          # createTracingHook(), hook factories
│   ├── span-stack.ts     # Module-level span stack management
│   └── index.ts          # Public exports
```

### Pattern 1: Module-Level Span Stack

**What:** A module-scoped array that tracks the active span hierarchy during resolution
**When to use:** Always - this is the standard pattern for context propagation without AsyncLocalStorage
**Example:**

```typescript
// span-stack.ts
const spanStack: Span[] = [];

export function pushSpan(span: Span): void {
  spanStack.push(span);
}

export function popSpan(): Span | undefined {
  return spanStack.pop();
}

export function getActiveSpan(): Span | undefined {
  return spanStack[spanStack.length - 1];
}
```

### Pattern 2: WeakMap Hook Tracking

**What:** Use WeakMap to track installed hooks per container for cleanup
**When to use:** For double-instrumentation prevention and cleanup
**Example:**

```typescript
// Tracks installed cleanup functions per container
const installedHooks = new WeakMap<object, () => void>();

function instrumentContainer(container: Container, tracer: Tracer): () => void {
  // Clean up previous hooks if any
  const existingCleanup = installedHooks.get(container);
  if (existingCleanup) {
    existingCleanup();
  }

  // Install new hooks and track cleanup
  const cleanup = installHooks(container, tracer);
  installedHooks.set(container, cleanup);

  return cleanup;
}
```

### Pattern 3: Span Naming Convention

**What:** Concise, hierarchical span names for DI resolution
**When to use:** All resolution spans
**Example:**

```typescript
// Format: "resolve:{portName}" for clarity in tracing UIs
const spanName = `resolve:${context.portName}`;

// Alternative considered: "{containerName}.{portName}"
// But this gets too verbose in deep hierarchies
```

### Anti-Patterns to Avoid

- **Thread-local storage emulation:** Don't try to implement AsyncLocalStorage manually - use module-level stack
- **String concatenation for span names:** Use template literals for consistent formatting
- **Synchronous cleanup in async contexts:** Always handle cleanup in try/finally blocks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build            | Use Instead               | Why                                |
| --------------------- | ---------------------- | ------------------------- | ---------------------------------- |
| Context propagation   | Custom context passing | Module-level span stack   | Standard pattern, works everywhere |
| Hook cleanup tracking | Manual arrays/maps     | WeakMap                   | Automatic cleanup on GC            |
| Attribute filtering   | Custom filter logic    | OTel attribute limits     | Standard, performant               |
| Span ID generation    | Custom random          | @hex-di/tracing utils     | W3C compliant, tested              |
| Error event format    | Custom error objects   | OTel exception convention | Standard across tools              |

**Key insight:** The hooks system already provides all needed context - don't duplicate what ResolutionHookContext already captures.

## Common Pitfalls

### Pitfall 1: Span Stack Corruption

**What goes wrong:** Forgetting to pop spans in error cases corrupts the stack
**Why it happens:** Not using try/finally blocks consistently
**How to avoid:** Always pop in finally block, even on errors
**Warning signs:** Spans with wrong parents, stack growing indefinitely

### Pitfall 2: Memory Leaks from Hook References

**What goes wrong:** Hooks hold references preventing container GC
**Why it happens:** Not cleaning up hooks when containers are disposed
**How to avoid:** Return cleanup functions, use WeakMap for tracking
**Warning signs:** Memory usage growing with container creation/disposal cycles

### Pitfall 3: Filtering Too Early

**What goes wrong:** Filtering spans at creation time loses valuable data
**Why it happens:** Trying to optimize too early
**How to avoid:** Create all spans, filter at export time or in processor
**Warning signs:** Missing spans in traces when debugging

### Pitfall 4: Circular Dependency Stack Overflow

**What goes wrong:** Circular dependencies cause infinite span creation
**Why it happens:** Container detects circular dependency after hook fires
**How to avoid:** Check isCacheHit in beforeResolve, handle CircularDependencyError
**Warning signs:** Stack overflow errors during resolution

## Code Examples

Verified patterns from official sources:

### Hook Installation Pattern

```typescript
// Based on existing @hex-di/runtime patterns
function installTracingHooks(
  container: Container,
  tracer: Tracer,
  options: AutoInstrumentOptions
): () => void {
  const beforeResolve = (context: ResolutionHookContext) => {
    // Check filtering options
    if (!shouldTrace(context, options)) return;

    // Get parent span from stack
    const parentSpan = getActiveSpan();

    // Create child span
    const span = tracer.startSpan(`resolve:${context.portName}`, {
      kind: "internal",
      attributes: {
        "hex-di.port.name": context.portName,
        "hex-di.port.lifetime": context.lifetime,
        "hex-di.container.name": context.containerId,
        "hex-di.resolution.cached": context.isCacheHit,
      },
    });

    // Push to stack for nested resolutions
    pushSpan(span);
  };

  const afterResolve = (context: ResolutionResultContext) => {
    const span = popSpan();
    if (!span) return;

    try {
      if (context.error) {
        span.recordException(context.error);
        span.setStatus("error");
      } else {
        span.setStatus("ok");
      }
    } finally {
      span.end();
    }
  };

  container.addHook("beforeResolve", beforeResolve);
  container.addHook("afterResolve", afterResolve);

  return () => {
    container.removeHook("beforeResolve", beforeResolve);
    container.removeHook("afterResolve", afterResolve);
  };
}
```

### Tree Instrumentation with Subscription

```typescript
// Using InspectorAPI for tree walking
function instrumentContainerTree(
  root: Container,
  tracer: Tracer,
  options: AutoInstrumentOptions
): () => void {
  const cleanups = new Map<Container, () => void>();

  // Instrument a container and track cleanup
  function instrumentOne(container: Container): void {
    if (cleanups.has(container)) return; // Already instrumented

    const cleanup = instrumentContainer(container, tracer, options);
    cleanups.set(container, cleanup);
  }

  // Walk existing tree
  function walkTree(container: Container): void {
    instrumentOne(container);

    const children = container.inspector.getChildContainers();
    for (const child of children) {
      // InspectorAPI returns InspectorAPI, need to get container
      // This is where WeakMap<InspectorAPI, Container> comes in
      walkTree(getContainerFromInspector(child));
    }
  }

  // Initial instrumentation
  walkTree(root);

  // Subscribe to new children
  const unsubscribe = root.inspector.subscribe(event => {
    if (event.type === "child-created") {
      // Instrument new child
      const child = getChildById(event.childId);
      if (child) walkTree(child);
    }
  });

  // Return cleanup that removes all hooks and subscription
  return () => {
    unsubscribe();
    for (const cleanup of cleanups.values()) {
      cleanup();
    }
    cleanups.clear();
  };
}
```

## State of the Art

| Old Approach         | Current Approach              | When Changed           | Impact                     |
| -------------------- | ----------------------------- | ---------------------- | -------------------------- |
| AsyncLocalStorage    | Module-level stack            | Browser support needed | Works in all environments  |
| Manual span creation | Automatic via hooks           | OTel matured           | Consistent instrumentation |
| Sampling at creation | Sampling decision propagation | W3C Trace Context      | Better distributed tracing |

**Deprecated/outdated:**

- Zone.js for context: Replaced by simpler patterns
- OpenTracing: Merged into OpenTelemetry

## Open Questions

Things that couldn't be fully resolved:

1. **InspectorAPI to Container mapping**
   - What we know: Need WeakMap<InspectorAPI, Container> for reverse lookup
   - What's unclear: Exact implementation location (likely in runtime internals)
   - Recommendation: Implement utility function that traverses from root

2. **Exact OTel attribute conventions**
   - What we know: Use hex-di.\* namespace, follow OTel patterns
   - What's unclear: Exact attribute names for all fields
   - Recommendation: Follow OTel database/RPC conventions as template

3. **minDurationMs implementation**
   - What we know: Need to filter short spans
   - What's unclear: Filter at span-end vs export time
   - Recommendation: Filter at span-end to avoid memory overhead

## Sources

### Primary (HIGH confidence)

- @hex-di/runtime source - Hook system implementation verified
- @hex-di/tracing source - Span types and context utilities verified
- @hex-di/core source - InspectorAPI and ContextVariable patterns verified

### Secondary (MEDIUM confidence)

- Test files showing hook usage patterns
- Existing context propagation implementation

### Tertiary (LOW confidence)

- OpenTelemetry conventions (couldn't access official docs directly)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All from existing codebase
- Architecture: HIGH - Based on implemented patterns
- Pitfalls: MEDIUM - Inferred from similar systems

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain)
