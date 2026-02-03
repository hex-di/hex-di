# Phase 16: Performance - Research

**Researched:** 2026-02-03
**Domain:** Runtime container performance optimization
**Confidence:** HIGH

## Summary

This research investigates three performance requirements for the runtime package: O(1) child container unregistration, configurable timestamp capture, and performance benchmarks.

**Key findings:**

1. **Child container tracking** uses `Array.indexOf()` + `splice()` in `LifecycleManager.unregisterChildContainer()`, creating O(n) complexity. A Map-based approach with a unique ID per child achieves O(1).
2. **Timestamp capture** occurs in three locations: MemoMap (3 call sites), trace.ts (4 call sites), and hooks-runner.ts (2 call sites). A configuration option can disable these in production.
3. **Vitest bench** is already used in @hex-di/graph; the same pattern applies to @hex-di/runtime with `vitest bench`.

**Primary recommendation:** Implement Map-based tracking in LifecycleManager, add runtime configuration for timestamp capture, and create benchmark suite following the existing graph package pattern.

## Standard Stack

### Core

| Library | Version | Purpose      | Why Standard                                            |
| ------- | ------- | ------------ | ------------------------------------------------------- |
| vitest  | 4.x     | Benchmarking | Already in use via `vitest bench`; native benchmark API |

### Supporting

| Library         | Version | Purpose                 | When to Use                                       |
| --------------- | ------- | ----------------------- | ------------------------------------------------- |
| performance.now | Native  | High-resolution timing  | When benchmarking needs sub-millisecond precision |
| Map             | Native  | O(1) container tracking | Replace Array for unregistration                  |

### Alternatives Considered

| Instead of | Could Use         | Tradeoff                                                             |
| ---------- | ----------------- | -------------------------------------------------------------------- |
| Map        | WeakMap           | WeakMap cannot iterate for disposal; need explicit tracking          |
| Date.now() | performance.now() | performance.now() higher precision but not needed for trace metadata |

**Installation:**
No additional packages needed. Uses existing vitest with benchmark mode.

## Architecture Patterns

### Current Child Container Tracking (Problem)

```typescript
// packages/runtime/src/container/internal/lifecycle-manager.ts
// Line 71: Array storage
private readonly childContainers: Disposable[] = [];

// Line 111-113: O(1) registration (push)
registerChildContainer(child: Disposable): void {
  this.childContainers.push(child);
}

// Line 120-125: O(n) unregistration (indexOf + splice)
unregisterChildContainer(child: Disposable): void {
  const idx = this.childContainers.indexOf(child);  // O(n)
  if (idx !== -1) {
    this.childContainers.splice(idx, 1);            // O(n)
  }
}
```

### Recommended: Map-Based Tracking

```typescript
// Pattern 1: Map with numeric ID
private readonly childContainers: Map<number, Disposable> = new Map();
private childIdCounter = 0;

registerChildContainer(child: Disposable): number {
  const id = this.childIdCounter++;
  this.childContainers.set(id, child);
  return id;  // Return ID for O(1) unregistration
}

unregisterChildContainer(id: number): void {
  this.childContainers.delete(id);  // O(1)
}

// Disposal still works (iterate Map values in reverse order)
async dispose(): Promise<void> {
  const children = Array.from(this.childContainers.values());
  for (let i = children.length - 1; i >= 0; i--) {
    await children[i].dispose();
  }
  this.childContainers.clear();
}
```

### Timestamp Capture Locations

```typescript
// Location 1: MemoMap (3 call sites)
// packages/runtime/src/util/memo-map.ts
// Lines 195, 246, 303 - CacheEntry creation
const entry: CacheEntry<P> = {
  resolvedAt: Date.now(), // CONFIGURABLE
  resolutionOrder: this.resolutionCounter++,
};

// Location 2: trace.ts (4 call sites)
// packages/runtime/src/trace.ts
// Lines 97, 102-103, 184, 188-189 - Start/duration timing
startTimes.set(ctx.portName, Date.now());
const duration = Date.now() - startTime;

// Location 3: hooks-runner.ts (2 call sites)
// packages/runtime/src/resolution/hooks-runner.ts
// Lines 149, 191, 246 - Resolution timing
const startTime = Date.now();
const duration = Date.now() - startTime;
```

### Recommended: Runtime Configuration

```typescript
// Option 1: Container-level configuration
interface CreateContainerOptions {
  name: string;
  devtools?: ContainerDevToolsOptions;
  performance?: {
    /** Disable timestamp capture for production (default: false) */
    disableTimestamps?: boolean;
  };
}

// Option 2: Global runtime config
import { setRuntimeConfig } from "@hex-di/runtime";

setRuntimeConfig({
  captureTimestamps: process.env.NODE_ENV !== "production",
});

// Implementation in MemoMap
const entry: CacheEntry<P> = {
  resolvedAt: this.config.captureTimestamps ? Date.now() : 0,
  resolutionOrder: this.resolutionCounter++,
};
```

### Benchmark Pattern (from @hex-di/graph)

```typescript
// packages/graph/tests/performance.bench.ts
import { bench, describe } from "vitest";

describe("resolution performance", () => {
  bench("single resolve() - singleton", () => {
    container.resolve(Port);
  });

  bench(
    "100k resolve() - singleton",
    () => {
      for (let i = 0; i < 100_000; i++) {
        container.resolve(Port);
      }
    },
    { iterations: 10 }
  );
});
```

### Anti-Patterns to Avoid

- **WeakMap for child tracking:** Cannot iterate for LIFO disposal
- **Timestamp in hot path without config:** Unnecessary overhead in production
- **Micro-benchmarks without warmup:** Cold JIT can skew results

## Don't Hand-Roll

| Problem                | Don't Build              | Use Instead                 | Why                                        |
| ---------------------- | ------------------------ | --------------------------- | ------------------------------------------ |
| Benchmarking framework | Custom timing loops      | `vitest bench`              | Built-in warmup, statistics, comparison    |
| High-precision timing  | Manual Date.now() deltas | Vitest bench internals      | Handles JIT warmup, GC noise               |
| Map key generation     | UUID/random strings      | Simple incrementing counter | Faster, guaranteed unique within container |

**Key insight:** Vitest's benchmark mode handles warmup iterations, statistical analysis, and output formatting. Custom benchmark code would need to replicate all of this.

## Common Pitfalls

### Pitfall 1: Breaking LIFO Disposal Order

**What goes wrong:** Switching from Array to Map loses insertion order for disposal
**Why it happens:** Map doesn't guarantee insertion order iteration (in practice it does, but not specified)
**How to avoid:** Either track insertion order separately, or convert to Array before disposal
**Warning signs:** Child containers disposed in wrong order; parent singletons accessed after disposal

### Pitfall 2: ID Leaking to Public API

**What goes wrong:** Registration returns ID that must be passed to unregistration, leaking implementation detail
**Why it happens:** Need to correlate register/unregister calls
**How to avoid:** Store ID on the child container object (e.g., Symbol property) internally
**Warning signs:** Public API changes; existing tests fail

### Pitfall 3: Timestamp Config Not Thread-Safe

**What goes wrong:** Global config modified after containers created
**Why it happens:** Container-level config requires passing through multiple layers
**How to avoid:** Container-level config frozen at creation; no global mutable state
**Warning signs:** Race conditions in tests; inconsistent behavior

### Pitfall 4: Benchmark Isolation

**What goes wrong:** Benchmark results vary wildly between runs
**Why it happens:** Shared container state between benchmark iterations
**How to avoid:** Create fresh container per benchmark iteration, or use setup/teardown hooks
**Warning signs:** High variance in benchmark results; "flaky" benchmarks

## Code Examples

### Child Container Map Tracking Implementation

```typescript
// Source: Derived from current LifecycleManager pattern
import type { MemoMap } from "../../util/memo-map.js";

// Symbol for internal ID storage
const CHILD_ID = Symbol("childContainerId");

interface DisposableWithId {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
  [CHILD_ID]?: number;
}

export class LifecycleManager {
  private readonly childContainers: Map<number, DisposableWithId> = new Map();
  private readonly childScopes: Set<DisposableWithId> = new Set();
  private childIdCounter = 0;
  private disposed = false;

  registerChildContainer(child: DisposableWithId): void {
    const id = this.childIdCounter++;
    child[CHILD_ID] = id;
    this.childContainers.set(id, child);
  }

  unregisterChildContainer(child: DisposableWithId): void {
    const id = child[CHILD_ID];
    if (id !== undefined) {
      this.childContainers.delete(id);
    }
  }

  async dispose(singletonMemo: MemoMap, parentUnregister?: () => void): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    // LIFO: convert to array and reverse
    const children = Array.from(this.childContainers.values());
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) await child.dispose();
    }
    this.childContainers.clear();

    // Rest of disposal...
  }
}
```

### Container-Level Timestamp Configuration

```typescript
// Source: Derived from existing CreateContainerOptions pattern
export interface RuntimePerformanceOptions {
  /**
   * Disable timestamp capture for production builds.
   * When true, resolvedAt will be 0 and duration tracking disabled.
   * @default false
   */
  readonly disableTimestamps?: boolean;
}

export interface CreateContainerOptions {
  readonly name: string;
  readonly devtools?: ContainerDevToolsOptions;
  readonly performance?: RuntimePerformanceOptions;
}

// Usage
const container = createContainer(graph, {
  name: "App",
  performance: {
    disableTimestamps: process.env.NODE_ENV === "production",
  },
});
```

### Runtime Benchmark Suite Structure

```typescript
// Source: Derived from packages/graph/tests/performance.bench.ts pattern
import { bench, describe, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Pre-create ports (avoid port creation overhead in benchmarks)
const ports = Array.from({ length: 100 }, (_, i) => port<object>()({ name: `Port${i}` }));

const adapters = ports.map(p =>
  createAdapter({
    provides: p,
    requires: [],
    lifetime: "singleton",
    factory: () => ({}),
  })
);

describe("resolution performance", () => {
  let container: ReturnType<typeof createContainer>;

  beforeEach(() => {
    const graph = GraphBuilder.create();
    adapters.forEach(a => graph.provide(a));
    container = createContainer(graph.build(), { name: "Bench" });
  });

  bench("resolve 100k singletons (cached)", () => {
    for (let i = 0; i < 100_000; i++) {
      container.resolve(ports[0]!);
    }
  });

  bench("resolve 100 different ports", () => {
    for (const p of ports) {
      container.resolve(p);
    }
  });
});

describe("scope operations", () => {
  bench("create/dispose 10k scopes", async () => {
    for (let i = 0; i < 10_000; i++) {
      const scope = container.createScope();
      await scope.dispose();
    }
  });
});

describe("disposal performance", () => {
  bench("dispose 1k child containers", async () => {
    const childGraph = GraphBuilder.create().build();
    const children = Array.from({ length: 1000 }, (_, i) =>
      container.createChild(childGraph, { name: `Child${i}` })
    );

    // Dispose parent (cascades to all children)
    await container.dispose();
  });
});
```

## State of the Art

| Old Approach              | Current Approach     | When Changed  | Impact                                    |
| ------------------------- | -------------------- | ------------- | ----------------------------------------- |
| Array.indexOf for lookup  | Map.get for O(1)     | Current phase | Improves unregistration from O(n) to O(1) |
| Always capture timestamps | Configurable capture | Current phase | Reduces production overhead               |

**Deprecated/outdated:**

- None - these are new optimizations

## Open Questions

1. **ID storage mechanism**
   - What we know: Need to correlate child containers for O(1) unregistration
   - What's unclear: Symbol property vs WeakMap external storage vs explicit ID return
   - Recommendation: Symbol property keeps API unchanged and avoids WeakMap complexity

2. **Scope tracking**
   - What we know: Scopes use Set (already O(1) deletion)
   - What's unclear: Whether scope tracking should also use Map for consistency
   - Recommendation: Keep Set for scopes; no performance issue identified

3. **Benchmark targets validation**
   - What we know: Requirements specify 100k resolution, 10k scope, 1k disposal
   - What's unclear: What constitutes "pass" (absolute time? ops/sec?)
   - Recommendation: Use vitest bench defaults; document baseline on reference hardware

## Sources

### Primary (HIGH confidence)

- `/Users/u1070457/Projects/Perso/hex-di/packages/runtime/src/container/internal/lifecycle-manager.ts` - Current O(n) implementation
- `/Users/u1070457/Projects/Perso/hex-di/packages/runtime/src/util/memo-map.ts` - Timestamp capture locations
- `/Users/u1070457/Projects/Perso/hex-di/packages/graph/tests/performance.bench.ts` - Existing benchmark pattern

### Secondary (MEDIUM confidence)

- `/Users/u1070457/Projects/Perso/hex-di/packages/runtime/src/trace.ts` - Tracing timestamp usage
- `/Users/u1070457/Projects/Perso/hex-di/packages/runtime/src/resolution/hooks-runner.ts` - Hook timing
- `/Users/u1070457/Projects/Perso/hex-di/packages/runtime/src/types/options.ts` - Configuration pattern

### Tertiary (LOW confidence)

- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - vitest bench already used in monorepo
- Architecture: HIGH - direct code analysis of current implementation
- Pitfalls: HIGH - derived from code structure and DI patterns

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable patterns)

---

## Implementation Summary

### PERF-01: O(1) Child Container Unregistration

**File to modify:** `packages/runtime/src/container/internal/lifecycle-manager.ts`

**Changes:**

1. Replace `childContainers: Disposable[]` with `childContainers: Map<number, Disposable>`
2. Add `childIdCounter: number = 0`
3. Update `registerChildContainer()` to assign ID and store in Map
4. Update `unregisterChildContainer()` to use `Map.delete()`
5. Update `dispose()` to convert Map values to Array for LIFO iteration
6. Update `getChildContainerSnapshots()` to iterate Map values

### PERF-02: Configurable Timestamp Capture

**Files to modify:**

1. `packages/runtime/src/types/options.ts` - Add `RuntimePerformanceOptions` interface
2. `packages/runtime/src/util/memo-map.ts` - Accept config, conditionally capture timestamps
3. `packages/runtime/src/container/factory.ts` - Pass config through to MemoMap
4. `packages/runtime/src/container/base-impl.ts` - Accept and propagate config

**Note:** trace.ts and hooks-runner.ts timestamps are for DevTools/debugging and should remain active when hooks are installed (DevTools opt-in).

### PERF-03: Performance Benchmarks

**File to create:** `packages/runtime/tests/performance.bench.ts`

**Content:**

- Resolution benchmarks (100k ops target)
- Scope operation benchmarks (10k ops target)
- Disposal benchmarks (1k containers target)
- Add `"test:bench": "vitest bench"` to package.json
